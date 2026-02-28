import { create } from 'zustand';
import { db } from '@db/index';
import { rewards } from '@db/schema';
import type { Reward, NewReward } from '@db/schema';
import { eq, isNull } from 'drizzle-orm';
import { newId } from '@lib/ids';

interface RewardsStore {
  rewards: Reward[];
  load: () => Promise<void>;
  addReward: (data: Omit<NewReward, 'id'>) => Promise<Reward>;
  redeemReward: (rewardId: string) => Promise<void>;
  archiveReward: (rewardId: string) => Promise<void>;
}

export const useRewardsStore = create<RewardsStore>((set, get) => ({
  rewards: [],

  load: async () => {
    const rows = await db.select().from(rewards).where(isNull(rewards.archivedAt));
    set({ rewards: rows });
  },

  addReward: async (data) => {
    const id = newId();
    await db.insert(rewards).values({ ...data, id });
    const inserted = await db.select().from(rewards).where(eq(rewards.id, id));
    const reward = inserted[0];
    set((s) => ({ rewards: [...s.rewards, reward] }));
    return reward;
  },

  redeemReward: async (rewardId) => {
    const reward = get().rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    await db
      .update(rewards)
      .set({ redeemedCount: reward.redeemedCount + 1 })
      .where(eq(rewards.id, rewardId));
    set((s) => ({
      rewards: s.rewards.map((r) =>
        r.id === rewardId ? { ...r, redeemedCount: r.redeemedCount + 1 } : r,
      ),
    }));
  },

  archiveReward: async (rewardId) => {
    await db
      .update(rewards)
      .set({ archivedAt: new Date().toISOString() })
      .where(eq(rewards.id, rewardId));
    set((s) => ({ rewards: s.rewards.filter((r) => r.id !== rewardId) }));
  },
}));
