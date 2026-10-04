import { create } from 'zustand';
import { db } from '@db/index';
import { rewards } from '@db/schema';
import type { Reward, NewReward } from '@db/schema';
import { eq } from 'drizzle-orm';
import { newId } from '@lib/ids';

type RewardEdit = Partial<Pick<Reward, 'name' | 'description' | 'pointCost' | 'imageUri'>>;

interface RewardsStore {
  rewards: Reward[];
  /** Archived rewards — kept so redemption history can still show their names. */
  archivedRewards: Reward[];
  load: () => Promise<void>;
  addReward: (data: Omit<NewReward, 'id'>) => Promise<Reward>;
  updateReward: (rewardId: string, data: RewardEdit) => Promise<void>;
  redeemReward: (rewardId: string) => Promise<void>;
  archiveReward: (rewardId: string) => Promise<void>;
}

export const useRewardsStore = create<RewardsStore>((set, get) => ({
  rewards: [],
  archivedRewards: [],

  load: async () => {
    const rows = await db.select().from(rewards);
    set({
      rewards: rows.filter((r) => !r.archivedAt),
      archivedRewards: rows.filter((r) => !!r.archivedAt),
    });
  },

  addReward: async (data) => {
    const id = newId();
    await db.insert(rewards).values({ ...data, id });
    const inserted = await db.select().from(rewards).where(eq(rewards.id, id));
    const reward = inserted[0];
    set((s) => ({ rewards: [...s.rewards, reward] }));
    return reward;
  },

  updateReward: async (rewardId, data) => {
    await db.update(rewards).set(data).where(eq(rewards.id, rewardId));
    set((s) => ({
      rewards: s.rewards.map((r) => (r.id === rewardId ? { ...r, ...data } : r)),
    }));
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
    const archivedAt = new Date().toISOString();
    await db.update(rewards).set({ archivedAt }).where(eq(rewards.id, rewardId));
    set((s) => {
      const reward = s.rewards.find((r) => r.id === rewardId);
      return {
        rewards: s.rewards.filter((r) => r.id !== rewardId),
        archivedRewards: reward ? [...s.archivedRewards, { ...reward, archivedAt }] : s.archivedRewards,
      };
    });
  },
}));
