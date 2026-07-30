CREATE TABLE `app_config` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`business_name` text NOT NULL,
	`owner_wa_number` text,
	`egg_rack_size` integer DEFAULT 30 NOT NULL,
	`setup_completed` integer DEFAULT false NOT NULL,
	`session_timeout_minutes` integer DEFAULT 5 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "app_config_single_row_check" CHECK("app_config"."id" = 1),
	CONSTRAINT "app_config_egg_rack_size_check" CHECK("app_config"."egg_rack_size" > 0),
	CONSTRAINT "app_config_session_timeout_check" CHECK("app_config"."session_timeout_minutes" > 0)
);
--> statement-breakpoint
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
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('owner', 'cashier')),
	CONSTRAINT "users_failed_login_attempts_check" CHECK("users"."failed_login_attempts" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);