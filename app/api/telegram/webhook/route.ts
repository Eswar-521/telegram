import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { readCrmData, writeCrmData } from "@/lib/data";
import { sendTelegramMessage } from "@/lib/telegram";
import type { Appointment, CatalogItem, Contact, CrmData } from "@/lib/types";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 60;

type TelegramContact = {
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  user_id?: number;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  caption?: string;
  contact?: TelegramContact;
  chat: {
    id: number;
    type: string;
  };
  from?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

const bookingPendingTag = "booking-requested";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatContactName(message: TelegramMessage) {
  const from = message.from;
  const parts = [from?.first_name, from?.last_name].filter(Boolean);
  return parts.join(" ") || from?.username || `Telegram ${from?.id ?? message.chat.id}`;
}

function formatCatalog(catalog: CatalogItem[]) {
  const activeItems = catalog.filter((item) => item.active);

  if (!activeItems.length) {
    return "Catalog is not available yet.";
  }

  return activeItems
    .map((item, index) => {
      const price = item.price ? ` - INR ${item.price.toFixed(2)}` : "";
      const duration =
        item.type === "service" && item.durationMinutes ? `, ${item.durationMinutes} min` : "";
      return `${index + 1}. ${item.name}${price}${duration}`;
    })
    .join("\n");
}

function buildReply(text: string, catalog: CatalogItem[]) {
  const normalized = text.trim().toLowerCase();

  if (normalized.startsWith("/start")) {
    return {
      text:
        "Welcome. You can view the catalog, share your phone number, or ask for an appointment.",
      extra: {
        reply_markup: {
          resize_keyboard: true,
          keyboard: [
            [{ text: "Catalog" }, { text: "Book Appointment" }],
            [{ text: "Share Phone", request_contact: true }]
          ]
        }
      }
    };
  }

  if (normalized === "/catalog" || normalized === "catalog") {
    return { text: formatCatalog(catalog) };
  }

  if (normalized === "/book" || normalized === "book appointment") {
    return {
      text:
        "Send service, date, and time in one message. Example: Haircut 2026-06-20 15:30"
    };
  }

  if (normalized === "/help" || normalized === "help") {
    return { text: "Commands: /catalog, /book, /help" };
  }

  return { text: "Thanks. The business owner will see your message in the CRM inbox." };
}

function addPendingBooking(contact: Contact) {
  if (!contact.tags.includes(bookingPendingTag)) {
    contact.tags = [...contact.tags, bookingPendingTag];
  }
}

function clearPendingBooking(contact: Contact) {
  contact.tags = contact.tags.filter((tag) => tag !== bookingPendingTag);
}

function parseAppointmentStart(text: string) {
  const ymd = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  const dmy = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  const dateMatch = ymd ?? dmy;

  if (!dateMatch) return null;

  const year = ymd ? Number(dateMatch[1]) : Number(dateMatch[3]);
  const month = ymd ? Number(dateMatch[2]) : Number(dateMatch[2]);
  const day = ymd ? Number(dateMatch[3]) : Number(dateMatch[1]);
  const withoutDate = text.replace(dateMatch[0], " ");
  const time24 = withoutDate.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const time12 = withoutDate.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i);
  const timeMatch = time24 ?? time12;

  if (!timeMatch) return null;

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] ?? "0");
  const meridiem = time12?.[3]?.toLowerCase();

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  const candidate = new Date(year, month - 1, day, hour, minute);

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day ||
    candidate.getHours() !== hour ||
    candidate.getMinutes() !== minute
  ) {
    return null;
  }

  return candidate.toISOString();
}

function findRequestedCatalogItem(text: string, catalog: CatalogItem[]) {
  const normalized = text.toLowerCase();

  return catalog.find(
    (item) => item.active && item.name && normalized.includes(item.name.toLowerCase())
  );
}

function formatAppointmentDate(iso: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || "Asia/Kolkata"
    }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  }
}

