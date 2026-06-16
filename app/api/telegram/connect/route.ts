import { NextResponse } from "next/server";
import { readCrmData, sanitizeCrmDataForClient, writeCrmData } from "@/lib/data";
import { getTelegramMe, setTelegramWebhook } from "@/lib/telegram";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 60;

type ConnectAction = {
  action?: "test" | "webhook";
};

export async function POST(request: Request) {
  const body = (await request.json()) as ConnectAction;
  const data = await readCrmData();
  const botToken = data.telegram.botToken.trim();

  if (!botToken) {
    return NextResponse.json({ error: "Bot token is required." }, { status: 400 });
  }

  try {
    if (body.action === "webhook") {
      const publicBaseUrl = data.telegram.publicBaseUrl.trim().replace(/\/$/, "");

      if (!publicBaseUrl.startsWith("https://")) {
        return NextResponse.json(
          { error: "Webhook needs a public HTTPS URL." },
          { status: 400 }
        );
      }

      await setTelegramWebhook(
        botToken,
        `${publicBaseUrl}/api/telegram/webhook`,
        data.telegram.webhookSecret || undefined
      );

      data.telegram.connected = true;
      data.telegram.lastVerifiedAt = new Date().toISOString();
      await writeCrmData(data);

      return NextResponse.json({
        data: sanitizeCrmDataForClient(data),
        message: "Webhook connected."
      });
    }

    const me = await getTelegramMe(botToken);
    data.telegram.botUsername = me.username ?? "";
    data.telegram.connected = true;
    data.telegram.lastVerifiedAt = new Date().toISOString();
    await writeCrmData(data);

    return NextResponse.json({
      data: sanitizeCrmDataForClient(data),
      message: `Connected to @${me.username ?? me.first_name}.`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Telegram connection failed." },
      { status: 502 }
    );
  }
}
