"use client";

import { Pencil, Trash2, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import type { ContactGroup } from "@/lib/types";
import type { CrmViewProps } from "./shared";
import { makeId, nowIso } from "./shared";

const emptyGroup = (): ContactGroup => ({
  id: "",
  name: "",
  description: "",
  contactIds: [],
  telegramChatId: "",
  inviteLink: "",
  createdAt: "",
  updatedAt: ""
});

export function GroupsView({ data, persist, saving, setNotice }: CrmViewProps) {
  const [groupDraft, setGroupDraft] = useState<ContactGroup>(emptyGroup());

  function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = nowIso();
    const group: ContactGroup = {
      ...groupDraft,
      id: groupDraft.id || makeId(),
      name: groupDraft.name.trim(),
      description: groupDraft.description.trim(),
      telegramChatId: groupDraft.telegramChatId.trim(),
      inviteLink: groupDraft.inviteLink.trim(),
      createdAt: groupDraft.createdAt || now,
      updatedAt: now
    };

    if (!group.name) {
      setNotice("Group name is required.");
      return;
    }

    const groups = groupDraft.id
      ? data.groups.map((item) => (item.id === group.id ? group : item))
      : [group, ...data.groups];

    void persist({ ...data, groups }, "Group saved.");
    setGroupDraft(emptyGroup());
  }

  function toggleGroupContact(contactId: string) {
    setGroupDraft((current) => ({
      ...current,
      contactIds: current.contactIds.includes(contactId)
        ? current.contactIds.filter((id) => id !== contactId)
        : [...current.contactIds, contactId]
    }));
  }

  function deleteGroup(groupId: string) {
    void persist(
      { ...data, groups: data.groups.filter((item) => item.id !== groupId) },
      "Group removed."
    );
  }

  return (
    <section className="content-grid">
      <form className="panel form-grid" onSubmit={saveGroup}>
        <div className="panel-heading">
          <h2>{groupDraft.id ? "Edit Telegram Group" : "New Telegram Group"}</h2>
          <div className="button-row">
            <button className="secondary" onClick={() => setGroupDraft(emptyGroup())} type="button">
              Clear
            </button>
            <button className="primary" disabled={saving} type="submit">
              <UsersRound size={16} />
              Save
            </button>
          </div>
        </div>

        <label>
          Telegram group name
          <input
            value={groupDraft.name}
            onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })}
          />
        </label>
        <label>
          Telegram chat ID
          <input
            value={groupDraft.telegramChatId}
            onChange={(event) =>
              setGroupDraft({ ...groupDraft, telegramChatId: event.target.value })
            }
          />
        </label>
        <label>
          Invite link
          <input
            value={groupDraft.inviteLink}
            onChange={(event) => setGroupDraft({ ...groupDraft, inviteLink: event.target.value })}
          />
        </label>
        <label className="wide">
          Description
          <textarea
            value={groupDraft.description}
            onChange={(event) =>
              setGroupDraft({ ...groupDraft, description: event.target.value })
            }
          />
        </label>
        <fieldset className="wide checkbox-grid">
          <legend>Members</legend>
          {data.contacts.map((contact) => (
            <label key={contact.id}>
              <input
                checked={groupDraft.contactIds.includes(contact.id)}
                onChange={() => toggleGroupContact(contact.id)}
                type="checkbox"
              />
              <span>{contact.name}</span>
            </label>
          ))}
        </fieldset>
      </form>

      <section className="panel list-panel">
        <div className="panel-heading">
          <h2>Telegram Groups</h2>
          <span>{data.groups.length}</span>
        </div>
        <div className="records">
          {data.groups.map((group) => (
            <article className="record" key={group.id}>
              <div>
                <strong>{group.name}</strong>
                <span>{group.contactIds.length} contacts</span>
                <small>{group.telegramChatId || group.inviteLink || group.description}</small>
              </div>
              <div className="icon-actions">
                <button aria-label="Edit group" onClick={() => setGroupDraft(group)} type="button">
                  <Pencil size={16} />
                </button>
                <button aria-label="Delete group" onClick={() => deleteGroup(group.id)} type="button">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {!data.groups.length ? <p className="empty-state">No groups yet.</p> : null}
        </div>
      </section>
    </section>
  );
}
