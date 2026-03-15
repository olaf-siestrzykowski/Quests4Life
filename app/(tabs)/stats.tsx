import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { format, subDays, parseISO, startOfDay, getDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks } from 'date-fns';
import { Screen } from '@components/Screen';
import { usePointsStore, useTaskStore, useAchievementsStore } from '@store/index';
import { ACHIEVEMENT_DEFS } from '@store/achievementsStore';
import { db } from '@db/index';
import { completions, tasks, pointsLedger } from '@db/schema';
import { gte, lte, eq, and } from 'drizzle-orm';
import type { Task } from '@db/schema';

const REASON_LABEL: Record<string, string> = {
  task_complete:   'Task completed',
  task_uncomplete: 'Task uncompleted',
  goal_bonus:      'Goal bonus',
  reward_redeem:   'Reward redeemed',
  combo_bonus:     'Combo bonus',
};

function calcStreak(completedDates: Set<string>): number {
  let streak = 0;
  let cursor = new Date();
  while (completedDates.has(format(cursor, 'yyyy-MM-dd'))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

function groupByDate(history: ReturnType<typeof usePointsStore.getState>['history']) {
  const map = new Map<string, typeof history>();
  for (const entry of [...history].reverse()) {
    const day = (entry.createdAt ?? '').slice(0, 10);
    if (!day) continue;
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(entry);
  }
  return Array.from(map.entries()).map(([date, entries]) => ({ date, entries }));
}

function trendLabel(curr: number, prev: number): { text: string; color: string } | null {
  if (prev === 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct === 0) return null;
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, color: pct >= 0 ? '#22c55e' : '#ef4444' };
}

/** Bar chart using pure Views — no external chart lib needed. */
function BarChart({ data, color = '#0ea5e9' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 80 }}>
      {data.map((item, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <View
            style={{
              width: '100%',
              height: Math.max(2, Math.round((item.value / max) * 64)),
              backgroundColor: item.value > 0 ? color : '#e2e8f0',
              borderRadius: 3,
            }}
          />
          <Text style={{ fontSize: 8, color: '#94a3b8' }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** 30-day streak calendar grid. */
function StreakCalendar({ completedDates }: { completedDates: Set<string> }) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(today, 29 - i);
    return format(d, 'yyyy-MM-dd');
  });
  const todayStr = format(today, 'yyyy-MM-dd');

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
      {days.map((date) => {
        const done = completedDates.has(date);
        const isToday = date === todayStr;
        return (
          <View
            key={date}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: done ? '#22c55e' : '#e2e8f0',
              borderWidth: isToday ? 2 : 0,
              borderColor: '#0ea5e9',
            }}
          />
        );
      })}
    </View>
  );
}

interface CategoryStat { name: string; color: string; points: number }

