import { sqliteDatabase } from "../db/client";

export type CashBookEntryType = "income" | "expense";

export type CashBookCategory =
  | "sale"
  | "sale_refund"
  | "feed"
  | "transportation"
  | "operations"
  | "electricity"
  | "medicine"
  | "other";

export type CashBookUserRole = "owner" | "cashier";

type CashBookDatabaseRow = {
  id: string;
  type: CashBookEntryType;
  amount: number;
  category: CashBookCategory;
  description: string;
  relatedTransactionId: string | null;
  createdByUserId: string;
  createdByName: string;
  createdByRole: CashBookUserRole;
  entryDate: number;
  createdAt: number;
  updatedAt: number;
};

type CashBookSummaryDatabaseRow = {
  totalIncome: number;
  totalExpense: number;
  entryCount: number;
  incomeEntryCount: number;
  expenseEntryCount: number;
};

export type CashBookEntry = {
  id: string;
  type: CashBookEntryType;
  typeLabel: string;
  amount: number;
  category: CashBookCategory;
  categoryLabel: string;
  description: string;
  relatedTransactionId: string | null;
  createdByUserId: string;
  createdByName: string;
  createdByRole: CashBookUserRole;
  entryDate: number;
  createdAt: number;
  updatedAt: number;
};

export type CashBookSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  entryCount: number;
  incomeEntryCount: number;
  expenseEntryCount: number;
};

export type CashBookDateRange = {
  dateFrom: number;
  dateTo: number;
};

export type GetCashBookEntriesOptions = {
  type?: CashBookEntryType | "all";
  category?: CashBookCategory | "all";
  dateFrom?: number;
  dateTo?: number;
  limit?: number;
};

export type GetCashBookSummaryOptions = {
  dateFrom?: number;
  dateTo?: number;
};

const DEFAULT_ENTRY_LIMIT = 300;
const MAX_ENTRY_LIMIT = 1000;

const EMPTY_SUMMARY: CashBookSummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  entryCount: 0,
  incomeEntryCount: 0,
  expenseEntryCount: 0,
};

function normalizeLimit(requestedLimit?: number): number {
  if (requestedLimit === undefined) {
    return DEFAULT_ENTRY_LIMIT;
  }

  if (!Number.isInteger(requestedLimit) || requestedLimit <= 0) {
    throw new Error(
      "Batas jumlah catatan kas harus berupa bilangan bulat lebih dari nol.",
    );
  }

  return Math.min(requestedLimit, MAX_ENTRY_LIMIT);
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

function validateDateRange(
  dateFrom: number | null,
  dateTo: number | null,
): void {
  if (dateFrom !== null && dateTo !== null && dateFrom > dateTo) {
    throw new Error("Tanggal awal tidak boleh melewati tanggal akhir.");
  }
}

function mapCashBookRow(row: CashBookDatabaseRow): CashBookEntry {
  return {
    id: row.id,
    type: row.type,
    typeLabel: getCashBookTypeLabel(row.type),
    amount: row.amount,
    category: row.category,
    categoryLabel: getCashBookCategoryLabel(row.category),
    description: row.description,
    relatedTransactionId: row.relatedTransactionId,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdByRole: row.createdByRole,
    entryDate: row.entryDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getCashBookTypeLabel(type: CashBookEntryType): string {
  switch (type) {
    case "income":
      return "Pemasukan";

    case "expense":
      return "Pengeluaran";

    default:
      return type;
  }
}

export function getCashBookCategoryLabel(category: CashBookCategory): string {
  switch (category) {
    case "sale":
      return "Penjualan";

    case "sale_refund":
      return "Pengembalian penjualan";

    case "feed":
      return "Pakan";

    case "transportation":
      return "Transportasi";

    case "operations":
      return "Operasional";

    case "electricity":
      return "Listrik";

    case "medicine":
      return "Obat dan kesehatan";

    case "other":
      return "Lainnya";

    default:
      return category;
  }
}

export function getTodayDateRange(
  currentTime: number = Date.now(),
): CashBookDateRange {
  if (!Number.isSafeInteger(currentTime) || currentTime < 0) {
    throw new Error("Waktu hari ini tidak valid.");
  }

  const startDate = new Date(currentTime);

  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate.getTime());

  endDate.setDate(endDate.getDate() + 1);

  return {
    dateFrom: startDate.getTime(),

    dateTo: endDate.getTime() - 1,
  };
}

export function getMonthDateRange(
  currentTime: number = Date.now(),
): CashBookDateRange {
  if (!Number.isSafeInteger(currentTime) || currentTime < 0) {
    throw new Error("Waktu bulan tidak valid.");
  }

  const currentDate = new Date(currentTime);

  const startDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );

  const endDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    1,
    0,
    0,
    0,
    0,
  );

  return {
    dateFrom: startDate.getTime(),

    dateTo: endDate.getTime() - 1,
  };
}

