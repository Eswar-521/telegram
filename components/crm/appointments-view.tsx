"use client";

import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import type { CrmViewProps } from "./shared";
import {
  formatDateTime,
  fromLocalInputValue,
  makeId,
  nowIso,
  toLocalInputValue
} from "./shared";

const statusOptions: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled"];

const emptyAppointment = (): Appointment => ({
  id: "",
  contactId: "",
  customerName: "",
  catalogItemId: "",
  startsAt: nowIso(),
  status: "scheduled",
  notes: "",
  createdBy: "owner",
  createdAt: "",
  updatedAt: ""
});

export function AppointmentsView({ data, persist, saving, setNotice }: CrmViewProps) {
  const [appointmentDraft, setAppointmentDraft] = useState<Appointment>(emptyAppointment());

  function saveAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = nowIso();
    const contact = data.contacts.find((item) => item.id === appointmentDraft.contactId);
    const appointment: Appointment = {
      ...appointmentDraft,
      id: appointmentDraft.id || makeId(),
      customerName: (appointmentDraft.customerName || contact?.name || "").trim(),
      notes: appointmentDraft.notes.trim(),
      createdAt: appointmentDraft.createdAt || now,
      updatedAt: now
    };

    if (!appointment.customerName || !appointment.startsAt) {
      setNotice("Customer and start time are required.");
      return;
    }

    const appointments = appointmentDraft.id
      ? data.appointments.map((item) => (item.id === appointment.id ? appointment : item))
      : [appointment, ...data.appointments];

    void persist({ ...data, appointments }, "Appointment saved.");
    setAppointmentDraft(emptyAppointment());
  }

  function deleteAppointment(appointmentId: string) {
    void persist(
      {
        ...data,
        appointments: data.appointments.filter((item) => item.id !== appointmentId)
      },
      "Appointment removed."
    );
  }

  return (
    <section className="content-grid">
      <form className="panel form-grid" onSubmit={saveAppointment}>
        <div className="panel-heading">
          <h2>{appointmentDraft.id ? "Edit Appointment" : "New Admin Appointment"}</h2>
          <div className="button-row">
            <button
              className="secondary"
              onClick={() => setAppointmentDraft(emptyAppointment())}
              type="button"
            >
              Clear
            </button>
            <button className="primary" disabled={saving} type="submit">
              <CalendarClock size={16} />
              Save
            </button>
          </div>
        </div>

        <label>
          Contact
          <select
            value={appointmentDraft.contactId}
            onChange={(event) => {
              const contact = data.contacts.find((item) => item.id === event.target.value);
              setAppointmentDraft({
                ...appointmentDraft,
                contactId: event.target.value,
                customerName: contact?.name ?? appointmentDraft.customerName
              });
            }}
          >
            <option value="">Manual customer</option>
            {data.contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Customer name
          <input
            value={appointmentDraft.customerName}
            onChange={(event) =>
              setAppointmentDraft({
                ...appointmentDraft,
                customerName: event.target.value
              })
            }
          />
        </label>
        <label>
          Service/Product
          <select
            value={appointmentDraft.catalogItemId}
            onChange={(event) =>
              setAppointmentDraft({
                ...appointmentDraft,
                catalogItemId: event.target.value
              })
            }
          >
            <option value="">None</option>
            {data.catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Starts at
          <input
            type="datetime-local"
            value={toLocalInputValue(appointmentDraft.startsAt)}
            onChange={(event) =>
              setAppointmentDraft({
                ...appointmentDraft,
                startsAt: fromLocalInputValue(event.target.value)
              })
            }
          />
        </label>
        <label>
          Status
          <select
            value={appointmentDraft.status}
            onChange={(event) =>
              setAppointmentDraft({
                ...appointmentDraft,
                status: event.target.value as AppointmentStatus
              })
            }
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Notes
          <textarea
            value={appointmentDraft.notes}
            onChange={(event) =>
              setAppointmentDraft({ ...appointmentDraft, notes: event.target.value })
            }
          />
        </label>
      </form>

      <section className="panel list-panel">
        <div className="panel-heading">
          <h2>Appointment Requests</h2>
          <span>{data.appointments.length}</span>
        </div>
        <div className="records">
          {data.appointments.map((appointment) => {
            const item = data.catalog.find(
              (catalogItem) => catalogItem.id === appointment.catalogItemId
            );
            return (
              <article className="record" key={appointment.id}>
                <div>
                  <strong>{appointment.customerName}</strong>
                  <span>{formatDateTime(appointment.startsAt)}</span>
                  <small>
                    {[
                      item?.name,
                      appointment.status,
                      appointment.createdBy === "customer" ? "Telegram customer" : ""
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
                <div className="icon-actions">
                  <button
                    aria-label="Edit appointment"
                    onClick={() => setAppointmentDraft(appointment)}
                    type="button"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    aria-label="Delete appointment"
                    onClick={() => deleteAppointment(appointment.id)}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
          {!data.appointments.length ? <p className="empty-state">No appointments yet.</p> : null}
        </div>
      </section>
    </section>
  );
}
