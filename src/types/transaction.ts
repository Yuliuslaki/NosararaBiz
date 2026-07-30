export const PAYMENT_METHODS = {
  CASH: "cash",
  QRIS: "qris",
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS",
};

export const TRANSACTION_STATUSES = {
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type TransactionStatus =
  (typeof TRANSACTION_STATUSES)[keyof typeof TRANSACTION_STATUSES];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  paid: "Lunas",
  cancelled: "Dibatalkan",
};

export const CANCELLATION_REASONS = {
  WRONG_QUANTITY: "wrong_quantity",
  WRONG_PRODUCT: "wrong_product",
  WRONG_PAYMENT_METHOD: "wrong_payment_method",
  CUSTOMER_CANCELLED: "customer_cancelled",
  OTHER: "other",
} as const;

export type CancellationReason =
  (typeof CANCELLATION_REASONS)[keyof typeof CANCELLATION_REASONS];

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  wrong_quantity: "Salah jumlah barang",
  wrong_product: "Salah memilih produk",
  wrong_payment_method: "Salah metode pembayaran",
  customer_cancelled: "Pelanggan membatalkan pembelian",
  other: "Alasan lainnya",
};