export function getYearDateRange(
  currentTime: number = Date.now(),
): CashBookDateRange {
  if (!Number.isSafeInteger(currentTime) || currentTime < 0) {
    throw new Error("Waktu tahun tidak valid.");
  }

  const currentDate = new Date(currentTime);

  const startDate = new Date(currentDate.getFullYear(), 0, 1, 0, 0, 0, 0);

  const endDate = new Date(currentDate.getFullYear() + 1, 0, 1, 0, 0, 0, 0);

  return {
    dateFrom: startDate.getTime(),

    dateTo: endDate.getTime() - 1,
  };
}

export function getCashBookEntries(
  options: GetCashBookEntriesOptions = {},
): CashBookEntry[] {
  const type = options.type ?? "all";

  const category = options.category ?? "all";

  const dateFrom = normalizeOptionalTimestamp(options.dateFrom, "Tanggal awal");

  const dateTo = normalizeOptionalTimestamp(options.dateTo, "Tanggal akhir");

  const limit = normalizeLimit(options.limit);

  validateDateRange(dateFrom, dateTo);

  const rows = sqliteDatabase.getAllSync<CashBookDatabaseRow>(
    `
        SELECT
          id AS id,
          type AS type,
          amount AS amount,
          category AS category,
          description AS description,

          related_transaction_id
            AS relatedTransactionId,

          created_by_user_id
            AS createdByUserId,

          created_by_name
            AS createdByName,

          created_by_role
            AS createdByRole,

          entry_date
            AS entryDate,

          created_at
            AS createdAt,

          updated_at
            AS updatedAt

        FROM cash_books

        WHERE (
          $type = 'all'
          OR type = $type
        )

        AND (
          $category = 'all'
          OR category = $category
        )

        AND (
          $dateFrom IS NULL
          OR entry_date >= $dateFrom
        )

        AND (
          $dateTo IS NULL
          OR entry_date <= $dateTo
        )

        ORDER BY
          entry_date DESC,
          created_at DESC,
          id DESC

        LIMIT $limit;
      `,
    {
      $type: type,
      $category: category,
      $dateFrom: dateFrom,
      $dateTo: dateTo,
      $limit: limit,
    },
  );

  return rows.map(mapCashBookRow);
}

export function getCashBookSummary(
  options: GetCashBookSummaryOptions = {},
): CashBookSummary {
  const dateFrom = normalizeOptionalTimestamp(options.dateFrom, "Tanggal awal");

  const dateTo = normalizeOptionalTimestamp(options.dateTo, "Tanggal akhir");

  validateDateRange(dateFrom, dateTo);

  const row = sqliteDatabase.getFirstSync<CashBookSummaryDatabaseRow>(
    `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN type = 'income'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS totalIncome,

          COALESCE(
            SUM(
              CASE
                WHEN type = 'expense'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS totalExpense,

          COUNT(*) AS entryCount,

          COALESCE(
            SUM(
              CASE
                WHEN type = 'income'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS incomeEntryCount,

          COALESCE(
            SUM(
              CASE
                WHEN type = 'expense'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS expenseEntryCount

        FROM cash_books

        WHERE (
          $dateFrom IS NULL
          OR entry_date >= $dateFrom
        )

        AND (
          $dateTo IS NULL
          OR entry_date <= $dateTo
        );
      `,
    {
      $dateFrom: dateFrom,
      $dateTo: dateTo,
    },
  );

  if (row === null) {
    return EMPTY_SUMMARY;
  }

  return {
    totalIncome: row.totalIncome,

    totalExpense: row.totalExpense,

    balance: row.totalIncome - row.totalExpense,

    entryCount: row.entryCount,

    incomeEntryCount: row.incomeEntryCount,

    expenseEntryCount: row.expenseEntryCount,
  };
}

export function getTodayCashBookSummary(
  currentTime: number = Date.now(),
): CashBookSummary {
  const dateRange = getTodayDateRange(currentTime);

  return getCashBookSummary(dateRange);
}

export function getMonthCashBookSummary(
  currentTime: number = Date.now(),
): CashBookSummary {
  const dateRange = getMonthDateRange(currentTime);

  return getCashBookSummary(dateRange);
}

export function getYearCashBookSummary(
  currentTime: number = Date.now(),
): CashBookSummary {
  const dateRange = getYearDateRange(currentTime);

  return getCashBookSummary(dateRange);
}
