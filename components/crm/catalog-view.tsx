"use client";

import { Package, Pencil, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import type { CatalogItem, CatalogType } from "@/lib/types";
import type { CrmViewProps } from "./shared";
import { formatMoney, makeId, nowIso } from "./shared";

const typeOptions: CatalogType[] = ["service", "product"];

const emptyCatalogItem = (): CatalogItem => ({
  id: "",
  type: "service",
  name: "",
  description: "",
  price: 0,
  durationMinutes: 30,
  active: true,
  createdAt: "",
  updatedAt: ""
});

export function CatalogView({ data, persist, saving, setNotice }: CrmViewProps) {
  const [catalogDraft, setCatalogDraft] = useState<CatalogItem>(emptyCatalogItem());

  function saveCatalogItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = nowIso();
    const item: CatalogItem = {
      ...catalogDraft,
      id: catalogDraft.id || makeId(),
      name: catalogDraft.name.trim(),
      description: catalogDraft.description.trim(),
      price: Number(catalogDraft.price) || 0,
      durationMinutes: Number(catalogDraft.durationMinutes) || 0,
      createdAt: catalogDraft.createdAt || now,
      updatedAt: now
    };

    if (!item.name) {
      setNotice("Catalog name is required.");
      return;
    }

    const catalog = catalogDraft.id
      ? data.catalog.map((entry) => (entry.id === item.id ? item : entry))
      : [item, ...data.catalog];

    void persist({ ...data, catalog }, "Catalog item saved.");
    setCatalogDraft(emptyCatalogItem());
  }

  function deleteCatalogItem(itemId: string) {
    void persist(
      { ...data, catalog: data.catalog.filter((item) => item.id !== itemId) },
      "Catalog item removed."
    );
  }

  return (
    <section className="content-grid">
      <form className="panel form-grid" onSubmit={saveCatalogItem}>
        <div className="panel-heading">
          <h2>{catalogDraft.id ? "Edit Catalog" : "New Catalog"}</h2>
          <div className="button-row">
            <button className="secondary" onClick={() => setCatalogDraft(emptyCatalogItem())} type="button">
              Clear
            </button>
            <button className="primary" disabled={saving} type="submit">
              <Package size={16} />
              Save
            </button>
          </div>
        </div>

        <label>
          Type
          <select
            value={catalogDraft.type}
            onChange={(event) =>
              setCatalogDraft({ ...catalogDraft, type: event.target.value as CatalogType })
            }
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name
          <input
            value={catalogDraft.name}
            onChange={(event) => setCatalogDraft({ ...catalogDraft, name: event.target.value })}
          />
        </label>
        <label>
          Price
          <input
            min="0"
            step="0.01"
            type="number"
            value={catalogDraft.price}
            onChange={(event) =>
              setCatalogDraft({ ...catalogDraft, price: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Duration minutes
          <input
            min="0"
            type="number"
            value={catalogDraft.durationMinutes}
            onChange={(event) =>
              setCatalogDraft({
                ...catalogDraft,
                durationMinutes: Number(event.target.value)
              })
            }
          />
        </label>
        <label className="switch-line">
          <input
            checked={catalogDraft.active}
            onChange={(event) =>
              setCatalogDraft({ ...catalogDraft, active: event.target.checked })
            }
            type="checkbox"
          />
          Active
        </label>
        <label className="wide">
          Description
          <textarea
            value={catalogDraft.description}
            onChange={(event) =>
              setCatalogDraft({ ...catalogDraft, description: event.target.value })
            }
          />
        </label>
      </form>

      <section className="panel list-panel">
        <div className="panel-heading">
          <h2>Catalog List</h2>
          <span>{data.catalog.length}</span>
        </div>
        <div className="records">
          {data.catalog.map((item) => (
            <article className="record" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.type} · {formatMoney(item.price)}
                  {item.type === "service" ? ` · ${item.durationMinutes} min` : ""}
                </span>
                <small>{item.active ? "Active" : "Inactive"}</small>
              </div>
              <div className="icon-actions">
                <button aria-label="Edit catalog item" onClick={() => setCatalogDraft(item)} type="button">
                  <Pencil size={16} />
                </button>
                <button
                  aria-label="Delete catalog item"
                  onClick={() => deleteCatalogItem(item.id)}
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {!data.catalog.length ? <p className="empty-state">No catalog items yet.</p> : null}
        </div>
      </section>
    </section>
  );
}
