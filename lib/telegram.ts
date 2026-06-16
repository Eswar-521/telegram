type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

async function telegramApi<T>(
  botToken: string,
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(30_000)
    });
  } catch {
    throw new Error(
      "Telegram API is not reachable from this computer. Check internet, firewall, VPN, or proxy and try again."
    );
  }

  const payload = (await response.json()) as TelegramApiResponse<T>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram ${method} failed`);
  }

  return payload.result as T;
}

export async function getTelegramMe(botToken: string) {
  return telegramApi<TelegramUser>(botToken, "getMe");
}

export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string
) {
  return telegramApi<boolean>(botToken, "setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "edited_message"],
    ...(secretToken ? { secret_token: secretToken } : {})
  });
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  extra?: Record<string, unknown>
) {
  return telegramApi<unknown>(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra
  });
}
