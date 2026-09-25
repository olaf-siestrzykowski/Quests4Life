import { addDays, addWeeks, addMonths, format, parseISO, isBefore, isAfter, startOfDay, startOfMonth, endOfMonth, getDay } from 'date-fns';

// ─── Schedule Rule Types ──────────────────────────────────────────────────────

export type ScheduleRule =
  | { type: 'once';               date: string }
  | { type: 'daily';              startDate: string }
  | { type: 'weekly';             daysOfWeek: number[]; startDate: string }
  | { type: 'weekly_count';       timesPerWeek: number; startDate: string }
  | { type: 'monthly';            dayOfMonth: number; startDate: string }
  | { type: 'monthly_nth_weekday'; nth: number; weekday: number; startDate: string }
  | { type: 'custom';             intervalDays: number; startDate: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Find the Nth weekday (1-indexed, or -1 = last) of a given month. */
function nthWeekdayOfMonth(year: number, month: number, nth: number, weekday: number): Date | null {
  if (nth > 0) {
    const first = new Date(year, month, 1);
    const diff = (weekday - first.getDay() + 7) % 7;
    const firstOccurrence = addDays(first, diff);
    const result = addWeeks(firstOccurrence, nth - 1);
    if (result.getMonth() !== month) return null;
    return result;
  }
  if (nth === -1) {
    const last = endOfMonth(new Date(year, month, 1));
    const diff = (last.getDay() - weekday + 7) % 7;
    return addDays(last, -diff);
  }
  return null;
}

// ─── Core: next due date ──────────────────────────────────────────────────────

/**
 * Returns the next ISO date (YYYY-MM-DD) the task is due after `after`.
 * Returns null if the task will never be due again, or if after the endDate.
 */
export function nextDueDate(
  rule: ScheduleRule,
  after: Date = new Date(),
  endDate?: string | null,
): string | null {
  const afterDay = startOfDay(after);

  let result: string | null = null;

  switch (rule.type) {
    case 'once': {
      const due = startOfDay(parseISO(rule.date));
      result = isBefore(due, afterDay) ? null : rule.date;
      break;
    }

    case 'daily': {
      const start = startOfDay(parseISO(rule.startDate));
      result = isBefore(afterDay, start)
        ? rule.startDate
        : format(addDays(afterDay, 1), 'yyyy-MM-dd');
      break;
    }

    case 'weekly': {
      const days = rule.daysOfWeek.slice().sort((a, b) => a - b);
      for (let offset = 1; offset <= 7; offset++) {
        const candidate = addDays(afterDay, offset);
        if (days.includes(candidate.getDay())) {
          result = format(candidate, 'yyyy-MM-dd');
          break;
        }
      }
      break;
    }

    case 'weekly_count': {
      // Shows up every day — frequency tracking is done at the UI/store level
      const start = startOfDay(parseISO(rule.startDate));
      result = isBefore(afterDay, start)
        ? rule.startDate
        : format(addDays(afterDay, 1), 'yyyy-MM-dd');
      break;
    }

    case 'monthly': {
      const next = addDays(afterDay, 1);
      for (let m = 0; m <= 1; m++) {
        const candidate = new Date(next.getFullYear(), next.getMonth() + m, rule.dayOfMonth);
        if (!isBefore(candidate, next)) {
          result = format(candidate, 'yyyy-MM-dd');
          break;
        }
      }
      break;
    }

    case 'monthly_nth_weekday': {
      const next = addDays(afterDay, 1);
      for (let m = 0; m <= 2; m++) {
        const year  = next.getFullYear();
        const month = next.getMonth() + m;
        const actualYear  = year + Math.floor(month / 12);
        const actualMonth = month % 12;
        const candidate = nthWeekdayOfMonth(actualYear, actualMonth, rule.nth, rule.weekday);
        if (candidate && !isBefore(candidate, next)) {
          result = format(candidate, 'yyyy-MM-dd');
          break;
        }
      }
      break;
    }

    case 'custom': {
      const start = startOfDay(parseISO(rule.startDate));
      result = isBefore(afterDay, start)
        ? rule.startDate
        : format(addDays(afterDay, rule.intervalDays), 'yyyy-MM-dd');
      break;
    }
  }

  if (result && endDate && result > endDate) return null;
  return result;
}

/**
 * Returns all due dates in [from, to] for a given rule.
 */
export function dueDatesInRange(
  rule: ScheduleRule,
  from: Date,
  to: Date,
  endDate?: string | null,
): string[] {
  const results: string[] = [];
  let cursor: Date = addDays(from, -1);

  for (let i = 0; i < 366; i++) {
    const next = nextDueDate(rule, cursor, endDate);
    if (!next) break;
    const nextDate = parseISO(next);
    if (isAfter(nextDate, to)) break;
    results.push(next);
    cursor = nextDate;
    if (rule.type === 'once') break;
  }

  return results;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NTH_LABEL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', [-1]: 'last' };

export function formatRuleSummary(rule: ScheduleRule): string {
  switch (rule.type) {
    case 'once':
      return `Once · ${rule.date}`;
    case 'daily':
      return 'Daily';
    case 'weekly': {
      const sorted = rule.daysOfWeek.slice().sort((a, b) => a - b);
      if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) return 'Weekdays';
      if (sorted.length === 7) return 'Every day';
      return sorted.map((d) => DAY_ABBR[d]).join(', ');
    }
    case 'weekly_count':
      return `${rule.timesPerWeek}× per week`;
    case 'monthly':
      return `Monthly · day ${rule.dayOfMonth}`;
    case 'monthly_nth_weekday': {
      const nth = NTH_LABEL[rule.nth] ?? `${rule.nth}th`;
      return `${nth} ${DAY_FULL[rule.weekday]} of month`;
    }
    case 'custom':
      return `Every ${rule.intervalDays} day${rule.intervalDays !== 1 ? 's' : ''}`;
  }
}

// ─── Serialisation ────────────────────────────────────────────────────────────

export function serializeRule(rule: ScheduleRule): string {
  return JSON.stringify(rule);
}

export function deserializeRule(json: string): ScheduleRule {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    switch (parsed.type) {
      case 'once':
        if (typeof parsed.date === 'string') return parsed as ScheduleRule;
        break;
      case 'daily':
        if (typeof parsed.startDate === 'string') return parsed as ScheduleRule;
        break;
      case 'weekly':
        if (Array.isArray(parsed.daysOfWeek) && typeof parsed.startDate === 'string')
          return parsed as ScheduleRule;
        break;
      case 'weekly_count':
        if (typeof parsed.timesPerWeek === 'number' && typeof parsed.startDate === 'string')
          return parsed as ScheduleRule;
        break;
      case 'monthly':
        if (typeof parsed.dayOfMonth === 'number' && typeof parsed.startDate === 'string')
          return parsed as ScheduleRule;
        break;
      case 'monthly_nth_weekday':
        if (
          typeof parsed.nth === 'number' &&
          typeof parsed.weekday === 'number' &&
          typeof parsed.startDate === 'string'
        )
          return parsed as ScheduleRule;
        break;
      case 'custom':
        if (typeof parsed.intervalDays === 'number' && typeof parsed.startDate === 'string')
          return parsed as ScheduleRule;
        break;
    }
  } catch {}
  return { type: 'daily', startDate: new Date().toISOString().slice(0, 10) };
}
