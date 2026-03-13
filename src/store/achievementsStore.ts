import { create } from 'zustand';
import { db } from '@db/index';
import { achievements } from '@db/schema';
import type { Achievement } from '@db/schema';
import { eq } from 'drizzle-orm';
import { newId } from '@lib/ids';

export interface AchievementDef {
  key: string;
  label: string;
  emoji: string;
  description: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: 'first_task',         emoji: '🌱', label: 'First Step',       description: 'Complete your first task' },
  { key: 'tasks_10',           emoji: '🎯', label: 'On a Roll',        description: 'Complete 10 tasks total' },
  { key: 'tasks_50',           emoji: '⚡', label: 'Power User',       description: 'Complete 50 tasks total' },
  { key: 'tasks_100',          emoji: '💯', label: 'Century',          description: '100 total completions' },
  { key: 'tasks_500',          emoji: '🚀', label: 'Rocket',           description: '500 total completions' },
  { key: 'streak_3',           emoji: '🔥', label: 'On Fire',          description: '3-day streak' },
  { key: 'streak_7',           emoji: '🌟', label: 'Week Warrior',     description: '7-day streak' },
  { key: 'streak_30',          emoji: '🏆', label: 'Unstoppable',      description: '30-day streak' },
  { key: 'goal_crusher',       emoji: '🎉', label: 'Goal Crusher',     description: 'Complete a goal bonus 5 times' },
  { key: 'high_roller',        emoji: '💰', label: 'High Roller',      description: 'Accumulate 1000 lifetime points' },
  { key: 'spender',            emoji: '🎁', label: 'Treat Yourself',   description: 'Redeem 5 rewards' },
];

interface AchievementsStore {
  unlocked: Achievement[];
  justUnlocked: AchievementDef | null;
  load: () => Promise<void>;
  checkAndUnlock: (key: string) => Promise<AchievementDef | null>;
  markSeen: () => Promise<void>;
}

export const useAchievementsStore = create<AchievementsStore>((set, get) => ({
  unlocked: [],
  justUnlocked: null,

  load: async () => {
    const rows = await db.select().from(achievements);
    set({ unlocked: rows });
  },

  checkAndUnlock: async (key) => {
    const { unlocked } = get();
    if (unlocked.some((a) => a.key === key)) return null;

    const def = ACHIEVEMENT_DEFS.find((d) => d.key === key);
    if (!def) return null;

    try {
      await db.insert(achievements).values({ id: newId(), key }).onConflictDoNothing();
      const rows = await db.select().from(achievements).where(eq(achievements.key, key));
      if (rows.length > 0) {
        set((s) => ({ unlocked: [...s.unlocked, rows[0]], justUnlocked: def }));
        return def;
      }
    } catch { /* already exists */ }
    return null;
  },

  markSeen: async () => {
    set({ justUnlocked: null });
  },
}));

/** Call this after task completions / point additions to check multiple achievements at once. */
export async function checkAchievements(params: {
  totalCompletions: number;
  streak: number;
  goalBonusCount: number;
  lifetimePoints: number;
  redeemCount: number;
}) {
  const { checkAndUnlock } = useAchievementsStore.getState();
  const earned: AchievementDef[] = [];

  const check = async (key: string, condition: boolean) => {
    if (condition) {
      const a = await checkAndUnlock(key);
      if (a) earned.push(a);
    }
  };

  await check('first_task',   params.totalCompletions >= 1);
  await check('tasks_10',     params.totalCompletions >= 10);
  await check('tasks_50',     params.totalCompletions >= 50);
  await check('tasks_100',    params.totalCompletions >= 100);
  await check('tasks_500',    params.totalCompletions >= 500);
  await check('streak_3',     params.streak >= 3);
  await check('streak_7',     params.streak >= 7);
  await check('streak_30',    params.streak >= 30);
  await check('goal_crusher', params.goalBonusCount >= 5);
  await check('high_roller',  params.lifetimePoints >= 1000);
  await check('spender',      params.redeemCount >= 5);

  return earned;
}
