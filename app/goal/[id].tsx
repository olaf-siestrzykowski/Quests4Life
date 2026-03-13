import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from '@lib/haptics';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInCalendarDays, addDays } from 'date-fns';
import { useTaskStore, usePointsStore } from '@store/index';
import { TaskCard } from '@components/TaskCard';
import { ScheduleRulePicker } from '@components/ScheduleRulePicker';
import { Screen } from '@components/Screen';
import { deserializeRule, serializeRule } from '@lib/recurrence';
import type { ScheduleRule } from '@lib/recurrence';
import { effectivePoints } from '@lib/difficulty';
import type { Task } from '@db/schema';

const BONUS_PRESETS = [25, 50, 100, 200, 500];

/** Returns { from, to, label, daysLeft } for the current period of a goal rule. */
function getPeriodInfo(rule: ScheduleRule): { from: string; to: string; label: string; daysLeft: number } {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  if (rule.type === 'weekly') {
    const mon = startOfWeek(today, { weekStartsOn: 1 });
    const sun = endOfWeek(today, { weekStartsOn: 1 });
    const to = format(sun, 'yyyy-MM-dd');
    const daysLeft = Math.max(0, differenceInCalendarDays(sun, today));
    return { from: format(mon, 'yyyy-MM-dd'), to, label: 'this week', daysLeft };
  }
  if (rule.type === 'monthly') {
    const first = startOfMonth(today);
    const last = endOfMonth(today);
    const to = format(last, 'yyyy-MM-dd');
    const daysLeft = Math.max(0, differenceInCalendarDays(last, today));
    return { from: format(first, 'yyyy-MM-dd'), to, label: 'this month', daysLeft };
  }
  // daily / once / custom — fall back to "today"
  return { from: todayStr, to: todayStr, label: 'today', daysLeft: 0 };
}

