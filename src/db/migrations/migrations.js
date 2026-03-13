// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo
// SQL is inlined as strings to avoid Metro asset resolution issues with .sql files.

import journal from './meta/_journal.json';

const m0000 = `CREATE TABLE \`categories\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`color\` text DEFAULT '#0ea5e9' NOT NULL,
	\`icon\` text DEFAULT 'tag' NOT NULL,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`completions\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`task_id\` text NOT NULL,
	\`completed_at\` text DEFAULT (datetime('now')) NOT NULL,
	\`for_date\` text NOT NULL,
	FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE \`points_ledger\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`delta\` integer NOT NULL,
	\`reason\` text NOT NULL,
	\`task_id\` text,
	\`reward_id\` text,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`rewards\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`description\` text,
	\`point_cost\` integer NOT NULL,
	\`image_uri\` text,
	\`redeemed_count\` integer DEFAULT 0 NOT NULL,
	\`archived_at\` text,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`tasks\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`title\` text NOT NULL,
	\`description\` text,
	\`category_id\` text,
	\`schedule_rule\` text NOT NULL,
	\`point_value\` integer DEFAULT 10 NOT NULL,
	\`parent_goal_id\` text,
	\`is_goal\` integer DEFAULT false NOT NULL,
	\`bonus_points\` integer DEFAULT 0 NOT NULL,
	\`sort_order\` integer DEFAULT 0 NOT NULL,
	\`archived_at\` text,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE no action
);`;

const m0001 = `CREATE TABLE \`app_settings\` (
	\`key\` text PRIMARY KEY NOT NULL,
	\`value\` text NOT NULL
);`;

const m0002 = `ALTER TABLE \`tasks\` ADD \`difficulty\` text DEFAULT 'normal';`;

const m0003 = `CREATE TABLE \`achievements\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`key\` text NOT NULL,
	\`unlocked_at\` text DEFAULT (datetime('now')) NOT NULL,
	\`seen\` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`achievements_key_unique\` ON \`achievements\` (\`key\`);`;

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
  },
};
