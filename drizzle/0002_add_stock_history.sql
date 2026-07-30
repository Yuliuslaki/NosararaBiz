CREATE TABLE `stock_history` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`change_type` text NOT NULL,
	`quantity_change` integer NOT NULL,
	`resulting_stock` integer NOT NULL,
	`note` text,
	`reference_type` text NOT NULL,
	`reference_id` text,
	`performed_by_user_id` text,
	`performed_by_name` text NOT NULL,
	`performed_by_role` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`performed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "stock_history_change_type_check" CHECK("stock_history"."change_type" IN (
        'initial_stock',
        'stock_addition',
        'sale',
        'sale_cancellation',
        'manual_correction'
      )),
	CONSTRAINT "stock_history_quantity_change_check" CHECK("stock_history"."quantity_change" <> 0),
	CONSTRAINT "stock_history_resulting_stock_check" CHECK("stock_history"."resulting_stock" >= 0),
	CONSTRAINT "stock_history_reference_type_check" CHECK("stock_history"."reference_type" IN (
        'product',
        'transaction',
        'manual'
      )),
	CONSTRAINT "stock_history_performed_by_role_check" CHECK("stock_history"."performed_by_role" IN (
        'owner',
        'cashier',
        'system'
      ))
);
--> statement-breakpoint
CREATE INDEX `stock_history_product_index` ON `stock_history` (`product_id`);--> statement-breakpoint
CREATE INDEX `stock_history_created_at_index` ON `stock_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `stock_history_change_type_index` ON `stock_history` (`change_type`);--> statement-breakpoint
CREATE INDEX `stock_history_user_index` ON `stock_history` (`performed_by_user_id`);