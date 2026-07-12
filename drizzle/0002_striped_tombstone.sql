ALTER TABLE `arl_events` ADD `event_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `arl_events` ADD `arl_level` integer;--> statement-breakpoint
ALTER TABLE `arl_events` ADD `dimension_scores` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `firmographic_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `intent_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `arl_token` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `arl_level` integer;--> statement-breakpoint
ALTER TABLE `prospects` ADD `arl_last_event` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `arl_completed_at` text;
--> statement-breakpoint
UPDATE `prospects` SET `firmographic_score` = `score` WHERE `firmographic_score` = 0;
