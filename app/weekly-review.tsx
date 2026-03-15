import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import {
  format, subDays, startOfWeek, endOfWeek, subWeeks, parseISO, getDay,
} from 'date-fns';
import { Screen } from '@components/Screen';
import { useTaskStore, usePointsStore } from '@store/index';
import { db } from '@db/index';
import { completions } from '@db/schema';
import { and, gte, lte } from 'drizzle-orm';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function BarChart({ data, color = '#0ea5e9' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 }}>
      {data.map((item, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '600' }}>
            {item.value > 0 ? item.value : ''}
          </Text>
          <View
            style={{
              width: '100%',
              height: Math.max(3, Math.round((item.value / max) * 56)),
              backgroundColor: item.value > 0 ? color : '#e2e8f0',
              borderRadius: 4,
            }}
          />
          <Text style={{ fontSize: 9, color: '#94a3b8' }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

interface WeekData {
  from: string;
  to: string;
  taskCount: number;
  points: number;
  byDay: number[];   // length 7, indexed by getDay() (0=Sun)
  topTasks: { title: string; count: number }[];
}

export default function WeeklyReviewScreen() {
  const storeTasks = useTaskStore((s) => s.tasks);
  const history    = usePointsStore((s) => s.history);

  const [thisWeek, setThisWeek] = useState<WeekData | null>(null);
  const [lastWeek, setLastWeek] = useState<WeekData | null>(null);

  useEffect(() => {
    (async () => {
      const today = new Date();
      const opts  = { weekStartsOn: 1 } as const;

      const computeWeek = async (weekStart: Date): Promise<WeekData> => {
        const from = format(weekStart, 'yyyy-MM-dd');
        const to   = format(endOfWeek(weekStart, opts), 'yyyy-MM-dd');

        const rows = await db
          .select()
          .from(completions)
          .where(and(gte(completions.forDate, from), lte(completions.forDate, to)));

        const byDay = [0, 0, 0, 0, 0, 0, 0];
        const taskFreq = new Map<string, number>();
        for (const r of rows) {
          byDay[getDay(parseISO(r.forDate))]++;
          taskFreq.set(r.taskId, (taskFreq.get(r.taskId) ?? 0) + 1);
        }

        // Top tasks by completion frequency this week
        const topTasks = [...taskFreq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => ({
            title: storeTasks.find((t) => t.id === id)?.title ?? 'Unknown task',
            count,
          }));

        // Points earned this week from ledger
        let points = 0;
        for (const e of history) {
          if (e.delta > 0) {
            const day = (e.createdAt ?? '').slice(0, 10);
            if (day >= from && day <= to) points += e.delta;
          }
        }

        return { from, to, taskCount: rows.length, points, byDay, topTasks };
      };

      const [tw, lw] = await Promise.all([
        computeWeek(startOfWeek(today, opts)),
        computeWeek(startOfWeek(subWeeks(today, 1), opts)),
      ]);
      setThisWeek(tw);
      setLastWeek(lw);
    })();
  }, [storeTasks, history]);

  const formatDateRange = (from: string, to: string) =>
    `${format(parseISO(from), 'MMM d')} – ${format(parseISO(to), 'MMM d')}`;

  const trend = (curr: number, prev: number) => {
    if (prev === 0) return null;
    const pct = Math.round(((curr - prev) / prev) * 100);
    if (pct === 0) return null;
    return { text: `${pct > 0 ? '+' : ''}${pct}%`, up: pct > 0 };
  };

  const Card = ({ children, style }: { children: React.ReactNode; style?: object }) => (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
      ...style,
    }}>
      {children}
    </View>
  );

  const SectionTitle = ({ text }: { text: string }) => (
    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
      {text}
    </Text>
  );

  return (
    <Screen edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 22, color: '#64748b' }}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#0f172a' }}>Weekly Review</Text>
          {thisWeek && (
            <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
              {formatDateRange(thisWeek.from, thisWeek.to)}
            </Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}>
        {thisWeek == null ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>⏳</Text>
            <Text style={{ fontSize: 14, color: '#94a3b8' }}>Loading…</Text>
          </View>
        ) : (
          <>
            {/* Summary pills */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {/* Tasks */}
              <View style={{ flex: 1, backgroundColor: '#f0f9ff', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#bae6fd' }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#0ea5e9' }}>{thisWeek.taskCount}</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>tasks done</Text>
                {lastWeek && (() => {
                  const t = trend(thisWeek.taskCount, lastWeek.taskCount);
                  return t ? (
                    <Text style={{ fontSize: 10, fontWeight: '700', color: t.up ? '#22c55e' : '#ef4444', marginTop: 4 }}>
                      {t.text} vs last week
                    </Text>
                  ) : null;
                })()}
              </View>
              {/* Points */}
              <View style={{ flex: 1, backgroundColor: '#fef9c3', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fde68a' }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#ca8a04' }}>+{thisWeek.points}</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>points earned</Text>
                {lastWeek && (() => {
                  const t = trend(thisWeek.points, lastWeek.points);
                  return t ? (
                    <Text style={{ fontSize: 10, fontWeight: '700', color: t.up ? '#22c55e' : '#ef4444', marginTop: 4 }}>
                      {t.text} vs last week
                    </Text>
                  ) : null;
                })()}
              </View>
            </View>

            {/* Day-by-day chart */}
            <Card>
              <SectionTitle text="Tasks completed by day" />
              <BarChart
                color="#0ea5e9"
                data={DAY_LABELS.map((label, i) => ({
                  label,
                  value: thisWeek.byDay[i],
                }))}
              />
            </Card>

            {/* vs last week comparison */}
            {lastWeek && (
              <Card>
                <SectionTitle text="This week vs last week" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#94a3b8', marginBottom: 8 }}>
                      LAST WEEK · {formatDateRange(lastWeek.from, lastWeek.to)}
                    </Text>
                    <BarChart
                      color="#cbd5e1"
                      data={DAY_LABELS.map((label, i) => ({
                        label,
                        value: lastWeek.byDay[i],
                      }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#0369a1', marginBottom: 8 }}>
                      THIS WEEK · {formatDateRange(thisWeek.from, thisWeek.to)}
                    </Text>
                    <BarChart
                      color="#0ea5e9"
                      data={DAY_LABELS.map((label, i) => ({
                        label,
                        value: thisWeek.byDay[i],
                      }))}
                    />
                  </View>
                </View>
              </Card>
            )}

            {/* Top tasks */}
            {thisWeek.topTasks.length > 0 && (
              <Card>
                <SectionTitle text="Most completed tasks" />
                {thisWeek.topTasks.map((t, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderTopWidth: i === 0 ? 0 : 0.5,
                      borderTopColor: '#f1f5f9',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#94a3b8', width: 20, fontWeight: '700' }}>
                      {i + 1}.
                    </Text>
                    <Text style={{ flex: 1, fontSize: 14, color: '#1e293b' }}>{t.title}</Text>
                    <View style={{ backgroundColor: '#f0f9ff', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0ea5e9' }}>×{t.count}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Empty state */}
            {thisWeek.taskCount === 0 && (
              <View style={{ alignItems: 'center', marginTop: 16 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>📅</Text>
                <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '600' }}>No tasks completed this week</Text>
                <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                  Complete tasks today to start your review
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
