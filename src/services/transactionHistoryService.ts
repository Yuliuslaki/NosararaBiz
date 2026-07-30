import { sqliteDatabase } from "../db/client";
import type { ProductCategory, ProductUnit } from "../types/product";

export type TransactionPaymentMethod = "cash" | "qris";

export type TransactionStatus = "paid" | "cancelled";

export type TransactionUserRole = "owner" | "cashier";

export type TransactionCancellationReason =
  | "wrong_quantity"
  | "wrong_product"
  | "wrong_payment_method"
  | "customer_cancelled"
  | "other";

type TransactionHistoryDatabaseRow = {
  id: string;
  transactionNumber: string;
  transactionDate: number;
  paymentMethod: TransactionPaymentMethod;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
  status: TransactionStatus;
  createdByUserId: string;
  createdByName: string;
  createdByRole: TransactionUserRole;
  cancelledByUserId: string | null;
  cancelledByName: string | null;
  cancelledByRole: TransactionUserRole | null;
  cancelledAt: number | null;
  cancellationReason: TransactionCancellationReason | null;
  cancellationNote: string | null;
  createdAt: number;
  updatedAt: number;
  itemCount: number;
};

type TransactionItemDatabaseRow = {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  saleUnit: ProductUnit;
  quantity: number;
  quantityInBaseUnit: number;
  unitPrice: number;
  subtotal: number;
  rackSizeSnapshot: number | null;
  createdAt: number;
};

type TodayTransactionSummaryDatabaseRow = {
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  qrisSales: number;
  cancelledTransactions: number;
};

export type TransactionHistoryItem = {
  id: string;
  transactionNumber: string;
  transactionDate: number;
  paymentMethod: TransactionPaymentMethod;
  paymentMethodLabel: string;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
  status: TransactionStatus;
  statusLabel: string;
  createdByUserId: string;
  createdByName: string;
  createdByRole: TransactionUserRole;
  cancelledByUserId: string | null;
  cancelledByName: string | null;
  cancelledByRole: TransactionUserRole | null;
  cancelledAt: number | null;
  cancellationReason: TransactionCancellationReason | null;
  cancellationReasonLabel: string | null;
  cancellationNote: string | null;
  createdAt: number;
  updatedAt: number;
  itemCount: number;
};

export type TransactionDetailItem = {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  saleUnit: ProductUnit;
  quantity: number;
  quantityInBaseUnit: number;
  unitPrice: number;
  subtotal: number;
  rackSizeSnapshot: number | null;
  createdAt: number;
};

export type TransactionDetail = TransactionHistoryItem & {
  items: TransactionDetailItem[];
};

export type TodayTransactionSummary = {
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  qrisSales: number;
  cancelledTransactions: number;
};

export type GetTransactionHistoryOptions = {
  status?: TransactionStatus | "all";
  limit?: number;
  dateFrom?: number;
  dateTo?: number;
};

const DEFAULT_HISTORY_LIMIT = 200;
const MAX_HISTORY_LIMIT = 500;

function normalizeLimit(requestedLimit?: number): number {
  if (requestedLimit === undefined) {
    return DEFAULT_HISTORY_LIMIT;
  }

  if (!Number.isInteger(requestedLimit) || requestedLimit <= 0) {
    throw new Error(
      "Batas jumlah transaksi harus berupa bilangan bulat lebih dari nol.",
    );
  }

  return Math.min(requestedLimit, MAX_HISTORY_LIMIT);
}

