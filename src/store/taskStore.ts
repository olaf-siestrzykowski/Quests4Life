import { create } from 'zustand';
import { db } from '@db/index';
import { tasks, completions } from '@db/schema';
import type { Task, NewTask, NewCompletion } from '@db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { newId } from '@lib/ids';
import { format } from 'date-fns';

interface TaskStore {
  tasks: Task[];
  completedTodayIds: Set<string>;
  loading: boolean;
  load: () => Promise<void>;
  addTask: (data: Omit<NewTask, 'id'>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Omit<NewTask, 'id'>>) => Promise<void>;
  completeTask: (taskId: string, forDate?: string) => Promise<void>;
  uncompleteTask: (taskId: string, forDate?: string) => Promise<void>;
  archiveTask: (taskId: string) => Promise<void>;
  reorderTask: (taskId: string, direction: 'up' | 'down') => Promise<void>;
  completionsForDate: (date: string) => Promise<Set<string>>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  completedTodayIds: new Set(),
  loading: false,

  load: async () => {
    set({ loading: true });
    const today = format(new Date(), 'yyyy-MM-dd');
    const [taskRows, completionRows] = await Promise.all([
      db.select().from(tasks).where(isNull(tasks.archivedAt)),
      db.select().from(completions).where(eq(completions.forDate, today)),
    ]);
    const completedTodayIds = new Set(completionRows.map((c) => c.taskId));
    set({ tasks: taskRows, completedTodayIds, loading: false });
  },

  addTask: async (data) => {
    const id = newId();
    await db.insert(tasks).values({ ...data, id });
    const inserted = await db.select().from(tasks).where(eq(tasks.id, id));
    const task = inserted[0];
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (id, data) => {
    await db.update(tasks).set(data).where(eq(tasks.id, id));
    const updated = await db.select().from(tasks).where(eq(tasks.id, id));
    const task = updated[0];
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? task : t)) }));
  },

  completeTask: async (taskId, forDate) => {
    const date = forDate ?? format(new Date(), 'yyyy-MM-dd');
    // Guard against duplicate completions for same date
    const existing = await db
      .select()
      .from(completions)
      .where(and(eq(completions.taskId, taskId), eq(completions.forDate, date)));
    if (existing.length > 0) return;
    await db.insert(completions).values({ id: newId(), taskId, forDate: date });
    set((s) => {
      const next = new Set(s.completedTodayIds);
      next.add(taskId);
      return { completedTodayIds: next };
    });
  },

  uncompleteTask: async (taskId, forDate) => {
    const date = forDate ?? format(new Date(), 'yyyy-MM-dd');
    await db
      .delete(completions)
      .where(and(eq(completions.taskId, taskId), eq(completions.forDate, date)));
    set((s) => {
      const next = new Set(s.completedTodayIds);
      next.delete(taskId);
      return { completedTodayIds: next };
    });
  },

  archiveTask: async (taskId) => {
    await db.update(tasks).set({ archivedAt: new Date().toISOString() }).where(eq(tasks.id, taskId));
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
  },

  reorderTask: async (taskId, direction) => {
    const { tasks: allTasks } = get();
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Siblings = tasks with the same parentGoalId, not archived, not a goal
    const siblings = allTasks
      .filter((t) => t.parentGoalId === task.parentGoalId && !t.archivedAt && !t.isGoal)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));

    const idx = siblings.findIndex((t) => t.id === taskId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    // Assign normalised sortOrders (0, 1, 2, …) then swap the two
    const updates = siblings.map((t, i) => ({ id: t.id, sortOrder: i }));
    [updates[idx].sortOrder, updates[swapIdx].sortOrder] = [
      updates[swapIdx].sortOrder,
      updates[idx].sortOrder,
    ];

    for (const u of updates) {
      await db.update(tasks).set({ sortOrder: u.sortOrder }).where(eq(tasks.id, u.id));
    }
    set((s) => ({
      tasks: s.tasks.map((t) => {
        const u = updates.find((x) => x.id === t.id);
        return u ? { ...t, sortOrder: u.sortOrder } : t;
      }),
    }));
  },

  completionsForDate: async (date) => {
    const rows = await db
      .select()
      .from(completions)
      .where(eq(completions.forDate, date));
    return new Set(rows.map((r) => r.taskId));
  },
}));