/** 7-day heatmap (Mon–Sun of current week). Each cell: 0 | 1 | 2 (none / partial / all). */
function WeekHeatmap({ childTasks, completionMap }: {
  childTasks: Task[];
  completionMap: Map<string, Map<string, number>>;  // taskId → date → count
}) {
  const today = new Date();
  const mon = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mon, i);
    return format(d, 'yyyy-MM-dd');
  });
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayStr = format(today, 'yyyy-MM-dd');

  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 14 }}>
      {days.map((date, i) => {
        const total = childTasks.length;
        const done = childTasks.filter((t) => {
          const dateMap = completionMap.get(t.id);
          return dateMap ? (dateMap.get(date) ?? 0) > 0 : false;
        }).length;
        const isToday = date === todayStr;
        const isFuture = date > todayStr;

        let bg = '#e2e8f0'; // empty
        if (!isFuture && total > 0) {
          if (done === total) bg = '#22c55e';
          else if (done > 0) bg = '#86efac';
        }

        return (
          <View key={date} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Text style={{ fontSize: 9, color: isToday ? '#0ea5e9' : '#94a3b8', fontWeight: isToday ? '700' : '400' }}>
              {DAY_LABELS[i]}
            </Text>
            <View style={{
              width: 28, height: 28, borderRadius: 8,
              backgroundColor: isFuture ? '#f1f5f9' : bg,
              borderWidth: isToday ? 2 : 0,
              borderColor: '#0ea5e9',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {!isFuture && done > 0 && (
                <Text style={{ fontSize: 9, fontWeight: '700', color: done === total ? '#fff' : '#16a34a' }}>
                  {done}/{total}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const tasks             = useTaskStore((s) => s.tasks);
  const completedTodayIds = useTaskStore((s) => s.completedTodayIds);
  const completeTask      = useTaskStore((s) => s.completeTask);
  const uncompleteTask    = useTaskStore((s) => s.uncompleteTask);
  const archiveTask       = useTaskStore((s) => s.archiveTask);
  const duplicateTask     = useTaskStore((s) => s.duplicateTask);
  const updateTask        = useTaskStore((s) => s.updateTask);
  const reorderTask       = useTaskStore((s) => s.reorderTask);
  const completionsInRange = useTaskStore((s) => s.completionsInRange);
  const addPoints         = usePointsStore((s) => s.addPoints);
  const wasGoalBonus      = usePointsStore((s) => s.wasGoalBonusGrantedToday);

  const [isReordering, setIsReordering] = useState(false);
  const [isEditing, setIsEditing]       = useState(false);

  // Period stats
  const [periodCount, setPeriodCount]       = useState(0);
  const [periodInfo, setPeriodInfo]         = useState<ReturnType<typeof getPeriodInfo> | null>(null);
  // Per-day completions for the heatmap: taskId → date → count
  const [dayCompletionMap, setDayCompletionMap] = useState<Map<string, Map<string, number>>>(new Map());

  const goal = tasks.find((t) => t.id === id && t.isGoal);

  // Edit form state
  const [editTitle, setEditTitle]           = useState(goal?.title ?? '');
  const [editDescription, setEditDescription] = useState(goal?.description ?? '');
  const [editBonus, setEditBonus]           = useState(goal?.bonusPoints ?? 100);
  const [editRule, setEditRule]             = useState<ScheduleRule>(() => {
    try { return deserializeRule(goal?.scheduleRule ?? '{}'); }
    catch { return { type: 'monthly', dayOfMonth: 1, startDate: new Date().toISOString().slice(0, 10) }; }
  });

  const openEdit = () => {
    if (!goal) return;
    setEditTitle(goal.title);
    setEditDescription(goal.description ?? '');
    setEditBonus(goal.bonusPoints);
    try { setEditRule(deserializeRule(goal.scheduleRule)); } catch {}
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) { Alert.alert('Title required'); return; }
    await updateTask(id, {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      bonusPoints: editBonus,
      scheduleRule: serializeRule(editRule),
    });
    setIsEditing(false);
  };

  const childTasks = tasks
    .filter((t) => t.parentGoalId === id && !t.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));

  const done = childTasks.filter((t) => completedTodayIds.has(t.id)).length;

  // Fetch period completions
  useEffect(() => {
    if (!goal || childTasks.length === 0) return;
    const rule = (() => {
      try { return deserializeRule(goal.scheduleRule); }
      catch { return null; }
    })();
    if (!rule) return;

    const info = getPeriodInfo(rule);
    setPeriodInfo(info);

    const taskIds = childTasks.map((t) => t.id);

    // For period count (any task completed any day in period)
    completionsInRange(taskIds, info.from, info.to).then((map) => {
      const total = Array.from(map.values()).reduce((s, n) => s + n, 0);
      setPeriodCount(total);
    });

    // For heatmap: fetch last 7 days (Mon-Sun)
    const today = new Date();
    const mon = startOfWeek(today, { weekStartsOn: 1 });
    const sun = endOfWeek(today, { weekStartsOn: 1 });
    const monStr = format(mon, 'yyyy-MM-dd');
    const sunStr = format(sun, 'yyyy-MM-dd');

    // We need per-day breakdown. completionsInRange gives total counts, not per-day.
    // Fetch each day individually for the heatmap.
    const days = Array.from({ length: 7 }, (_, i) => format(addDays(mon, i), 'yyyy-MM-dd'));
    Promise.all(
      days.map((day) => completionsInRange(taskIds, day, day).then((m) => ({ day, m })))
    ).then((results) => {
      const perDay = new Map<string, Map<string, number>>();
      for (const taskId of taskIds) perDay.set(taskId, new Map());
      for (const { day, m } of results) {
        for (const [taskId, count] of m) {
          perDay.get(taskId)!.set(day, count);
        }
      }
      setDayCompletionMap(perDay);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id, goal?.scheduleRule, childTasks.length]);

  if (!goal) {
    return (
      <Screen backgroundColor="#fff" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#94a3b8' }}>Goal not found.</Text>
      </Screen>
    );
  }

  const handleComplete = async (task: Task) => {
    if (isReordering) return;
    const alreadyDone = completedTodayIds.has(task.id);
    const pts = effectivePoints(task);
    if (alreadyDone) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      await uncompleteTask(task.id, todayStr);
      await addPoints(-pts, 'task_uncomplete', { taskId: task.id });
    } else {
      await completeTask(task.id);
      await addPoints(pts, 'task_complete', { taskId: task.id });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Goal bonus check
      if (goal.bonusPoints > 0 && !(await wasGoalBonus(goal.id))) {
        const newDone = new Set([...completedTodayIds, task.id]);
        if (childTasks.every((t) => newDone.has(t.id))) {
          await addPoints(goal.bonusPoints, 'goal_bonus', { taskId: goal.id });
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Goal complete! 🎉', `You earned ${goal.bonusPoints} bonus points!`);
        }
      }
    }
  };

  const handleArchiveGoal = () => {
    Alert.alert(`Archive "${goal.title}"?`, 'This goal and all its tasks will be hidden.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          for (const t of childTasks) await archiveTask(t.id);
          await archiveTask(goal.id);
          router.back();
        },
      },
    ]);
  };

  const progress = childTasks.length > 0 ? done / childTasks.length : 0;

  // Period-aware label for the stats card
  const periodLabel = periodInfo?.label ?? 'today';
  const periodMax = childTasks.length * (
    periodInfo?.label === 'this week' ? 7 :
    periodInfo?.label === 'this month' ? 30 : 1
  );

  const showHeatmap = periodInfo?.label === 'this week' || periodInfo?.label === 'this month';

  return (
    <Screen backgroundColor="#f8fafc" edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity onPress={isEditing ? () => setIsEditing(false) : () => router.back()}>
            <Text style={{ fontSize: 16, color: '#0ea5e9' }}>{isEditing ? 'Cancel' : '‹ Back'}</Text>
          </TouchableOpacity>
          {isEditing ? (
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text style={{ fontSize: 16, color: '#0ea5e9', fontWeight: '700' }}>Save</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={openEdit}>
                <Text style={{ fontSize: 14, color: '#0ea5e9' }}>Edit</Text>
              </TouchableOpacity>
              {childTasks.length > 1 && (
                <TouchableOpacity onPress={() => setIsReordering((v) => !v)}>
                  <Text style={{ fontSize: 14, color: isReordering ? '#0ea5e9' : '#64748b', fontWeight: isReordering ? '700' : '400' }}>
                    {isReordering ? 'Done' : 'Reorder'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleArchiveGoal}>
                <Text style={{ fontSize: 14, color: '#ef4444' }}>Archive</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isEditing ? (
          /* ─── Edit Form ─────────────────────────────────────────── */
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
            <TextInput
              style={editStyles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Goal title"
              placeholderTextColor="#94a3b8"
              autoFocus
            />
            <TextInput
              style={[editStyles.input, { height: 60, textAlignVertical: 'top', paddingTop: 10, marginTop: 10 }]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Why it matters (optional)"
              placeholderTextColor="#94a3b8"
              multiline
            />
            <Text style={editStyles.fieldLabel}>Completion Bonus</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {BONUS_PRESETS.map((pts) => {
                const active = editBonus === pts;
                return (
                  <TouchableOpacity
                    key={pts}
                    onPress={() => setEditBonus(pts)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      borderWidth: 1,
                      backgroundColor: active ? '#f59e0b' : '#f8fafc',
                      borderColor: active ? '#f59e0b' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : '#475569' }}>
                      ⭐ {pts}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={editStyles.fieldLabel}>Cycle</Text>
            <ScheduleRulePicker value={editRule} onChange={setEditRule} />
          </ScrollView>
        ) : (
          /* ─── View Mode ─────────────────────────────────────────── */
          <>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#0f172a' }}>{goal.title}</Text>
            {goal.description ? (
              <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{goal.description}</Text>
            ) : null}

            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#0ea5e9' }}>{done}/{childTasks.length}</Text>
                <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>tasks today</Text>
              </View>
              {periodLabel !== 'today' && (
                <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: '#8b5cf6' }}>{periodCount}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{periodLabel}</Text>
                </View>
              )}
              <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#f59e0b' }}>⭐ {goal.bonusPoints}</Text>
                <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>bonus pts</Text>
              </View>
            </View>

            {/* Days left badge */}
            {periodInfo && periodInfo.daysLeft > 0 && periodLabel !== 'today' && (
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                {periodInfo.daysLeft} day{periodInfo.daysLeft !== 1 ? 's' : ''} left {periodLabel === 'this week' ? 'in week' : 'in month'}
              </Text>
            )}

            {/* Progress bar */}
            {childTasks.length > 0 && (
              <View style={{ marginTop: 12, height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: progress === 1 ? '#22c55e' : '#0ea5e9',
                    borderRadius: 3,
                  }}
                />
              </View>
            )}

            {/* Weekly heatmap */}
            {showHeatmap && childTasks.length > 0 && (
              <WeekHeatmap childTasks={childTasks} completionMap={dayCompletionMap} />
            )}
          </>
        )}
      </View>

      <FlatList
        data={childTasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 14, color: '#94a3b8' }}>No tasks yet — add some below!</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TaskCard
            task={item}
            completed={completedTodayIds.has(item.id)}
            onComplete={() => handleComplete(item)}
            onPress={isReordering ? undefined : () => router.push(`/task/${item.id}`)}
            onLongPress={isReordering ? undefined : () => Alert.alert(item.title, '', [
              { text: 'Edit', onPress: () => router.push(`/task/${item.id}`) },
              { text: 'Duplicate', onPress: () => duplicateTask(item.id) },
              { text: 'Archive', style: 'destructive', onPress: () =>
                Alert.alert('Archive task?', '', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Archive', style: 'destructive', onPress: () => archiveTask(item.id) },
                ])
              },
              { text: 'Cancel', style: 'cancel' },
            ])}
            reordering={isReordering}
            onMoveUp={index > 0 ? () => reorderTask(item.id, 'up') : undefined}
            onMoveDown={index < childTasks.length - 1 ? () => reorderTask(item.id, 'down') : undefined}
          />
        )}
      />

      {/* FAB — add task to this goal (hidden while editing) */}
      {!isReordering && !isEditing && (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/new-task', params: { goalId: goal.id } })}
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
    </Screen>
  );
}

const editStyles = {
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 8,
  },
};
