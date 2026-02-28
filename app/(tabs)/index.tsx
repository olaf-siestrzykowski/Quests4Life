import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { format, startOfDay, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import { useTaskStore, usePointsStore } from '@store/index';
import { TaskCard } from '@components/TaskCard';
import { deserializeRule, dueDatesInRange } from '@lib/recurrence';
import type { Task } from '@db/schema';

function buildWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TodayScreen() {
  const tasks              = useTaskStore((s) => s.tasks);
  const completedTodayIds  = useTaskStore((s) => s.completedTodayIds);
  const completeTask       = useTaskStore((s) => s.completeTask);
  const uncompleteTask     = useTaskStore((s) => s.uncompleteTask);
  const completionsForDate = useTaskStore((s) => s.completionsForDate);
  const balance            = usePointsStore((s) => s.balance);
  const addPoints          = usePointsStore((s) => s.addPoints);
  const wasGoalBonus       = usePointsStore((s) => s.wasGoalBonusGrantedToday);

  const todayDate = startOfDay(new Date());
  const todayStr  = format(todayDate, 'yyyy-MM-dd');

  const [selectedDate, setSelectedDate]   = useState(todayDate);
  const [weekStart, setWeekStart]         = useState(() => startOfWeek(todayDate, { weekStartsOn: 1 }));
  // completions for the selected date (only populated when not today)
  const [historicIds, setHistoricIds]     = useState<Set<string>>(new Set());

  const isToday = isSameDay(selectedDate, todayDate);
  const selectedStr = format(selectedDate, 'yyyy-MM-dd');

  // When selected date changes and it's not today, fetch completions for that date
  useEffect(() => {
    if (isToday) {
      setHistoricIds(new Set());
      return;
    }
    completionsForDate(selectedStr).then(setHistoricIds);
  }, [selectedStr, isToday]);

  const completedIds = isToday ? completedTodayIds : historicIds;

  const todayTasks = tasks.filter((t) => {
    if (t.isGoal) return false;
    try {
      const selectedStart = startOfDay(selectedDate);
      return dueDatesInRange(deserializeRule(t.scheduleRule), selectedStart, selectedStart).includes(selectedStr);
    } catch {
      return false;
    }
  });

  const doneCount  = todayTasks.filter((t) => completedIds.has(t.id)).length;
  const totalCount = todayTasks.length;
  const progress   = totalCount > 0 ? doneCount / totalCount : 0;

  const handleComplete = useCallback(
    async (task: Task) => {
      // Completing past/future dates is read-only
      if (!isToday) return;

      const alreadyDone = completedTodayIds.has(task.id);

      if (alreadyDone) {
        await uncompleteTask(task.id, todayStr);
        await addPoints(-task.pointValue, 'task_uncomplete', { taskId: task.id });
      } else {
        await completeTask(task.id, todayStr);
        await addPoints(task.pointValue, 'task_complete', { taskId: task.id });
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Goal bonus
        if (task.parentGoalId) {
          const goal = tasks.find((t) => t.id === task.parentGoalId && t.isGoal);
          if (goal && goal.bonusPoints > 0 && !wasGoalBonus(goal.id)) {
            const siblings = tasks.filter((t) => t.parentGoalId === task.parentGoalId && !t.archivedAt);
            const newDone = new Set([...completedTodayIds, task.id]);
            if (siblings.every((s) => newDone.has(s.id))) {
              await addPoints(goal.bonusPoints, 'goal_bonus', { taskId: goal.id });
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Goal complete! 🎉', `You earned ${goal.bonusPoints} bonus points!`);
            }
          }
        }
      }
    },
    [tasks, completedTodayIds, todayStr, isToday],
  );

  const weekDays = buildWeekDays(weekStart);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, backgroundColor: '#f8fafc' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '700', color: '#0f172a' }}>
              {isToday ? 'Today' : format(selectedDate, 'EEE, MMM d')}
            </Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 1 }}>
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </Text>
          </View>
          {/* Points badge */}
          <View style={{ backgroundColor: '#0ea5e9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>⭐ {balance}</Text>
          </View>
        </View>
      </View>

      {/* Week strip */}
      <View style={{ backgroundColor: '#f8fafc', paddingBottom: 8 }}>
        {/* Prev / Next week row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 6 }}>
          <TouchableOpacity
            onPress={() => setWeekStart((w) => subWeeks(w, 1))}
            style={{ padding: 6 }}
          >
            <Text style={{ fontSize: 18, color: '#64748b' }}>‹</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
            {weekDays.map((day) => {
              const dayStr   = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isSameDay(day, todayDate);
              return (
                <TouchableOpacity
                  key={dayStr}
                  onPress={() => {
                    setSelectedDate(startOfDay(day));
                    // Keep week strip showing the week containing the selected date
                    setWeekStart(startOfWeek(day, { weekStartsOn: 1 }));
                  }}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 6,
                    borderRadius: 10,
                    backgroundColor: isSelected ? '#0ea5e9' : 'transparent',
                    minWidth: 38,
                  }}
                >
                  <Text style={{ fontSize: 10, color: isSelected ? '#bae6fd' : '#94a3b8', fontWeight: '500' }}>
                    {DAY_LABELS[day.getDay()]}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 1, color: isSelected ? '#fff' : isTodayDay ? '#0ea5e9' : '#334155' }}>
                    {format(day, 'd')}
                  </Text>
                  {isTodayDay && !isSelected && (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#0ea5e9', marginTop: 2 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => setWeekStart((w) => addWeeks(w, 1))}
            style={{ padding: 6 }}
          >
            <Text style={{ fontSize: 18, color: '#64748b' }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Jump to today */}
        {!isToday && (
          <TouchableOpacity
            onPress={() => {
              setSelectedDate(todayDate);
              setWeekStart(startOfWeek(todayDate, { weekStartsOn: 1 }));
            }}
            style={{ alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, backgroundColor: '#e0f2fe' }}
          >
            <Text style={{ fontSize: 12, color: '#0ea5e9', fontWeight: '600' }}>Jump to Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      {totalCount > 0 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
              {doneCount} of {totalCount} done
            </Text>
            <Text style={{ fontSize: 12, color: '#0ea5e9', fontWeight: '600' }}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View style={{ height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: progress === 1 ? '#22c55e' : '#0ea5e9',
                borderRadius: 3,
              }}
            />
          </View>
        </View>
      )}

      {/* Task list */}
      <FlatList
        data={todayTasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 48 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>
              {isToday ? '🎉' : '📅'}
            </Text>
            <Text style={{ fontSize: 16, color: '#64748b', fontWeight: '600' }}>
              {isToday ? 'Nothing due today' : 'No tasks on this day'}
            </Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              {isToday ? 'Add a task to get started' : 'Schedule tasks to see them here'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            completed={completedIds.has(item.id)}
            onComplete={isToday ? () => handleComplete(item) : undefined}
            onPress={() => router.push(`/task/${item.id}`)}
            readonly={!isToday}
          />
        )}
      />

      {/* FAB (only on today) */}
      {isToday && (
        <TouchableOpacity
          onPress={() => router.push('/new-task')}
          style={{
            position: 'absolute',
            bottom: 32,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#0ea5e9',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#0ea5e9',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
