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
import { useColors } from '@lib/colors';
import type { AppColors } from '@lib/colors';

const BONUS_PRESETS = [25, 50, 100, 200, 500];

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
  return { from: todayStr, to: todayStr, label: 'today', daysLeft: 0 };
}

function WeekHeatmap({ childTasks, completionMap, C }: {
  childTasks: Task[];
  completionMap: Map<string, Map<string, number>>;
  C: AppColors;
}) {
  const today = new Date();
  const mon = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => format(addDays(mon, i), 'yyyy-MM-dd'));
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

        let bg = C.border;
        if (!isFuture && total > 0) {
          if (done === total) bg = C.success;
          else if (done > 0) bg = C.successDark;
        }

        return (
          <View key={date} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Text style={{ fontSize: 9, color: isToday ? C.primary : C.textMuted, fontWeight: isToday ? '700' : '400' }}>
              {DAY_LABELS[i]}
            </Text>
            <View style={{
              width: 28, height: 28, borderRadius: 8,
              backgroundColor: isFuture ? C.borderLight : bg,
              borderWidth: isToday ? 2 : 0,
              borderColor: C.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {!isFuture && done > 0 && (
                <Text style={{ fontSize: 9, fontWeight: '700', color: done === total ? '#fff' : C.successDark }}>
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
  const C = useColors();
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

  const [periodCount, setPeriodCount]           = useState(0);
  const [periodInfo, setPeriodInfo]             = useState<ReturnType<typeof getPeriodInfo> | null>(null);
  const [dayCompletionMap, setDayCompletionMap] = useState<Map<string, Map<string, number>>>(new Map());

  const goal = tasks.find((t) => t.id === id && t.isGoal);

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

    completionsInRange(taskIds, info.from, info.to).then((map) => {
      const total = Array.from(map.values()).reduce((s, n) => s + n, 0);
      setPeriodCount(total);
    });

    const today = new Date();
    const mon = startOfWeek(today, { weekStartsOn: 1 });
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
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textMuted }}>Goal not found.</Text>
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
  const periodLabel = periodInfo?.label ?? 'today';
  const showHeatmap = periodInfo?.label === 'this week' || periodInfo?.label === 'this month';

  const inputStyle = {
    backgroundColor: C.bgInput,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  };
  const fieldLabel = {
    fontSize: 11,
    fontWeight: '700' as const,
    color: C.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 8,
  };

  return (
    <Screen edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, backgroundColor: C.bgCard, borderBottomWidth: 0.5, borderBottomColor: C.borderLight }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity onPress={isEditing ? () => setIsEditing(false) : () => router.back()}>
            <Text style={{ fontSize: 16, color: C.primary }}>{isEditing ? 'Cancel' : '‹ Back'}</Text>
          </TouchableOpacity>
          {isEditing ? (
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text style={{ fontSize: 16, color: C.primary, fontWeight: '700' }}>Save</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={openEdit}>
                <Text style={{ fontSize: 14, color: C.primary }}>Edit</Text>
              </TouchableOpacity>
              {childTasks.length > 1 && (
                <TouchableOpacity onPress={() => setIsReordering((v) => !v)}>
                  <Text style={{ fontSize: 14, color: isReordering ? C.primary : C.textSecondary, fontWeight: isReordering ? '700' : '400' }}>
                    {isReordering ? 'Done' : 'Reorder'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleArchiveGoal}>
                <Text style={{ fontSize: 14, color: C.danger }}>Archive</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isEditing ? (
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
            <TextInput
              style={inputStyle}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Goal title"
              placeholderTextColor={C.textMuted}
              autoFocus
            />
            <TextInput
              style={[inputStyle, { height: 60, textAlignVertical: 'top', paddingTop: 10, marginTop: 10 }]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Why it matters (optional)"
              placeholderTextColor={C.textMuted}
              multiline
            />
            <Text style={fieldLabel}>Completion Bonus</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {BONUS_PRESETS.map((pts) => {
                const active = editBonus === pts;
                return (
                  <TouchableOpacity
                    key={pts}
                    onPress={() => setEditBonus(pts)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                      backgroundColor: active ? C.warning : C.bgCard,
                      borderColor: active ? C.warning : C.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : C.textSecondary }}>
                      ⭐ {pts}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={fieldLabel}>Cycle</Text>
            <ScheduleRulePicker value={editRule} onChange={setEditRule} />
          </ScrollView>
        ) : (
          <>
            <Text style={{ fontSize: 22, fontWeight: '700', color: C.textDim }}>{goal.title}</Text>
            {goal.description ? (
              <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>{goal.description}</Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1, backgroundColor: C.bgPage, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary }}>{done}/{childTasks.length}</Text>
                <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>tasks today</Text>
              </View>
              {periodLabel !== 'today' && (
                <View style={{ flex: 1, backgroundColor: C.bgPage, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: C.purple }}>{periodCount}</Text>
                  <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{periodLabel}</Text>
                </View>
              )}
              <View style={{ flex: 1, backgroundColor: C.bgPage, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.warning }}>⭐ {goal.bonusPoints}</Text>
                <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>bonus pts</Text>
              </View>
            </View>

            {periodInfo && periodInfo.daysLeft > 0 && periodLabel !== 'today' && (
              <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
                {periodInfo.daysLeft} day{periodInfo.daysLeft !== 1 ? 's' : ''} left {periodLabel === 'this week' ? 'in week' : 'in month'}
              </Text>
            )}

            {childTasks.length > 0 && (
              <View style={{ marginTop: 12, height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{
                  height: '100%',
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: progress === 1 ? C.success : C.primary,
                  borderRadius: 3,
                }} />
              </View>
            )}

            {showHeatmap && childTasks.length > 0 && (
              <WeekHeatmap childTasks={childTasks} completionMap={dayCompletionMap} C={C} />
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
            <Text style={{ fontSize: 14, color: C.textMuted }}>No tasks yet — add some below!</Text>
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

      {!isReordering && !isEditing && (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/new-task', params: { goalId: goal.id } })}
          style={{
            position: 'absolute',
            bottom: 32, right: 24,
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: C.primary,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: C.primary,
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
