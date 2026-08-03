ALTER TABLE `transactions`
ADD COLUMN `subtotal_amount` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `transactions`
ADD COLUMN `taxable_amount` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `transactions`
ADD COLUMN `vat_rate` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `transactions`
ADD COLUMN `vat_amount` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `transactions`
SET
  `subtotal_amount` = `total_amount`,
  `taxable_amount` = 0,
  `vat_rate` = 0,
  `vat_amount` = 0;
--> statement-breakpoint
ALTER TABLE `transaction_items`
ADD COLUMN `vat_treatment` text NOT NULL DEFAULT 'exempt';
--> statement-breakpoint
ALTER TABLE `transaction_items`
ADD COLUMN `vat_rate` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `transaction_items`
ADD COLUMN `vat_amount` integer NOT NULL DEFAULT 0;