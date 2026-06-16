# Tinitiate CRM Telegram

Business-owner CRM built with Next.js for Telegram contacts, groups, catalog, appointments, and inbox messaging.

## What This App Does

- Save Telegram contacts and groups.
- Send messages to a saved contact or group.
- Receive customer messages from a Telegram bot into the CRM Inbox.
- Manage products/services in a catalog.
- Create owner-side customer appointments.

## Bot And API Flow

Telegram message sending/receiving works through the Telegram Bot API.

1. Create a bot in Telegram using `@BotFather`.
2. Copy the bot token from BotFather.
3. Add the token in Vercel Environment Variables.
4. Open the CRM app and click **Test**.
5. Click **Webhook** so Telegram can send incoming messages to the deployed app.
6. Customer sends a message to the bot.
7. Telegram calls:

```text
https://telegram-brown.vercel.app/api/telegram/webhook
```

8. The CRM saves the message and shows it in **Inbox**.

## Environment Variables

In Vercel project settings, add these variables.

| Key | Value |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Your BotFather token |
| `TELEGRAM_BOT_USERNAME` | `Tinitiate_crm_bot` |
| `APP_URL` | `https://telegram-brown.vercel.app` |

After adding or changing environment variables, redeploy the Vercel project.

## Vercel Setup

1. Push this repo to GitHub.
2. Open Vercel.
3. Import the GitHub repo.
4. Framework should be detected as **Next.js**.
5. Add the environment variables listed above.
6. Deploy.
7. Open:

```text
https://telegram-brown.vercel.app
```

## Connect Telegram Bot

In the deployed app:

1. Go to **Configure Account**.
2. Go to the **Telegram** panel.
3. Click **Test**.
4. Expected success message:

```text
Connected to @Tinitiate_crm_bot.
```

5. Click **Webhook**.
6. Expected success message:

```text
Webhook connected.
```

## Receive Messages

1. Open Telegram on phone.
2. Search:

```text
@Tinitiate_crm_bot
```

3. Click **Start**.
4. Send a message, for example:

```text
hello
```

5. Open the CRM app.
6. Go to **Inbox**.
7. The incoming message should be visible.

## Send Messages To Contact

The contact must have a Telegram chat ID. Phone number alone is not enough.

1. Go to **Telegram Contacts**.
2. Add or edit a contact.
3. Fill **Telegram chat ID**.
4. Save.
5. Go to **Inbox**.
6. Set **Send to** as **Contact**.
7. Select the contact.
8. Type a message.
9. Click **Send**.

## Send Messages To Group

There are two ways:

- If the group has a Telegram group chat ID, the bot sends directly to that Telegram group.
- If no group chat ID exists, the app sends individually to contacts inside the CRM group who have Telegram chat IDs.

Steps:

1. Go to **Telegram Groups**.
2. Create a group.
3. Add contacts to the group.
4. Go to **Inbox**.
5. Set **Send to** as **Group**.
6. Select the group.
7. Type a message.
8. Click **Send**.

## Local Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Local receiving from Telegram will not work unless you use a public HTTPS tunnel such as ngrok. Telegram cannot call `localhost`.

## Common Errors

### Bot token is required

The app cannot see `TELEGRAM_BOT_TOKEN`.

Fix:

1. Add `TELEGRAM_BOT_TOKEN` in Vercel project Environment Variables.
2. Redeploy.
3. Click **Test** again.

### Telegram API is not reachable

The server cannot reach `https://api.telegram.org`.

Fix:

- On local machine: use VPN/WARP or a different network.
- On hosting: redeploy, change server region, or try another provider.

### Message is not visible in Inbox

Webhook is not set or the app URL is wrong.

Fix:

1. `APP_URL` must be:

```text
https://telegram-brown.vercel.app
```

2. Redeploy.
3. Click **Webhook** again.
4. Send a new message to the bot.

## Important Notes

- Telegram bots cannot send messages to a phone number directly.
- A user must first open the bot and click **Start**.
- After the user starts the bot, Telegram gives a chat ID.
- The app uses that chat ID for future messages.
- Current Vercel data storage is temporary runtime storage. For permanent production CRM data, add a database later.
