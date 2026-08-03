import * as Crypto from "expo-crypto";

import type { ProductCategory, ProductUnit } from "../types/product";
import { sqliteDatabase } from "../db/client";
import type { AuthenticatedUser } from "./authService";

export type SalePaymentMethod = "cash" | "qris";

export type SaleVatTreatment = "taxable" | "exempt";

export const SALE_VAT_RATE_PERCENT = 11;

export type SaleAmountItem = {
  productCategory: ProductCategory;
  subtotal: number;
};

export type SaleAmountBreakdown = {
  subtotalAmount: number;
  taxableAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
};

export type SaleItemInput = {
  productId: string;
  saleUnit: ProductUnit;
  quantity: number;
};

export type CreateSaleTransactionInput = {
  paymentMethod: SalePaymentMethod;
  amountPaid: number;
  items: SaleItemInput[];
  performedBy: AuthenticatedUser;
};

export type CreatedSaleItem = {
  id: string;
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  saleUnit: ProductUnit;
  quantity: number;
  quantityInBaseUnit: number;
  unitPrice: number;
  subtotal: number;
  vatTreatment: SaleVatTreatment;
  vatRate: number;
  vatAmount: number;
  rackSizeSnapshot: number | null;
};

export type CreatedSaleTransaction = {
  id: string;
  transactionNumber: string;
  transactionDate: number;
  paymentMethod: SalePaymentMethod;
  subtotalAmount: number;
  taxableAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
  status: "paid";
  items: CreatedSaleItem[];
};

type ProductDatabaseRow = {
  id: string;
  name: string;
  category: ProductCategory;
  baseUnit: ProductUnit;
  pricePerBaseUnit: number;
  pricePerRack: number | null;
  currentStock: number;
  rackSize: number | null;
  isActive: number;
  deletedAt: number | null;
};

type NormalizedSaleItem = {
  productId: string;
  saleUnit: ProductUnit;
  quantity: number;
};

type ProductStockPlan = {
  product: ProductDatabaseRow;
  quantityChange: number;
  resultingStock: number;
};

const VALID_SALE_UNITS: ProductUnit[] = ["rack", "piece", "sack", "head"];

function assertSafeNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} harus berupa bilangan bulat nol atau lebih.`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} harus berupa bilangan bulat lebih dari nol.`);
  }
}

