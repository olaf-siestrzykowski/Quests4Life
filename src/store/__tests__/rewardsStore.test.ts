/**
 * Tests for rewardsStore.
 *
 * Strategy: mock @db/index with jest.fn() chains mirroring the Drizzle calls:
 *   select → from (awaited directly, or → where)
 *   insert → values
 *   update → set → where
 */

// ─── Mock: drizzle-orm operators ─────────────────────────────────────────────

jest.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ _op: 'eq', col, val }),
}));

// ─── Mock: @db/schema ─────────────────────────────────────────────────────────

jest.mock('@db/schema', () => ({
  rewards: { _table: 'rewards', id: { _col: 'id' } },
}));

// ─── Mock: @lib/ids ───────────────────────────────────────────────────────────

let idCounter = 0;
jest.mock('@lib/ids', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

// ─── Mock: db (fluent Drizzle builder) ───────────────────────────────────────

const mockSelect      = jest.fn();
const mockFrom        = jest.fn();
const mockSelectWhere = jest.fn();
const mockInsert      = jest.fn();
const mockValues      = jest.fn();
const mockUpdate      = jest.fn();
const mockSet         = jest.fn();
const mockUpdateWhere = jest.fn();

jest.mock('@db/index', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}));

/** `from()` result that can be awaited directly (load) or chained with where(). */
function fromResult(rows: unknown[]) {
  return Object.assign(Promise.resolve(rows), { where: mockSelectWhere });
}

function wireChains() {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue(fromResult([]));
  mockSelectWhere.mockResolvedValue([]);
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockResolvedValue(undefined);
  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdateWhere.mockResolvedValue(undefined);
}

// ─── Imports (after mocks are declared) ──────────────────────────────────────

import { useRewardsStore } from '../rewardsStore';
import type { Reward } from '@db/schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReward(overrides: Partial<Reward> = {}): Reward {
  return {
    id: 'r1',
    name: 'Coffee',
    description: null,
    pointCost: 50,
    imageUri: null,
    redeemedCount: 0,
    archivedAt: null,
    createdAt: '2026-01-01 10:00:00',
    ...overrides,
  };
}

beforeEach(() => {
  useRewardsStore.setState({ rewards: [], archivedRewards: [] });
  idCounter = 0;
  jest.clearAllMocks();
  wireChains();
});

// ─── load() ──────────────────────────────────────────────────────────────────

describe('load()', () => {
  it('splits active and archived rewards', async () => {
    const active   = makeReward({ id: 'a' });
    const archived = makeReward({ id: 'b', archivedAt: '2026-02-01T00:00:00Z' });
    mockFrom.mockReturnValueOnce(fromResult([active, archived]));

    await useRewardsStore.getState().load();

    expect(useRewardsStore.getState().rewards).toEqual([active]);
    expect(useRewardsStore.getState().archivedRewards).toEqual([archived]);
  });

  it('sets both lists empty when there are no rewards', async () => {
    await useRewardsStore.getState().load();
    expect(useRewardsStore.getState().rewards).toEqual([]);
    expect(useRewardsStore.getState().archivedRewards).toEqual([]);
  });
});

// ─── addReward() ─────────────────────────────────────────────────────────────

describe('addReward()', () => {
  it('inserts with a generated id and appends the stored row', async () => {
    const stored = makeReward({ id: 'test-id-1', name: 'Movie night', pointCost: 200 });
    mockSelectWhere.mockResolvedValueOnce([stored]);

    const result = await useRewardsStore.getState().addReward({ name: 'Movie night', pointCost: 200 });

    expect(mockValues).toHaveBeenCalledWith({ name: 'Movie night', pointCost: 200, id: 'test-id-1' });
    expect(result).toEqual(stored);
    expect(useRewardsStore.getState().rewards).toEqual([stored]);
  });
});

// ─── updateReward() ──────────────────────────────────────────────────────────

describe('updateReward()', () => {
  it('writes the patch to the DB', async () => {
    useRewardsStore.setState({ rewards: [makeReward()] });
    await useRewardsStore.getState().updateReward('r1', { name: 'Fancy coffee', pointCost: 75 });
    expect(mockSet).toHaveBeenCalledWith({ name: 'Fancy coffee', pointCost: 75 });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it('merges the patch into the matching reward only', async () => {
    const other = makeReward({ id: 'r2', name: 'Book' });
    useRewardsStore.setState({ rewards: [makeReward({ redeemedCount: 3 }), other] });

    await useRewardsStore.getState().updateReward('r1', { pointCost: 75, description: 'Oat latte' });

    const [updated, untouched] = useRewardsStore.getState().rewards;
    expect(updated).toMatchObject({ id: 'r1', name: 'Coffee', pointCost: 75, description: 'Oat latte', redeemedCount: 3 });
    expect(untouched).toBe(other);
  });

  it('can clear the description', async () => {
    useRewardsStore.setState({ rewards: [makeReward({ description: 'old' })] });
    await useRewardsStore.getState().updateReward('r1', { description: null });
    expect(useRewardsStore.getState().rewards[0].description).toBeNull();
  });
});

// ─── redeemReward() ──────────────────────────────────────────────────────────

describe('redeemReward()', () => {
  it('increments redeemedCount in DB and state', async () => {
    useRewardsStore.setState({ rewards: [makeReward({ redeemedCount: 2 })] });
    await useRewardsStore.getState().redeemReward('r1');
    expect(mockSet).toHaveBeenCalledWith({ redeemedCount: 3 });
    expect(useRewardsStore.getState().rewards[0].redeemedCount).toBe(3);
  });

  it('is a no-op for an unknown reward', async () => {
    useRewardsStore.setState({ rewards: [makeReward()] });
    await useRewardsStore.getState().redeemReward('missing');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(useRewardsStore.getState().rewards[0].redeemedCount).toBe(0);
  });
});

// ─── archiveReward() ─────────────────────────────────────────────────────────

describe('archiveReward()', () => {
  it('sets archivedAt in the DB', async () => {
    useRewardsStore.setState({ rewards: [makeReward()] });
    await useRewardsStore.getState().archiveReward('r1');
    expect(mockSet).toHaveBeenCalledWith({ archivedAt: expect.any(String) });
  });

  it('moves the reward from active to archived', async () => {
    useRewardsStore.setState({ rewards: [makeReward(), makeReward({ id: 'r2' })] });

    await useRewardsStore.getState().archiveReward('r1');

    const { rewards, archivedRewards } = useRewardsStore.getState();
    expect(rewards.map((r) => r.id)).toEqual(['r2']);
    expect(archivedRewards).toHaveLength(1);
    expect(archivedRewards[0]).toMatchObject({ id: 'r1', name: 'Coffee' });
    expect(archivedRewards[0].archivedAt).toEqual(expect.any(String));
  });

  it('leaves archived list unchanged for an unknown reward', async () => {
    useRewardsStore.setState({ rewards: [makeReward()] });
    await useRewardsStore.getState().archiveReward('missing');
    expect(useRewardsStore.getState().rewards).toHaveLength(1);
    expect(useRewardsStore.getState().archivedRewards).toEqual([]);
  });
});
