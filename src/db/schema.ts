import { int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Categories ──────────────────────────────────────────────────────────────

export const categories = sqliteTable('categories', {
  id:         text('id').primaryKey(),
  name:       text('name').notNull(),
  color:      text('color').notNull().default('#0ea5e9'), // hex
  icon:       text('icon').notNull().default('tag'),       // lucide icon name
  createdAt:  text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Tasks / Goals ────────────────────────────────────────────────────────────

export const tasks = sqliteTable('tasks', {
  id:            text('id').primaryKey(),
  title:         text('title').notNull(),
  description:   text('description'),
  categoryId:    text('category_id').references(() => categories.id),
  // JSON: ScheduleRule — see src/lib/recurrence.ts for shape
  scheduleRule:  text('schedule_rule').notNull(),
  pointValue:    int('point_value').notNull().default(10),
  // null = standalone task, non-null = belongs to a goal
  parentGoalId:  text('parent_goal_id'),
  // if true, this row represents a Goal (container for child tasks)
  isGoal:        int('is_goal', { mode: 'boolean' }).notNull().default(false),
  // bonus points awarded when all child tasks of this goal are completed
  bonusPoints:   int('bonus_points').notNull().default(0),
  // 'easy' = 0.5×, 'normal' = 1×, 'hard' = 2× of pointValue at completion
  difficulty:    text('difficulty').default('normal'),
  sortOrder:     int('sort_order').notNull().default(0),
  archivedAt:    text('archived_at'),
  createdAt:     text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Completions ──────────────────────────────────────────────────────────────

export const completions = sqliteTable('completions', {
  id:          text('id').primaryKey(),
  taskId:      text('task_id').notNull().references(() => tasks.id),
  completedAt: text('completed_at').notNull().default(sql`(datetime('now'))`),
  // ISO date this completion counts toward (the "due date" it satisfies)
  forDate:     text('for_date').notNull(),
});

// ─── Points Ledger (append-only) ─────────────────────────────────────────────

export const pointsLedger = sqliteTable('points_ledger', {
  id:        text('id').primaryKey(),
  delta:     int('delta').notNull(),          // positive = earned, negative = spent
  reason:    text('reason').notNull(),         // 'task_complete' | 'goal_bonus' | 'reward_redeem'
  taskId:    text('task_id'),                  // set for task_complete / goal_bonus
  rewardId:  text('reward_id'),               // set for reward_redeem
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Rewards ─────────────────────────────────────────────────────────────────

export const rewards = sqliteTable('rewards', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  description:   text('description'),
  pointCost:     int('point_cost').notNull(),
  imageUri:      text('image_uri'),
  redeemedCount: int('redeemed_count').notNull().default(0),
  archivedAt:    text('archived_at'),
  createdAt:     text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Achievements ─────────────────────────────────────────────────────────────

export const achievements = sqliteTable('achievements', {
  id:          text('id').primaryKey(),
  key:         text('key').notNull().unique(),    // e.g. 'first_task', 'streak_7'
  unlockedAt:  text('unlocked_at').notNull().default(sql`(datetime('now'))`),
  seen:        int('seen', { mode: 'boolean' }).notNull().default(false),
});

// ─── App Settings (key-value store for preferences) ─────────────────────────

export const appSettings = sqliteTable('app_settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Category    = typeof categories.$inferSelect;
export type Task        = typeof tasks.$inferSelect;
export type Completion  = typeof completions.$inferSelect;
export type PointEntry  = typeof pointsLedger.$inferSelect;
export type Reward      = typeof rewards.$inferSelect;

export type Achievement   = typeof achievements.$inferSelect;
export type NewCategory   = typeof categories.$inferInsert;
export type NewTask       = typeof tasks.$inferInsert;
export type NewCompletion = typeof completions.$inferInsert;
export type NewPointEntry = typeof pointsLedger.$inferInsert;
export type NewReward     = typeof rewards.$inferInsert;
export type AppSetting    = typeof appSettings.$inferSelect;
