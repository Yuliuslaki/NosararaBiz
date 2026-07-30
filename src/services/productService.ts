import * as Crypto from "expo-crypto";

import { DEFAULT_EGG_RACK_SIZE } from "../constants/app";
import { sqliteDatabase } from "../db/client";
import type { ProductCategory, ProductUnit } from "../types/product";
import type { AuthenticatedUser } from "./authService";

type ProductDatabaseRow = {
  id: string;
  name: string;
  category: ProductCategory;
  baseUnit: ProductUnit;
  pricePerBaseUnit: number;
  pricePerRack: number | null;
  currentStock: number;
  minStockThreshold: number;
  rackSize: number | null;
  isActive: number;
  createdAt: number;
  updatedAt: number;
};

type ExistingProductRow = {
  id: string;
};

export type ProductListItem = {
  id: string;
  name: string;
  category: ProductCategory;
  baseUnit: ProductUnit;
  pricePerBaseUnit: number;
  pricePerRack: number | null;
  currentStock: number;
  minStockThreshold: number;
  rackSize: number | null;
  isActive: boolean;
  isLowStock: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ProductSummary = {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
};

export type CreateProductInput = {
  name: string;
  category: ProductCategory;
  baseUnit: ProductUnit;
  pricePerBaseUnit: number;
  pricePerRack?: number | null;
  initialStock: number;
  minStockThreshold: number;
  rackSize?: number | null;
  performedBy: AuthenticatedUser;
};

export type CreateProductResult = {
  productId: string;
};

export type UpdateProductInput = {
  productId: string;
  pricePerBaseUnit: number;
  pricePerRack?: number | null;
  currentStock: number;
  minStockThreshold: number;
  rackSize?: number | null;
  performedBy: AuthenticatedUser;
};

export type UpdateProductResult = {
  productId: string;
  stockDifference: number;
};

export type DeactivateProductResult = {
  productId: string;
};

const MIN_PRODUCT_NAME_LENGTH = 2;
const MAX_PRODUCT_NAME_LENGTH = 100;

function mapProductRow(row: ProductDatabaseRow): ProductListItem {
  const isActive = row.isActive === 1;

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    baseUnit: row.baseUnit,
    pricePerBaseUnit: row.pricePerBaseUnit,
    pricePerRack: row.pricePerRack,
    currentStock: row.currentStock,
    minStockThreshold: row.minStockThreshold,
    rackSize: row.rackSize,
    isActive,
    isLowStock: isActive && row.currentStock <= row.minStockThreshold,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizeProductName(name: string): string {
  const normalizedName = name.trim().replace(/\s+/g, " ");

  if (normalizedName.length < MIN_PRODUCT_NAME_LENGTH) {
    throw new Error(`Nama produk minimal ${MIN_PRODUCT_NAME_LENGTH} karakter.`);
  }

  if (normalizedName.length > MAX_PRODUCT_NAME_LENGTH) {
    throw new Error(
      `Nama produk maksimal ${MAX_PRODUCT_NAME_LENGTH} karakter.`,
    );
  }

  return normalizedName;
}

function validateNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} harus berupa bilangan bulat nol atau lebih.`);
  }
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} harus berupa bilangan bulat lebih dari nol.`);
  }
}

function validateCreateConfiguration(input: CreateProductInput): {
  baseUnit: ProductUnit;
  pricePerRack: number | null;
  rackSize: number | null;
} {
  validateNonNegativeInteger(input.pricePerBaseUnit, "Harga produk");

  validateNonNegativeInteger(input.initialStock, "Stok awal");

  validateNonNegativeInteger(input.minStockThreshold, "Batas minimum stok");

  if (input.category === "eggs") {
    if (input.baseUnit !== "piece") {
      throw new Error("Satuan dasar produk telur harus berupa butir.");
    }

    const rackSize = input.rackSize ?? DEFAULT_EGG_RACK_SIZE;

    validatePositiveInteger(rackSize, "Jumlah butir per rak");

    if (input.pricePerRack === undefined || input.pricePerRack === null) {
      throw new Error("Harga telur per rak wajib diisi.");
    }

    validateNonNegativeInteger(input.pricePerRack, "Harga telur per rak");

    return {
      baseUnit: "piece",
      pricePerRack: input.pricePerRack,
      rackSize,
    };
  }

  if (input.pricePerRack !== undefined && input.pricePerRack !== null) {
    throw new Error("Harga per rak hanya dapat digunakan untuk produk telur.");
  }

  if (input.rackSize !== undefined && input.rackSize !== null) {
    throw new Error(
      "Jumlah butir per rak hanya dapat digunakan untuk produk telur.",
    );
  }

  if (input.category === "fertilizer" && input.baseUnit !== "sack") {
    throw new Error("Satuan produk pupuk kandang harus berupa karung.");
  }

  if (input.category === "culled_chicken" && input.baseUnit !== "head") {
    throw new Error("Satuan produk ayam afkir harus berupa ekor.");
  }

  return {
    baseUnit: input.baseUnit,
    pricePerRack: null,
    rackSize: null,
  };
}

