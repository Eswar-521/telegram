import { promises as fs } from "fs";
import path from "path";
import type { CrmData } from "@/lib/types";

const dataDir = process.env.VERCEL
  ? path.join("/tmp", "tinitiate-crm-telegram")
  : path.join(process.cwd(), "data");
const dataPath = path.join(dataDir, "crm.json");

export function createInitialCrmData(): CrmData {
  return {
    business: {
      name: "Tinitiate CRM",
      ownerName: "",
      phone: "",
      timezone: "Asia/Kolkata"
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
      botUsername: process.env.TELEGRAM_BOT_USERNAME ?? "",
      businessTelegramId: process.env.TELEGRAM_ADMIN_CHAT_ID ?? "",
      publicBaseUrl: process.env.APP_URL ?? "http://localhost:3000",
      webhookSecret: "",
      connected: false
    },
    deviceAccount: {
      accountName: "",
      phoneNumber: "",
      deviceName: "Owner mobile",
      apiKey: process.env.CRM_DEVICE_API_KEY ?? "",
      connectionMode: "telegram_bot",
      status: "not_configured"
    },
    contacts: [],
    groups: [],
    catalog: [],
    appointments: [],
    chatMessages: []
  };
}

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataPath);
  } catch {
    await writeCrmData(createInitialCrmData());
  }
}

export async function readCrmData(): Promise<CrmData> {
  await ensureDataFile();
  const raw = await fs.readFile(dataPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<CrmData>;
  const initial = createInitialCrmData();

  const telegram = {
    ...initial.telegram,
    ...parsed.telegram,
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? parsed.telegram?.botToken ?? initial.telegram.botToken,
    botUsername:
      process.env.TELEGRAM_BOT_USERNAME ??
      parsed.telegram?.botUsername ??
      initial.telegram.botUsername,
    businessTelegramId:
      process.env.TELEGRAM_ADMIN_CHAT_ID ??
      parsed.telegram?.businessTelegramId ??
      initial.telegram.businessTelegramId,
    publicBaseUrl: process.env.APP_URL ?? parsed.telegram?.publicBaseUrl ?? initial.telegram.publicBaseUrl
  };

  return {
    business: { ...initial.business, ...parsed.business },
    telegram,
    deviceAccount: { ...initial.deviceAccount, ...parsed.deviceAccount },
    contacts: parsed.contacts ?? [],
    groups: parsed.groups ?? [],
    catalog: parsed.catalog ?? [],
    appointments: parsed.appointments ?? [],
    chatMessages: parsed.chatMessages ?? []
  };
}

export async function writeCrmData(data: CrmData) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function sanitizeCrmDataForClient(data: CrmData): CrmData {
  return {
    ...data,
    telegram: {
      ...data.telegram,
      botToken: "",
      hasBotToken: Boolean(data.telegram.botToken)
    },
    deviceAccount: {
      ...data.deviceAccount,
      apiKey: "",
      hasApiKey: Boolean(data.deviceAccount.apiKey)
    }
  };
}

export function mergeClientCrmData(existing: CrmData, incoming: CrmData): CrmData {
  const incomingToken = incoming.telegram?.botToken?.trim();
  const incomingApiKey = incoming.deviceAccount?.apiKey?.trim();

  return {
    business: { ...existing.business, ...incoming.business },
    telegram: {
      ...existing.telegram,
      ...incoming.telegram,
      botToken: incomingToken || existing.telegram.botToken
    },
    deviceAccount: {
      ...existing.deviceAccount,
      ...incoming.deviceAccount,
      apiKey: incomingApiKey || existing.deviceAccount.apiKey
    },
    contacts: incoming.contacts ?? existing.contacts,
    groups: incoming.groups ?? existing.groups,
    catalog: incoming.catalog ?? existing.catalog,
    appointments: incoming.appointments ?? existing.appointments,
    chatMessages: incoming.chatMessages ?? existing.chatMessages
  };
}
