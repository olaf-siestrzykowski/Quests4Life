import { create } from 'zustand';
import { db } from '@db/index';
import { pointsLedger } from '@db/schema';
import type { PointEntry, NewPointEntry } from '@db/schema';
import { newId } from '@lib/ids';
import { format } from 'date-fns';

interface PointsStore {
  balance: number;
  history: PointEntry[];
  load: () => Promise<void>;
  addPoints: (
    delta: number,
    reason: string,
    meta?: { taskId?: string; rewardId?: string },
  ) => Promise<void>;
  wasGoalBonusGrantedToday: (goalId: string) => boolean;
}

export const usePointsStore = create<PointsStore>((set, get) => ({
  balance: 0,
  history: [],

  load: async () => {
    const rows = await db
      .select()
      .from(pointsLedger)
      .orderBy(pointsLedger.createdAt);
    const balance = rows.reduce((sum, r) => sum + r.delta, 0);
    set({ history: rows, balance });
  },

  addPoints: async (delta, reason, meta = {}) => {
    const entry: NewPointEntry = {
      id: newId(),
      delta,
      reason,
      taskId: meta.taskId,
      rewardId: meta.rewardId,
    };
    await db.insert(pointsLedger).values(entry);
    set((s) => ({
      balance: s.balance + delta,
      history: [...s.history, entry as PointEntry],
    }));
  },

  wasGoalBonusGrantedToday: (goalId) => {
    const todayPrefix = format(new Date(), 'yyyy-MM-dd');
    return get().history.some(
      (e) =>
        e.reason === 'goal_bonus' &&
        e.taskId === goalId &&
        (e.createdAt ?? '').startsWith(todayPrefix),
    );
  },
}));
