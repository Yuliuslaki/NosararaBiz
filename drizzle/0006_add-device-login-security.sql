PRAGMA foreign_keys=OFF;--> statement-breakpoint

CREATE TABLE `__new_app_config` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`business_name` text NOT NULL,
	`owner_wa_number` text,
	`egg_rack_size` integer DEFAULT 30 NOT NULL,
	`setup_completed` integer DEFAULT false NOT NULL,
	`session_timeout_minutes` integer DEFAULT 5 NOT NULL,
	`login_failed_attempts` integer DEFAULT 0 NOT NULL,
	`login_locked_until` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "app_config_single_row_check"
		CHECK("__new_app_config"."id" = 1),
	CONSTRAINT "app_config_egg_rack_size_check"
		CHECK("__new_app_config"."egg_rack_size" > 0),
	CONSTRAINT "app_config_session_timeout_check"
		CHECK("__new_app_config"."session_timeout_minutes" > 0),
	CONSTRAINT "app_config_login_failed_attempts_check"
		CHECK("__new_app_config"."login_failed_attempts" >= 0)
);--> statement-breakpoint

INSERT INTO `__new_app_config` (
	"id",
	"business_name",
	"owner_wa_number",
	"egg_rack_size",
	"setup_completed",
	"session_timeout_minutes",
	"login_failed_attempts",
	"login_locked_until",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"business_name",
	"owner_wa_number",
	"egg_rack_size",
	"setup_completed",
	"session_timeout_minutes",
	0,
	NULL,
	"created_at",
	"updated_at"
FROM `app_config`;--> statement-breakpoint

DROP TABLE `app_config`;--> statement-breakpoint

ALTER TABLE `__new_app_config`
	RENAME TO `app_config`;--> statement-breakpoint

PRAGMA foreign_keys=ON;