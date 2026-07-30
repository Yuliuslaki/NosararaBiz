CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`base_unit` text NOT NULL,
	`price_per_base_unit` integer NOT NULL,
	`price_per_rack` integer,
	`current_stock` integer DEFAULT 0 NOT NULL,
	`min_stock_threshold` integer DEFAULT 0 NOT NULL,
	`rack_size` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "products_category_check" CHECK("products"."category" IN (
        'eggs',
        'fertilizer',
        'culled_chicken',
        'other'
      )),
	CONSTRAINT "products_base_unit_check" CHECK("products"."base_unit" IN ('rack', 'piece', 'sack', 'head')),
	CONSTRAINT "products_price_per_base_unit_check" CHECK("products"."price_per_base_unit" >= 0),
	CONSTRAINT "products_price_per_rack_check" CHECK("products"."price_per_rack" IS NULL OR "products"."price_per_rack" >= 0),
	CONSTRAINT "products_current_stock_check" CHECK("products"."current_stock" >= 0),
	CONSTRAINT "products_min_stock_threshold_check" CHECK("products"."min_stock_threshold" >= 0),
	CONSTRAINT "products_category_base_unit_check" CHECK(
        ("products"."category" = 'eggs' AND "products"."base_unit" = 'piece')
        OR
        ("products"."category" = 'fertilizer' AND "products"."base_unit" = 'sack')
        OR
        ("products"."category" = 'culled_chicken' AND "products"."base_unit" = 'head')
        OR
        ("products"."category" = 'other')
      ),
	CONSTRAINT "products_egg_configuration_check" CHECK(
        (
          "products"."category" = 'eggs'
          AND "products"."rack_size" IS NOT NULL
          AND "products"."rack_size" > 0
          AND "products"."price_per_rack" IS NOT NULL
        )
        OR
        (
          "products"."category" <> 'eggs'
          AND "products"."rack_size" IS NULL
          AND "products"."price_per_rack" IS NULL
        )
      )
);
--> statement-breakpoint
CREATE INDEX `products_category_index` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `products_active_index` ON `products` (`is_active`);