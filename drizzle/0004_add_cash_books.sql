CREATE TABLE `cash_books` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`related_transaction_id` text,
	`created_by_user_id` text,
	`created_by_name` text NOT NULL,
	`created_by_role` text NOT NULL,
	`entry_date` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`related_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "cash_books_type_check" CHECK("cash_books"."type" IN ('income', 'expense')),
	CONSTRAINT "cash_books_amount_check" CHECK("cash_books"."amount" > 0),
	CONSTRAINT "cash_books_category_check" CHECK("cash_books"."category" IN (
        'sale',
        'sale_refund',
        'feed',
        'transportation',
        'operations',
        'electricity',
        'medicine',
        'other'
      )),
	CONSTRAINT "cash_books_created_by_role_check" CHECK("cash_books"."created_by_role" IN (
        'owner',
        'cashier',
        'system'
      )),
	CONSTRAINT "cash_books_category_type_check" CHECK(
        (
          "cash_books"."category" = 'sale'
          AND "cash_books"."type" = 'income'
          AND "cash_books"."related_transaction_id" IS NOT NULL
        )
        OR
        (
          "cash_books"."category" = 'sale_refund'
          AND "cash_books"."type" = 'expense'
          AND "cash_books"."related_transaction_id" IS NOT NULL
        )
        OR
        (
          "cash_books"."category" IN (
            'feed',
            'transportation',
            'operations',
            'electricity',
            'medicine',
            'other'
          )
          AND "cash_books"."type" = 'expense'
          AND "cash_books"."related_transaction_id" IS NULL
        )
      )
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cash_books_transaction_category_unique` ON `cash_books` (`related_transaction_id`,`category`);--> statement-breakpoint
CREATE INDEX `cash_books_entry_date_index` ON `cash_books` (`entry_date`);--> statement-breakpoint
CREATE INDEX `cash_books_type_index` ON `cash_books` (`type`);--> statement-breakpoint
CREATE INDEX `cash_books_category_index` ON `cash_books` (`category`);--> statement-breakpoint
CREATE INDEX `cash_books_transaction_index` ON `cash_books` (`related_transaction_id`);--> statement-breakpoint
CREATE INDEX `cash_books_user_index` ON `cash_books` (`created_by_user_id`);