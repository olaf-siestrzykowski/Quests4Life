import { parseISO } from 'date-fns';
import {
  nextDueDate,
  dueDatesInRange,
  formatRuleSummary,
  serializeRule,
  deserializeRule,
  type ScheduleRule,
} from '../recurrence';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const d = (iso: string) => parseISO(iso);

// ─── nextDueDate — once ───────────────────────────────────────────────────────

describe('nextDueDate – once', () => {
  const rule: ScheduleRule = { type: 'once', date: '2025-06-15' };

  it('returns the date when asked before it', () => {
    expect(nextDueDate(rule, d('2025-06-14'))).toBe('2025-06-15');
  });

  it('returns the date when asked on the same day', () => {
    expect(nextDueDate(rule, d('2025-06-15'))).toBe('2025-06-15');
  });

  it('returns null when asked after the date', () => {
    expect(nextDueDate(rule, d('2025-06-16'))).toBeNull();
  });

  it('respects endDate: null when date ≤ endDate', () => {
    expect(nextDueDate(rule, d('2025-06-14'), '2025-06-15')).toBe('2025-06-15');
  });

  it('respects endDate: returns null when date > endDate', () => {
    expect(nextDueDate(rule, d('2025-06-14'), '2025-06-10')).toBeNull();
  });
});

// ─── nextDueDate — daily ──────────────────────────────────────────────────────

describe('nextDueDate – daily', () => {
  const rule: ScheduleRule = { type: 'daily', startDate: '2025-01-10' };

  it('returns startDate when asked before start', () => {
    expect(nextDueDate(rule, d('2025-01-01'))).toBe('2025-01-10');
  });

  it('returns tomorrow when asked today (after start)', () => {
    expect(nextDueDate(rule, d('2025-01-15'))).toBe('2025-01-16');
  });

  it('returns null when next day exceeds endDate', () => {
    expect(nextDueDate(rule, d('2025-01-31'), '2025-01-31')).toBeNull();
  });
});

// ─── nextDueDate — weekly ─────────────────────────────────────────────────────

describe('nextDueDate – weekly', () => {
  // Mon=1, Wed=3, Fri=5
  const rule: ScheduleRule = { type: 'weekly', daysOfWeek: [1, 3, 5], startDate: '2025-01-01' };

  it('finds next weekday within the same week', () => {
    // 2025-01-06 is Monday → next is Wednesday 2025-01-08
    expect(nextDueDate(rule, d('2025-01-06'))).toBe('2025-01-08');
  });

  it('wraps to next week correctly', () => {
    // 2025-01-10 is Friday → next Mon is 2025-01-13
    expect(nextDueDate(rule, d('2025-01-10'))).toBe('2025-01-13');
  });

  it('handles single day: same day is not returned, next week is', () => {
    const rule2: ScheduleRule = { type: 'weekly', daysOfWeek: [1], startDate: '2025-01-01' };
    // 2025-01-06 Mon → next Mon is 2025-01-13
    expect(nextDueDate(rule2, d('2025-01-06'))).toBe('2025-01-13');
  });
});

// ─── nextDueDate — weekly_count ───────────────────────────────────────────────

describe('nextDueDate – weekly_count', () => {
  const rule: ScheduleRule = { type: 'weekly_count', timesPerWeek: 3, startDate: '2025-01-10' };

  it('returns startDate when asked before start', () => {
    expect(nextDueDate(rule, d('2025-01-01'))).toBe('2025-01-10');
  });

  it('returns tomorrow when after start (appears daily like daily rule)', () => {
    expect(nextDueDate(rule, d('2025-01-15'))).toBe('2025-01-16');
  });
});

// ─── nextDueDate — monthly ────────────────────────────────────────────────────

describe('nextDueDate – monthly', () => {
  const rule: ScheduleRule = { type: 'monthly', dayOfMonth: 15, startDate: '2025-01-01' };

  it('returns same month when asked before the 15th', () => {
    expect(nextDueDate(rule, d('2025-01-10'))).toBe('2025-01-15');
  });

  it('returns next month when asked on the 15th', () => {
    expect(nextDueDate(rule, d('2025-01-15'))).toBe('2025-02-15');
  });

  it('returns next month when asked after the 15th', () => {
    expect(nextDueDate(rule, d('2025-01-20'))).toBe('2025-02-15');
  });

  it('handles month rollover to next year', () => {
    expect(nextDueDate(rule, d('2025-12-20'))).toBe('2026-01-15');
  });
});

// ─── nextDueDate — monthly_nth_weekday ───────────────────────────────────────

