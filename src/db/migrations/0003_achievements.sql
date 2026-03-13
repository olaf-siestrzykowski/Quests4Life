CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`unlocked_at` text DEFAULT (datetime('now')) NOT NULL,
	`seen` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_key_unique` ON `achievements` (`key`);
