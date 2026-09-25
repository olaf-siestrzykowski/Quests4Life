CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`unlocked_at` text DEFAULT (datetime('now')) NOT NULL,
	`seen` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_key_unique` ON `achievements` (`key`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `difficulty` text DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `tasks` ADD `schedule_end_date` text;