export default function StatsScreen() {
  const history              = usePointsStore((s) => s.history);
  const balance              = usePointsStore((s) => s.balance);
  const storeTasks           = useTaskStore((s) => s.tasks);
  const completedTodayIds    = useTaskStore((s) => s.completedTodayIds);
  const unlocked             = useAchievementsStore((s) => s.unlocked);

  const [streak, setStreak] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [pointsPerDay, setPointsPerDay]     = useState<{ label: string; value: number }[]>([]);
  const [byDow, setByDow]                   = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Month / week stats
  const [thisMonthTasks, setThisMonthTasks] = useState(0);
  const [lastMonthTasks, setLastMonthTasks] = useState(0);
  const [thisWeekTasks, setThisWeekTasks]   = useState(0);
  const [lastWeekTasks, setLastWeekTasks]   = useState(0);

  // Points this / last week
  const [thisWeekPts, setThisWeekPts]   = useState(0);
  const [lastWeekPts, setLastWeekPts]   = useState(0);

  // Personal bests
  const [bestDayPts, setBestDayPts]         = useState(0);
  const [bestDayTaskCount, setBestDayTaskCount] = useState(0);

  // Category breakdown
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      // All completions
      const rows = await db.select().from(completions);
      const dates = new Set(rows.map((r) => r.forDate));
      setCompletedDates(dates);
      setStreak(calcStreak(dates));
      setTotalCompleted(rows.length);

      // Day-of-week breakdown
      const dow = [0, 0, 0, 0, 0, 0, 0];
      for (const r of rows) { dow[getDay(parseISO(r.forDate))]++; }
      setByDow(dow);

      // This month / last month
      const mFrom  = format(startOfMonth(today), 'yyyy-MM-dd');
      const mTo    = format(endOfMonth(today), 'yyyy-MM-dd');
      const lmFrom = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
      const lmTo   = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');

      const [thisMonthRows, lastMonthRows] = await Promise.all([
        db.select().from(completions).where(and(gte(completions.forDate, mFrom), lte(completions.forDate, mTo))),
        db.select().from(completions).where(and(gte(completions.forDate, lmFrom), lte(completions.forDate, lmTo))),
      ]);
      setThisMonthTasks(thisMonthRows.length);
      setLastMonthTasks(lastMonthRows.length);

      // This week / last week
      const wFrom  = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const wTo    = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const lwFrom = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const lwTo   = format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const [thisWeekRows, lastWeekRows] = await Promise.all([
        db.select().from(completions).where(and(gte(completions.forDate, wFrom), lte(completions.forDate, wTo))),
        db.select().from(completions).where(and(gte(completions.forDate, lwFrom), lte(completions.forDate, lwTo))),
      ]);
      setThisWeekTasks(thisWeekRows.length);
      setLastWeekTasks(lastWeekRows.length);

      // Personal bests — best day tasks and best day pts
      const tasksByDate = new Map<string, number>();
      for (const r of rows) tasksByDate.set(r.forDate, (tasksByDate.get(r.forDate) ?? 0) + 1);
      let bestCount = 0;
      for (const count of tasksByDate.values()) if (count > bestCount) bestCount = count;
      setBestDayTaskCount(bestCount);

      // Category breakdown — join completions → tasks → categories (last 30 days)
      const thirtyAgo = format(subDays(today, 29), 'yyyy-MM-dd');
      const recentCompletions = rows.filter((r) => r.forDate >= thirtyAgo);
      const completedTaskIds = [...new Set(recentCompletions.map((r) => r.taskId))];

      if (completedTaskIds.length > 0) {
        const allTasks = storeTasks;
        const catMap = new Map<string, { name: string; color: string; points: number }>();

        for (const r of recentCompletions) {
          const task = allTasks.find((t) => t.id === r.taskId);
          if (!task) continue;
          const catId = task.categoryId ?? '__none__';
          if (!catMap.has(catId)) {
            catMap.set(catId, { name: catId === '__none__' ? 'Uncategorised' : 'Unknown', color: '#cbd5e1', points: 0 });
          }
          catMap.get(catId)!.points += task.pointValue;
        }

        // Enrich with category names/colors from store
        const { useCategoryStore } = await import('@store/index');
        const cats = useCategoryStore.getState().categories;
        for (const cat of cats) {
          if (catMap.has(cat.id)) {
            catMap.get(cat.id)!.name = cat.name;
            catMap.get(cat.id)!.color = cat.color;
          }
        }

        const sorted = [...catMap.values()].sort((a, b) => b.points - a.points).slice(0, 5);
        setCategoryStats(sorted);
      }
    })();
  }, [storeTasks]);

  // Points per day — last 14 days (from ledger)
  useEffect(() => {
    const today = new Date();
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(today, 13 - i);
      return format(d, 'yyyy-MM-dd');
    });
    const map = new Map<string, number>();
    for (const day of days) map.set(day, 0);

    let thisWk = 0, lastWk = 0;
    const wFrom  = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const wTo    = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const lwFrom = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const lwTo   = format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    let bestDay = 0;
    const dayPts = new Map<string, number>();

    for (const entry of history) {
      if (entry.delta <= 0) continue;
      const day = (entry.createdAt ?? '').slice(0, 10);
      if (map.has(day)) map.set(day, map.get(day)! + entry.delta);
      if (day >= wFrom && day <= wTo) thisWk += entry.delta;
      if (day >= lwFrom && day <= lwTo) lastWk += entry.delta;
      dayPts.set(day, (dayPts.get(day) ?? 0) + entry.delta);
    }
    for (const pts of dayPts.values()) if (pts > bestDay) bestDay = pts;
    setBestDayPts(bestDay);
    setThisWeekPts(thisWk);
    setLastWeekPts(lastWk);

    setPointsPerDay(
      days.map((d) => ({
        label: format(parseISO(d), 'd'),
        value: map.get(d) ?? 0,
      }))
    );
  }, [history]);

  const totalEarned = history.filter((e) => e.delta > 0).reduce((s, e) => s + e.delta, 0);
  const totalSpent  = Math.abs(history.filter((e) => e.delta < 0).reduce((s, e) => s + e.delta, 0));
  const groups      = groupByDate(history);

  const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const dowData    = DOW_LABELS.map((label, i) => ({ label, value: byDow[i] }));

  const weekTaskTrend = trendLabel(thisWeekTasks, lastWeekTasks);
  const weekPtsTrend  = trendLabel(thisWeekPts, lastWeekPts);

  // Goal stats
  const activeGoals    = storeTasks.filter((t) => t.isGoal && !t.archivedAt).length;
  const activeTasks    = storeTasks.filter((t) => !t.isGoal && !t.archivedAt).length;

  const StatPill = ({
    label, value, color, trend,
  }: { label: string; value: string | number; color: string; trend?: { text: string; color: string } | null }) => (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, textAlign: 'center' }}>{label}</Text>
      {trend && (
        <Text style={{ fontSize: 10, fontWeight: '700', color: trend.color, marginTop: 3 }}>{trend.text}</Text>
      )}
    </View>
  );

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 14, letterSpacing: 0.4, textTransform: 'uppercase' }}>{title}</Text>
      {children}
    </View>
  );

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '700', color: '#0f172a' }}>Stats</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 1 }}>Your progress over time</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/weekly-review')}
            style={{ backgroundColor: '#f0f9ff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#bae6fd', marginTop: 4 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#0369a1' }}>Weekly Review →</Text>
          </TouchableOpacity>
        </View>

        {/* Achievements banner */}
        {unlocked.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/achievements')}
            style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: '#fef9c3', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#fde68a' }}
          >
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {unlocked.slice(0, 5).map((a) => {
                const def = ACHIEVEMENT_DEFS.find((d) => d.key === a.key);
                return <Text key={a.key} style={{ fontSize: 20 }}>{def?.emoji ?? '🏅'}</Text>;
              })}
              {unlocked.length > 5 && (
                <Text style={{ fontSize: 14, color: '#92400e', fontWeight: '700', marginLeft: 4, alignSelf: 'center' }}>+{unlocked.length - 5}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#78350f' }}>
                {unlocked.length} / {ACHIEVEMENT_DEFS.length} achievements
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#92400e' }}>→</Text>
          </TouchableOpacity>
        )}

        {/* Balance card */}
        <View style={{ marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0ea5e9', padding: 24, alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Current Balance</Text>
          <Text style={{ color: '#fff', fontSize: 52, fontWeight: '800', marginTop: 4, lineHeight: 60 }}>
            ⭐ {balance}
          </Text>
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>TOTAL EARNED</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>+{totalEarned}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>TOTAL SPENT</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>-{totalSpent}</Text>
            </View>
          </View>
        </View>

        {/* This month summary card */}
        <View style={{ marginHorizontal: 20, backgroundColor: '#f0f9ff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#bae6fd' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            {format(new Date(), 'MMMM')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#0ea5e9' }}>{thisMonthTasks}</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>tasks done</Text>
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#f59e0b' }}>{streak}🔥</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>day streak</Text>
            </View>
            {lastMonthTasks > 0 && (
              <View style={{ justifyContent: 'center' }}>
                {trendLabel(thisMonthTasks, lastMonthTasks) && (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: trendLabel(thisMonthTasks, lastMonthTasks)!.color }}>
                    {trendLabel(thisMonthTasks, lastMonthTasks)!.text} vs last month
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Stat pills — week view */}
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 20 }}>
          <StatPill label="This week tasks" value={thisWeekTasks} color="#0ea5e9" trend={weekTaskTrend} />
          <StatPill label="This week pts" value={`+${thisWeekPts}`} color="#22c55e" trend={weekPtsTrend} />
          <StatPill label="All tasks done" value={totalCompleted} color="#8b5cf6" />
        </View>

        {/* Active counts row */}
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a' }}>{activeTasks}</Text>
            <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>active tasks</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#f59e0b' }}>{activeGoals}</Text>
            <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>active goals</Text>
          </View>
        </View>

        {/* Goals at a glance */}
        {(() => {
          const activeGoals = storeTasks.filter((t) => t.isGoal && !t.archivedAt);
          if (activeGoals.length === 0) return null;

          return (
            <ChartCard title="Goals — today's progress">
              {activeGoals.map((goal) => {
                const children = storeTasks.filter((t) => t.parentGoalId === goal.id && !t.archivedAt);
                const doneToday = children.filter((t) => completedTodayIds.has(t.id)).length;
                const total = children.length;
                const progress = total > 0 ? doneToday / total : 0;
                const isComplete = total > 0 && doneToday === total;

                return (
                  <TouchableOpacity
                    key={goal.id}
                    onPress={() => router.push(`/goal/${goal.id}`)}
                    style={{ marginBottom: 14 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: isComplete ? '#22c55e' : '#1e293b' }}>
                        {isComplete ? '✓ ' : ''}{goal.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                        {doneToday}/{total}
                      </Text>
                    </View>
                    <View style={{ height: 5, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.round(progress * 100)}%`,
                          backgroundColor: isComplete ? '#22c55e' : '#0ea5e9',
                          borderRadius: 3,
                        }}
                      />
                    </View>
                    {total === 0 && (
                      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>No child tasks</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ChartCard>
          );
        })()}

        {/* Personal bests */}
        {(bestDayPts > 0 || bestDayTaskCount > 0) && (
          <ChartCard title="Personal Bests">
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#fef9c3', borderRadius: 12 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#ca8a04' }}>+{bestDayPts}</Text>
                <Text style={{ fontSize: 11, color: '#92400e', marginTop: 2, textAlign: 'center' }}>Best day (points)</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#f0fdf4', borderRadius: 12 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#16a34a' }}>{bestDayTaskCount}</Text>
                <Text style={{ fontSize: 11, color: '#166534', marginTop: 2, textAlign: 'center' }}>Most tasks in a day</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#fff7ed', borderRadius: 12 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#ea580c' }}>{streak}🔥</Text>
                <Text style={{ fontSize: 11, color: '#9a3412', marginTop: 2, textAlign: 'center' }}>Current streak</Text>
              </View>
            </View>
          </ChartCard>
        )}

        {/* Category breakdown */}
        {categoryStats.length > 0 && (
          <ChartCard title="Points by Category — last 30 days">
            {categoryStats.map((cat) => {
              const maxPts = categoryStats[0].points;
              const width = maxPts > 0 ? (cat.points / maxPts) * 100 : 0;
              return (
                <View key={cat.name} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }} />
                      <Text style={{ fontSize: 13, color: '#1e293b', fontWeight: '500' }}>{cat.name}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0ea5e9' }}>+{cat.points}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3 }}>
                    <View style={{ height: 6, width: `${width}%`, backgroundColor: cat.color, borderRadius: 3 }} />
                  </View>
                </View>
              );
            })}
          </ChartCard>
        )}

        {/* Points per day — 14-day bar chart */}
        {pointsPerDay.some((d) => d.value > 0) && (
          <ChartCard title="Points earned — last 14 days">
            <BarChart data={pointsPerDay} color="#0ea5e9" />
          </ChartCard>
        )}

        {/* Completions by day of week */}
        {totalCompleted > 0 && (
          <ChartCard title="Completions by day of week">
            <BarChart data={dowData} color="#8b5cf6" />
          </ChartCard>
        )}

        {/* 30-day streak calendar */}
        {totalCompleted > 0 && (
          <ChartCard title="Last 30 days">
            <StreakCalendar completedDates={completedDates} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#22c55e' }} />
                <Text style={{ fontSize: 11, color: '#64748b' }}>Had completions</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#e2e8f0' }} />
                <Text style={{ fontSize: 11, color: '#64748b' }}>No completions</Text>
              </View>
            </View>
          </ChartCard>
        )}

        {/* Recent Activity */}
        {groups.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>📊</Text>
            <Text style={{ fontSize: 16, color: '#64748b', fontWeight: '600' }}>No history yet</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Complete tasks to start earning points</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Recent Activity
            </Text>
            {groups.map((group) => (
              <View key={group.date} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6 }}>
                  {format(parseISO(group.date), 'EEEE, MMMM d')}
                </Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                  {group.entries.map((entry, idx) => (
                    <View
                      key={entry.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderTopWidth: idx === 0 ? 0 : 0.5,
                        borderTopColor: '#f1f5f9',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: '500' }}>
                          {REASON_LABEL[entry.reason] ?? entry.reason}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                          {(entry.createdAt ?? '').slice(11, 16)}
                        </Text>
                      </View>
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: entry.delta >= 0 ? '#22c55e' : '#ef4444',
                      }}>
                        {entry.delta >= 0 ? '+' : ''}{entry.delta}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