function normalizeOptionalTimestamp(
  value: number | undefined,
  label: string,
): number | null {
  if (value === undefined) {
    return null;
  }

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} tidak valid.`);
  }

  return value;
}

export function getTransactionPaymentMethodLabel(
  paymentMethod: TransactionPaymentMethod,
): string {
  switch (paymentMethod) {
    case "cash":
      return "Tunai";

    case "qris":
      return "QRIS";

    default:
      return paymentMethod;
  }
}

export function getTransactionStatusLabel(status: TransactionStatus): string {
  switch (status) {
    case "paid":
      return "Berhasil";

    case "cancelled":
      return "Dibatalkan";

    default:
      return status;
  }
}

export function getTransactionCancellationReasonLabel(
  reason: TransactionCancellationReason,
): string {
  switch (reason) {
    case "wrong_quantity":
      return "Jumlah produk salah";

    case "wrong_product":
      return "Produk salah";

    case "wrong_payment_method":
      return "Metode pembayaran salah";

    case "customer_cancelled":
      return "Dibatalkan pelanggan";

    case "other":
      return "Alasan lainnya";

    default:
      return reason;
  }
}

function mapTransactionHistoryRow(
  row: TransactionHistoryDatabaseRow,
): TransactionHistoryItem {
  return {
    id: row.id,
    transactionNumber: row.transactionNumber,
    transactionDate: row.transactionDate,
    paymentMethod: row.paymentMethod,
    paymentMethodLabel: getTransactionPaymentMethodLabel(row.paymentMethod),
    totalAmount: row.totalAmount,
    amountPaid: row.amountPaid,
    changeAmount: row.changeAmount,
    status: row.status,
    statusLabel: getTransactionStatusLabel(row.status),
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdByRole: row.createdByRole,
    cancelledByUserId: row.cancelledByUserId,
    cancelledByName: row.cancelledByName,
    cancelledByRole: row.cancelledByRole,
    cancelledAt: row.cancelledAt,
    cancellationReason: row.cancellationReason,
    cancellationReasonLabel:
      row.cancellationReason === null
        ? null
        : getTransactionCancellationReasonLabel(row.cancellationReason),
    cancellationNote: row.cancellationNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    itemCount: row.itemCount,
  };
}

function mapTransactionItemRow(
  row: TransactionItemDatabaseRow,
): TransactionDetailItem {
  return {
    id: row.id,
    transactionId: row.transactionId,
    productId: row.productId,
    productName: row.productName,
    productCategory: row.productCategory,
    saleUnit: row.saleUnit,
    quantity: row.quantity,
    quantityInBaseUnit: row.quantityInBaseUnit,
    unitPrice: row.unitPrice,
    subtotal: row.subtotal,
    rackSizeSnapshot: row.rackSizeSnapshot,
    createdAt: row.createdAt,
  };
}

function getTransactionRowById(
  transactionId: string,
): TransactionHistoryDatabaseRow | null {
  return sqliteDatabase.getFirstSync<TransactionHistoryDatabaseRow>(
    `
      SELECT
        transactions.id AS id,

        transactions.transaction_number
          AS transactionNumber,

        transactions.transaction_date
          AS transactionDate,

        transactions.payment_method
          AS paymentMethod,

        transactions.total_amount
          AS totalAmount,

        transactions.amount_paid
          AS amountPaid,

        transactions.change_amount
          AS changeAmount,

        transactions.status
          AS status,

        transactions.created_by_user_id
          AS createdByUserId,

        transactions.created_by_name
          AS createdByName,

        transactions.created_by_role
          AS createdByRole,

        transactions.cancelled_by_user_id
          AS cancelledByUserId,

        transactions.cancelled_by_name
          AS cancelledByName,

        transactions.cancelled_by_role
          AS cancelledByRole,

        transactions.cancelled_at
          AS cancelledAt,

        transactions.cancellation_reason
          AS cancellationReason,

        transactions.cancellation_note
          AS cancellationNote,

        transactions.created_at
          AS createdAt,

        transactions.updated_at
          AS updatedAt,

        (
          SELECT COUNT(*)
          FROM transaction_items
          WHERE
            transaction_items.transaction_id
              = transactions.id
        ) AS itemCount

      FROM transactions

      WHERE transactions.id
        = $transactionId

      LIMIT 1;
    `,
    {
      $transactionId: transactionId,
    },
  );
}

export function getTransactionHistory(
  options: GetTransactionHistoryOptions = {},
): TransactionHistoryItem[] {
  const limit = normalizeLimit(options.limit);

  const status = options.status ?? "all";

  const dateFrom = normalizeOptionalTimestamp(options.dateFrom, "Tanggal awal");

  const dateTo = normalizeOptionalTimestamp(options.dateTo, "Tanggal akhir");

  if (dateFrom !== null && dateTo !== null && dateFrom > dateTo) {
    throw new Error("Tanggal awal tidak boleh melewati tanggal akhir.");
  }

  const rows = sqliteDatabase.getAllSync<TransactionHistoryDatabaseRow>(
    `
        SELECT
          transactions.id AS id,

          transactions.transaction_number
            AS transactionNumber,

          transactions.transaction_date
            AS transactionDate,

          transactions.payment_method
            AS paymentMethod,

          transactions.total_amount
            AS totalAmount,

          transactions.amount_paid
            AS amountPaid,

          transactions.change_amount
            AS changeAmount,

          transactions.status
            AS status,

          transactions.created_by_user_id
            AS createdByUserId,

          transactions.created_by_name
            AS createdByName,

          transactions.created_by_role
            AS createdByRole,

          transactions.cancelled_by_user_id
            AS cancelledByUserId,

          transactions.cancelled_by_name
            AS cancelledByName,

          transactions.cancelled_by_role
            AS cancelledByRole,

          transactions.cancelled_at
            AS cancelledAt,

          transactions.cancellation_reason
            AS cancellationReason,

          transactions.cancellation_note
            AS cancellationNote,

          transactions.created_at
            AS createdAt,

          transactions.updated_at
            AS updatedAt,

          (
            SELECT COUNT(*)
            FROM transaction_items
            WHERE
              transaction_items.transaction_id
                = transactions.id
          ) AS itemCount

        FROM transactions

        WHERE (
          $status = 'all'
          OR transactions.status
            = $status
        )

        AND (
          $dateFrom IS NULL
          OR transactions.transaction_date
            >= $dateFrom
        )

        AND (
          $dateTo IS NULL
          OR transactions.transaction_date
            <= $dateTo
        )

        ORDER BY
          transactions.transaction_date DESC,
          transactions.id DESC

        LIMIT $limit;
      `,
    {
      $status: status,
      $dateFrom: dateFrom,
      $dateTo: dateTo,
      $limit: limit,
    },
  );

  return rows.map(mapTransactionHistoryRow);
}

export function getTransactionDetail(transactionId: string): TransactionDetail {
  const normalizedTransactionId = transactionId.trim();

  if (normalizedTransactionId.length === 0) {
    throw new Error("ID transaksi wajib diisi.");
  }

  const transactionRow = getTransactionRowById(normalizedTransactionId);

  if (transactionRow === null) {
    throw new Error("Transaksi tidak ditemukan.");
  }

  const itemRows = sqliteDatabase.getAllSync<TransactionItemDatabaseRow>(
    `
        SELECT
          id AS id,
          transaction_id
            AS transactionId,
          product_id AS productId,
          product_name AS productName,
          product_category
            AS productCategory,
          sale_unit AS saleUnit,
          quantity AS quantity,
          quantity_in_base_unit
            AS quantityInBaseUnit,
          unit_price AS unitPrice,
          subtotal AS subtotal,
          rack_size_snapshot
            AS rackSizeSnapshot,
          created_at AS createdAt

        FROM transaction_items

        WHERE transaction_id
          = $transactionId

        ORDER BY
          created_at ASC,
          id ASC;
      `,
    {
      $transactionId: normalizedTransactionId,
    },
  );

  return {
    ...mapTransactionHistoryRow(transactionRow),

    items: itemRows.map(mapTransactionItemRow),
  };
}

export function getTodayTransactionSummary(
  currentTime: number = Date.now(),
): TodayTransactionSummary {
  if (!Number.isSafeInteger(currentTime) || currentTime < 0) {
    throw new Error("Waktu ringkasan transaksi tidak valid.");
  }

  const startDate = new Date(currentTime);

  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate.getTime());

  endDate.setDate(endDate.getDate() + 1);

  const row = sqliteDatabase.getFirstSync<TodayTransactionSummaryDatabaseRow>(
    `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN status = 'paid'
                THEN total_amount
                ELSE 0
              END
            ),
            0
          ) AS totalSales,

          COALESCE(
            SUM(
              CASE
                WHEN status = 'paid'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS totalTransactions,

          COALESCE(
            SUM(
              CASE
                WHEN status = 'paid'
                  AND payment_method = 'cash'
                THEN total_amount
                ELSE 0
              END
            ),
            0
          ) AS cashSales,

          COALESCE(
            SUM(
              CASE
                WHEN status = 'paid'
                  AND payment_method = 'qris'
                THEN total_amount
                ELSE 0
              END
            ),
            0
          ) AS qrisSales,

          COALESCE(
            SUM(
              CASE
                WHEN status = 'cancelled'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS cancelledTransactions

        FROM transactions

        WHERE transaction_date
          >= $startDate

        AND transaction_date
          < $endDate;
      `,
    {
      $startDate: startDate.getTime(),

      $endDate: endDate.getTime(),
    },
  );

  if (row === null) {
    return {
      totalSales: 0,
      totalTransactions: 0,
      cashSales: 0,
      qrisSales: 0,
      cancelledTransactions: 0,
    };
  }

  return {
    totalSales: row.totalSales,
    totalTransactions: row.totalTransactions,
    cashSales: row.cashSales,
    qrisSales: row.qrisSales,
    cancelledTransactions: row.cancelledTransactions,
  };
}