function validateUpdateConfiguration(
  product: ProductListItem,
  input: UpdateProductInput,
): {
  pricePerRack: number | null;
  rackSize: number | null;
} {
  validateNonNegativeInteger(input.pricePerBaseUnit, "Harga produk");

  validateNonNegativeInteger(input.currentStock, "Stok produk");

  validateNonNegativeInteger(input.minStockThreshold, "Batas minimum stok");

  if (product.category === "eggs") {
    const rackSize =
      input.rackSize ?? product.rackSize ?? DEFAULT_EGG_RACK_SIZE;

    validatePositiveInteger(rackSize, "Jumlah butir per rak");

    if (input.pricePerRack === undefined || input.pricePerRack === null) {
      throw new Error("Harga telur per rak wajib diisi.");
    }

    validateNonNegativeInteger(input.pricePerRack, "Harga telur per rak");

    return {
      pricePerRack: input.pricePerRack,
      rackSize,
    };
  }

  if (input.pricePerRack !== undefined && input.pricePerRack !== null) {
    throw new Error("Harga per rak hanya dapat digunakan untuk produk telur.");
  }

  if (input.rackSize !== undefined && input.rackSize !== null) {
    throw new Error(
      "Jumlah butir per rak hanya dapat digunakan untuk produk telur.",
    );
  }

  return {
    pricePerRack: null,
    rackSize: null,
  };
}

export function getProducts(): ProductListItem[] {
  const rows = sqliteDatabase.getAllSync<ProductDatabaseRow>(`
      SELECT
        id,
        name,
        category,
        base_unit AS baseUnit,
        price_per_base_unit AS pricePerBaseUnit,
        price_per_rack AS pricePerRack,
        current_stock AS currentStock,
        min_stock_threshold AS minStockThreshold,
        rack_size AS rackSize,
        is_active AS isActive,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM products
      WHERE deleted_at IS NULL
      ORDER BY
        is_active DESC,
        name COLLATE NOCASE ASC;
    `);

  return rows.map(mapProductRow);
}

export function getActiveProducts(): ProductListItem[] {
  const rows = sqliteDatabase.getAllSync<ProductDatabaseRow>(`
      SELECT
        id,
        name,
        category,
        base_unit AS baseUnit,
        price_per_base_unit AS pricePerBaseUnit,
        price_per_rack AS pricePerRack,
        current_stock AS currentStock,
        min_stock_threshold AS minStockThreshold,
        rack_size AS rackSize,
        is_active AS isActive,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM products
      WHERE deleted_at IS NULL
        AND is_active = 1
      ORDER BY name COLLATE NOCASE ASC;
    `);

  return rows.map(mapProductRow);
}

export function getProductById(productId: string): ProductListItem | null {
  const row = sqliteDatabase.getFirstSync<ProductDatabaseRow>(
    `
        SELECT
          id,
          name,
          category,
          base_unit AS baseUnit,
          price_per_base_unit AS pricePerBaseUnit,
          price_per_rack AS pricePerRack,
          current_stock AS currentStock,
          min_stock_threshold AS minStockThreshold,
          rack_size AS rackSize,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM products
        WHERE id = $productId
          AND deleted_at IS NULL
        LIMIT 1;
      `,
    {
      $productId: productId,
    },
  );

  return row === null ? null : mapProductRow(row);
}

export function getProductSummary(): ProductSummary {
  const products = getProducts();

  return {
    totalProducts: products.length,

    activeProducts: products.filter((product) => product.isActive).length,

    inactiveProducts: products.filter((product) => !product.isActive).length,

    lowStockProducts: products.filter((product) => product.isLowStock).length,
  };
}