describe('nextDueDate – monthly_nth_weekday', () => {
  // 1st Monday of month; weekday=1 (Mon)
  const rule: ScheduleRule = { type: 'monthly_nth_weekday', nth: 1, weekday: 1, startDate: '2025-01-01' };

  it('returns 1st Monday of January 2025 when asked before it', () => {
    // Jan 2025: 1st Mon = 2025-01-06
    expect(nextDueDate(rule, d('2025-01-01'))).toBe('2025-01-06');
  });

  it('returns 1st Monday of February when asked after Jan 1st Mon', () => {
    // Feb 2025: 1st Mon = 2025-02-03
    expect(nextDueDate(rule, d('2025-01-06'))).toBe('2025-02-03');
  });

  it('handles last (-1) weekday of month', () => {
    // Last Monday of Jan 2025 = 2025-01-27
    const ruleL: ScheduleRule = { type: 'monthly_nth_weekday', nth: -1, weekday: 1, startDate: '2025-01-01' };
    expect(nextDueDate(ruleL, d('2025-01-01'))).toBe('2025-01-27');
  });

  it('handles 4th Friday', () => {
    // 4th Friday of Jan 2025 = 2025-01-24
    const ruleF: ScheduleRule = { type: 'monthly_nth_weekday', nth: 4, weekday: 5, startDate: '2025-01-01' };
    expect(nextDueDate(ruleF, d('2025-01-01'))).toBe('2025-01-24');
  });
});

// ─── nextDueDate — custom ─────────────────────────────────────────────────────

describe('nextDueDate – custom', () => {
  const rule: ScheduleRule = { type: 'custom', intervalDays: 3, startDate: '2025-01-10' };

  it('returns startDate when asked before start', () => {
    expect(nextDueDate(rule, d('2025-01-05'))).toBe('2025-01-10');
  });

  it('returns startDate + interval when asked on startDate', () => {
    expect(nextDueDate(rule, d('2025-01-10'))).toBe('2025-01-13');
  });

  it('adds intervalDays from current day after start', () => {
    expect(nextDueDate(rule, d('2025-01-20'))).toBe('2025-01-23');
  });
});

// ─── dueDatesInRange ──────────────────────────────────────────────────────────

describe('dueDatesInRange', () => {
  it('returns single date for once rule within range', () => {
    const rule: ScheduleRule = { type: 'once', date: '2025-03-15' };
    expect(dueDatesInRange(rule, d('2025-03-01'), d('2025-03-31'))).toEqual(['2025-03-15']);
  });

  it('returns empty for once rule outside range', () => {
    const rule: ScheduleRule = { type: 'once', date: '2025-02-01' };
    expect(dueDatesInRange(rule, d('2025-03-01'), d('2025-03-31'))).toEqual([]);
  });

  it('returns 7 dates for daily rule over a week', () => {
    const rule: ScheduleRule = { type: 'daily', startDate: '2025-01-01' };
    const result = dueDatesInRange(rule, d('2025-01-01'), d('2025-01-07'));
    expect(result).toHaveLength(7);
    expect(result[0]).toBe('2025-01-01');
    expect(result[6]).toBe('2025-01-07');
  });

  it('returns correct days for weekly Mon/Wed/Fri over one week', () => {
    const rule: ScheduleRule = { type: 'weekly', daysOfWeek: [1, 3, 5], startDate: '2025-01-01' };
    // Week of Jan 6–12: Mon=6, Wed=8, Fri=10
    const result = dueDatesInRange(rule, d('2025-01-06'), d('2025-01-12'));
    expect(result).toEqual(['2025-01-06', '2025-01-08', '2025-01-10']);
  });

  it('returns 2 occurrences for monthly rule over 2 months', () => {
    const rule: ScheduleRule = { type: 'monthly', dayOfMonth: 1, startDate: '2025-01-01' };
    const result = dueDatesInRange(rule, d('2025-01-01'), d('2025-02-28'));
    expect(result).toEqual(['2025-01-01', '2025-02-01']);
  });

  it('respects endDate cutoff', () => {
    const rule: ScheduleRule = { type: 'daily', startDate: '2025-01-01' };
    const result = dueDatesInRange(rule, d('2025-01-01'), d('2025-01-07'), '2025-01-04');
    expect(result).toEqual(['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04']);
  });

  it('returns empty when entire range is after endDate', () => {
    const rule: ScheduleRule = { type: 'daily', startDate: '2025-01-01' };
    const result = dueDatesInRange(rule, d('2025-02-01'), d('2025-02-07'), '2025-01-31');
    expect(result).toEqual([]);
  });

  it('returns monthly_nth_weekday occurrences in range', () => {
    // 1st Monday: Jan=2025-01-06, Feb=2025-02-03, Mar=2025-03-03
    const rule: ScheduleRule = { type: 'monthly_nth_weekday', nth: 1, weekday: 1, startDate: '2025-01-01' };
    const result = dueDatesInRange(rule, d('2025-01-01'), d('2025-03-31'));
    expect(result).toContain('2025-01-06');
    expect(result).toContain('2025-02-03');
    expect(result).toContain('2025-03-03');
    expect(result).toHaveLength(3);
  });

  it('custom every-3-days: 3 occurrences in 9-day window', () => {
    const rule: ScheduleRule = { type: 'custom', intervalDays: 3, startDate: '2025-01-01' };
    const result = dueDatesInRange(rule, d('2025-01-01'), d('2025-01-09'));
    expect(result).toEqual(['2025-01-01', '2025-01-04', '2025-01-07']);
  });
});

