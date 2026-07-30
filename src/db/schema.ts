import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const appConfig = sqliteTable(
  "app_config",
  {
    id: integer("id").primaryKey().default(1),

    businessName: text("business_name").notNull(),

    ownerWaNumber: text("owner_wa_number"),

    eggRackSize: integer("egg_rack_size").notNull().default(30),

    setupCompleted: integer("setup_completed", {
      mode: "boolean",
    })
      .notNull()
      .default(false),

    sessionTimeoutMinutes: integer("session_timeout_minutes")
      .notNull()
      .default(5),

    loginFailedAttempts: integer("login_failed_attempts").notNull().default(0),

    loginLockedUntil: integer("login_locked_until", {
      mode: "timestamp_ms",
    }),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    check("app_config_single_row_check", sql`${table.id} = 1`),

    check("app_config_egg_rack_size_check", sql`${table.eggRackSize} > 0`),

    check(
      "app_config_session_timeout_check",
      sql`${table.sessionTimeoutMinutes} > 0`,
    ),

    check(
      "app_config_login_failed_attempts_check",
      sql`${table.loginFailedAttempts} >= 0`,
    ),
  ],
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),

    fullName: text("full_name").notNull(),

    username: text("username").notNull(),

    role: text("role", {
      enum: ["owner", "officer"],
    }).notNull(),

    pinHash: text("pin_hash").notNull(),

    pinSalt: text("pin_salt").notNull(),

    isActive: integer("is_active", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),

    lockedUntil: integer("locked_until", {
      mode: "timestamp_ms",
    }),

    lastLoginAt: integer("last_login_at", {
      mode: "timestamp_ms",
    }),

    deletedAt: integer("deleted_at", {
      mode: "timestamp_ms",
    }),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),

    check("users_role_check", sql`${table.role} IN ('owner', 'officer')`),

    check(
      "users_failed_login_attempts_check",
      sql`${table.failedLoginAttempts} >= 0`,
    ),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),

    name: text("name").notNull(),

    category: text("category", {
      enum: ["eggs", "fertilizer", "culled_chicken", "other"],
    }).notNull(),

    baseUnit: text("base_unit", {
      enum: ["rack", "piece", "sack", "head"],
    }).notNull(),

    pricePerBaseUnit: integer("price_per_base_unit").notNull(),

    pricePerRack: integer("price_per_rack"),

    currentStock: integer("current_stock").notNull().default(0),

    minStockThreshold: integer("min_stock_threshold").notNull().default(0),

    rackSize: integer("rack_size"),

    isActive: integer("is_active", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    deletedAt: integer("deleted_at", {
      mode: "timestamp_ms",
    }),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("products_category_index").on(table.category),

    index("products_active_index").on(table.isActive),

    check(
      "products_category_check",
      sql`${table.category} IN (
        'eggs',
        'fertilizer',
        'culled_chicken',
        'other'
      )`,
    ),

    check(
      "products_base_unit_check",
      sql`${table.baseUnit} IN ('rack', 'piece', 'sack', 'head')`,
    ),

    check(
      "products_price_per_base_unit_check",
      sql`${table.pricePerBaseUnit} >= 0`,
    ),

    check(
      "products_price_per_rack_check",
      sql`${table.pricePerRack} IS NULL OR ${table.pricePerRack} >= 0`,
    ),

    check("products_current_stock_check", sql`${table.currentStock} >= 0`),

    check(
      "products_min_stock_threshold_check",
      sql`${table.minStockThreshold} >= 0`,
    ),

    check(
      "products_category_base_unit_check",
      sql`
        (${table.category} = 'eggs' AND ${table.baseUnit} = 'piece')
        OR
        (${table.category} = 'fertilizer' AND ${table.baseUnit} = 'sack')
        OR
        (${table.category} = 'culled_chicken' AND ${table.baseUnit} = 'head')
        OR
        (${table.category} = 'other')
      `,
    ),

    check(
      "products_egg_configuration_check",
      sql`
        (
          ${table.category} = 'eggs'
          AND ${table.rackSize} IS NOT NULL
          AND ${table.rackSize} > 0
          AND ${table.pricePerRack} IS NOT NULL
        )
        OR
        (
          ${table.category} <> 'eggs'
          AND ${table.rackSize} IS NULL
          AND ${table.pricePerRack} IS NULL
        )
      `,
    ),
  ],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),

    transactionNumber: text("transaction_number").notNull(),

    transactionDate: integer("transaction_date", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    paymentMethod: text("payment_method", {
      enum: ["cash", "qris"],
    }).notNull(),

    totalAmount: integer("total_amount").notNull(),

    amountPaid: integer("amount_paid").notNull(),

    changeAmount: integer("change_amount").notNull().default(0),

    status: text("status", {
      enum: ["paid", "cancelled"],
    })
      .notNull()
      .default("paid"),

    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    createdByName: text("created_by_name").notNull(),

    createdByRole: text("created_by_role", {
      enum: ["owner", "officer"],
    }).notNull(),

    cancelledByUserId: text("cancelled_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    cancelledByName: text("cancelled_by_name"),

    cancelledByRole: text("cancelled_by_role", {
      enum: ["owner", "officer"],
    }),

    cancelledAt: integer("cancelled_at", {
      mode: "timestamp_ms",
    }),

    cancellationReason: text("cancellation_reason", {
      enum: [
        "wrong_quantity",
        "wrong_product",
        "wrong_payment_method",
        "customer_cancelled",
        "other",
      ],
    }),

    cancellationNote: text("cancellation_note"),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("transactions_number_unique").on(table.transactionNumber),

    index("transactions_date_index").on(table.transactionDate),

    index("transactions_status_index").on(table.status),

    index("transactions_payment_method_index").on(table.paymentMethod),

    index("transactions_created_by_user_index").on(table.createdByUserId),

    check(
      "transactions_payment_method_check",
      sql`${table.paymentMethod} IN ('cash', 'qris')`,
    ),

    check(
      "transactions_status_check",
      sql`${table.status} IN ('paid', 'cancelled')`,
    ),

    check(
      "transactions_created_by_role_check",
      sql`${table.createdByRole} IN ('owner', 'officer')`,
    ),

    check(
      "transactions_cancelled_by_role_check",
      sql`
        ${table.cancelledByRole} IS NULL
        OR ${table.cancelledByRole} IN ('owner', 'officer')
      `,
    ),

    check("transactions_total_amount_check", sql`${table.totalAmount} > 0`),

    check("transactions_amount_paid_check", sql`${table.amountPaid} >= 0`),

    check("transactions_change_amount_check", sql`${table.changeAmount} >= 0`),

    check(
      "transactions_payment_amounts_check",
      sql`
        (
          ${table.paymentMethod} = 'cash'
          AND ${table.amountPaid} >= ${table.totalAmount}
          AND ${table.changeAmount}
            = ${table.amountPaid} - ${table.totalAmount}
        )
        OR
        (
          ${table.paymentMethod} = 'qris'
          AND ${table.amountPaid} = ${table.totalAmount}
          AND ${table.changeAmount} = 0
        )
      `,
    ),

    check(
      "transactions_cancellation_reason_check",
      sql`
        ${table.cancellationReason} IS NULL
        OR ${table.cancellationReason} IN (
          'wrong_quantity',
          'wrong_product',
          'wrong_payment_method',
          'customer_cancelled',
          'other'
        )
      `,
    ),

    check(
      "transactions_cancellation_state_check",
      sql`
        (
          ${table.status} = 'paid'
          AND ${table.cancelledByUserId} IS NULL
          AND ${table.cancelledByName} IS NULL
          AND ${table.cancelledByRole} IS NULL
          AND ${table.cancelledAt} IS NULL
          AND ${table.cancellationReason} IS NULL
          AND ${table.cancellationNote} IS NULL
        )
        OR
        (
          ${table.status} = 'cancelled'
          AND ${table.cancelledByName} IS NOT NULL
          AND ${table.cancelledByRole} IS NOT NULL
          AND ${table.cancelledAt} IS NOT NULL
          AND ${table.cancellationReason} IS NOT NULL
        )
      `,
    ),

    check(
      "transactions_other_cancellation_note_check",
      sql`
        ${table.status} <> 'cancelled'
        OR ${table.cancellationReason} <> 'other'
        OR (
          ${table.cancellationNote} IS NOT NULL
          AND length(trim(${table.cancellationNote})) > 0
        )
      `,
    ),
  ],
);

