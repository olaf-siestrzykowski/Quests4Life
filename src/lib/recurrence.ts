import { addDays, addWeeks, addMonths, format, parseISO, isBefore, startOfDay } from 'date-fns';

// ─── Schedule Rule Types ──────────────────────────────────────────────────────

export type ScheduleRule =
  | { type: 'once';    date: string }
  | { type: 'daily';   startDate: string }
  | { type: 'weekly';  daysOfWeek: number[]; startDate: string }   // 0=Sun … 6=Sat
  | { type: 'monthly'; dayOfMonth: number;   startDate: string }
  | { type: 'custom';  intervalDays: number; startDate: string };

// ─── Core: next due date ──────────────────────────────────────────────────────

/**
 * Returns the next ISO date (YYYY-MM-DD) the task is due after `after`.
 * Returns null if the task will never be due again (one-time already done).
 */
export function nextDueDate(rule: ScheduleRule, after: Date = new Date()): string | null {
  const afterDay = startOfDay(after);

  switch (rule.type) {
    case 'once': {
      const due = startOfDay(parseISO(rule.date));
      return isBefore(due, afterDay) ? null : rule.date;
    }

    case 'daily': {
      const start = startOfDay(parseISO(rule.startDate));
      if (isBefore(afterDay, start)) return rule.startDate;
      return format(addDays(afterDay, 1), 'yyyy-MM-dd');
    }

    case 'weekly': {
      const days = rule.daysOfWeek.slice().sort((a, b) => a - b);
      for (let offset = 1; offset <= 7; offset++) {
        const candidate = addDays(afterDay, offset);
        if (days.includes(candidate.getDay())) {
          return format(candidate, 'yyyy-MM-dd');
        }
      }
      return null; // should never happen if daysOfWeek is non-empty
    }

    case 'monthly': {
      const next = addDays(afterDay, 1);
      // Try current month, then next
      for (let m = 0; m <= 1; m++) {
        const candidate = new Date(next.getFullYear(), next.getMonth() + m, rule.dayOfMonth);
        if (!isBefore(candidate, next)) {
          return format(candidate, 'yyyy-MM-dd');
        }
      }
      return null;
    }

    case 'custom': {
      const start = startOfDay(parseISO(rule.startDate));
      if (isBefore(afterDay, start)) return rule.startDate;
      return format(addDays(afterDay, rule.intervalDays), 'yyyy-MM-dd');
    }
  }
}

/**
 * Returns all due dates in [from, to] for a given rule.
 * Useful for "today's tasks" and calendar views.
 */
export function dueDatesInRange(rule: ScheduleRule, from: Date, to: Date): string[] {
  const results: string[] = [];
  let cursor: Date = addDays(from, -1); // start one day before so nextDueDate >= from

  for (let i = 0; i < 366; i++) { // safety cap
    const next = nextDueDate(rule, cursor);
    if (!next) break;
    const nextDate = parseISO(next);
    if (isBefore(to, nextDate)) break;
    results.push(next);
    cursor = nextDate;
    if (rule.type === 'once') break;
  }

  return results;
}

// ─── Serialisation ────────────────────────────────────────────────────────────

export function serializeRule(rule: ScheduleRule): string {
  return JSON.stringify(rule);
}

export function deserializeRule(json: string): ScheduleRule {
  return JSON.parse(json) as ScheduleRule;
}
