CREATE TABLE `__backup_0005_users` AS
SELECT
  `id`,
  `full_name`,
  `username`,
  CASE
    WHEN `role` = 'cashier' THEN 'officer'
    ELSE `role`
  END AS `role`,
  `pin_hash`,
  `pin_salt`,
  `is_active`,
  `failed_login_attempts`,
  `locked_until`,
  `last_login_at`,
  `deleted_at`,
  `created_at`,
  `updated_at`
FROM `users`;--> statement-breakpoint

CREATE TABLE `__backup_0005_transactions` AS
SELECT
  `id`,
  `transaction_number`,
  `transaction_date`,
  `payment_method`,
  `total_amount`,
  `amount_paid`,
  `change_amount`,
  `status`,
  `created_by_user_id`,
  `created_by_name`,
  CASE
    WHEN `created_by_role` = 'cashier' THEN 'officer'
    ELSE `created_by_role`
  END AS `created_by_role`,
  `cancelled_by_user_id`,
  `cancelled_by_name`,
  CASE
    WHEN `cancelled_by_role` = 'cashier' THEN 'officer'
    ELSE `cancelled_by_role`
  END AS `cancelled_by_role`,
  `cancelled_at`,
  `cancellation_reason`,
  `cancellation_note`,
  `created_at`,
  `updated_at`
FROM `transactions`;--> statement-breakpoint

CREATE TABLE `__backup_0005_transaction_items` AS
SELECT
  `id`,
  `transaction_id`,
  `product_id`,
  `product_name`,
  `product_category`,
  `sale_unit`,
  `quantity`,
  `quantity_in_base_unit`,
  `unit_price`,
  `subtotal`,
  `rack_size_snapshot`,
  `created_at`
FROM `transaction_items`;--> statement-breakpoint

CREATE TABLE `__backup_0005_cash_books` AS
SELECT
  `id`,
  `type`,
  `amount`,
  `category`,
  `description`,
  `related_transaction_id`,
  `created_by_user_id`,
  `created_by_name`,
  CASE
    WHEN `created_by_role` = 'cashier' THEN 'officer'
    ELSE `created_by_role`
  END AS `created_by_role`,
  `entry_date`,
  `created_at`,
  `updated_at`
FROM `cash_books`;--> statement-breakpoint

CREATE TABLE `__backup_0005_stock_history` AS
SELECT
  `id`,
  `product_id`,
  `change_type`,
  `quantity_change`,
  `resulting_stock`,
  `note`,
  `reference_type`,
  `reference_id`,
  `performed_by_user_id`,
  `performed_by_name`,
  CASE
    WHEN `performed_by_role` = 'cashier' THEN 'officer'
    ELSE `performed_by_role`
  END AS `performed_by_role`,
  `created_at`
FROM `stock_history`;--> statement-breakpoint

DROP TABLE `transaction_items`;--> statement-breakpoint
DROP TABLE `cash_books`;--> statement-breakpoint
DROP TABLE `stock_history`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint

CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `full_name` text NOT NULL,
  `username` text NOT NULL,
  `role` text NOT NULL,
  `pin_hash` text NOT NULL,
  `pin_salt` text NOT NULL,
  `is_active` integer DEFAULT true NOT NULL,
  `failed_login_attempts` integer DEFAULT 0 NOT NULL,
  `locked_until` integer,
  `last_login_at` integer,
  `deleted_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  CONSTRAINT "users_role_check"
    CHECK(`users`.`role` IN ('owner', 'officer')),
  CONSTRAINT "users_failed_login_attempts_check"
    CHECK(`users`.`failed_login_attempts` >= 0)
);--> statement-breakpoint

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

  FOREIGN KEY (`created_by_user_id`)
    REFERENCES `users`(`id`)
    ON UPDATE no action
    ON DELETE restrict,

  FOREIGN KEY (`cancelled_by_user_id`)
    REFERENCES `users`(`id`)
    ON UPDATE no action
    ON DELETE set null,

  CONSTRAINT "transactions_payment_method_check"
    CHECK(`transactions`.`payment_method` IN ('cash', 'qris')),

  CONSTRAINT "transactions_status_check"
    CHECK(`transactions`.`status` IN ('paid', 'cancelled')),

  CONSTRAINT "transactions_created_by_role_check"
    CHECK(`transactions`.`created_by_role` IN ('owner', 'officer')),

  CONSTRAINT "transactions_cancelled_by_role_check"
    CHECK(
      `transactions`.`cancelled_by_role` IS NULL
      OR `transactions`.`cancelled_by_role` IN ('owner', 'officer')
    ),

  CONSTRAINT "transactions_total_amount_check"
    CHECK(`transactions`.`total_amount` > 0),

  CONSTRAINT "transactions_amount_paid_check"
    CHECK(`transactions`.`amount_paid` >= 0),

  CONSTRAINT "transactions_change_amount_check"
    CHECK(`transactions`.`change_amount` >= 0),

  CONSTRAINT "transactions_payment_amounts_check"
    CHECK(
      (
        `transactions`.`payment_method` = 'cash'
        AND `transactions`.`amount_paid` >= `transactions`.`total_amount`
        AND `transactions`.`change_amount`
          = `transactions`.`amount_paid` - `transactions`.`total_amount`
      )
      OR
      (
        `transactions`.`payment_method` = 'qris'
        AND `transactions`.`amount_paid` = `transactions`.`total_amount`
        AND `transactions`.`change_amount` = 0
      )
    ),

  CONSTRAINT "transactions_cancellation_reason_check"
    CHECK(
      `transactions`.`cancellation_reason` IS NULL
      OR `transactions`.`cancellation_reason` IN (
        'wrong_quantity',
        'wrong_product',
        'wrong_payment_method',
        'customer_cancelled',
        'other'
      )
    ),

  CONSTRAINT "transactions_cancellation_state_check"
    CHECK(
      (
        `transactions`.`status` = 'paid'
        AND `transactions`.`cancelled_by_user_id` IS NULL
        AND `transactions`.`cancelled_by_name` IS NULL
        AND `transactions`.`cancelled_by_role` IS NULL
        AND `transactions`.`cancelled_at` IS NULL
        AND `transactions`.`cancellation_reason` IS NULL
        AND `transactions`.`cancellation_note` IS NULL
      )
      OR
      (
        `transactions`.`status` = 'cancelled'
        AND `transactions`.`cancelled_by_name` IS NOT NULL
        AND `transactions`.`cancelled_by_role` IS NOT NULL
        AND `transactions`.`cancelled_at` IS NOT NULL
        AND `transactions`.`cancellation_reason` IS NOT NULL
      )
    ),

  CONSTRAINT "transactions_other_cancellation_note_check"
    CHECK(
      `transactions`.`status` <> 'cancelled'
      OR `transactions`.`cancellation_reason` <> 'other'
      OR (
        `transactions`.`cancellation_note` IS NOT NULL
        AND length(trim(`transactions`.`cancellation_note`)) > 0
      )
    )
);--> statement-breakpoint

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

  FOREIGN KEY (`transaction_id`)
    REFERENCES `transactions`(`id`)
    ON UPDATE no action
    ON DELETE cascade,

  FOREIGN KEY (`product_id`)
    REFERENCES `products`(`id`)
    ON UPDATE no action
    ON DELETE restrict,

  CONSTRAINT "transaction_items_category_check"
    CHECK(`transaction_items`.`product_category` IN (
      'eggs',
      'fertilizer',
      'culled_chicken',
      'other'
    )),

  CONSTRAINT "transaction_items_sale_unit_check"
    CHECK(`transaction_items`.`sale_unit` IN (
      'rack',
      'piece',
      'sack',
      'head'
    )),

  CONSTRAINT "transaction_items_quantity_check"
    CHECK(`transaction_items`.`quantity` > 0),

  CONSTRAINT "transaction_items_base_quantity_check"
    CHECK(`transaction_items`.`quantity_in_base_unit` > 0),

  CONSTRAINT "transaction_items_unit_price_check"
    CHECK(`transaction_items`.`unit_price` >= 0),

  CONSTRAINT "transaction_items_subtotal_check"
    CHECK(
      `transaction_items`.`subtotal` >= 0
      AND `transaction_items`.`subtotal`
        = `transaction_items`.`quantity`
          * `transaction_items`.`unit_price`
    ),

  CONSTRAINT "transaction_items_category_unit_check"
    CHECK(
      (
        `transaction_items`.`product_category` = 'eggs'
        AND `transaction_items`.`sale_unit` IN ('rack', 'piece')
      )
      OR
      (
        `transaction_items`.`product_category` = 'fertilizer'
        AND `transaction_items`.`sale_unit` = 'sack'
      )
      OR
      (
        `transaction_items`.`product_category` = 'culled_chicken'
        AND `transaction_items`.`sale_unit` = 'head'
      )
      OR
      (`transaction_items`.`product_category` = 'other')
    ),

  CONSTRAINT "transaction_items_unit_conversion_check"
    CHECK(
      (
        `transaction_items`.`sale_unit` = 'rack'
        AND `transaction_items`.`rack_size_snapshot` IS NOT NULL
        AND `transaction_items`.`rack_size_snapshot` > 0
        AND `transaction_items`.`quantity_in_base_unit`
          = `transaction_items`.`quantity`
            * `transaction_items`.`rack_size_snapshot`
      )
      OR
      (
        `transaction_items`.`sale_unit` <> 'rack'
        AND `transaction_items`.`rack_size_snapshot` IS NULL
        AND `transaction_items`.`quantity_in_base_unit`
          = `transaction_items`.`quantity`
      )
    )
);--> statement-breakpoint

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

  FOREIGN KEY (`related_transaction_id`)
    REFERENCES `transactions`(`id`)
    ON UPDATE no action
    ON DELETE restrict,

  FOREIGN KEY (`created_by_user_id`)
    REFERENCES `users`(`id`)
    ON UPDATE no action
    ON DELETE set null,

  CONSTRAINT "cash_books_type_check"
    CHECK(`cash_books`.`type` IN ('income', 'expense')),

  CONSTRAINT "cash_books_amount_check"
    CHECK(`cash_books`.`amount` > 0),

  CONSTRAINT "cash_books_category_check"
    CHECK(`cash_books`.`category` IN (
      'sale',
      'sale_refund',
      'feed',
      'transportation',
      'operations',
      'electricity',
      'medicine',
      'other'
    )),

  CONSTRAINT "cash_books_created_by_role_check"
    CHECK(`cash_books`.`created_by_role` IN (
      'owner',
      'officer',
      'system'
    )),

  CONSTRAINT "cash_books_category_type_check"
    CHECK(
      (
        `cash_books`.`category` = 'sale'
        AND `cash_books`.`type` = 'income'
        AND `cash_books`.`related_transaction_id` IS NOT NULL
      )
      OR
      (
        `cash_books`.`category` = 'sale_refund'
        AND `cash_books`.`type` = 'expense'
        AND `cash_books`.`related_transaction_id` IS NOT NULL
      )
      OR
      (
        `cash_books`.`category` IN (
          'feed',
          'transportation',
          'operations',
          'electricity',
          'medicine',
          'other'
        )
        AND `cash_books`.`type` = 'expense'
        AND `cash_books`.`related_transaction_id` IS NULL
      )
    )
);--> statement-breakpoint

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

  FOREIGN KEY (`product_id`)
    REFERENCES `products`(`id`)
    ON UPDATE no action
    ON DELETE restrict,

  FOREIGN KEY (`performed_by_user_id`)
    REFERENCES `users`(`id`)
    ON UPDATE no action
    ON DELETE set null,

  CONSTRAINT "stock_history_change_type_check"
    CHECK(`stock_history`.`change_type` IN (
      'initial_stock',
      'stock_addition',
      'sale',
      'sale_cancellation',
      'manual_correction'
    )),

  CONSTRAINT "stock_history_quantity_change_check"
    CHECK(`stock_history`.`quantity_change` <> 0),

  CONSTRAINT "stock_history_resulting_stock_check"
    CHECK(`stock_history`.`resulting_stock` >= 0),

  CONSTRAINT "stock_history_reference_type_check"
    CHECK(`stock_history`.`reference_type` IN (
      'product',
      'transaction',
      'manual'
    )),

  CONSTRAINT "stock_history_performed_by_role_check"
    CHECK(`stock_history`.`performed_by_role` IN (
      'owner',
      'officer',
      'system'
    ))
);--> statement-breakpoint

INSERT INTO `users` (
  `id`,
  `full_name`,
  `username`,
  `role`,
  `pin_hash`,
  `pin_salt`,
  `is_active`,
  `failed_login_attempts`,
  `locked_until`,
  `last_login_at`,
  `deleted_at`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `full_name`,
  `username`,
  `role`,
  `pin_hash`,
  `pin_salt`,
  `is_active`,
  `failed_login_attempts`,
  `locked_until`,
  `last_login_at`,
  `deleted_at`,
  `created_at`,
  `updated_at`
FROM `__backup_0005_users`;--> statement-breakpoint

INSERT INTO `transactions` (
  `id`,
  `transaction_number`,
  `transaction_date`,
  `payment_method`,
  `total_amount`,
  `amount_paid`,
  `change_amount`,
  `status`,
  `created_by_user_id`,
  `created_by_name`,
  `created_by_role`,
  `cancelled_by_user_id`,
  `cancelled_by_name`,
  `cancelled_by_role`,
  `cancelled_at`,
  `cancellation_reason`,
  `cancellation_note`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `transaction_number`,
  `transaction_date`,
  `payment_method`,
  `total_amount`,
  `amount_paid`,
  `change_amount`,
  `status`,
  `created_by_user_id`,
  `created_by_name`,
  `created_by_role`,
  `cancelled_by_user_id`,
  `cancelled_by_name`,
  `cancelled_by_role`,
  `cancelled_at`,
  `cancellation_reason`,
  `cancellation_note`,
  `created_at`,
  `updated_at`
FROM `__backup_0005_transactions`;--> statement-breakpoint

INSERT INTO `transaction_items` (
  `id`,
  `transaction_id`,
  `product_id`,
  `product_name`,
  `product_category`,
  `sale_unit`,
  `quantity`,
  `quantity_in_base_unit`,
  `unit_price`,
  `subtotal`,
  `rack_size_snapshot`,
  `created_at`
)
SELECT
  `id`,
  `transaction_id`,
  `product_id`,
  `product_name`,
  `product_category`,
  `sale_unit`,
  `quantity`,
  `quantity_in_base_unit`,
  `unit_price`,
  `subtotal`,
  `rack_size_snapshot`,
  `created_at`
FROM `__backup_0005_transaction_items`;--> statement-breakpoint

INSERT INTO `cash_books` (
  `id`,
  `type`,
  `amount`,
  `category`,
  `description`,
  `related_transaction_id`,
  `created_by_user_id`,
  `created_by_name`,
  `created_by_role`,
  `entry_date`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `type`,
  `amount`,
  `category`,
  `description`,
  `related_transaction_id`,
  `created_by_user_id`,
  `created_by_name`,
  `created_by_role`,
  `entry_date`,
  `created_at`,
  `updated_at`
FROM `__backup_0005_cash_books`;--> statement-breakpoint

INSERT INTO `stock_history` (
  `id`,
  `product_id`,
  `change_type`,
  `quantity_change`,
  `resulting_stock`,
  `note`,
  `reference_type`,
  `reference_id`,
  `performed_by_user_id`,
  `performed_by_name`,
  `performed_by_role`,
  `created_at`
)
SELECT
  `id`,
  `product_id`,
  `change_type`,
  `quantity_change`,
  `resulting_stock`,
  `note`,
  `reference_type`,
  `reference_id`,
  `performed_by_user_id`,
  `performed_by_name`,
  `performed_by_role`,
  `created_at`
FROM `__backup_0005_stock_history`;--> statement-breakpoint

DROP TABLE `__backup_0005_transaction_items`;--> statement-breakpoint
DROP TABLE `__backup_0005_cash_books`;--> statement-breakpoint
DROP TABLE `__backup_0005_stock_history`;--> statement-breakpoint
DROP TABLE `__backup_0005_transactions`;--> statement-breakpoint
DROP TABLE `__backup_0005_users`;--> statement-breakpoint

CREATE UNIQUE INDEX `users_username_unique`
ON `users` (`username`);--> statement-breakpoint

CREATE UNIQUE INDEX `transactions_number_unique`
ON `transactions` (`transaction_number`);--> statement-breakpoint

CREATE INDEX `transactions_date_index`
ON `transactions` (`transaction_date`);--> statement-breakpoint

CREATE INDEX `transactions_status_index`
ON `transactions` (`status`);--> statement-breakpoint

CREATE INDEX `transactions_payment_method_index`
ON `transactions` (`payment_method`);--> statement-breakpoint

CREATE INDEX `transactions_created_by_user_index`
ON `transactions` (`created_by_user_id`);--> statement-breakpoint

CREATE INDEX `transaction_items_transaction_index`
ON `transaction_items` (`transaction_id`);--> statement-breakpoint

CREATE INDEX `transaction_items_product_index`
ON `transaction_items` (`product_id`);--> statement-breakpoint

CREATE UNIQUE INDEX `cash_books_transaction_category_unique`
ON `cash_books` (`related_transaction_id`, `category`);--> statement-breakpoint

CREATE INDEX `cash_books_entry_date_index`
ON `cash_books` (`entry_date`);--> statement-breakpoint

CREATE INDEX `cash_books_type_index`
ON `cash_books` (`type`);--> statement-breakpoint

CREATE INDEX `cash_books_category_index`
ON `cash_books` (`category`);--> statement-breakpoint

CREATE INDEX `cash_books_transaction_index`
ON `cash_books` (`related_transaction_id`);--> statement-breakpoint

CREATE INDEX `cash_books_user_index`
ON `cash_books` (`created_by_user_id`);--> statement-breakpoint

CREATE INDEX `stock_history_product_index`
ON `stock_history` (`product_id`);--> statement-breakpoint

CREATE INDEX `stock_history_created_at_index`
ON `stock_history` (`created_at`);--> statement-breakpoint

CREATE INDEX `stock_history_change_type_index`
ON `stock_history` (`change_type`);--> statement-breakpoint

CREATE INDEX `stock_history_user_index`
ON `stock_history` (`performed_by_user_id`);