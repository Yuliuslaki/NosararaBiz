import * as Crypto from "expo-crypto";

import { sqliteDatabase } from "../db/client";
import type { AuthenticatedUser } from "./authService";
import {
  getCashBookCategoryLabel,
  type CashBookCategory,
} from "./cashBookService";

export type ExpenseCategory = Exclude<CashBookCategory, "sale" | "sale_refund">;

export type CreateExpenseInput = {
  category: ExpenseCategory;
  amount: number;
  description: string;
  performedBy: AuthenticatedUser;
};

export type CreatedExpense = {
  id: string;
  type: "expense";
  amount: number;
  category: ExpenseCategory;
  categoryLabel: string;
  description: string;
  relatedTransactionId: null;
  createdByUserId: string;
  createdByName: string;
  createdByRole: "owner";
  entryDate: number;
  createdAt: number;
  updatedAt: number;
};

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  "feed",
  "transportation",
  "operations",
  "electricity",
  "medicine",
  "other",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  feed: "Pakan",
  transportation: "Transportasi",
  operations: "Operasional",
  electricity: "Listrik",
  medicine: "Obat dan kesehatan",
  other: "Lainnya",
};

const MIN_DESCRIPTION_LENGTH = 3;
const MAX_DESCRIPTION_LENGTH = 250;

function normalizeDescription(description: string): string {
  const normalizedDescription = description.trim().replace(/\s+/g, " ");

  if (normalizedDescription.length < MIN_DESCRIPTION_LENGTH) {
    throw new Error("Keterangan pengeluaran minimal 3 karakter.");
  }

  if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error("Keterangan pengeluaran maksimal 250 karakter.");
  }

  return normalizedDescription;
}

function validateExpenseAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(
      "Nominal pengeluaran harus berupa bilangan bulat lebih dari nol.",
    );
  }
}

function validateExpenseCategory(category: ExpenseCategory): void {
  if (!EXPENSE_CATEGORIES.includes(category)) {
    throw new Error("Kategori pengeluaran tidak valid.");
  }
}

function validatePerformedBy(performedBy: AuthenticatedUser): void {
  if (performedBy.role !== "owner") {
    throw new Error("Hanya Owner yang dapat mencatat pengeluaran.");
  }

  if (performedBy.id.trim().length === 0) {
    throw new Error("ID pengguna tidak valid.");
  }

  if (performedBy.fullName.trim().length === 0) {
    throw new Error("Nama pengguna tidak valid.");
  }
}

export function createExpense(input: CreateExpenseInput): CreatedExpense {
  validatePerformedBy(input.performedBy);

  validateExpenseCategory(input.category);

  validateExpenseAmount(input.amount);

  const description = normalizeDescription(input.description);

  const expenseId = Crypto.randomUUID();

  const currentTime = Date.now();

  const createdExpense: CreatedExpense = {
    id: expenseId,
    type: "expense",
    amount: input.amount,
    category: input.category,
    categoryLabel: getCashBookCategoryLabel(input.category),
    description,
    relatedTransactionId: null,
    createdByUserId: input.performedBy.id,
    createdByName: input.performedBy.fullName,
    createdByRole: "owner",
    entryDate: currentTime,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  sqliteDatabase.withTransactionSync(() => {
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
            'expense',
            $amount,
            $category,
            $description,
            NULL,
            $createdByUserId,
            $createdByName,
            'owner',
            $entryDate,
            $createdAt,
            $updatedAt
          );
        `,
      {
        $id: createdExpense.id,

        $amount: createdExpense.amount,

        $category: createdExpense.category,

        $description: createdExpense.description,

        $createdByUserId: createdExpense.createdByUserId,

        $createdByName: createdExpense.createdByName,

        $entryDate: createdExpense.entryDate,

        $createdAt: createdExpense.createdAt,

        $updatedAt: createdExpense.updatedAt,
      },
    );
  });

  return createdExpense;
}
