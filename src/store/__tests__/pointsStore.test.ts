/**
 * Tests for pointsStore.
 *
 * Strategy: mock @db/index so no real SQLite is needed.
 * The Drizzle query chain (select → from → orderBy / where → limit,
 * and insert → values) is replicated with jest.fn() chains.
 * @db/schema and drizzle-orm operators are mocked to return plain
 * objects that the mock db ignores as arguments.
 */

// ─── Mock: drizzle-orm operators ─────────────────────────────────────────────

jest.mock('drizzle-orm', () => ({
  and:  (...args: unknown[]) => ({ _op: 'and', args }),
  eq:   (col: unknown, val: unknown) => ({ _op: 'eq', col, val }),
  like: (col: unknown, val: unknown) => ({ _op: 'like', col, val }),
  sql:  Object.assign(
    (strings: TemplateStringsArray, ...vals: unknown[]) => ({ _sql: strings, vals }),
    { raw: (s: string) => ({ _raw: s }) },
  ),
}));

// ─── Mock: @db/schema ─────────────────────────────────────────────────────────

jest.mock('@db/schema', () => {
  const col = (name: string) => ({ _col: name });
  const table = (name: string, cols: Record<string, unknown>) =>
    Object.assign({ _table: name }, cols);
  return {
    pointsLedger: table('points_ledger', {
      id:        col('id'),
      delta:     col('delta'),
      reason:    col('reason'),
      taskId:    col('task_id'),
      rewardId:  col('reward_id'),
      createdAt: col('created_at'),
    }),
  };
});

// ─── Mock: @lib/ids ───────────────────────────────────────────────────────────

let idCounter = 0;
jest.mock('@lib/ids', () => ({
  newId: () => `test-id-${++idCounter}`,
}));

// ─── Mock: db (fluent Drizzle builder) ───────────────────────────────────────

const mockValues  = jest.fn();
const mockInsert  = jest.fn();
const mockLimit   = jest.fn();
const mockWhere   = jest.fn();
const mockOrderBy = jest.fn();
const mockFrom    = jest.fn();
const mockSelect  = jest.fn();

jest.mock('@db/index', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));

// Wire up the chains once — individual tests override terminal mocks with
// mockResolvedValueOnce / mockReturnValueOnce as needed.
mockSelect.mockReturnValue({ from: mockFrom });
mockFrom.mockReturnValue({ orderBy: mockOrderBy, where: mockWhere });
mockOrderBy.mockResolvedValue([]);
mockWhere.mockReturnValue({ limit: mockLimit });
mockLimit.mockResolvedValue([]);
mockInsert.mockReturnValue({ values: mockValues });
mockValues.mockResolvedValue(undefined);

// ─── Imports (after mocks are declared) ──────────────────────────────────────

import { usePointsStore } from '../pointsStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  usePointsStore.setState({ balance: 0, history: [] });
}

beforeEach(() => {
  resetStore();
  idCounter = 0;
  jest.clearAllMocks();
  // Re-wire chains after clearAllMocks
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ orderBy: mockOrderBy, where: mockWhere });
  mockOrderBy.mockResolvedValue([]);
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockLimit.mockResolvedValue([]);
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockResolvedValue(undefined);
});

// ─── load() ──────────────────────────────────────────────────────────────────

describe('load()', () => {
  it('sets balance to 0 and history to [] when ledger is empty', async () => {
    mockOrderBy.mockResolvedValueOnce([]);
    await usePointsStore.getState().load();
    expect(usePointsStore.getState().balance).toBe(0);
    expect(usePointsStore.getState().history).toEqual([]);
  });

  it('sums positive deltas into balance', async () => {
    const rows = [
      { id: 'a', delta: 10, reason: 'task_complete', taskId: null, rewardId: null, createdAt: '2025-01-01T00:00:00Z' },
      { id: 'b', delta: 25, reason: 'task_complete', taskId: null, rewardId: null, createdAt: '2025-01-02T00:00:00Z' },
    ];
    mockOrderBy.mockResolvedValueOnce(rows);
    await usePointsStore.getState().load();
    expect(usePointsStore.getState().balance).toBe(35);
    expect(usePointsStore.getState().history).toEqual(rows);
  });

  it('subtracts negative deltas (rewards)', async () => {
    const rows = [
      { id: 'a', delta: 100,  reason: 'task_complete', taskId: null, rewardId: null, createdAt: '2025-01-01T00:00:00Z' },
      { id: 'b', delta: -50,  reason: 'reward_redeem', taskId: null, rewardId: 'r1', createdAt: '2025-01-02T00:00:00Z' },
    ];
    mockOrderBy.mockResolvedValueOnce(rows);
    await usePointsStore.getState().load();
    expect(usePointsStore.getState().balance).toBe(50);
  });

  it('handles uncomplete entries (negative task delta)', async () => {
    const rows = [
      { id: 'a', delta: 10,  reason: 'task_complete',   taskId: 't1', rewardId: null, createdAt: '2025-01-01T00:00:00Z' },
      { id: 'b', delta: -10, reason: 'task_uncomplete', taskId: 't1', rewardId: null, createdAt: '2025-01-01T00:01:00Z' },
    ];
    mockOrderBy.mockResolvedValueOnce(rows);
    await usePointsStore.getState().load();
    expect(usePointsStore.getState().balance).toBe(0);
  });

  it('orders by createdAt (passes pointsLedger.createdAt to orderBy)', async () => {
    mockOrderBy.mockResolvedValueOnce([]);
    await usePointsStore.getState().load();
    expect(mockOrderBy).toHaveBeenCalledTimes(1);
    const arg = mockOrderBy.mock.calls[0][0];
    expect(arg).toEqual({ _col: 'created_at' });
  });
});