function createCustomerAppointment(
  data: CrmData,
  contact: Contact,
  text: string,
  startsAt: string,
  now: string
): Appointment {
  const catalogItem = findRequestedCatalogItem(text, data.catalog);

  return {
    id: randomUUID(),
    contactId: contact.id,
    customerName: contact.name,
    catalogItemId: catalogItem?.id ?? "",
    startsAt,
    status: "scheduled",
    notes: `Telegram request: ${text}`,
    createdBy: "customer",
    createdAt: now,
    updatedAt: now
  };
}

function buildAdminAppointmentMessage(
  data: CrmData,
  contact: Contact,
  appointment: Appointment,
  rawText: string
) {
  const catalogItem = data.catalog.find((item) => item.id === appointment.catalogItemId);
  const when = formatAppointmentDate(appointment.startsAt, data.business.timezone);
  const details = [
    "<b>New appointment request</b>",
    `Customer: ${escapeHtml(contact.name)}`,
    contact.phone ? `Phone: ${escapeHtml(contact.phone)}` : "",
    `Telegram chat: ${escapeHtml(contact.telegramChatId || contact.telegramUserId)}`,
    `When: ${escapeHtml(when)}`,
    catalogItem ? `Service: ${escapeHtml(catalogItem.name)}` : "",
    `Message: ${escapeHtml(rawText)}`
  ].filter(Boolean);

  return details.join("\n");
}

export async function POST(request: Request) {
  const data = await readCrmData();

  if (data.telegram.webhookSecret) {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");

    if (secret !== data.telegram.webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message ?? update.edited_message;

  if (!message?.from) {
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();
  const telegramUserId = String(message.from.id);
  const telegramChatId = String(message.chat.id);
  const incomingText = message.text ?? message.caption ?? "";
  const text = incomingText || "[non-text message]";
  let contact: Contact | undefined = data.contacts.find(
    (item) => item.telegramUserId === telegramUserId || item.telegramChatId === telegramChatId
  );

  if (!contact) {
    contact = {
      id: randomUUID(),
      name: formatContactName(message),
      phone: message.contact?.phone_number ?? "",
      email: "",
      telegramUserId,
      telegramChatId,
      tags: ["telegram"],
      notes: "",
      createdAt: now,
      updatedAt: now
    };
    data.contacts.push(contact);
  } else {
    contact.name = contact.name || formatContactName(message);
    contact.telegramUserId = contact.telegramUserId || telegramUserId;
    contact.telegramChatId = contact.telegramChatId || telegramChatId;
    contact.phone = message.contact?.phone_number ?? contact.phone;
    contact.updatedAt = now;
  }

  data.chatMessages.push({
    id: randomUUID(),
    contactId: contact.id,
    telegramChatId,
    direction: "inbound",
    text,
    createdAt: now
  });
  data.chatMessages = data.chatMessages.slice(-500);

  const normalized = incomingText.trim().toLowerCase();
  let reply = buildReply(text, data.catalog);
  let adminMessage = "";

  if (normalized === "/book" || normalized === "book appointment") {
    addPendingBooking(contact);
  } else if (incomingText.trim() && contact.tags.includes(bookingPendingTag)) {
    const startsAt = parseAppointmentStart(incomingText);

    if (startsAt) {
      const appointment = createCustomerAppointment(data, contact, incomingText.trim(), startsAt, now);
      data.appointments.unshift(appointment);
      clearPendingBooking(contact);
      adminMessage = buildAdminAppointmentMessage(data, contact, appointment, incomingText.trim());
      reply = {
        text:
          "Appointment request sent to the admin. You will receive confirmation after review."
      };
    } else {
      reply = {
        text: "Please include date and time. Example: Haircut 2026-06-20 15:30"
      };
    }
  }

  await writeCrmData(data);

  if (data.telegram.botToken && message.chat.type === "private") {
    await sendTelegramMessage(data.telegram.botToken, telegramChatId, reply.text, reply.extra);
  }

  const adminTelegramChatId = data.telegram.businessTelegramId.trim();

  if (data.telegram.botToken && adminTelegramChatId && adminMessage) {
    try {
      await sendTelegramMessage(
        data.telegram.botToken,
        adminTelegramChatId,
        adminMessage
      );
    } catch (error) {
      console.error("Admin appointment notification failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}
