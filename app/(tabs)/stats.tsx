import { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, subDays, parseISO } from 'date-fns';
import { usePointsStore } from '@store/index';
import { db } from '@db/index';
import { completions } from '@db/schema';

type DayGroup = {
  date: string; // 'yyyy-MM-dd'
  entries: ReturnType<typeof usePointsStore.getState>['history'];
};

const REASON_LABEL: Record<string, string> = {
  task_complete:   'Task completed',
  task_uncomplete: 'Task uncompleted',
  goal_bonus:      'Goal bonus',
  reward_redeem:   'Reward redeemed',
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

function groupByDate(history: ReturnType<typeof usePointsStore.getState>['history']): DayGroup[] {
  const map = new Map<string, DayGroup['entries']>();
  for (const entry of [...history].reverse()) {
    const day = (entry.createdAt ?? '').slice(0, 10);
    if (!day) continue;
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(entry);
  }
  return Array.from(map.entries()).map(([date, entries]) => ({ date, entries }));
}

export default function StatsScreen() {
  const history = usePointsStore((s) => s.history);
  const balance = usePointsStore((s) => s.balance);

  const [streak, setStreak] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);

  useEffect(() => {
    (async () => {
      const rows = await db.select().from(completions);
      const dates = new Set(rows.map((r) => r.forDate));
      setStreak(calcStreak(dates));
      setTotalCompleted(rows.length);
    })();
  }, []);

  const totalEarned = history.filter((e) => e.delta > 0).reduce((s, e) => s + e.delta, 0);
  const totalSpent  = Math.abs(history.filter((e) => e.delta < 0).reduce((s, e) => s + e.delta, 0));
  const groups      = groupByDate(history);

  const StatPill = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: '#0f172a' }}>Stats</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 1 }}>Your progress over time</Text>
        </View>

        {/* Balance card */}
        <View style={{ marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0ea5e9', padding: 24, alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Current Balance</Text>
          <Text style={{ color: '#fff', fontSize: 52, fontWeight: '800', marginTop: 4, lineHeight: 60 }}>
            ⭐ {balance}
          </Text>
        </View>

        {/* Stat pills */}
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 24 }}>
          <StatPill label="Earned" value={`+${totalEarned}`} color="#22c55e" />
          <StatPill label="Spent" value={`-${totalSpent}`} color="#ef4444" />
          <StatPill label="Tasks Done" value={totalCompleted} color="#0ea5e9" />
          <StatPill label="Day Streak" value={`${streak}🔥`} color="#f59e0b" />
        </View>

        {/* History */}
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
    </SafeAreaView>
  );
}
