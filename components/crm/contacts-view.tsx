"use client";

import { CirclePlus, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Contact } from "@/lib/types";
import type { CrmViewProps } from "./shared";
import { makeId, nowIso, splitTags } from "./shared";

const emptyContact = (): Contact => ({
  id: "",
  name: "",
  phone: "",
  email: "",
  telegramUserId: "",
  telegramChatId: "",
  tags: [],
  notes: "",
  createdAt: "",
  updatedAt: ""
});

export function ContactsView({ data, persist, saving, setNotice }: CrmViewProps) {
  const [contactDraft, setContactDraft] = useState<Contact>(emptyContact());
  const botUsername = data.telegram.botUsername.replace(/^@/, "").trim();
  const botLink = botUsername ? `https://t.me/${botUsername}` : "";

  function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = nowIso();
    const contact: Contact = {
      ...contactDraft,
      id: contactDraft.id || makeId(),
      name: contactDraft.name.trim(),
      phone: contactDraft.phone.trim(),
      email: contactDraft.email.trim(),
      telegramUserId: contactDraft.telegramUserId.trim(),
      telegramChatId: contactDraft.telegramChatId.trim(),
      notes: contactDraft.notes.trim(),
      createdAt: contactDraft.createdAt || now,
      updatedAt: now
    };

    if (!contact.name) {
      setNotice("Contact name is required.");
      return;
    }

    const contacts = contactDraft.id
      ? data.contacts.map((item) => (item.id === contact.id ? contact : item))
      : [contact, ...data.contacts];

    void persist({ ...data, contacts }, "Contact saved.");
    setContactDraft(emptyContact());
  }

  function deleteContact(contactId: string) {
    const contacts = data.contacts.filter((item) => item.id !== contactId);
    const groups = data.groups.map((group) => ({
      ...group,
      contactIds: group.contactIds.filter((id) => id !== contactId)
    }));

    void persist({ ...data, contacts, groups }, "Contact removed.");
  }

  return (
    <section className="content-grid">
      <form className="panel form-grid" onSubmit={saveContact}>
        <div className="panel-heading">
          <h2>{contactDraft.id ? "Edit Telegram Contact" : "New Telegram Contact"}</h2>
          <div className="button-row">
            <button className="secondary" onClick={() => setContactDraft(emptyContact())} type="button">
              Clear
            </button>
            <button className="primary" disabled={saving} type="submit">
              <CirclePlus size={16} />
              Save
            </button>
          </div>
        </div>

        <label>
          Name
          <input
            value={contactDraft.name}
            onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })}
          />
        </label>
        <label>
          Phone
          <input
            value={contactDraft.phone}
            onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })}
          />
        </label>
        <label>
          Email
          <input
            value={contactDraft.email}
            onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })}
          />
        </label>
        <label>
          Telegram user ID
          <input
            value={contactDraft.telegramUserId}
            onChange={(event) =>
              setContactDraft({ ...contactDraft, telegramUserId: event.target.value })
            }
          />
        </label>
        <label>
          Telegram chat ID
          <input
            value={contactDraft.telegramChatId}
            onChange={(event) =>
              setContactDraft({ ...contactDraft, telegramChatId: event.target.value })
            }
          />
        </label>
        <label>
          Tags
          <input
            value={contactDraft.tags.join(", ")}
            onChange={(event) =>
              setContactDraft({ ...contactDraft, tags: splitTags(event.target.value) })
            }
          />
        </label>
        <label className="wide">
          Notes
          <textarea
            value={contactDraft.notes}
            onChange={(event) => setContactDraft({ ...contactDraft, notes: event.target.value })}
          />
        </label>
      </form>

      <section className="panel list-panel">
        <div className="panel-heading">
          <h2>Telegram Contacts</h2>
          <span>{data.contacts.length}</span>
        </div>
        <div className="records">
          {data.contacts.map((contact) => {
            const hasTelegramChat = Boolean(contact.telegramChatId || contact.telegramUserId);

            return (
              <article className="record" key={contact.id}>
                <div>
                  <strong>{contact.name}</strong>
                  <span>
                    {[contact.phone, contact.email].filter(Boolean).join(" · ") ||
                      contact.telegramChatId ||
                      "Telegram contact"}
                  </span>
                  <small className={hasTelegramChat ? "status-ready" : "status-waiting"}>
                    {hasTelegramChat
                      ? "Ready for Telegram messages"
                      : "Ask this contact to start your bot first"}
                  </small>
                  {!hasTelegramChat && botLink ? (
                    <a className="inline-link" href={botLink} rel="noreferrer" target="_blank">
                      <ExternalLink size={13} />
                      {botLink}
                    </a>
                  ) : null}
                  <div className="tag-row">
                    {contact.tags.map((tag) => (
                      <em key={tag}>{tag}</em>
                    ))}
                  </div>
                </div>
                <div className="icon-actions">
                  <button aria-label="Edit contact" onClick={() => setContactDraft(contact)} type="button">
                    <Pencil size={16} />
                  </button>
                  <button aria-label="Delete contact" onClick={() => deleteContact(contact.id)} type="button">
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
          {!data.contacts.length ? <p className="empty-state">No contacts yet.</p> : null}
        </div>
      </section>
    </section>
  );
}