function assertSafeCalculation(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} terlalu besar atau tidak valid.`);
  }
}

export function isProductSubjectToVat(
  productCategory: ProductCategory,
): boolean {
  return productCategory === "fertilizer";
}

export function calculateSaleAmounts(
  items: readonly SaleAmountItem[],
): SaleAmountBreakdown {
  let subtotalAmount = 0;
  let taxableAmount = 0;

  for (const item of items) {
    assertSafeCalculation(item.subtotal, "Subtotal produk");

    const nextSubtotalAmount = subtotalAmount + item.subtotal;

    assertSafeCalculation(nextSubtotalAmount, "Subtotal transaksi");

    subtotalAmount = nextSubtotalAmount;

    if (isProductSubjectToVat(item.productCategory)) {
      const nextTaxableAmount = taxableAmount + item.subtotal;

      assertSafeCalculation(nextTaxableAmount, "Dasar pengenaan PPN");

      taxableAmount = nextTaxableAmount;
    }
  }

  const vatRate = taxableAmount > 0 ? SALE_VAT_RATE_PERCENT : 0;

  const vatAmount =
    taxableAmount > 0
      ? Math.round((taxableAmount * SALE_VAT_RATE_PERCENT) / 100)
      : 0;

  assertSafeCalculation(vatAmount, "Nominal PPN");

  const totalAmount = subtotalAmount + vatAmount;

  assertSafeCalculation(totalAmount, "Total transaksi");

  return {
    subtotalAmount,
    taxableAmount,
    vatRate,
    vatAmount,
    totalAmount,
  };
}

function applyItemVatSnapshots(
  items: CreatedSaleItem[],
  taxableAmount: number,
  transactionVatAmount: number,
): void {
  const taxableItems = items.filter((item) => item.vatTreatment === "taxable");

  if (
    taxableItems.length === 0 ||
    taxableAmount <= 0 ||
    transactionVatAmount <= 0
  ) {
    return;
  }

  let allocatedVatAmount = 0;

  taxableItems.forEach((item, index) => {
    const isLastTaxableItem = index === taxableItems.length - 1;

    const itemVatAmount = isLastTaxableItem
      ? transactionVatAmount - allocatedVatAmount
      : Math.floor((transactionVatAmount * item.subtotal) / taxableAmount);

    assertSafeCalculation(itemVatAmount, `PPN ${item.productName}`);

    item.vatAmount = itemVatAmount;

    allocatedVatAmount += itemVatAmount;
  });
}

function normalizeItems(items: SaleItemInput[]): NormalizedSaleItem[] {
  if (!Array.isArray(items)) {
    throw new Error("Daftar produk transaksi tidak valid.");
  }

  if (items.length === 0) {
    throw new Error("Transaksi harus memiliki minimal satu produk.");
  }

  const mergedItems = new Map<string, NormalizedSaleItem>();

  for (const item of items) {
    const productId = item.productId.trim();

    if (productId.length === 0) {
      throw new Error("ID produk transaksi tidak valid.");
    }

    if (!VALID_SALE_UNITS.includes(item.saleUnit)) {
      throw new Error("Satuan penjualan tidak valid.");
    }

    assertPositiveInteger(item.quantity, "Jumlah produk");

    const itemKey = `${productId}:${item.saleUnit}`;

    const existingItem = mergedItems.get(itemKey);

    if (existingItem) {
      const mergedQuantity = existingItem.quantity + item.quantity;

      assertPositiveInteger(mergedQuantity, "Jumlah gabungan produk");

      existingItem.quantity = mergedQuantity;

      continue;
    }

    mergedItems.set(itemKey, {
      productId,
      saleUnit: item.saleUnit,
      quantity: item.quantity,
    });
  }

  return Array.from(mergedItems.values());
}

function getProductById(productId: string): ProductDatabaseRow {
  const product = sqliteDatabase.getFirstSync<ProductDatabaseRow>(
    `
        SELECT
          id AS id,
          name AS name,
          category AS category,
          base_unit AS baseUnit,
          price_per_base_unit AS pricePerBaseUnit,
          price_per_rack AS pricePerRack,
          current_stock AS currentStock,
          rack_size AS rackSize,
          is_active AS isActive,
          deleted_at AS deletedAt
        FROM products
        WHERE id = $productId
        LIMIT 1;
      `,
    {
      $productId: productId,
    },
  );

  if (product === null) {
    throw new Error("Salah satu produk tidak ditemukan.");
  }

  if (product.isActive !== 1 || product.deletedAt !== null) {
    throw new Error(
      `${product.name} sudah tidak aktif dan tidak dapat dijual.`,
    );
  }

  return product;
}

function validateSaleUnit(
  product: ProductDatabaseRow,
  saleUnit: ProductUnit,
): void {
  switch (product.category) {
    case "eggs":
      if (saleUnit !== "rack" && saleUnit !== "piece") {
        throw new Error(
          `${product.name} hanya dapat dijual dalam satuan rak atau butir.`,
        );
      }

      return;

    case "fertilizer":
      if (saleUnit !== "sack") {
        throw new Error(
          `${product.name} hanya dapat dijual dalam satuan karung.`,
        );
      }

      return;

    case "culled_chicken":
      if (saleUnit !== "head") {
        throw new Error(
          `${product.name} hanya dapat dijual dalam satuan ekor.`,
        );
      }

      return;

    case "other":
      if (saleUnit !== product.baseUnit) {
        throw new Error(
          `Satuan penjualan ${product.name} harus sesuai satuan dasarnya.`,
        );
      }

      return;

    default:
      throw new Error(`Kategori ${product.name} tidak valid.`);
  }
}

function resolveUnitPrice(
  product: ProductDatabaseRow,
  saleUnit: ProductUnit,
): number {
  if (saleUnit === "rack") {
    if (product.category !== "eggs" || product.pricePerRack === null) {
      throw new Error(`Harga per rak ${product.name} belum tersedia.`);
    }

    if (product.pricePerRack <= 0) {
      throw new Error(`Harga per rak ${product.name} harus lebih dari nol.`);
    }

    return product.pricePerRack;
  }

  if (product.pricePerBaseUnit <= 0) {
    throw new Error(`Harga ${product.name} harus lebih dari nol.`);
  }

  return product.pricePerBaseUnit;
}

function calculateQuantityInBaseUnit(
  product: ProductDatabaseRow,
  saleUnit: ProductUnit,
  quantity: number,
): {
  quantityInBaseUnit: number;
  rackSizeSnapshot: number | null;
} {
  if (saleUnit !== "rack") {
    return {
      quantityInBaseUnit: quantity,
      rackSizeSnapshot: null,
    };
  }

  if (
    product.category !== "eggs" ||
    product.rackSize === null ||
    product.rackSize <= 0
  ) {
    throw new Error(
      `Konfigurasi jumlah butir per rak ${product.name} tidak valid.`,
    );
  }

  const quantityInBaseUnit = quantity * product.rackSize;

  assertSafeCalculation(quantityInBaseUnit, `Jumlah ${product.name}`);

  return {
    quantityInBaseUnit,
    rackSizeSnapshot: product.rackSize,
  };
}

function createTransactionNumber(
  transactionDate: number,
  transactionId: string,
): string {
  const date = new Date(transactionDate);

  const day = String(date.getDate()).padStart(2, "0");

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const year = String(date.getFullYear());

  const hours = String(date.getHours()).padStart(2, "0");

  const minutes = String(date.getMinutes()).padStart(2, "0");

  const seconds = String(date.getSeconds()).padStart(2, "0");

  const uniqueSuffix = transactionId
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();

  return ["TRX", day, month, year, hours, minutes, seconds, uniqueSuffix].join(
    "-",
  );
}

function validatePayment(
  paymentMethod: SalePaymentMethod,
  totalAmount: number,
  amountPaid: number,
): number {
  assertSafeNonNegativeInteger(amountPaid, "Jumlah pembayaran");

  if (paymentMethod === "cash") {
    if (amountPaid < totalAmount) {
      throw new Error("Jumlah uang tunai belum mencukupi total transaksi.");
    }

    const changeAmount = amountPaid - totalAmount;

    assertSafeCalculation(changeAmount, "Jumlah kembalian");

    return changeAmount;
  }

  if (paymentMethod === "qris") {
    if (amountPaid !== totalAmount) {
      throw new Error("Pembayaran QRIS harus sama dengan total transaksi.");
    }

    return 0;
  }

  throw new Error("Metode pembayaran tidak valid.");
}

export function createSaleTransaction(
  input: CreateSaleTransactionInput,
): CreatedSaleTransaction {
  const normalizedItems = normalizeItems(input.items);

  const transactionDate = Date.now();

  const transactionId = Crypto.randomUUID();

  const transactionNumber = createTransactionNumber(
    transactionDate,
    transactionId,
  );

  const productCache = new Map<string, ProductDatabaseRow>();

  const requiredStockByProduct = new Map<string, number>();

  const preparedItems: CreatedSaleItem[] = [];

  for (let index = 0; index < normalizedItems.length; index += 1) {
    const item = normalizedItems[index];

    let product = productCache.get(item.productId);

    if (!product) {
      product = getProductById(item.productId);

      productCache.set(product.id, product);
    }

    validateSaleUnit(product, item.saleUnit);

    const unitPrice = resolveUnitPrice(product, item.saleUnit);

    const { quantityInBaseUnit, rackSizeSnapshot } =
      calculateQuantityInBaseUnit(product, item.saleUnit, item.quantity);

    const subtotal = item.quantity * unitPrice;

    assertSafeCalculation(subtotal, `Subtotal ${product.name}`);

    const currentRequiredStock = requiredStockByProduct.get(product.id) ?? 0;

    const nextRequiredStock = currentRequiredStock + quantityInBaseUnit;

    assertSafeCalculation(nextRequiredStock, `Jumlah stok ${product.name}`);

    requiredStockByProduct.set(product.id, nextRequiredStock);

    preparedItems.push({
      id: Crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      saleUnit: item.saleUnit,
      quantity: item.quantity,
      quantityInBaseUnit,
      unitPrice,
      subtotal,
      vatTreatment: isProductSubjectToVat(product.category)
        ? "taxable"
        : "exempt",
      vatRate: isProductSubjectToVat(product.category)
        ? SALE_VAT_RATE_PERCENT
        : 0,
      vatAmount: 0,
      rackSizeSnapshot,
    });
  }

  const { subtotalAmount, taxableAmount, vatRate, vatAmount, totalAmount } =
    calculateSaleAmounts(preparedItems);

  if (subtotalAmount <= 0) {
    throw new Error("Subtotal transaksi harus lebih dari nol.");
  }

  applyItemVatSnapshots(preparedItems, taxableAmount, vatAmount);

  const changeAmount = validatePayment(
    input.paymentMethod,
    totalAmount,
    input.amountPaid,
  );

  const stockPlans: ProductStockPlan[] = [];

  for (const [productId, requiredStock] of requiredStockByProduct) {
    const product = productCache.get(productId);

    if (!product) {
      throw new Error("Data produk transaksi tidak lengkap.");
    }

    if (product.currentStock < requiredStock) {
      throw new Error(
        `Stok ${product.name} tidak mencukupi. Stok tersedia ${product.currentStock}, sedangkan yang dibutuhkan ${requiredStock}.`,
      );
    }

    const resultingStock = product.currentStock - requiredStock;

    stockPlans.push({
      product,
      quantityChange: -requiredStock,
      resultingStock,
    });
  }

  let createdTransaction: CreatedSaleTransaction | null = null;

  sqliteDatabase.withTransactionSync(() => {
    sqliteDatabase.runSync(
      `
          INSERT INTO transactions (
            id,
            transaction_number,
            transaction_date,
            payment_method,
            subtotal_amount,
            taxable_amount,
            vat_rate,
            vat_amount,
            total_amount,
            amount_paid,
            change_amount,
            status,
            created_by_user_id,
            created_by_name,
            created_by_role,
            created_at,
            updated_at
          )
          VALUES (
            $id,
            $transactionNumber,
            $transactionDate,
            $paymentMethod,
            $subtotalAmount,
            $taxableAmount,
            $vatRate,
            $vatAmount,
            $totalAmount,
            $amountPaid,
            $changeAmount,
            'paid',
            $createdByUserId,
            $createdByName,
            $createdByRole,
            $createdAt,
            $updatedAt
          );
        `,
      {
        $id: transactionId,

        $transactionNumber: transactionNumber,

        $transactionDate: transactionDate,

        $paymentMethod: input.paymentMethod,

        $subtotalAmount: subtotalAmount,

        $taxableAmount: taxableAmount,

        $vatRate: vatRate,

        $vatAmount: vatAmount,

        $totalAmount: totalAmount,

        $amountPaid: input.amountPaid,

        $changeAmount: changeAmount,

        $createdByUserId: input.performedBy.id,

        $createdByName: input.performedBy.fullName,

        $createdByRole: input.performedBy.role,

        $createdAt: transactionDate,

        $updatedAt: transactionDate,
      },
    );

    for (const item of preparedItems) {
      sqliteDatabase.runSync(
        `
            INSERT INTO transaction_items (
              id,
              transaction_id,
              product_id,
              product_name,
              product_category,
              sale_unit,
              quantity,
              quantity_in_base_unit,
              unit_price,
              subtotal,
              vat_treatment,
              vat_rate,
              vat_amount,
              rack_size_snapshot,
              created_at
            )
            VALUES (
              $id,
              $transactionId,
              $productId,
              $productName,
              $productCategory,
              $saleUnit,
              $quantity,
              $quantityInBaseUnit,
              $unitPrice,
              $subtotal,
              $vatTreatment,
              $vatRate,
              $vatAmount,
              $rackSizeSnapshot,
              $createdAt
            );
          `,
        {
          $id: item.id,

          $transactionId: transactionId,

          $productId: item.productId,

          $productName: item.productName,

          $productCategory: item.productCategory,

          $saleUnit: item.saleUnit,

          $quantity: item.quantity,

          $quantityInBaseUnit: item.quantityInBaseUnit,

          $unitPrice: item.unitPrice,

          $subtotal: item.subtotal,

          $vatTreatment: item.vatTreatment,

          $vatRate: item.vatRate,

          $vatAmount: item.vatAmount,

          $rackSizeSnapshot: item.rackSizeSnapshot,

          $createdAt: transactionDate,
        },
      );
    }

    for (const stockPlan of stockPlans) {
      sqliteDatabase.runSync(
        `
            UPDATE products
            SET
              current_stock =
                $resultingStock,
              updated_at =
                $updatedAt
            WHERE id = $productId;
          `,
        {
          $resultingStock: stockPlan.resultingStock,

          $updatedAt: transactionDate,

          $productId: stockPlan.product.id,
        },
      );

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
              'sale',
              $quantityChange,
              $resultingStock,
              $note,
              'transaction',
              $referenceId,
              $performedByUserId,
              $performedByName,
              $performedByRole,
              $createdAt
            );
          `,
        {
          $id: Crypto.randomUUID(),

          $productId: stockPlan.product.id,

          $quantityChange: stockPlan.quantityChange,

          $resultingStock: stockPlan.resultingStock,

          $note: `Penjualan ${transactionNumber}`,

          $referenceId: transactionId,

          $performedByUserId: input.performedBy.id,

          $performedByName: input.performedBy.fullName,

          $performedByRole: input.performedBy.role,

          $createdAt: transactionDate,
        },
      );
    }

    sqliteDatabase.runSync(
      `
          INSERT INTO cash_books (
            id,
            type,
            amount,
            category,
            description,
            related_transaction_id,
            created_by_user_id,
            created_by_name,
            created_by_role,
            entry_date,
            created_at,
            updated_at
          )
          VALUES (
            $id,
            'income',
            $amount,
            'sale',
            $description,
            $relatedTransactionId,
            $createdByUserId,
            $createdByName,
            $createdByRole,
            $entryDate,
            $createdAt,
            $updatedAt
          );
        `,
      {
        $id: Crypto.randomUUID(),

        $amount: totalAmount,

        $description: `Penjualan ${transactionNumber}`,

        $relatedTransactionId: transactionId,

        $createdByUserId: input.performedBy.id,

        $createdByName: input.performedBy.fullName,

        $createdByRole: input.performedBy.role,

        $entryDate: transactionDate,

        $createdAt: transactionDate,

        $updatedAt: transactionDate,
      },
    );

    createdTransaction = {
      id: transactionId,
      transactionNumber,
      transactionDate,
      paymentMethod: input.paymentMethod,
      subtotalAmount,
      taxableAmount,
      vatRate,
      vatAmount,
      totalAmount,
      amountPaid: input.amountPaid,
      changeAmount,
      status: "paid",
      items: preparedItems,
    };
  });

  if (createdTransaction === null) {
    throw new Error("Transaksi gagal disimpan.");
  }

  return createdTransaction;
}