// ─── formatRuleSummary ────────────────────────────────────────────────────────

describe('formatRuleSummary', () => {
  it('once', () => {
    expect(formatRuleSummary({ type: 'once', date: '2025-06-01' })).toBe('Once · 2025-06-01');
  });

  it('daily', () => {
    expect(formatRuleSummary({ type: 'daily', startDate: '2025-01-01' })).toBe('Daily');
  });

  it('weekly – weekdays shortcut', () => {
    expect(formatRuleSummary({ type: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], startDate: '2025-01-01' })).toBe('Weekdays');
  });

  it('weekly – every day shortcut', () => {
    expect(formatRuleSummary({ type: 'weekly', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startDate: '2025-01-01' })).toBe('Every day');
  });

  it('weekly – explicit days', () => {
    expect(formatRuleSummary({ type: 'weekly', daysOfWeek: [1, 3, 5], startDate: '2025-01-01' })).toBe('Mon, Wed, Fri');
  });

  it('weekly_count', () => {
    expect(formatRuleSummary({ type: 'weekly_count', timesPerWeek: 4, startDate: '2025-01-01' })).toBe('4× per week');
  });

  it('monthly', () => {
    expect(formatRuleSummary({ type: 'monthly', dayOfMonth: 15, startDate: '2025-01-01' })).toBe('Monthly · day 15');
  });

  it('monthly_nth_weekday – 1st Monday', () => {
    expect(formatRuleSummary({ type: 'monthly_nth_weekday', nth: 1, weekday: 1, startDate: '2025-01-01' })).toBe('1st Monday of month');
  });

  it('monthly_nth_weekday – last Friday', () => {
    expect(formatRuleSummary({ type: 'monthly_nth_weekday', nth: -1, weekday: 5, startDate: '2025-01-01' })).toBe('last Friday of month');
  });

  it('custom – singular', () => {
    expect(formatRuleSummary({ type: 'custom', intervalDays: 1, startDate: '2025-01-01' })).toBe('Every 1 day');
  });

  it('custom – plural', () => {
    expect(formatRuleSummary({ type: 'custom', intervalDays: 5, startDate: '2025-01-01' })).toBe('Every 5 days');
  });
});

// ─── serialize / deserialize ──────────────────────────────────────────────────

describe('serializeRule / deserializeRule', () => {
  const rules: ScheduleRule[] = [
    { type: 'once', date: '2025-06-01' },
    { type: 'daily', startDate: '2025-01-01' },
    { type: 'weekly', daysOfWeek: [1, 3, 5], startDate: '2025-01-01' },
    { type: 'weekly_count', timesPerWeek: 3, startDate: '2025-01-01' },
    { type: 'monthly', dayOfMonth: 15, startDate: '2025-01-01' },
    { type: 'monthly_nth_weekday', nth: 2, weekday: 3, startDate: '2025-01-01' },
    { type: 'custom', intervalDays: 7, startDate: '2025-01-01' },
  ];

  rules.forEach((rule) => {
    it(`round-trips ${rule.type}`, () => {
      expect(deserializeRule(serializeRule(rule))).toEqual(rule);
    });
  });

  it('falls back to daily for invalid JSON', () => {
    const result = deserializeRule('not-json');
    expect(result.type).toBe('daily');
  });

  it('falls back to daily for unknown type', () => {
    const result = deserializeRule(JSON.stringify({ type: 'unknown', foo: 'bar' }));
    expect(result.type).toBe('daily');
  });

  it('falls back to daily for missing required fields', () => {
    const result = deserializeRule(JSON.stringify({ type: 'weekly' })); // missing daysOfWeek
    expect(result.type).toBe('daily');
  });
});