export function createProduct(input: CreateProductInput): CreateProductResult {
  const productName = normalizeProductName(input.name);

  const configuration = validateCreateConfiguration(input);

  const productId = Crypto.randomUUID();
  const stockHistoryId = Crypto.randomUUID();
  const now = Date.now();

  sqliteDatabase.withTransactionSync(() => {
    const existingProduct = sqliteDatabase.getFirstSync<ExistingProductRow>(
      `
            SELECT id
            FROM products
            WHERE lower(name) =
              lower($productName)
              AND deleted_at IS NULL
            LIMIT 1;
          `,
      {
        $productName: productName,
      },
    );

    if (existingProduct !== null) {
      throw new Error("Nama produk sudah digunakan. Gunakan nama produk lain.");
    }

    sqliteDatabase.runSync(
      `
          INSERT INTO products (
            id,
            name,
            category,
            base_unit,
            price_per_base_unit,
            price_per_rack,
            current_stock,
            min_stock_threshold,
            rack_size,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            $id,
            $name,
            $category,
            $baseUnit,
            $pricePerBaseUnit,
            $pricePerRack,
            $currentStock,
            $minStockThreshold,
            $rackSize,
            1,
            $createdAt,
            $updatedAt
          );
        `,
      {
        $id: productId,
        $name: productName,
        $category: input.category,
        $baseUnit: configuration.baseUnit,
        $pricePerBaseUnit: input.pricePerBaseUnit,
        $pricePerRack: configuration.pricePerRack,
        $currentStock: input.initialStock,
        $minStockThreshold: input.minStockThreshold,
        $rackSize: configuration.rackSize,
        $createdAt: now,
        $updatedAt: now,
      },
    );

    if (input.initialStock > 0) {
      sqliteDatabase.runSync(
        `
            INSERT INTO stock_history (
              id,
              product_id,
              change_type,
              quantity_change,
              resulting_stock,
              note,
              reference_type,
              reference_id,
              performed_by_user_id,
              performed_by_name,
              performed_by_role,
              created_at
            )
            VALUES (
              $id,
              $productId,
              'initial_stock',
              $quantityChange,
              $resultingStock,
              $note,
              'product',
              $referenceId,
              $performedByUserId,
              $performedByName,
              $performedByRole,
              $createdAt
            );
          `,
        {
          $id: stockHistoryId,
          $productId: productId,
          $quantityChange: input.initialStock,
          $resultingStock: input.initialStock,
          $note: "Stok awal saat produk dibuat",
          $referenceId: productId,
          $performedByUserId: input.performedBy.id,
          $performedByName: input.performedBy.fullName,
          $performedByRole: input.performedBy.role,
          $createdAt: now,
        },
      );
    }
  });

  return {
    productId,
  };
}

export function updateProduct(input: UpdateProductInput): UpdateProductResult {
  const existingProduct = getProductById(input.productId);

  if (existingProduct === null) {
    throw new Error("Produk yang akan diperbarui tidak ditemukan.");
  }

  if (!existingProduct.isActive) {
    throw new Error("Produk nonaktif tidak dapat diperbarui.");
  }

  const configuration = validateUpdateConfiguration(existingProduct, input);

  const stockDifference = input.currentStock - existingProduct.currentStock;

  const now = Date.now();

  sqliteDatabase.withTransactionSync(() => {
    sqliteDatabase.runSync(
      `
          UPDATE products
          SET
            price_per_base_unit =
              $pricePerBaseUnit,
            price_per_rack =
              $pricePerRack,
            current_stock =
              $currentStock,
            min_stock_threshold =
              $minStockThreshold,
            rack_size =
              $rackSize,
            updated_at =
              $updatedAt
          WHERE id = $productId
            AND deleted_at IS NULL;
        `,
      {
        $productId: existingProduct.id,
        $pricePerBaseUnit: input.pricePerBaseUnit,
        $pricePerRack: configuration.pricePerRack,
        $currentStock: input.currentStock,
        $minStockThreshold: input.minStockThreshold,
        $rackSize: configuration.rackSize,
        $updatedAt: now,
      },
    );

    if (stockDifference !== 0) {
      sqliteDatabase.runSync(
        `
            INSERT INTO stock_history (
              id,
              product_id,
              change_type,
              quantity_change,
              resulting_stock,
              note,
              reference_type,
              reference_id,
              performed_by_user_id,
              performed_by_name,
              performed_by_role,
              created_at
            )
            VALUES (
              $id,
              $productId,
              'manual_correction',
              $quantityChange,
              $resultingStock,
              $note,
              'product',
              $referenceId,
              $performedByUserId,
              $performedByName,
              $performedByRole,
              $createdAt
            );
          `,
        {
          $id: Crypto.randomUUID(),
          $productId: existingProduct.id,
          $quantityChange: stockDifference,
          $resultingStock: input.currentStock,
          $note: "Koreksi stok melalui edit produk",
          $referenceId: existingProduct.id,
          $performedByUserId: input.performedBy.id,
          $performedByName: input.performedBy.fullName,
          $performedByRole: input.performedBy.role,
          $createdAt: now,
        },
      );
    }
  });

  return {
    productId: existingProduct.id,
    stockDifference,
  };
}

export function deactivateProduct(productId: string): DeactivateProductResult {
  const existingProduct = getProductById(productId);

  if (existingProduct === null) {
    throw new Error("Produk yang akan dihapus tidak ditemukan.");
  }

  if (!existingProduct.isActive) {
    throw new Error("Produk tersebut sudah tidak aktif.");
  }

  const now = Date.now();

  sqliteDatabase.runSync(
    `
      UPDATE products
      SET
        is_active = 0,
        deleted_at = $deletedAt,
        updated_at = $updatedAt
      WHERE id = $productId
        AND deleted_at IS NULL;
    `,
    {
      $productId: productId,
      $deletedAt: now,
      $updatedAt: now,
    },
  );

  return {
    productId,
  };
}
