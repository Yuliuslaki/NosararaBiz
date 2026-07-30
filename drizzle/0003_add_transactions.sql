CREATE TABLE `transaction_items` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`product_category` text NOT NULL,
	`sale_unit` text NOT NULL,
	`quantity` integer NOT NULL,
	`quantity_in_base_unit` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`rack_size_snapshot` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "transaction_items_category_check" CHECK("transaction_items"."product_category" IN (
        'eggs',
        'fertilizer',
        'culled_chicken',
        'other'
      )),
	CONSTRAINT "transaction_items_sale_unit_check" CHECK("transaction_items"."sale_unit" IN ('rack', 'piece', 'sack', 'head')),
	CONSTRAINT "transaction_items_quantity_check" CHECK("transaction_items"."quantity" > 0),
	CONSTRAINT "transaction_items_base_quantity_check" CHECK("transaction_items"."quantity_in_base_unit" > 0),
	CONSTRAINT "transaction_items_unit_price_check" CHECK("transaction_items"."unit_price" >= 0),
	CONSTRAINT "transaction_items_subtotal_check" CHECK(
        "transaction_items"."subtotal" >= 0
        AND "transaction_items"."subtotal" = "transaction_items"."quantity" * "transaction_items"."unit_price"
      ),
	CONSTRAINT "transaction_items_category_unit_check" CHECK(
        (
          "transaction_items"."product_category" = 'eggs'
          AND "transaction_items"."sale_unit" IN ('rack', 'piece')
        )
        OR
        (
          "transaction_items"."product_category" = 'fertilizer'
          AND "transaction_items"."sale_unit" = 'sack'
        )
        OR
        (
          "transaction_items"."product_category" = 'culled_chicken'
          AND "transaction_items"."sale_unit" = 'head'
        )
        OR
        ("transaction_items"."product_category" = 'other')
      ),
	CONSTRAINT "transaction_items_unit_conversion_check" CHECK(
        (
          "transaction_items"."sale_unit" = 'rack'
          AND "transaction_items"."rack_size_snapshot" IS NOT NULL
          AND "transaction_items"."rack_size_snapshot" > 0
          AND "transaction_items"."quantity_in_base_unit"
            = "transaction_items"."quantity" * "transaction_items"."rack_size_snapshot"
        )
        OR
        (
          "transaction_items"."sale_unit" <> 'rack'
          AND "transaction_items"."rack_size_snapshot" IS NULL
          AND "transaction_items"."quantity_in_base_unit" = "transaction_items"."quantity"
        )
      )
);
--> statement-breakpoint
CREATE INDEX `transaction_items_transaction_index` ON `transaction_items` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `transaction_items_product_index` ON `transaction_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_number` text NOT NULL,
	`transaction_date` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`payment_method` text NOT NULL,
	`total_amount` integer NOT NULL,
	`amount_paid` integer NOT NULL,
	`change_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_by_name` text NOT NULL,
	`created_by_role` text NOT NULL,
	`cancelled_by_user_id` text,
	`cancelled_by_name` text,
	`cancelled_by_role` text,
	`cancelled_at` integer,
	`cancellation_reason` text,
	`cancellation_note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "transactions_payment_method_check" CHECK("transactions"."payment_method" IN ('cash', 'qris')),
	CONSTRAINT "transactions_status_check" CHECK("transactions"."status" IN ('paid', 'cancelled')),
	CONSTRAINT "transactions_created_by_role_check" CHECK("transactions"."created_by_role" IN ('owner', 'cashier')),
	CONSTRAINT "transactions_cancelled_by_role_check" CHECK(
        "transactions"."cancelled_by_role" IS NULL
        OR "transactions"."cancelled_by_role" IN ('owner', 'cashier')
      ),
	CONSTRAINT "transactions_total_amount_check" CHECK("transactions"."total_amount" > 0),
	CONSTRAINT "transactions_amount_paid_check" CHECK("transactions"."amount_paid" >= 0),
	CONSTRAINT "transactions_change_amount_check" CHECK("transactions"."change_amount" >= 0),
	CONSTRAINT "transactions_payment_amounts_check" CHECK(
        (
          "transactions"."payment_method" = 'cash'
          AND "transactions"."amount_paid" >= "transactions"."total_amount"
          AND "transactions"."change_amount"
            = "transactions"."amount_paid" - "transactions"."total_amount"
        )
        OR
        (
          "transactions"."payment_method" = 'qris'
          AND "transactions"."amount_paid" = "transactions"."total_amount"
          AND "transactions"."change_amount" = 0
        )
      ),
	CONSTRAINT "transactions_cancellation_reason_check" CHECK(
        "transactions"."cancellation_reason" IS NULL
        OR "transactions"."cancellation_reason" IN (
          'wrong_quantity',
          'wrong_product',
          'wrong_payment_method',
          'customer_cancelled',
          'other'
        )
      ),
	CONSTRAINT "transactions_cancellation_state_check" CHECK(
        (
          "transactions"."status" = 'paid'
          AND "transactions"."cancelled_by_user_id" IS NULL
          AND "transactions"."cancelled_by_name" IS NULL
          AND "transactions"."cancelled_by_role" IS NULL
          AND "transactions"."cancelled_at" IS NULL
          AND "transactions"."cancellation_reason" IS NULL
          AND "transactions"."cancellation_note" IS NULL
        )
        OR
        (
          "transactions"."status" = 'cancelled'
          AND "transactions"."cancelled_by_name" IS NOT NULL
          AND "transactions"."cancelled_by_role" IS NOT NULL
          AND "transactions"."cancelled_at" IS NOT NULL
          AND "transactions"."cancellation_reason" IS NOT NULL
        )
      ),
	CONSTRAINT "transactions_other_cancellation_note_check" CHECK(
        "transactions"."status" <> 'cancelled'
        OR "transactions"."cancellation_reason" <> 'other'
        OR (
          "transactions"."cancellation_note" IS NOT NULL
          AND length(trim("transactions"."cancellation_note")) > 0
        )
      )
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_number_unique` ON `transactions` (`transaction_number`);--> statement-breakpoint
CREATE INDEX `transactions_date_index` ON `transactions` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_status_index` ON `transactions` (`status`);--> statement-breakpoint
CREATE INDEX `transactions_payment_method_index` ON `transactions` (`payment_method`);--> statement-breakpoint
CREATE INDEX `transactions_created_by_user_index` ON `transactions` (`created_by_user_id`);