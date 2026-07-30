import { sqliteDatabase } from "../db/client";
import type { ProductCategory, ProductUnit } from "../types/product";
import { formatCurrency } from "../utils/formatters";

export type ReportType = "daily_message" | "pdf" | "excel";

export type ReportDeliveryMode = "automatic" | "manual";

export type ReportDeliveryStatus =
  "pending" | "generated" | "waiting_connection" | "sent" | "failed";

type ReportSettingsDatabaseRow = {
  business_name: string;
  owner_wa_number: string | null;
  daily_whatsapp_enabled: number;
  daily_whatsapp_time: string;
  send_when_online: number;
  updated_at: number;
};

type TransactionReportSummaryDatabaseRow = {
  total_sales: number | null;
  total_transactions: number | null;
  cash_sales: number | null;
  qris_sales: number | null;
  cancelled_transactions: number | null;
};

type CashReportSummaryDatabaseRow = {
  total_income: number | null;
  total_expense: number | null;
};

type SoldProductDatabaseRow = {
  product_id: string;
  product_name: string;
  product_category: ProductCategory;
  base_unit: ProductUnit;
  quantity_in_base_unit: number | null;
  total_sales: number | null;
};

type LowStockProductDatabaseRow = {
  product_id: string;
  product_name: string;
  product_category: ProductCategory;
  base_unit: ProductUnit;
  current_stock: number;
  min_stock_threshold: number;
  rack_size: number | null;
};

type CompleteReportPeriodDatabaseRow = {
  earliest_date: number | null;
};

type ReportDeliveryHistoryDatabaseRow = {
  id: string;
  report_type: ReportType;
  delivery_mode: ReportDeliveryMode;
  period_start: number;
  period_end: number;
  destination_wa_number: string | null;
  file_name: string | null;
  file_uri: string | null;
  status: ReportDeliveryStatus;
  attempt_count: number;
  last_attempt_at: number | null;
  sent_at: number | null;
  error_message: string | null;
  created_by_user_id: string | null;
  created_by_name: string;
  created_by_role: "owner" | "system";
  created_at: number;
  updated_at: number;
};

export type ReportSettings = {
  businessName: string;
  ownerWaNumber: string | null;
  dailyWhatsappEnabled: boolean;
  dailyWhatsappTime: "00:00";
  sendWhenOnline: boolean;
  updatedAt: number;
  hasWhatsappNumber: boolean;
};

export type ReportPeriod = {
  periodStart: number;
  periodEnd: number;
};

export type ReportSoldProduct = {
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  baseUnit: ProductUnit;
  quantityInBaseUnit: number;
  totalSales: number;
};

export type ReportLowStockProduct = {
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  baseUnit: ProductUnit;
  currentStock: number;
  minStockThreshold: number;
  rackSize: number | null;
};

export type BusinessReportSummary = {
  businessName: string;
  periodStart: number;
  periodEnd: number;

  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  qrisSales: number;
  cancelledTransactions: number;

  totalIncome: number;
  totalExpense: number;
  netCashBalance: number;

  soldProducts: ReportSoldProduct[];
  lowStockProducts: ReportLowStockProduct[];
};

export type ReportDeliveryHistoryItem = {
  id: string;
  reportType: ReportType;
  deliveryMode: ReportDeliveryMode;
  periodStart: number;
  periodEnd: number;
  destinationWaNumber: string | null;
  fileName: string | null;
  fileUri: string | null;
  status: ReportDeliveryStatus;
  attemptCount: number;
  lastAttemptAt: number | null;
  sentAt: number | null;
  errorMessage: string | null;
  createdByUserId: string | null;
  createdByName: string;
  createdByRole: "owner" | "system";
  createdAt: number;
  updatedAt: number;
};

export type ReportDashboardSnapshot = {
  settings: ReportSettings;
  previousDaySummary: BusinessReportSummary;
  dailyWhatsappMessagePreview: string;
  recentDeliveryHistory: ReportDeliveryHistoryItem[];
};

const DAILY_WHATSAPP_TIME = "00:00" as const;

const DEFAULT_HISTORY_LIMIT = 30;
const MAX_HISTORY_LIMIT = 200;

function normalizeNonNegativeInteger(value: unknown): number {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }

  return Math.trunc(numericValue);
}

