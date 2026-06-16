import type { Dispatch, SetStateAction } from "react";
import type { CrmData } from "@/lib/types";

export type PersistCrmData = (nextData: CrmData, message?: string) => Promise<CrmData | null>;

export type CrmViewProps = {
  data: CrmData;
  persist: PersistCrmData;
  saving: boolean;
  setData: Dispatch<SetStateAction<CrmData>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
};

export const nowIso = () => new Date().toISOString();

export const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const splitTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

export const toLocalInputValue = (iso: string) => {
  if (!iso) return "";
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export const fromLocalInputValue = (value: string) => {
  if (!value) return nowIso();
  return new Date(value).toISOString();
};

export const formatDateTime = (iso: string) => {
  if (!iso) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso));
};

export const formatMoney = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value || 0);