// ─── addPoints() ──────────────────────────────────────────────────────────────

describe('addPoints()', () => {
  it('inserts a row and updates balance in-memory', async () => {
    await usePointsStore.getState().addPoints(20, 'task_complete', { taskId: 'task-1' });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledTimes(1);
    const inserted = mockValues.mock.calls[0][0];
    expect(inserted.delta).toBe(20);
    expect(inserted.reason).toBe('task_complete');
    expect(inserted.taskId).toBe('task-1');
    expect(inserted.rewardId).toBeUndefined();
    expect(usePointsStore.getState().balance).toBe(20);
  });

  it('accumulates balance across multiple calls', async () => {
    await usePointsStore.getState().addPoints(10, 'task_complete');
    await usePointsStore.getState().addPoints(15, 'task_complete');
    await usePointsStore.getState().addPoints(5,  'goal_bonus');
    expect(usePointsStore.getState().balance).toBe(30);
  });

  it('deducts balance for negative delta (reward redemption)', async () => {
    usePointsStore.setState({ balance: 100, history: [] });
    await usePointsStore.getState().addPoints(-50, 'reward_redeem', { rewardId: 'reward-1' });
    expect(usePointsStore.getState().balance).toBe(50);
    const entry = mockValues.mock.calls[0][0];
    expect(entry.delta).toBe(-50);
    expect(entry.rewardId).toBe('reward-1');
  });

  it('appends entry to history with generated id', async () => {
    await usePointsStore.getState().addPoints(10, 'task_complete', { taskId: 'task-42' });
    const history = usePointsStore.getState().history;
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('test-id-1');
    expect(history[0].delta).toBe(10);
    expect(history[0].taskId).toBe('task-42');
  });

  it('works without meta argument (no taskId/rewardId)', async () => {
    await usePointsStore.getState().addPoints(5, 'task_complete');
    const entry = mockValues.mock.calls[0][0];
    expect(entry.taskId).toBeUndefined();
    expect(entry.rewardId).toBeUndefined();
  });

  it('does not persist balance to DB — only inserts a row', async () => {
    await usePointsStore.getState().addPoints(10, 'task_complete');
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockSelect).not.toHaveBeenCalled();
  });
});

// ─── wasGoalBonusGrantedToday() ───────────────────────────────────────────────

describe('wasGoalBonusGrantedToday()', () => {
  it('returns false when no matching row exists', async () => {
    mockLimit.mockResolvedValueOnce([]);
    const result = await usePointsStore.getState().wasGoalBonusGrantedToday('goal-1');
    expect(result).toBe(false);
  });

  it('returns true when a matching row is found', async () => {
    mockLimit.mockResolvedValueOnce([{ id: 'some-entry' }]);
    const result = await usePointsStore.getState().wasGoalBonusGrantedToday('goal-1');
    expect(result).toBe(true);
  });

  it('queries with limit(1)', async () => {
    mockLimit.mockResolvedValueOnce([]);
    await usePointsStore.getState().wasGoalBonusGrantedToday('goal-99');
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it('passes goal_bonus reason and goalId to where clause', async () => {
    mockLimit.mockResolvedValueOnce([]);
    await usePointsStore.getState().wasGoalBonusGrantedToday('goal-abc');
    const whereArg = mockWhere.mock.calls[0][0];
    // whereArg is { _op: 'and', args: [eq, eq, like] }
    expect(whereArg._op).toBe('and');
    const [reasonEq, taskIdEq] = whereArg.args;
    expect(reasonEq._op).toBe('eq');
    expect(reasonEq.val).toBe('goal_bonus');
    expect(taskIdEq._op).toBe('eq');
    expect(taskIdEq.val).toBe('goal-abc');
  });

  it('filters by today\'s date prefix in the like clause', async () => {
    mockLimit.mockResolvedValueOnce([]);
    const today = new Date().toISOString().slice(0, 10);
    await usePointsStore.getState().wasGoalBonusGrantedToday('goal-abc');
    const whereArg = mockWhere.mock.calls[0][0];
    const likeClause = whereArg.args[2];
    expect(likeClause._op).toBe('like');
    expect(likeClause.val).toBe(`${today}%`);
  });

  it('does not modify in-memory state', async () => {
    usePointsStore.setState({ balance: 42, history: [] });
    mockLimit.mockResolvedValueOnce([{ id: 'x' }]);
    await usePointsStore.getState().wasGoalBonusGrantedToday('goal-1');
    expect(usePointsStore.getState().balance).toBe(42);
  });
});

// ─── State consistency ────────────────────────────────────────────────────────

describe('state consistency', () => {
  it('balance equals sum of all history deltas after addPoints calls', async () => {
    const deltas = [10, 25, -15, 50, -10];
    for (const delta of deltas) {
      await usePointsStore.getState().addPoints(delta, 'task_complete');
    }
    const { balance, history } = usePointsStore.getState();
    const expectedBalance = deltas.reduce((s, d) => s + d, 0);
    expect(balance).toBe(expectedBalance);
    expect(history).toHaveLength(deltas.length);
  });

  it('load() replaces any in-memory state with DB truth', async () => {
    // Simulate stale state
    usePointsStore.setState({ balance: 999, history: [{ id: 'stale' } as any] });

    const dbRows = [
      { id: 'db-1', delta: 30, reason: 'task_complete', taskId: null, rewardId: null, createdAt: '2025-01-01T00:00:00Z' },
    ];
    mockOrderBy.mockResolvedValueOnce(dbRows);
    await usePointsStore.getState().load();

    expect(usePointsStore.getState().balance).toBe(30);
    expect(usePointsStore.getState().history).toEqual(dbRows);
  });
});
