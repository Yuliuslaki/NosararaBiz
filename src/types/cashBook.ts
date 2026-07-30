export const CASH_BOOK_TYPES = {
  INCOME: "income",
  EXPENSE: "expense",
} as const;

export type CashBookType =
  (typeof CASH_BOOK_TYPES)[keyof typeof CASH_BOOK_TYPES];

export const CASH_BOOK_TYPE_LABELS: Record<CashBookType, string> = {
  income: "Uang Masuk",
  expense: "Uang Keluar",
};

export const CASH_BOOK_CATEGORIES = {
  SALE: "sale",
  SALE_REFUND: "sale_refund",
  FEED: "feed",
  TRANSPORTATION: "transportation",
  OPERATIONS: "operations",
  ELECTRICITY: "electricity",
  MEDICINE: "medicine",
  OTHER: "other",
} as const;

export type CashBookCategory =
  (typeof CASH_BOOK_CATEGORIES)[keyof typeof CASH_BOOK_CATEGORIES];

export const CASH_BOOK_CATEGORY_LABELS: Record<CashBookCategory, string> = {
  sale: "Penjualan",
  sale_refund: "Pembatalan Penjualan",
  feed: "Pakan",
  transportation: "Transportasi",
  operations: "Operasional",
  electricity: "Listrik",
  medicine: "Obat dan Vitamin",
  other: "Lainnya",
};
