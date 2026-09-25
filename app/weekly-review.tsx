import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import {
  format, startOfWeek, endOfWeek, subWeeks, parseISO, getDay,
} from 'date-fns';
import { Screen } from '@components/Screen';
import { useTaskStore, usePointsStore } from '@store/index';
import { db } from '@db/index';
import { completions } from '@db/schema';
import { and, gte, lte } from 'drizzle-orm';
import { useColors } from '@lib/colors';
import type { AppColors } from '@lib/colors';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function BarChart({ data, color, C }: { data: { label: string; value: number }[]; color: string; C: AppColors }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 }}>
      {data.map((item, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 9, color: C.textSecondary, fontWeight: '600' }}>
            {item.value > 0 ? item.value : ''}
          </Text>
          <View style={{
            width: '100%',
            height: Math.max(3, Math.round((item.value / max) * 56)),
            backgroundColor: item.value > 0 ? color : C.border,
            borderRadius: 4,
          }} />
          <Text style={{ fontSize: 9, color: C.textMuted }}>{item.label}</Text>
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
  byDay: number[];
  topTasks: { title: string; count: number }[];
}

export default function WeeklyReviewScreen() {
  const C = useColors();
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

        const topTasks = [...taskFreq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => ({
            title: storeTasks.find((t) => t.id === id)?.title ?? 'Unknown task',
            count,
          }));

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
      backgroundColor: C.bgCard,
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
      borderWidth: 1,
      borderColor: C.borderLight,
      ...style,
    }}>
      {children}
    </View>
  );

  const SectionTitle = ({ text }: { text: string }) => (
    <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
      {text}
    </Text>
  );

  return (
    <Screen edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 22, color: C.textSecondary }}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.textDim }}>Weekly Review</Text>
          {thisWeek && (
            <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>
              {formatDateRange(thisWeek.from, thisWeek.to)}
            </Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}>
        {thisWeek == null ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>⏳</Text>
            <Text style={{ fontSize: 14, color: C.textMuted }}>Loading…</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: C.primaryBg, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.primaryLight }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: C.primary }}>{thisWeek.taskCount}</Text>
                <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>tasks done</Text>
                {lastWeek && (() => {
                  const t = trend(thisWeek.taskCount, lastWeek.taskCount);
                  return t ? (
                    <Text style={{ fontSize: 10, fontWeight: '700', color: t.up ? C.success : C.danger, marginTop: 4 }}>
                      {t.text} vs last week
                    </Text>
                  ) : null;
                })()}
              </View>
              <View style={{ flex: 1, backgroundColor: C.warningLight, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.warningDark }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: C.warningDark }}>+{thisWeek.points}</Text>
                <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>points earned</Text>
                {lastWeek && (() => {
                  const t = trend(thisWeek.points, lastWeek.points);
                  return t ? (
                    <Text style={{ fontSize: 10, fontWeight: '700', color: t.up ? C.success : C.danger, marginTop: 4 }}>
                      {t.text} vs last week
                    </Text>
                  ) : null;
                })()}
              </View>
            </View>

            <Card>
              <SectionTitle text="Tasks completed by day" />
              <BarChart
                color={C.primary}
                C={C}
                data={DAY_LABELS.map((label, i) => ({ label, value: thisWeek.byDay[i] }))}
              />
            </Card>

            {lastWeek && (
              <Card>
                <SectionTitle text="This week vs last week" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: C.textMuted, marginBottom: 8 }}>
                      LAST WEEK · {formatDateRange(lastWeek.from, lastWeek.to)}
                    </Text>
                    <BarChart
                      color={C.border}
                      C={C}
                      data={DAY_LABELS.map((label, i) => ({ label, value: lastWeek.byDay[i] }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: C.primaryDark, marginBottom: 8 }}>
                      THIS WEEK · {formatDateRange(thisWeek.from, thisWeek.to)}
                    </Text>
                    <BarChart
                      color={C.primary}
                      C={C}
                      data={DAY_LABELS.map((label, i) => ({ label, value: thisWeek.byDay[i] }))}
                    />
                  </View>
                </View>
              </Card>
            )}

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
                      borderTopColor: C.borderLight,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: C.textMuted, width: 20, fontWeight: '700' }}>
                      {i + 1}.
                    </Text>
                    <Text style={{ flex: 1, fontSize: 14, color: C.text }}>{t.title}</Text>
                    <View style={{ backgroundColor: C.primaryBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>×{t.count}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {thisWeek.taskCount === 0 && (
              <View style={{ alignItems: 'center', marginTop: 16 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>📅</Text>
                <Text style={{ fontSize: 15, color: C.textSecondary, fontWeight: '600' }}>No tasks completed this week</Text>
                <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
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