export const transactionItems = sqliteTable(
  "transaction_items",
  {
    id: text("id").primaryKey(),

    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, {
        onDelete: "cascade",
      }),

    productId: text("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "restrict",
      }),

    productName: text("product_name").notNull(),

    productCategory: text("product_category", {
      enum: ["eggs", "fertilizer", "culled_chicken", "other"],
    }).notNull(),

    saleUnit: text("sale_unit", {
      enum: ["rack", "piece", "sack", "head"],
    }).notNull(),

    quantity: integer("quantity").notNull(),

    quantityInBaseUnit: integer("quantity_in_base_unit").notNull(),

    unitPrice: integer("unit_price").notNull(),

    subtotal: integer("subtotal").notNull(),

    rackSizeSnapshot: integer("rack_size_snapshot"),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("transaction_items_transaction_index").on(table.transactionId),

    index("transaction_items_product_index").on(table.productId),

    check(
      "transaction_items_category_check",
      sql`${table.productCategory} IN (
        'eggs',
        'fertilizer',
        'culled_chicken',
        'other'
      )`,
    ),

    check(
      "transaction_items_sale_unit_check",
      sql`${table.saleUnit} IN ('rack', 'piece', 'sack', 'head')`,
    ),

    check("transaction_items_quantity_check", sql`${table.quantity} > 0`),

    check(
      "transaction_items_base_quantity_check",
      sql`${table.quantityInBaseUnit} > 0`,
    ),

    check("transaction_items_unit_price_check", sql`${table.unitPrice} >= 0`),

    check(
      "transaction_items_subtotal_check",
      sql`
        ${table.subtotal} >= 0
        AND ${table.subtotal} = ${table.quantity} * ${table.unitPrice}
      `,
    ),

    check(
      "transaction_items_category_unit_check",
      sql`
        (
          ${table.productCategory} = 'eggs'
          AND ${table.saleUnit} IN ('rack', 'piece')
        )
        OR
        (
          ${table.productCategory} = 'fertilizer'
          AND ${table.saleUnit} = 'sack'
        )
        OR
        (
          ${table.productCategory} = 'culled_chicken'
          AND ${table.saleUnit} = 'head'
        )
        OR
        (${table.productCategory} = 'other')
      `,
    ),

    check(
      "transaction_items_unit_conversion_check",
      sql`
        (
          ${table.saleUnit} = 'rack'
          AND ${table.rackSizeSnapshot} IS NOT NULL
          AND ${table.rackSizeSnapshot} > 0
          AND ${table.quantityInBaseUnit}
            = ${table.quantity} * ${table.rackSizeSnapshot}
        )
        OR
        (
          ${table.saleUnit} <> 'rack'
          AND ${table.rackSizeSnapshot} IS NULL
          AND ${table.quantityInBaseUnit} = ${table.quantity}
        )
      `,
    ),
  ],
);

