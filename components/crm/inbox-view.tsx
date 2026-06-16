"use client";

import { Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ChatMessage, CrmData, MessageTargetType } from "@/lib/types";
import type { CrmViewProps } from "./shared";
import { formatDateTime } from "./shared";

export function InboxView({ data, saving, setData, setNotice, setSaving }: CrmViewProps) {
  const [targetType, setTargetType] = useState<MessageTargetType>("contact");
  const [targetId, setTargetId] = useState("");
  const [messageText, setMessageText] = useState("");

  const targets = targetType === "contact" ? data.contacts : data.groups;

  useEffect(() => {
    setTargetId((current) =>
      targets.some((target) => target.id === current) ? current : targets[0]?.id ?? ""
    );
  }, [targets]);

  const sortedMessages = useMemo(
    () =>
      [...data.chatMessages].sort(
        (first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      ),
    [data.chatMessages]
  );

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!targetId || !messageText.trim()) {
      setNotice("Target and message are required.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType, targetId, text: messageText })
      });
      const payload = (await response.json()) as {
        data?: CrmData;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Message failed.");
      }

      setData(payload.data);
      setMessageText("");
      setNotice(payload.message ?? "Message sent.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Message failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-grid two">
      <form className="panel form-grid compact" onSubmit={sendMessage}>
        <div className="panel-heading">
          <h2>Send Telegram Message</h2>
          <button className="primary" disabled={saving} type="submit">
            <Send size={16} />
            Send
          </button>
        </div>
        <label className="wide">
          Send to
          <select
            value={targetType}
            onChange={(event) => {
              setTargetType(event.target.value as MessageTargetType);
              setTargetId("");
            }}
          >
            <option value="contact">Contact</option>
            <option value="group">Group</option>
          </select>
        </label>
        <label className="wide">
          {targetType === "contact" ? "Contact" : "Group"}
          <select
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          >
            <option value="">Select {targetType}</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Message
          <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} />
        </label>
      </form>

      <section className="panel list-panel">
        <div className="panel-heading">
          <h2>Messages</h2>
          <span>{data.chatMessages.length}</span>
        </div>
        <div className="records message-records">
          {sortedMessages.map((message: ChatMessage) => {
            const contact = data.contacts.find((item) => item.id === message.contactId);
            const group = data.groups.find((item) => item.id === message.groupId);
            const delivery =
              message.targetType === "group" && message.sentCount
                ? `${message.sentCount} sent${
                    message.failedCount ? ` · ${message.failedCount} failed` : ""
                  }`
                : "";
            return (
              <article className={`message ${message.direction}`} key={message.id}>
                <div className="message-meta">
                  <strong>{message.targetName ?? group?.name ?? contact?.name ?? message.telegramChatId}</strong>
                  <span>{formatDateTime(message.createdAt)}</span>
                </div>
                {delivery ? <small>{delivery}</small> : null}
                <p>{message.text}</p>
              </article>
            );
          })}
          {!data.chatMessages.length ? <p className="empty-state">No messages yet.</p> : null}
        </div>
      </section>
    </section>
  );
}
