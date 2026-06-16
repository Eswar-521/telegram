export type CatalogType = "product" | "service";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled";
export type MessageDirection = "inbound" | "outbound";
export type MessageTargetType = "contact" | "group";
export type MessageDeliveryStatus = "sent" | "partial" | "failed";
export type DeviceConnectionMode = "telegram_bot" | "telegram_account";
export type DeviceAccountStatus = "not_configured" | "ready" | "blocked";

export type BusinessProfile = {
  name: string;
  ownerName: string;
  phone: string;
  timezone: string;
};

export type TelegramConfig = {
  botToken: string;
  botUsername: string;
  businessTelegramId: string;
  publicBaseUrl: string;
  webhookSecret: string;
  connected: boolean;
  hasBotToken?: boolean;
  lastVerifiedAt?: string;
};

export type DeviceAccountConfig = {
  accountName: string;
  phoneNumber: string;
  deviceName: string;
  apiKey: string;
  connectionMode: DeviceConnectionMode;
  status: DeviceAccountStatus;
  lastPairedAt?: string;
  hasApiKey?: boolean;
};

export type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  telegramUserId: string;
  telegramChatId: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ContactGroup = {
  id: string;
  name: string;
  description: string;
  contactIds: string[];
  telegramChatId: string;
  inviteLink: string;
  createdAt: string;
  updatedAt: string;
};

export type CatalogItem = {
  id: string;
  type: CatalogType;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Appointment = {
  id: string;
  contactId: string;
  customerName: string;
  catalogItemId: string;
  startsAt: string;
  status: AppointmentStatus;
  notes: string;
  createdBy: "owner" | "customer" | "bot";
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  contactId?: string;
  groupId?: string;
  targetType?: MessageTargetType;
  targetName?: string;
  telegramChatId: string;
  direction: MessageDirection;
  text: string;
  deliveryStatus?: MessageDeliveryStatus;
  sentCount?: number;
  failedCount?: number;
  createdAt: string;
};

export type CrmData = {
  business: BusinessProfile;
  telegram: TelegramConfig;
  deviceAccount: DeviceAccountConfig;
  contacts: Contact[];
  groups: ContactGroup[];
  catalog: CatalogItem[];
  appointments: Appointment[];
  chatMessages: ChatMessage[];
};
