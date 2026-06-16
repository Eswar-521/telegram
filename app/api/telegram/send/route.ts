import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { readCrmData, sanitizeCrmDataForClient, writeCrmData } from "@/lib/data";
import { sendTelegramMessage } from "@/lib/telegram";
import type { Contact, CrmData, MessageDeliveryStatus, MessageTargetType } from "@/lib/types";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 60;

type GroupDeliveryMode = "auto" | "group_chat" | "members";

type SendBody = {
  contactId?: string;
  groupId?: string;
  targetId?: string;
  targetType?: MessageTargetType;
  deliveryMode?: GroupDeliveryMode;
  text?: string;
};

function getContactChatId(contact: Contact) {
  return contact.telegramChatId || contact.telegramUserId;
}

function addMessageLog(
  data: CrmData,
  entry: {
    contactId?: string;
    groupId?: string;
    targetType: MessageTargetType;
    targetName: string;
    telegramChatId: string;
    text: string;
    deliveryStatus: MessageDeliveryStatus;
    sentCount: number;
    failedCount: number;
  }
) {
  data.chatMessages.push({
    id: randomUUID(),
    contactId: entry.contactId,
    groupId: entry.groupId,
    targetType: entry.targetType,
    targetName: entry.targetName,
    telegramChatId: entry.telegramChatId,
    direction: "outbound",
    text: entry.text,
    deliveryStatus: entry.deliveryStatus,
    sentCount: entry.sentCount,
    failedCount: entry.failedCount,
    createdAt: new Date().toISOString()
  });
  data.chatMessages = data.chatMessages.slice(-500);
}

export async function POST(request: Request) {
  const body = (await request.json()) as SendBody;
  const data = await readCrmData();
  const text = body.text?.trim();
  const targetType: MessageTargetType = body.targetType ?? (body.groupId ? "group" : "contact");
  const targetId = body.targetId ?? body.contactId ?? body.groupId;

  if (!data.telegram.botToken) {
    return NextResponse.json({ error: "Bot token is required." }, { status: 400 });
  }

  if (!targetId || !text) {
    return NextResponse.json({ error: "Target and message are required." }, { status: 400 });
  }

  if (targetType === "contact") {
    const contact = data.contacts.find((item) => item.id === targetId);
    const chatId = contact ? getContactChatId(contact) : "";

    if (!contact || !chatId) {
      return NextResponse.json(
        { error: "Contact does not have a Telegram chat yet." },
        { status: 400 }
      );
    }

    try {
      await sendTelegramMessage(data.telegram.botToken, chatId, text);

      addMessageLog(data, {
        contactId: contact.id,
        targetType: "contact",
        targetName: contact.name,
        telegramChatId: chatId,
        text,
        deliveryStatus: "sent",
        sentCount: 1,
        failedCount: 0
      });

      await writeCrmData(data);

      return NextResponse.json({
        data: sanitizeCrmDataForClient(data),
        message: "Message sent to contact."
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Message failed." },
        { status: 502 }
      );
    }
  }

  const group = data.groups.find((item) => item.id === targetId);

  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const deliveryMode = body.deliveryMode ?? "auto";
  const groupChatId = group.telegramChatId.trim();
  const shouldSendToGroupChat =
    deliveryMode === "group_chat" || (deliveryMode === "auto" && Boolean(groupChatId));

  if (shouldSendToGroupChat) {
    if (!groupChatId) {
      return NextResponse.json(
        { error: "Group does not have a Telegram chat ID." },
        { status: 400 }
      );
    }

    try {
      await sendTelegramMessage(data.telegram.botToken, groupChatId, text);

      addMessageLog(data, {
        groupId: group.id,
        targetType: "group",
        targetName: group.name,
        telegramChatId: groupChatId,
        text,
        deliveryStatus: "sent",
        sentCount: 1,
        failedCount: 0
      });

      await writeCrmData(data);

      return NextResponse.json({
        data: sanitizeCrmDataForClient(data),
        message: "Message sent to group."
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Message failed." },
        { status: 502 }
      );
    }
  }

  const recipients = group.contactIds
    .map((contactId) => data.contacts.find((contact) => contact.id === contactId))
    .filter((contact): contact is Contact => Boolean(contact && getContactChatId(contact)));

  if (!recipients.length) {
    return NextResponse.json(
      { error: "Group needs a Telegram chat ID or members with Telegram chat IDs." },
      { status: 400 }
    );
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const contact of recipients) {
    try {
      await sendTelegramMessage(data.telegram.botToken, getContactChatId(contact), text);
      sentCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  if (!sentCount) {
    return NextResponse.json({ error: "Message failed for every group member." }, { status: 502 });
  }

  addMessageLog(data, {
    groupId: group.id,
    targetType: "group",
    targetName: group.name,
    telegramChatId: recipients.map((contact) => getContactChatId(contact)).join(","),
    text,
    deliveryStatus: failedCount ? "partial" : "sent",
    sentCount,
    failedCount
  });

  await writeCrmData(data);

  return NextResponse.json({
    data: sanitizeCrmDataForClient(data),
    message: failedCount
      ? `Message sent to ${sentCount} contacts. ${failedCount} failed.`
      : `Message sent to ${sentCount} contacts.`
  });
}