function normalizeTimestamp(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} tidak valid.`);
  }

  return value;
}

function normalizeHistoryLimit(requestedLimit?: number): number {
  if (requestedLimit === undefined) {
    return DEFAULT_HISTORY_LIMIT;
  }

  if (!Number.isInteger(requestedLimit) || requestedLimit <= 0) {
    throw new Error(
      "Batas riwayat laporan harus berupa bilangan bulat lebih dari nol.",
    );
  }

  return Math.min(requestedLimit, MAX_HISTORY_LIMIT);
}

function normalizeWhatsappNumber(value: string): string {
  const normalizedValue = value.trim().replace(/[\s()-]/g, "");

  if (!/^\+?\d{9,15}$/.test(normalizedValue)) {
    throw new Error(
      "Nomor WhatsApp harus terdiri dari 9 sampai 15 angka dan boleh diawali tanda +.",
    );
  }

  return normalizedValue;
}

function ensureReportSettingsRow(): void {
  sqliteDatabase.runSync(`
    INSERT OR IGNORE INTO report_settings (
      id,
      daily_whatsapp_enabled,
      daily_whatsapp_time,
      send_when_online,
      created_at,
      updated_at
    )
    VALUES (
      1,
      0,
      '00:00',
      1,
      (unixepoch() * 1000),
      (unixepoch() * 1000)
    );
  `);
}

function validateReportPeriod(
  periodStart: number,
  periodEnd: number,
): ReportPeriod {
  const normalizedPeriodStart = normalizeTimestamp(
    periodStart,
    "Tanggal awal laporan",
  );

  const normalizedPeriodEnd = normalizeTimestamp(
    periodEnd,
    "Tanggal akhir laporan",
  );

  if (normalizedPeriodStart > normalizedPeriodEnd) {
    throw new Error("Tanggal awal laporan tidak boleh melewati tanggal akhir.");
  }

  return {
    periodStart: normalizedPeriodStart,
    periodEnd: normalizedPeriodEnd,
  };
}

function formatReportDate(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatReportDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getProductQuantityLabel(
  category: ProductCategory,
  baseUnit: ProductUnit,
): string {
  if (category === "eggs") {
    return "butir";
  }

  if (category === "fertilizer") {
    return "karung";
  }

  if (category === "culled_chicken") {
    return "ekor";
  }

  switch (baseUnit) {
    case "rack":
      return "rak";

    case "piece":
      return "unit";

    case "sack":
      return "karung";

    case "head":
      return "ekor";

    default:
      return "unit";
  }
}

function mapReportDeliveryHistoryRow(
  row: ReportDeliveryHistoryDatabaseRow,
): ReportDeliveryHistoryItem {
  return {
    id: row.id,
    reportType: row.report_type,
    deliveryMode: row.delivery_mode,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    destinationWaNumber: row.destination_wa_number,
    fileName: row.file_name,
    fileUri: row.file_uri,
    status: row.status,
    attemptCount: normalizeNonNegativeInteger(row.attempt_count),
    lastAttemptAt: row.last_attempt_at,
    sentAt: row.sent_at,
    errorMessage: row.error_message,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    createdByRole: row.created_by_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getReportSettings(): ReportSettings {
  ensureReportSettingsRow();

  const row = sqliteDatabase.getFirstSync<ReportSettingsDatabaseRow>(`
    SELECT
      app_config.business_name,
      app_config.owner_wa_number,
      report_settings.daily_whatsapp_enabled,
      report_settings.daily_whatsapp_time,
      report_settings.send_when_online,
      report_settings.updated_at

    FROM report_settings

    INNER JOIN app_config
      ON app_config.id = 1

    WHERE report_settings.id = 1

    LIMIT 1;
  `);

  if (row === null) {
    throw new Error(
      "Pengaturan laporan belum tersedia. Pastikan pengaturan awal aplikasi sudah selesai.",
    );
  }

  if (row.daily_whatsapp_time !== DAILY_WHATSAPP_TIME) {
    throw new Error(
      "Waktu laporan harian tidak valid. Waktu yang diizinkan hanya pukul 00.00.",
    );
  }

  const ownerWaNumber =
    row.owner_wa_number === null || row.owner_wa_number.trim().length === 0
      ? null
      : row.owner_wa_number.trim();

  return {
    businessName: row.business_name,
    ownerWaNumber,
    dailyWhatsappEnabled: Number(row.daily_whatsapp_enabled) === 1,
    dailyWhatsappTime: DAILY_WHATSAPP_TIME,
    sendWhenOnline: Number(row.send_when_online) === 1,
    updatedAt: row.updated_at,
    hasWhatsappNumber: ownerWaNumber !== null,
  };
}

export function setDailyWhatsappEnabled(enabled: boolean): ReportSettings {
  if (typeof enabled !== "boolean") {
    throw new Error("Status laporan WhatsApp tidak valid.");
  }

  const currentSettings = getReportSettings();

  if (enabled && !currentSettings.hasWhatsappNumber) {
    throw new Error(
      "Nomor WhatsApp Owner belum diatur. Tambahkan nomor WhatsApp sebelum mengaktifkan laporan harian.",
    );
  }

  sqliteDatabase.runSync(
    `
      UPDATE report_settings

      SET
        daily_whatsapp_enabled = $enabled,
        daily_whatsapp_time = '00:00',
        updated_at = (unixepoch() * 1000)

      WHERE id = 1;
    `,
    {
      $enabled: enabled ? 1 : 0,
    },
  );

  return getReportSettings();
}

export function setSendReportWhenOnline(enabled: boolean): ReportSettings {
  if (typeof enabled !== "boolean") {
    throw new Error("Status pengiriman saat online tidak valid.");
  }

  ensureReportSettingsRow();

  sqliteDatabase.runSync(
    `
      UPDATE report_settings

      SET
        send_when_online = $enabled,
        daily_whatsapp_time = '00:00',
        updated_at = (unixepoch() * 1000)

      WHERE id = 1;
    `,
    {
      $enabled: enabled ? 1 : 0,
    },
  );

  return getReportSettings();
}

export function updateOwnerWhatsappNumber(value: string): ReportSettings {
  const normalizedValue = normalizeWhatsappNumber(value);

  sqliteDatabase.runSync(
    `
      UPDATE app_config

      SET
        owner_wa_number = $ownerWaNumber,
        updated_at = (unixepoch() * 1000)

      WHERE id = 1;
    `,
    {
      $ownerWaNumber: normalizedValue,
    },
  );

  return getReportSettings();
}

export function clearOwnerWhatsappNumber(): ReportSettings {
  const currentSettings = getReportSettings();

  if (currentSettings.dailyWhatsappEnabled) {
    throw new Error(
      "Nonaktifkan laporan WhatsApp harian sebelum menghapus nomor tujuan.",
    );
  }

  sqliteDatabase.runSync(`
    UPDATE app_config

    SET
      owner_wa_number = NULL,
      updated_at = (unixepoch() * 1000)

    WHERE id = 1;
  `);

  return getReportSettings();
}

export function getPreviousDayReportPeriod(
  currentTime: number = Date.now(),
): ReportPeriod {
  const normalizedCurrentTime = normalizeTimestamp(
    currentTime,
    "Waktu laporan",
  );

  const todayStart = new Date(normalizedCurrentTime);

  todayStart.setHours(0, 0, 0, 0);

  const previousDayStart = new Date(todayStart.getTime());

  previousDayStart.setDate(previousDayStart.getDate() - 1);

  return {
    periodStart: previousDayStart.getTime(),
    periodEnd: todayStart.getTime() - 1,
  };
}

export function getCompleteReportPeriod(
  currentTime: number = Date.now(),
): ReportPeriod {
  const normalizedCurrentTime = normalizeTimestamp(
    currentTime,
    "Waktu laporan",
  );

  const row = sqliteDatabase.getFirstSync<CompleteReportPeriodDatabaseRow>(`
      SELECT
        MIN(source_date) AS earliest_date

      FROM (
        SELECT created_at AS source_date
        FROM app_config

        UNION ALL

        SELECT created_at AS source_date
        FROM users

        UNION ALL

        SELECT created_at AS source_date
        FROM products

        UNION ALL

        SELECT transaction_date AS source_date
        FROM transactions

        UNION ALL

        SELECT entry_date AS source_date
        FROM cash_books

        UNION ALL

        SELECT created_at AS source_date
        FROM stock_history
      )

      WHERE source_date IS NOT NULL;
    `);

  const earliestDate =
    row?.earliest_date === null || row?.earliest_date === undefined
      ? normalizedCurrentTime
      : normalizeNonNegativeInteger(row.earliest_date);

  return {
    periodStart: Math.min(earliestDate, normalizedCurrentTime),
    periodEnd: normalizedCurrentTime,
  };
}

export function getBusinessReportSummary(
  periodStart: number,
  periodEnd: number,
): BusinessReportSummary {
  const period = validateReportPeriod(periodStart, periodEnd);

  const settings = getReportSettings();

  const transactionSummary =
    sqliteDatabase.getFirstSync<TransactionReportSummaryDatabaseRow>(
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
          ) AS total_sales,

          COALESCE(
            SUM(
              CASE
                WHEN status = 'paid'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS total_transactions,

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
          ) AS cash_sales,

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
          ) AS qris_sales,

          COALESCE(
            SUM(
              CASE
                WHEN status = 'cancelled'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS cancelled_transactions

        FROM transactions

        WHERE transaction_date >= $periodStart
          AND transaction_date <= $periodEnd;
      `,
      {
        $periodStart: period.periodStart,
        $periodEnd: period.periodEnd,
      },
    );

  const cashSummary = sqliteDatabase.getFirstSync<CashReportSummaryDatabaseRow>(
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
          ) AS total_income,

          COALESCE(
            SUM(
              CASE
                WHEN type = 'expense'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS total_expense

        FROM cash_books

        WHERE entry_date >= $periodStart
          AND entry_date <= $periodEnd;
      `,
    {
      $periodStart: period.periodStart,
      $periodEnd: period.periodEnd,
    },
  );

  const soldProductRows = sqliteDatabase.getAllSync<SoldProductDatabaseRow>(
    `
        SELECT
          transaction_items.product_id,
          transaction_items.product_name,
          transaction_items.product_category,

          COALESCE(
            products.base_unit,
            transaction_items.sale_unit
          ) AS base_unit,

          COALESCE(
            SUM(transaction_items.quantity_in_base_unit),
            0
          ) AS quantity_in_base_unit,

          COALESCE(
            SUM(transaction_items.subtotal),
            0
          ) AS total_sales

        FROM transaction_items

        INNER JOIN transactions
          ON transactions.id
            = transaction_items.transaction_id

        LEFT JOIN products
          ON products.id
            = transaction_items.product_id

        WHERE transactions.status = 'paid'
          AND transactions.transaction_date >= $periodStart
          AND transactions.transaction_date <= $periodEnd

        GROUP BY
          transaction_items.product_id,
          transaction_items.product_name,
          transaction_items.product_category,
          products.base_unit,
          transaction_items.sale_unit

        ORDER BY
          quantity_in_base_unit DESC,
          transaction_items.product_name ASC;
      `,
    {
      $periodStart: period.periodStart,
      $periodEnd: period.periodEnd,
    },
  );

  const lowStockRows = sqliteDatabase.getAllSync<LowStockProductDatabaseRow>(`
      SELECT
        id AS product_id,
        name AS product_name,
        category AS product_category,
        base_unit,
        current_stock,
        min_stock_threshold,
        rack_size

      FROM products

      WHERE is_active = 1
        AND deleted_at IS NULL
        AND current_stock <= min_stock_threshold

      ORDER BY
        current_stock ASC,
        name ASC;
    `);

  const totalSales = normalizeNonNegativeInteger(
    transactionSummary?.total_sales,
  );

  const totalTransactions = normalizeNonNegativeInteger(
    transactionSummary?.total_transactions,
  );

  const cashSales = normalizeNonNegativeInteger(transactionSummary?.cash_sales);

  const qrisSales = normalizeNonNegativeInteger(transactionSummary?.qris_sales);

  const cancelledTransactions = normalizeNonNegativeInteger(
    transactionSummary?.cancelled_transactions,
  );

  const totalIncome = normalizeNonNegativeInteger(cashSummary?.total_income);

  const totalExpense = normalizeNonNegativeInteger(cashSummary?.total_expense);

  return {
    businessName: settings.businessName,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,

    totalSales,
    totalTransactions,
    cashSales,
    qrisSales,
    cancelledTransactions,

    totalIncome,
    totalExpense,
    netCashBalance: totalIncome - totalExpense,

    soldProducts: soldProductRows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      productCategory: row.product_category,
      baseUnit: row.base_unit,
      quantityInBaseUnit: normalizeNonNegativeInteger(
        row.quantity_in_base_unit,
      ),
      totalSales: normalizeNonNegativeInteger(row.total_sales),
    })),

    lowStockProducts: lowStockRows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      productCategory: row.product_category,
      baseUnit: row.base_unit,
      currentStock: normalizeNonNegativeInteger(row.current_stock),
      minStockThreshold: normalizeNonNegativeInteger(row.min_stock_threshold),
      rackSize:
        row.rack_size === null
          ? null
          : normalizeNonNegativeInteger(row.rack_size),
    })),
  };
}

export function getPreviousDayReportSummary(
  currentTime: number = Date.now(),
): BusinessReportSummary {
  const period = getPreviousDayReportPeriod(currentTime);

  return getBusinessReportSummary(period.periodStart, period.periodEnd);
}

export function getCompleteBusinessReportSummary(
  currentTime: number = Date.now(),
): BusinessReportSummary {
  const period = getCompleteReportPeriod(currentTime);

  return getBusinessReportSummary(period.periodStart, period.periodEnd);
}

export function buildDailyWhatsappMessage(
  summary: BusinessReportSummary,
): string {
  const soldProductLines =
    summary.soldProducts.length === 0
      ? ["- Tidak ada produk terjual"]
      : summary.soldProducts.map((product) => {
          const quantityLabel = getProductQuantityLabel(
            product.productCategory,
            product.baseUnit,
          );

          return (
            `- ${product.productName}: ` +
            `${product.quantityInBaseUnit} ${quantityLabel} ` +
            `(${formatCurrency(product.totalSales)})`
          );
        });

  const lowStockLines =
    summary.lowStockProducts.length === 0
      ? ["- Tidak ada stok yang menipis"]
      : summary.lowStockProducts.map((product) => {
          const quantityLabel = getProductQuantityLabel(
            product.productCategory,
            product.baseUnit,
          );

          return (
            `- ${product.productName}: ` +
            `${product.currentStock} ${quantityLabel} tersisa`
          );
        });

  return [
    `LAPORAN HARIAN ${summary.businessName.toUpperCase()}`,
    "",
    `Periode: ${formatReportDate(summary.periodStart)}`,
    `Dibuat: ${formatReportDateTime(summary.periodEnd + 1)}`,
    "",
    "PENJUALAN",
    `Total penjualan: ${formatCurrency(summary.totalSales)}`,
    `Transaksi berhasil: ${summary.totalTransactions}`,
    `Pembayaran tunai: ${formatCurrency(summary.cashSales)}`,
    `Pembayaran QRIS: ${formatCurrency(summary.qrisSales)}`,
    `Transaksi dibatalkan: ${summary.cancelledTransactions}`,
    "",
    "ARUS KAS",
    `Total pemasukan: ${formatCurrency(summary.totalIncome)}`,
    `Total pengeluaran: ${formatCurrency(summary.totalExpense)}`,
    `Saldo bersih kas: ${formatCurrency(summary.netCashBalance)}`,
    "",
    "PRODUK TERJUAL",
    ...soldProductLines,
    "",
    "STOK MENIPIS",
    ...lowStockLines,
  ].join("\n");
}

export function getReportDeliveryHistory(
  requestedLimit?: number,
): ReportDeliveryHistoryItem[] {
  const limit = normalizeHistoryLimit(requestedLimit);

  const rows = sqliteDatabase.getAllSync<ReportDeliveryHistoryDatabaseRow>(
    `
        SELECT
          id,
          report_type,
          delivery_mode,
          period_start,
          period_end,
          destination_wa_number,
          file_name,
          file_uri,
          status,
          attempt_count,
          last_attempt_at,
          sent_at,
          error_message,
          created_by_user_id,
          created_by_name,
          created_by_role,
          created_at,
          updated_at

        FROM report_delivery_history

        ORDER BY
          created_at DESC,
          id DESC

        LIMIT $limit;
      `,
    {
      $limit: limit,
    },
  );

  return rows.map(mapReportDeliveryHistoryRow);
}

export function getReportDashboardSnapshot(
  currentTime: number = Date.now(),
): ReportDashboardSnapshot {
  const settings = getReportSettings();

  const previousDaySummary = getPreviousDayReportSummary(currentTime);

  return {
    settings,
    previousDaySummary,
    dailyWhatsappMessagePreview: buildDailyWhatsappMessage(previousDaySummary),
    recentDeliveryHistory: getReportDeliveryHistory(),
  };
}
