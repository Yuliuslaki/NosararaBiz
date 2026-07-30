import { sqliteDatabase } from "../db/client";
import type { ProductCategory, ProductUnit } from "../types/product";

export type StockChangeType =
  | "initial_stock"
  | "manual_correction"
  | "sale"
  | "sale_cancellation"
  | "stock_in"
  | "stock_out"
  | string;

type StockHistoryDatabaseRow = {
  id: string;
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  productBaseUnit: ProductUnit;
  productRackSize: number | null;
  changeType: StockChangeType;
  quantityChange: number;
  resultingStock: number;
  note: string | null;
  referenceType: string | null;
  referenceId: string | null;
  performedByUserId: string | null;
  performedByName: string;
  performedByRole: "owner" | "cashier";
  createdAt: number;
};

type StockHistorySummaryDatabaseRow = {
  totalRecords: number;
  stockInRecords: number;
  stockOutRecords: number;
  neutralRecords: number;
};

export type StockHistoryItem = {
  id: string;
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  productBaseUnit: ProductUnit;
  productRackSize: number | null;
  changeType: StockChangeType;
  changeTypeLabel: string;
  quantityChange: number;
  resultingStock: number;
  note: string | null;
  referenceType: string | null;
  referenceId: string | null;
  performedByUserId: string | null;
  performedByName: string;
  performedByRole: "owner" | "cashier";
  createdAt: number;
  direction: "in" | "out" | "neutral";
};

export type StockHistorySummary = {
  totalRecords: number;
  stockInRecords: number;
  stockOutRecords: number;
  neutralRecords: number;
};

export type GetStockHistoryOptions = {
  productId?: string;
  limit?: number;
};

const DEFAULT_HISTORY_LIMIT = 200;
const MAX_HISTORY_LIMIT = 500;

function normalizeLimit(requestedLimit?: number): number {
  if (requestedLimit === undefined) {
    return DEFAULT_HISTORY_LIMIT;
  }

  if (!Number.isInteger(requestedLimit) || requestedLimit <= 0) {
    throw new Error(
      "Batas jumlah riwayat harus berupa bilangan bulat lebih dari nol.",
    );
  }

  return Math.min(requestedLimit, MAX_HISTORY_LIMIT);
}

export function getStockChangeTypeLabel(changeType: StockChangeType): string {
  switch (changeType) {
    case "initial_stock":
      return "Stok awal";

    case "manual_correction":
      return "Koreksi stok";

    case "sale":
      return "Penjualan";

    case "sale_cancellation":
      return "Pembatalan penjualan";

    case "stock_in":
      return "Stok masuk";

    case "stock_out":
      return "Stok keluar";

    default:
      return changeType
        .split("_")
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
  }
}

function getStockDirection(
  quantityChange: number,
): StockHistoryItem["direction"] {
  if (quantityChange > 0) {
    return "in";
  }

  if (quantityChange < 0) {
    return "out";
  }

  return "neutral";
}

function mapStockHistoryRow(row: StockHistoryDatabaseRow): StockHistoryItem {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    productCategory: row.productCategory,
    productBaseUnit: row.productBaseUnit,
    productRackSize: row.productRackSize,
    changeType: row.changeType,
    changeTypeLabel: getStockChangeTypeLabel(row.changeType),
    quantityChange: row.quantityChange,
    resultingStock: row.resultingStock,
    note: row.note,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    performedByUserId: row.performedByUserId,
    performedByName: row.performedByName,
    performedByRole: row.performedByRole,
    createdAt: row.createdAt,
    direction: getStockDirection(row.quantityChange),
  };
}

export function getStockHistory(
  options: GetStockHistoryOptions = {},
): StockHistoryItem[] {
  const limit = normalizeLimit(options.limit);

  const productId = options.productId?.trim() ?? "";

  const rows = sqliteDatabase.getAllSync<StockHistoryDatabaseRow>(
    `
        SELECT
          stock_history.id AS id,
          stock_history.product_id AS productId,
          products.name AS productName,
          products.category AS productCategory,
          products.base_unit AS productBaseUnit,
          products.rack_size AS productRackSize,
          stock_history.change_type AS changeType,
          stock_history.quantity_change AS quantityChange,
          stock_history.resulting_stock AS resultingStock,
          stock_history.note AS note,
          stock_history.reference_type AS referenceType,
          stock_history.reference_id AS referenceId,
          stock_history.performed_by_user_id AS performedByUserId,
          stock_history.performed_by_name AS performedByName,
          stock_history.performed_by_role AS performedByRole,
          stock_history.created_at AS createdAt
        FROM stock_history
        INNER JOIN products
          ON products.id =
            stock_history.product_id
        WHERE (
          $productId = ''
          OR stock_history.product_id =
            $productId
        )
        ORDER BY
          stock_history.created_at DESC,
          stock_history.id DESC
        LIMIT $limit;
      `,
    {
      $productId: productId,
      $limit: limit,
    },
  );

  return rows.map(mapStockHistoryRow);
}

export function getStockHistoryByProduct(
  productId: string,
  limit?: number,
): StockHistoryItem[] {
  const normalizedProductId = productId.trim();

  if (normalizedProductId.length === 0) {
    throw new Error("ID produk wajib diisi.");
  }

  return getStockHistory({
    productId: normalizedProductId,
    limit,
  });
}

export function getStockHistorySummary(): StockHistorySummary {
  const row = sqliteDatabase.getFirstSync<StockHistorySummaryDatabaseRow>(
    `
        SELECT
          COUNT(*) AS totalRecords,

          COALESCE(
            SUM(
              CASE
                WHEN quantity_change > 0
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS stockInRecords,

          COALESCE(
            SUM(
              CASE
                WHEN quantity_change < 0
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS stockOutRecords,

          COALESCE(
            SUM(
              CASE
                WHEN quantity_change = 0
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS neutralRecords
        FROM stock_history;
      `,
  );

  if (row === null) {
    return {
      totalRecords: 0,
      stockInRecords: 0,
      stockOutRecords: 0,
      neutralRecords: 0,
    };
  }

  return {
    totalRecords: row.totalRecords,
    stockInRecords: row.stockInRecords,
    stockOutRecords: row.stockOutRecords,
    neutralRecords: row.neutralRecords,
  };
}