export const cashBooks = sqliteTable(
  "cash_books",
  {
    id: text("id").primaryKey(),

    type: text("type", {
      enum: ["income", "expense"],
    }).notNull(),

    amount: integer("amount").notNull(),

    category: text("category", {
      enum: [
        "sale",
        "sale_refund",
        "feed",
        "transportation",
        "operations",
        "electricity",
        "medicine",
        "other",
      ],
    }).notNull(),

    description: text("description").notNull(),

    relatedTransactionId: text("related_transaction_id").references(
      () => transactions.id,
      {
        onDelete: "restrict",
      },
    ),

    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    createdByName: text("created_by_name").notNull(),

    createdByRole: text("created_by_role", {
      enum: ["owner", "officer", "system"],
    }).notNull(),

    entryDate: integer("entry_date", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("cash_books_transaction_category_unique").on(
      table.relatedTransactionId,
      table.category,
    ),

    index("cash_books_entry_date_index").on(table.entryDate),

    index("cash_books_type_index").on(table.type),

    index("cash_books_category_index").on(table.category),

    index("cash_books_transaction_index").on(table.relatedTransactionId),

    index("cash_books_user_index").on(table.createdByUserId),

    check("cash_books_type_check", sql`${table.type} IN ('income', 'expense')`),

    check("cash_books_amount_check", sql`${table.amount} > 0`),

    check(
      "cash_books_category_check",
      sql`${table.category} IN (
        'sale',
        'sale_refund',
        'feed',
        'transportation',
        'operations',
        'electricity',
        'medicine',
        'other'
      )`,
    ),

    check(
      "cash_books_created_by_role_check",
      sql`${table.createdByRole} IN (
        'owner',
        'officer',
        'system'
      )`,
    ),

    check(
      "cash_books_category_type_check",
      sql`
        (
          ${table.category} = 'sale'
          AND ${table.type} = 'income'
          AND ${table.relatedTransactionId} IS NOT NULL
        )
        OR
        (
          ${table.category} = 'sale_refund'
          AND ${table.type} = 'expense'
          AND ${table.relatedTransactionId} IS NOT NULL
        )
        OR
        (
          ${table.category} IN (
            'feed',
            'transportation',
            'operations',
            'electricity',
            'medicine',
            'other'
          )
          AND ${table.type} = 'expense'
          AND ${table.relatedTransactionId} IS NULL
        )
      `,
    ),
  ],
);

export const stockHistory = sqliteTable(
  "stock_history",
  {
    id: text("id").primaryKey(),

    productId: text("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "restrict",
      }),

    changeType: text("change_type", {
      enum: [
        "initial_stock",
        "stock_addition",
        "sale",
        "sale_cancellation",
        "manual_correction",
      ],
    }).notNull(),

    quantityChange: integer("quantity_change").notNull(),

    resultingStock: integer("resulting_stock").notNull(),

    note: text("note"),

    referenceType: text("reference_type", {
      enum: ["product", "transaction", "manual"],
    }).notNull(),

    referenceId: text("reference_id"),

    performedByUserId: text("performed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    performedByName: text("performed_by_name").notNull(),

    performedByRole: text("performed_by_role", {
      enum: ["owner", "officer", "system"],
    }).notNull(),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("stock_history_product_index").on(table.productId),

    index("stock_history_created_at_index").on(table.createdAt),

    index("stock_history_change_type_index").on(table.changeType),

    index("stock_history_user_index").on(table.performedByUserId),

    check(
      "stock_history_change_type_check",
      sql`${table.changeType} IN (
        'initial_stock',
        'stock_addition',
        'sale',
        'sale_cancellation',
        'manual_correction'
      )`,
    ),

    check(
      "stock_history_quantity_change_check",
      sql`${table.quantityChange} <> 0`,
    ),

    check(
      "stock_history_resulting_stock_check",
      sql`${table.resultingStock} >= 0`,
    ),

    check(
      "stock_history_reference_type_check",
      sql`${table.referenceType} IN (
        'product',
        'transaction',
        'manual'
      )`,
    ),

    check(
      "stock_history_performed_by_role_check",
      sql`${table.performedByRole} IN (
        'owner',
        'officer',
        'system'
      )`,
    ),
  ],
);

export const reportSettings = sqliteTable(
  "report_settings",
  {
    id: integer("id").primaryKey().default(1),

    dailyWhatsappEnabled: integer("daily_whatsapp_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(false),

    dailyWhatsappTime: text("daily_whatsapp_time").notNull().default("00:00"),

    sendWhenOnline: integer("send_when_online", {
      mode: "boolean",
    })
      .notNull()
      .default(true),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    check("report_settings_single_row_check", sql`${table.id} = 1`),

    check(
      "report_settings_daily_time_check",
      sql`${table.dailyWhatsappTime} = '00:00'`,
    ),
  ],
);

export const reportDeliveryHistory = sqliteTable(
  "report_delivery_history",
  {
    id: text("id").primaryKey(),

    reportType: text("report_type", {
      enum: ["daily_message", "pdf", "excel"],
    }).notNull(),

    deliveryMode: text("delivery_mode", {
      enum: ["automatic", "manual"],
    }).notNull(),

    periodStart: integer("period_start", {
      mode: "timestamp_ms",
    }).notNull(),

    periodEnd: integer("period_end", {
      mode: "timestamp_ms",
    }).notNull(),

    destinationWaNumber: text("destination_wa_number"),

    fileName: text("file_name"),

    fileUri: text("file_uri"),

    status: text("status", {
      enum: ["pending", "generated", "waiting_connection", "sent", "failed"],
    })
      .notNull()
      .default("pending"),

    attemptCount: integer("attempt_count").notNull().default(0),

    lastAttemptAt: integer("last_attempt_at", {
      mode: "timestamp_ms",
    }),

    sentAt: integer("sent_at", {
      mode: "timestamp_ms",
    }),

    errorMessage: text("error_message"),

    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    createdByName: text("created_by_name").notNull(),

    createdByRole: text("created_by_role", {
      enum: ["owner", "system"],
    }).notNull(),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("report_delivery_history_type_index").on(table.reportType),

    index("report_delivery_history_status_index").on(table.status),

    index("report_delivery_history_period_start_index").on(table.periodStart),

    index("report_delivery_history_created_at_index").on(table.createdAt),

    index("report_delivery_history_created_by_user_index").on(
      table.createdByUserId,
    ),

    check(
      "report_delivery_history_type_check",
      sql`${table.reportType} IN ('daily_message', 'pdf', 'excel')`,
    ),

    check(
      "report_delivery_history_mode_check",
      sql`${table.deliveryMode} IN ('automatic', 'manual')`,
    ),

    check(
      "report_delivery_history_status_check",
      sql`${table.status} IN (
        'pending',
        'generated',
        'waiting_connection',
        'sent',
        'failed'
      )`,
    ),

    check(
      "report_delivery_history_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),

    check(
      "report_delivery_history_period_check",
      sql`${table.periodEnd} >= ${table.periodStart}`,
    ),

    check(
      "report_delivery_history_created_by_role_check",
      sql`${table.createdByRole} IN ('owner', 'system')`,
    ),

    check(
      "report_delivery_history_type_mode_check",
      sql`
        (
          ${table.reportType} = 'daily_message'
          AND ${table.deliveryMode} = 'automatic'
        )
        OR
        (
          ${table.reportType} IN ('pdf', 'excel')
          AND ${table.deliveryMode} = 'manual'
        )
      `,
    ),

    check(
      "report_delivery_history_daily_message_check",
      sql`
        ${table.reportType} <> 'daily_message'
        OR (
          ${table.destinationWaNumber} IS NOT NULL
          AND length(trim(${table.destinationWaNumber})) > 0
          AND ${table.fileName} IS NULL
          AND ${table.fileUri} IS NULL
          AND ${table.status} IN (
            'pending',
            'waiting_connection',
            'sent',
            'failed'
          )
        )
      `,
    ),

    check(
      "report_delivery_history_document_check",
      sql`
        ${table.reportType} = 'daily_message'
        OR (
          ${table.status} IN ('pending', 'generated', 'sent', 'failed')
          AND (
            (
              ${table.fileName} IS NULL
              AND ${table.fileUri} IS NULL
            )
            OR
            (
              ${table.fileName} IS NOT NULL
              AND length(trim(${table.fileName})) > 0
              AND ${table.fileUri} IS NOT NULL
              AND length(trim(${table.fileUri})) > 0
            )
          )
        )
      `,
    ),

    check(
      "report_delivery_history_sent_state_check",
      sql`
        (
          ${table.status} = 'sent'
          AND ${table.sentAt} IS NOT NULL
        )
        OR
        (
          ${table.status} <> 'sent'
          AND ${table.sentAt} IS NULL
        )
      `,
    ),

    check(
      "report_delivery_history_error_state_check",
      sql`
        (
          ${table.status} = 'failed'
          AND ${table.errorMessage} IS NOT NULL
          AND length(trim(${table.errorMessage})) > 0
        )
        OR
        (
          ${table.status} <> 'failed'
          AND ${table.errorMessage} IS NULL
        )
      `,
    ),
  ],
);

export type AppConfig = typeof appConfig.$inferSelect;
export type NewAppConfig = typeof appConfig.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type TransactionItem = typeof transactionItems.$inferSelect;
export type NewTransactionItem = typeof transactionItems.$inferInsert;

export type CashBook = typeof cashBooks.$inferSelect;
export type NewCashBook = typeof cashBooks.$inferInsert;

export type StockHistory = typeof stockHistory.$inferSelect;
export type NewStockHistory = typeof stockHistory.$inferInsert;

export type ReportSettings = typeof reportSettings.$inferSelect;
export type NewReportSettings = typeof reportSettings.$inferInsert;

export type ReportDeliveryHistory = typeof reportDeliveryHistory.$inferSelect;
export type NewReportDeliveryHistory =
  typeof reportDeliveryHistory.$inferInsert;
