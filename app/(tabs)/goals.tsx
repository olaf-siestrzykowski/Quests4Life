import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  differenceInDays, parseISO,
} from 'date-fns';
import { useTaskStore } from '@store/index';
import { GoalCard } from '@components/GoalCard';
import { Screen } from '@components/Screen';
import { deserializeRule } from '@lib/recurrence';
import { useColors } from '@lib/colors';

function getPeriodInfo(scheduleRuleJson: string): {
  from: string; to: string; label: string; daysLeft: number;
} {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  try {
    const rule = deserializeRule(scheduleRuleJson);
    if (rule.type === 'weekly') {
      const from = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const to   = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const daysLeft = differenceInDays(parseISO(to), today);
      return { from, to, label: 'this week', daysLeft };
    }
    if (rule.type === 'monthly') {
      const from = format(startOfMonth(today), 'yyyy-MM-dd');
      const to   = format(endOfMonth(today), 'yyyy-MM-dd');
      const daysLeft = differenceInDays(parseISO(to), today);
      return { from, to, label: 'this month', daysLeft };
    }
  } catch {}
  return { from: todayStr, to: todayStr, label: 'today', daysLeft: 0 };
}

export default function GoalsScreen() {
  const C = useColors();

  const tasks              = useTaskStore((s) => s.tasks);
  const completedTodayIds  = useTaskStore((s) => s.completedTodayIds);
  const completionsInRange = useTaskStore((s) => s.completionsInRange);
  const loadTasks          = useTaskStore((s) => s.load);
  const unarchiveTask      = useTaskStore((s) => s.unarchiveTask);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, []);

  const [showArchived, setShowArchived] = useState(false);

  const allGoals      = tasks.filter((t) => t.isGoal);
  const goals         = allGoals.filter((t) => !t.archivedAt);
  const archivedGoals = allGoals.filter((t) => !!t.archivedAt);

  const [periodCounts, setPeriodCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const allChildTaskIds = goals.flatMap((g) =>
      tasks.filter((t) => t.parentGoalId === g.id && !t.archivedAt).map((t) => t.id),
    );
    if (allChildTaskIds.length === 0) return;

    const today = new Date();
    const from = format(startOfMonth(today), 'yyyy-MM-dd');
    const to   = format(endOfMonth(today), 'yyyy-MM-dd');

    completionsInRange(allChildTaskIds, from, to).then((byTaskId) => {
      const goalTotals = new Map<string, number>();
      for (const goal of goals) {
        const children = tasks.filter((t) => t.parentGoalId === goal.id && !t.archivedAt);
        let total = 0;
        for (const child of children) {
          total += byTaskId.get(child.id) ?? 0;
        }
        goalTotals.set(goal.id, total);
      }
      setPeriodCounts(goalTotals);
    });
  }, [tasks]);

  return (
    <Screen edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: C.textDim }}>Goals</Text>
        <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>
          {goals.length} active goal{goals.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 64 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎯</Text>
            <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '600' }}>No goals yet</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
              Tap + to create your first goal
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const childTasks = tasks.filter((t) => t.parentGoalId === item.id && !t.archivedAt);
          const { label, daysLeft } = getPeriodInfo(item.scheduleRule);
          return (
            <GoalCard
              goal={item}
              childTasks={childTasks}
              completedTodayIds={completedTodayIds}
              onPress={() => router.push(`/goal/${item.id}`)}
              periodDone={periodCounts.get(item.id) ?? 0}
              periodLabel={label}
              periodDaysLeft={daysLeft}
            />
          );
        }}
        ListFooterComponent={
          archivedGoals.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setShowArchived((v) => !v)}
                style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 }}
              >
                <Text style={{ fontSize: 13, color: C.textMuted }}>
                  {showArchived ? 'Hide archived' : `${archivedGoals.length} archived →`}
                </Text>
              </TouchableOpacity>
              {showArchived && archivedGoals.map((g) => (
                <View key={g.id} style={{ opacity: 0.5, marginTop: 8 }}>
                  <Pressable
                    onPress={() => Alert.alert(`Unarchive "${g.title}"?`, '', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Unarchive', onPress: () => unarchiveTask(g.id) },
                    ])}
                    style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}
                  >
                    <Text style={{ fontSize: 15, fontStyle: 'italic', color: C.textSecondary }}>{g.title}</Text>
                    <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Tap to unarchive</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/new-goal')}
        style={{
          position: 'absolute', bottom: 32, right: 24,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: C.primary,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
      </TouchableOpacity>
    </Screen>
  );
}
