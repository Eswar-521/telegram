"use client";

import {
  Bot,
  CalendarClock,
  Check,
  Contact as ContactIcon,
  MessageSquareText,
  Package,
  Settings,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppointmentsView } from "@/components/crm/appointments-view";
import { CatalogView } from "@/components/crm/catalog-view";
import { ContactsView } from "@/components/crm/contacts-view";
import { GroupsView } from "@/components/crm/groups-view";
import { InboxView } from "@/components/crm/inbox-view";
import { SetupView } from "@/components/crm/setup-view";
import type { CrmData } from "@/lib/types";

type ViewKey = "setup" | "contacts" | "groups" | "catalog" | "appointments" | "inbox";

const blankData: CrmData = {
  business: {
    name: "Tinitiate CRM",
    ownerName: "",
    phone: "",
    timezone: "Asia/Kolkata"
  },
  telegram: {
    botToken: "",
    botUsername: "",
    businessTelegramId: "",
    publicBaseUrl: "http://localhost:3000",
    webhookSecret: "",
    connected: false
  },
  deviceAccount: {
    accountName: "",
    phoneNumber: "",
    deviceName: "Owner mobile",
    apiKey: "",
    connectionMode: "telegram_bot",
    status: "not_configured"
  },
  contacts: [],
  groups: [],
  catalog: [],
  appointments: [],
  chatMessages: []
};

const navItems = [
  { key: "setup" as const, label: "Configure Account", icon: Settings },
  { key: "contacts" as const, label: "Telegram Contacts", icon: ContactIcon },
  { key: "groups" as const, label: "Telegram Groups", icon: UsersRound },
  { key: "catalog" as const, label: "Catalog", icon: Package },
  { key: "appointments" as const, label: "Appointments", icon: CalendarClock },
  { key: "inbox" as const, label: "Inbox", icon: MessageSquareText }
];

export function CrmDashboard() {
  const [activeView, setActiveView] = useState<ViewKey>("setup");
  const [data, setData] = useState<CrmData>(blankData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    fetch("/api/crm")
      .then(async (response) => {
        if (!response.ok) throw new Error("CRM data failed to load.");
        return (await response.json()) as CrmData;
      })
      .then((payload) => {
        if (mounted) setData(payload);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "CRM load failed."))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: "Contacts", value: data.contacts.length },
      { label: "Groups", value: data.groups.length },
      { label: "Catalog", value: data.catalog.length },
      { label: "Appointments", value: data.appointments.length }
    ],
    [data.appointments.length, data.catalog.length, data.contacts.length, data.groups.length]
  );

  async function persist(nextData: CrmData, message = "Saved.") {
    setSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/crm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nextData)
      });
      const payload = (await response.json()) as CrmData | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Save failed.");
      }

      setData(payload as CrmData);
      setNotice(message);
      return payload as CrmData;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Save failed.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  const activeTitle = navItems.find((item) => item.key === activeView)?.label;
  const viewProps = { data, persist, saving, setData, setNotice, setSaving };

  if (loading) {
    return (
      <main className="loading-screen">
        <Bot size={34} />
        <span>Loading CRM</span>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Bot size={22} />
          </span>
          <div>
            <strong>{data.business.name || "Tinitiate CRM"}</strong>
            <span>Telegram CRM</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="CRM sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeView === item.key ? "nav-item active" : "nav-item"}
                key={item.key}
                onClick={() => setActiveView(item.key)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Owner Workspace</span>
            <h1>{activeTitle}</h1>
          </div>
          <div className={data.telegram.connected ? "connection on" : "connection"}>
            <span />
            {data.telegram.botUsername ? `@${data.telegram.botUsername}` : "Bot not verified"}
          </div>
        </header>

        <section className="stats-grid" aria-label="CRM stats">
          {stats.map((stat) => (
            <div className="stat-panel" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </section>

        {notice ? <div className="notice">{notice}</div> : null}

        {activeView === "setup" ? <SetupView {...viewProps} /> : null}
        {activeView === "contacts" ? <ContactsView {...viewProps} /> : null}
        {activeView === "groups" ? <GroupsView {...viewProps} /> : null}
        {activeView === "catalog" ? <CatalogView {...viewProps} /> : null}
        {activeView === "appointments" ? <AppointmentsView {...viewProps} /> : null}
        {activeView === "inbox" ? <InboxView {...viewProps} /> : null}

        {saving ? (
          <div className="saving-pill">
            <Check size={16} />
            Working
          </div>
        ) : null}
      </section>
    </main>
  );
}
