CREATE TABLE `import_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`state_codes` text NOT NULL,
	`current_state_index` integer DEFAULT 0 NOT NULL,
	`sector` text DEFAULT '0' NOT NULL,
	`stratum` text DEFAULT '0' NOT NULL,
	`page_size` integer DEFAULT 100 NOT NULL,
	`max_records` integer DEFAULT 5000 NOT NULL,
	`next_record` integer DEFAULT 1 NOT NULL,
	`processed_count` integer DEFAULT 0 NOT NULL,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `prospects` ADD `clee` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `activity_code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `locality` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `postal_code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `score_reasons` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `source` text DEFAULT 'denue' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `is_demo` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `imported_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;
--> statement-breakpoint
UPDATE `prospects` SET `source` = 'demo', `is_demo` = 1
WHERE `id` IN (
  'denue-1001','denue-1002','denue-1003','denue-1004','denue-1005','denue-1006',
  'denue-1007','denue-1008','denue-1009','denue-1010','denue-1011','denue-1012'
);
