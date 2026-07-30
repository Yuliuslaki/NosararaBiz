CREATE TABLE `report_delivery_history` (
	`id` text PRIMARY KEY NOT NULL,
	`report_type` text NOT NULL,
	`delivery_mode` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`destination_wa_number` text,
	`file_name` text,
	`file_uri` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_attempt_at` integer,
	`sent_at` integer,
	`error_message` text,
	`created_by_user_id` text,
	`created_by_name` text NOT NULL,
	`created_by_role` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,

	FOREIGN KEY (`created_by_user_id`)
		REFERENCES `users`(`id`)
		ON UPDATE no action
		ON DELETE set null,

	CONSTRAINT "report_delivery_history_type_check"
		CHECK(
			"report_delivery_history"."report_type"
			IN ('daily_message', 'pdf', 'excel')
		),

	CONSTRAINT "report_delivery_history_mode_check"
		CHECK(
			"report_delivery_history"."delivery_mode"
			IN ('automatic', 'manual')
		),

	CONSTRAINT "report_delivery_history_status_check"
		CHECK(
			"report_delivery_history"."status" IN (
				'pending',
				'generated',
				'waiting_connection',
				'sent',
				'failed'
			)
		),

	CONSTRAINT "report_delivery_history_attempt_count_check"
		CHECK(
			"report_delivery_history"."attempt_count" >= 0
		),

	CONSTRAINT "report_delivery_history_period_check"
		CHECK(
			"report_delivery_history"."period_end"
				>= "report_delivery_history"."period_start"
		),

	CONSTRAINT "report_delivery_history_created_by_role_check"
		CHECK(
			"report_delivery_history"."created_by_role"
			IN ('owner', 'system')
		),

	CONSTRAINT "report_delivery_history_type_mode_check"
		CHECK(
			(
				"report_delivery_history"."report_type" = 'daily_message'
				AND "report_delivery_history"."delivery_mode" = 'automatic'
			)
			OR
			(
				"report_delivery_history"."report_type" IN ('pdf', 'excel')
				AND "report_delivery_history"."delivery_mode" = 'manual'
			)
		),

	CONSTRAINT "report_delivery_history_daily_message_check"
		CHECK(
			"report_delivery_history"."report_type" <> 'daily_message'
			OR (
				"report_delivery_history"."destination_wa_number" IS NOT NULL
				AND length(
					trim(
						"report_delivery_history"."destination_wa_number"
					)
				) > 0
				AND "report_delivery_history"."file_name" IS NULL
				AND "report_delivery_history"."file_uri" IS NULL
				AND "report_delivery_history"."status" IN (
					'pending',
					'waiting_connection',
					'sent',
					'failed'
				)
			)
		),

	CONSTRAINT "report_delivery_history_document_check"
		CHECK(
			"report_delivery_history"."report_type" = 'daily_message'
			OR (
				"report_delivery_history"."status"
					IN ('pending', 'generated', 'sent', 'failed')
				AND (
					(
						"report_delivery_history"."file_name" IS NULL
						AND "report_delivery_history"."file_uri" IS NULL
					)
					OR
					(
						"report_delivery_history"."file_name" IS NOT NULL
						AND length(
							trim(
								"report_delivery_history"."file_name"
							)
						) > 0
						AND "report_delivery_history"."file_uri" IS NOT NULL
						AND length(
							trim(
								"report_delivery_history"."file_uri"
							)
						) > 0
					)
				)
			)
		),

	CONSTRAINT "report_delivery_history_sent_state_check"
		CHECK(
			(
				"report_delivery_history"."status" = 'sent'
				AND "report_delivery_history"."sent_at" IS NOT NULL
			)
			OR
			(
				"report_delivery_history"."status" <> 'sent'
				AND "report_delivery_history"."sent_at" IS NULL
			)
		),

	CONSTRAINT "report_delivery_history_error_state_check"
		CHECK(
			(
				"report_delivery_history"."status" = 'failed'
				AND "report_delivery_history"."error_message" IS NOT NULL
				AND length(
					trim(
						"report_delivery_history"."error_message"
					)
				) > 0
			)
			OR
			(
				"report_delivery_history"."status" <> 'failed'
				AND "report_delivery_history"."error_message" IS NULL
			)
		)
);
--> statement-breakpoint

CREATE INDEX `report_delivery_history_type_index`
	ON `report_delivery_history` (`report_type`);
--> statement-breakpoint

CREATE INDEX `report_delivery_history_status_index`
	ON `report_delivery_history` (`status`);
--> statement-breakpoint

CREATE INDEX `report_delivery_history_period_start_index`
	ON `report_delivery_history` (`period_start`);
--> statement-breakpoint

CREATE INDEX `report_delivery_history_created_at_index`
	ON `report_delivery_history` (`created_at`);
--> statement-breakpoint

CREATE INDEX `report_delivery_history_created_by_user_index`
	ON `report_delivery_history` (`created_by_user_id`);
--> statement-breakpoint

CREATE TABLE `report_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`daily_whatsapp_enabled` integer DEFAULT false NOT NULL,
	`daily_whatsapp_time` text DEFAULT '00:00' NOT NULL,
	`send_when_online` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,

	CONSTRAINT "report_settings_single_row_check"
		CHECK(
			"report_settings"."id" = 1
		),

	CONSTRAINT "report_settings_daily_time_check"
		CHECK(
			"report_settings"."daily_whatsapp_time" = '00:00'
		)
);
--> statement-breakpoint

INSERT INTO `report_settings` (
	`id`,
	`daily_whatsapp_enabled`,
	`daily_whatsapp_time`,
	`send_when_online`,
	`created_at`,
	`updated_at`
)
VALUES (
	1,
	0,
	'00:00',
	1,
	(unixepoch() * 1000),
	(unixepoch() * 1000)
);