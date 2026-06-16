"use client";

import {
  Check,
  Copy,
  ExternalLink,
  FileJson,
  KeyRound,
  PlugZap,
  Save,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  CrmData,
  DeviceAccountStatus,
  DeviceConnectionMode
} from "@/lib/types";
import type { CrmViewProps } from "./shared";

const connectionModeOptions: Array<{ label: string; value: DeviceConnectionMode }> = [
  { label: "Telegram bot", value: "telegram_bot" },
  { label: "Telegram account", value: "telegram_account" }
];

const deviceStatusOptions: Array<{ label: string; value: DeviceAccountStatus }> = [
  { label: "Not configured", value: "not_configured" },
  { label: "Ready", value: "ready" },
  { label: "Blocked", value: "blocked" }
];

export function SetupView({ data, persist, saving, setData, setNotice, setSaving }: CrmViewProps) {
  const [botTokenInput, setBotTokenInput] = useState("");
  const [deviceApiKeyInput, setDeviceApiKeyInput] = useState("");
  const botUsername = data.telegram.botUsername.replace(/^@/, "").trim();
  const botLink = botUsername ? `https://t.me/${botUsername}` : "";

  const setupChecks = useMemo(
    () => [
      {
        label: "Business profile",
        ready: Boolean(data.business.name.trim() && data.business.phone.trim())
      },
      {
        label: "Mobile number",
        ready: Boolean(data.deviceAccount.phoneNumber.trim())
      },
      {
        label: "Device API key",
        ready: Boolean(data.deviceAccount.hasApiKey || deviceApiKeyInput.trim())
      },
      {
        label: "Telegram bot token",
        ready: Boolean(data.telegram.hasBotToken || botTokenInput.trim())
      },
      {
        label: "Bot invite link",
        ready: Boolean(botLink)
      },
      {
        label: "Public HTTPS URL",
        ready: data.telegram.publicBaseUrl.trim().startsWith("https://")
      }
    ],
    [
      botTokenInput,
      data.business.name,
      data.business.phone,
      data.deviceAccount.hasApiKey,
      data.deviceAccount.phoneNumber,
      data.telegram.hasBotToken,
      data.telegram.publicBaseUrl,
      botLink,
      deviceApiKeyInput
    ]
  );
  const setupReadyCount = setupChecks.filter((check) => check.ready).length;

  const configPreview = useMemo(
    () =>
      JSON.stringify(
        {
          "data/crm.json": {
            business: data.business,
            deviceAccount: {
              accountName: data.deviceAccount.accountName,
              phoneNumber: data.deviceAccount.phoneNumber,
              deviceName: data.deviceAccount.deviceName,
              apiKey:
                data.deviceAccount.hasApiKey || deviceApiKeyInput.trim()
                  ? "<stored server-side>"
                  : "",
              connectionMode: data.deviceAccount.connectionMode,
              status: data.deviceAccount.status
            },
            telegram: {
              botToken:
                data.telegram.hasBotToken || botTokenInput.trim()
                  ? "<stored server-side>"
                  : "",
              botUsername: data.telegram.botUsername,
              botLink,
              businessTelegramId: data.telegram.businessTelegramId,
              publicBaseUrl: data.telegram.publicBaseUrl,
              webhookSecret: data.telegram.webhookSecret ? "<configured>" : "",
              connected: data.telegram.connected
            }
          },
          ".env.local": {
            TELEGRAM_BOT_TOKEN: "optional",
            CRM_DEVICE_API_KEY: "optional",
            APP_URL: data.telegram.publicBaseUrl || "https://your-domain.com"
          }
        },
        null,
        2
      ),
    [
      botTokenInput,
      data.business,
      data.deviceAccount.accountName,
      data.deviceAccount.connectionMode,
      data.deviceAccount.deviceName,
      data.deviceAccount.hasApiKey,
      data.deviceAccount.phoneNumber,
      data.deviceAccount.status,
      data.telegram.botUsername,
      data.telegram.businessTelegramId,
      data.telegram.connected,
      data.telegram.hasBotToken,
      data.telegram.publicBaseUrl,
      data.telegram.webhookSecret,
      botLink,
      deviceApiKeyInput
    ]
  );

  async function copyBotLink() {
    if (!botLink) return;

    try {
      await navigator.clipboard.writeText(botLink);
      setNotice("Bot link copied.");
    } catch {
      setNotice(botLink);
    }
  }

  function updateBusiness(key: keyof CrmData["business"], value: string) {
    setData((current) => ({
      ...current,
      business: { ...current.business, [key]: value }
    }));
  }

  function updateTelegram(key: keyof CrmData["telegram"], value: string | boolean) {
    setData((current) => ({
      ...current,
      telegram: { ...current.telegram, [key]: value }
    }));
  }

  function updateDeviceAccount<
    Key extends keyof Omit<CrmData["deviceAccount"], "hasApiKey">
  >(key: Key, value: CrmData["deviceAccount"][Key]) {
    setData((current) => ({
      ...current,
      deviceAccount: { ...current.deviceAccount, [key]: value }
    }));
  }

  async function saveSetup() {
    const saved = await persist(
      {
        ...data,
        deviceAccount: {
          ...data.deviceAccount,
          apiKey: deviceApiKeyInput
        },
        telegram: {
          ...data.telegram,
          botToken: botTokenInput
        }
      },
      "Setup saved."
    );

    if (saved) {
      setBotTokenInput("");
      setDeviceApiKeyInput("");
    }
  }

  async function connectTelegram(action: "test" | "webhook") {
    const saved = await persist(
      {
        ...data,
        deviceAccount: {
          ...data.deviceAccount,
          apiKey: deviceApiKeyInput
        },
        telegram: {
          ...data.telegram,
          botToken: botTokenInput
        }
      },
      "Setup saved."
    );

    if (!saved) return;

    setBotTokenInput("");
    setDeviceApiKeyInput("");
    setSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = (await response.json()) as {
        data?: CrmData;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Telegram connection failed.");
      }

      setData(payload.data);
      setNotice(payload.message ?? "Telegram connected.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Telegram connection failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="setup-layout">
      <form className="panel form-grid" onSubmit={(event) => event.preventDefault()}>
        <div className="panel-heading">
          <h2>Business</h2>
          <button className="primary" disabled={saving} onClick={saveSetup} type="button">
            <Save size={16} />
            Save
          </button>
        </div>

        <label>
          Business name
          <input
            value={data.business.name}
            onChange={(event) => updateBusiness("name", event.target.value)}
          />
        </label>
        <label>
          Owner name
          <input
            value={data.business.ownerName}
            onChange={(event) => updateBusiness("ownerName", event.target.value)}
          />
        </label>
        <label>
          Phone
          <input
            value={data.business.phone}
            onChange={(event) => updateBusiness("phone", event.target.value)}
          />
        </label>
        <label>
          Timezone
          <input
            value={data.business.timezone}
            onChange={(event) => updateBusiness("timezone", event.target.value)}
          />
        </label>
      </form>

      <form className="panel form-grid" onSubmit={(event) => event.preventDefault()}>
        <div className="panel-heading">
          <h2>
            <Smartphone size={17} />
            Device/Account
          </h2>
          <button className="primary" disabled={saving} onClick={saveSetup} type="button">
            <Save size={16} />
            Save
          </button>
        </div>

        <label>
          Account name
          <input
            value={data.deviceAccount.accountName}
            onChange={(event) => updateDeviceAccount("accountName", event.target.value)}
          />
        </label>
        <label>
          Mobile number
          <input
            placeholder="+91..."
            value={data.deviceAccount.phoneNumber}
            onChange={(event) => updateDeviceAccount("phoneNumber", event.target.value)}
          />
        </label>
        <label>
          Device name
          <input
            value={data.deviceAccount.deviceName}
            onChange={(event) => updateDeviceAccount("deviceName", event.target.value)}
          />
        </label>
        <label>
          Connection mode
          <select
            value={data.deviceAccount.connectionMode}
            onChange={(event) =>
              updateDeviceAccount("connectionMode", event.target.value as DeviceConnectionMode)
            }
          >
            {connectionModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          API key
          <input
            placeholder={data.deviceAccount.hasApiKey ? "API key saved" : "crm_live_..."}
            type="password"
            value={deviceApiKeyInput}
            onChange={(event) => setDeviceApiKeyInput(event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={data.deviceAccount.status}
            onChange={(event) =>
              updateDeviceAccount("status", event.target.value as DeviceAccountStatus)
            }
          >
            {deviceStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      <form className="panel form-grid" onSubmit={(event) => event.preventDefault()}>
        <div className="panel-heading">
          <h2>
            <KeyRound size={17} />
            Telegram
          </h2>
          <div className="button-row">
            <button className="secondary" disabled={saving} onClick={saveSetup} type="button">
              <Save size={16} />
              Save
            </button>
            <button
              className="secondary"
              disabled={saving}
              onClick={() => connectTelegram("test")}
              type="button"
            >
              <ShieldCheck size={16} />
              Test
            </button>
            <button
              className="secondary"
              disabled={saving}
              onClick={() => connectTelegram("webhook")}
              type="button"
            >
              <PlugZap size={16} />
              Webhook
            </button>
          </div>
        </div>

        <label>
          Bot token
          <input
            placeholder={data.telegram.hasBotToken ? "Token saved" : "123456:ABC..."}
            type="password"
            value={botTokenInput}
            onChange={(event) => setBotTokenInput(event.target.value)}
          />
        </label>
        <label>
          Bot username
          <input
            value={data.telegram.botUsername}
            onChange={(event) => updateTelegram("botUsername", event.target.value)}
          />
        </label>
        <label className="wide">
          Bot invite link
          <div className="copy-field">
            <input
              readOnly
              value={botLink || "Save token and click Test to generate bot link"}
            />
            {botLink ? (
              <>
                <button className="secondary" onClick={copyBotLink} type="button">
                  <Copy size={16} />
                  Copy
                </button>
                <a className="secondary link-button" href={botLink} rel="noreferrer" target="_blank">
                  <ExternalLink size={16} />
                  Open
                </a>
              </>
            ) : null}
          </div>
        </label>
        <label>
          Admin Telegram chat ID
          <input
            value={data.telegram.businessTelegramId}
            onChange={(event) => updateTelegram("businessTelegramId", event.target.value)}
          />
        </label>
        <label>
          Public HTTPS URL
          <input
            value={data.telegram.publicBaseUrl}
            onChange={(event) => updateTelegram("publicBaseUrl", event.target.value)}
          />
        </label>
        <label>
          Webhook secret
          <input
            value={data.telegram.webhookSecret}
            onChange={(event) => updateTelegram("webhookSecret", event.target.value)}
          />
        </label>
      </form>

      <section className="panel setup-reference">
        <div className="panel-heading">
          <h2>Setup Checklist</h2>
          <span>
            {setupReadyCount}/{setupChecks.length}
          </span>
        </div>
        <div className="check-list">
          {setupChecks.map((check) => (
            <div className="check-row" key={check.label}>
              <span className={check.ready ? "check-dot ready" : "check-dot"}>
                {check.ready ? <Check size={12} /> : null}
              </span>
              <strong>{check.label}</strong>
            </div>
          ))}
        </div>

        <div className="config-header">
          <FileJson size={18} />
          <strong>Config File Structure</strong>
        </div>
        <pre className="config-code">
          <code>{configPreview}</code>
        </pre>
      </section>
    </section>
  );
}
