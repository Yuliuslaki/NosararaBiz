import { APP_LANGUAGE, CURRENCY_CODE } from "../constants/app";

export type DateInput = Date | string | number;

function normalizeDate(value: DateInput): Date {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Tanggal atau waktu tidak valid.");
  }

  return date;
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError("Nilai uang harus berupa angka yang valid.");
  }

  return new Intl.NumberFormat(APP_LANGUAGE, {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: DateInput): string {
  const date = normalizeDate(value);

  return new Intl.DateTimeFormat(APP_LANGUAGE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(value: DateInput): string {
  const date = normalizeDate(value);

  return new Intl.DateTimeFormat(APP_LANGUAGE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatTime(value: DateInput): string {
  const date = normalizeDate(value);

  return new Intl.DateTimeFormat(APP_LANGUAGE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(".", ":");
}

export function formatDateTime(value: DateInput): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}
