import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, View, Text, FlatList, SectionList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@components/Screen';
import { MonthCalendar } from '@components/MonthCalendar';
import { SwipeableRow } from '@components/SwipeableRow';
import * as Haptics from '@lib/haptics';
import {
  format, startOfDay, startOfWeek, addDays, isSameDay, parseISO,
  addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth,
} from 'date-fns';
import { useTaskStore, usePointsStore, useCategoryStore, useSettingsStore } from '@store/index';
import { checkAchievements } from '@store/achievementsStore';
import { db } from '@db/index';
import { completions, pointsLedger } from '@db/schema';
import { count, sum } from 'drizzle-orm';
import { TaskCard } from '@components/TaskCard';
import { SkeletonCard } from '@components/SkeletonCard';
import { deserializeRule, dueDatesInRange } from '@lib/recurrence';
import { effectivePoints } from '@lib/difficulty';
import { useColors } from '@lib/colors';
import type { Task } from '@db/schema';

function buildWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TodayScreen() {
  const C = useColors();

  const tasks              = useTaskStore((s) => s.tasks);
  const loading            = useTaskStore((s) => s.loading);
  const completedTodayIds  = useTaskStore((s) => s.completedTodayIds);
  const completeTask       = useTaskStore((s) => s.completeTask);
  const uncompleteTask     = useTaskStore((s) => s.uncompleteTask);
  const archiveTask        = useTaskStore((s) => s.archiveTask);
  const duplicateTask      = useTaskStore((s) => s.duplicateTask);
  const completionsForDate = useTaskStore((s) => s.completionsForDate);
  const loadTasks          = useTaskStore((s) => s.load);
  const balance            = usePointsStore((s) => s.balance);
  const loadPoints         = usePointsStore((s) => s.load);
  const addPoints          = usePointsStore((s) => s.addPoints);
  const wasGoalBonus       = usePointsStore((s) => s.wasGoalBonusGrantedToday);
  const categories         = useCategoryStore((s) => s.categories);
  const streakBonusEnabled    = useSettingsStore((s) => s.streakBonusEnabled);
  const persistedSortMode     = useSettingsStore((s) => s.sortMode);
  const persistedViewMode     = useSettingsStore((s) => s.viewMode);
  const setSortModePersisted  = useSettingsStore((s) => s.setSortMode);
  const setViewModePersisted  = useSettingsStore((s) => s.setViewMode);

  type SortMode = 'default' | 'points_desc' | 'alpha' | 'category';
  const sortMode = persistedSortMode as SortMode;
  const viewMode = persistedViewMode;
  const setSortMode = (v: SortMode) => { setSortModePersisted(v); };
  const setViewMode = (v: 'list' | 'compact') => { setViewModePersisted(v); };
  const comboRef = useRef(0);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadTasks(), loadPoints()]);
    setRefreshing(false);
  }, []);

  const [now, setNow] = useState(() => startOfDay(new Date()));
  const todayDate = now;
  const todayStr  = format(todayDate, 'yyyy-MM-dd');

  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        const newToday = startOfDay(new Date());
        setNow((prev) => {
          if (!isSameDay(prev, newToday)) {
            setSelectedDate((sel) => isSameDay(sel, prev) ? newToday : sel);
            return newToday;
          }
          return prev;
        });
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  const [selectedDate, setSelectedDate]   = useState(todayDate);
  const [weekStart, setWeekStart]         = useState(() => startOfWeek(todayDate, { weekStartsOn: 1 }));
  const [calendarMode, setCalendarMode]   = useState<'week' | 'month'>('week');
  const [monthView, setMonthView]         = useState(todayDate);
  const [historicIds, setHistoricIds]     = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    const newToday = startOfDay(new Date());
    setNow(newToday);
    setSelectedDate(newToday);
    setWeekStart(startOfWeek(newToday, { weekStartsOn: 1 }));
    setMonthView(newToday);
  }, []));

  const isToday = isSameDay(selectedDate, todayDate);
  const selectedStr = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    if (isToday) {
      setHistoricIds(new Set());
      return;
    }
    completionsForDate(selectedStr).then(setHistoricIds);
  }, [selectedStr, isToday]);

  const completedIds = isToday ? completedTodayIds : historicIds;

  const monthDueDates = useMemo<Set<string>>(() => {
    const from = startOfMonth(monthView);
    const to   = endOfMonth(monthView);
    const set  = new Set<string>();
    for (const t of tasks) {
      if (t.isGoal || t.archivedAt) continue;
      try {
        dueDatesInRange(deserializeRule(t.scheduleRule), from, to).forEach((d) => set.add(d));
      } catch {}
    }
    return set;
  }, [tasks, monthView]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(startOfDay(date));
    setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
    setMonthView(date);
  };

  const todayTasks = useMemo(() => {
    const filtered = tasks.filter((t) => {
      if (t.isGoal) return false;
      try {
        const selectedStart = startOfDay(selectedDate);
        return dueDatesInRange(deserializeRule(t.scheduleRule), selectedStart, selectedStart).includes(selectedStr);
      } catch {
        return false;
      }
    });
    switch (sortMode) {
      case 'points_desc': return [...filtered].sort((a, b) => b.pointValue - a.pointValue);
      case 'alpha':       return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
      case 'category': {
        const catName = (t: Task) => categories.find((c) => c.id === t.categoryId)?.name ?? '';
        return [...filtered].sort((a, b) => catName(a).localeCompare(catName(b)));
      }
      default: return filtered;
    }
  }, [tasks, selectedStr, sortMode, categories]);

  const doneCount  = todayTasks.filter((t) => completedIds.has(t.id)).length;
  const totalCount = todayTasks.length;
  const progress   = totalCount > 0 ? doneCount / totalCount : 0;

  const handleComplete = useCallback(
    async (task: Task) => {
      if (!isToday) return;

      const alreadyDone = completedTodayIds.has(task.id);
      let pts = effectivePoints(task);

      if (!alreadyDone && streakBonusEnabled) {
        let streak = 0;
        const { subDays: sd, format: fmt } = await import('date-fns');
        const allRows = await db.select({ forDate: completions.forDate }).from(completions);
        const completedSet = new Set(allRows.map((r) => r.forDate));
        let cur = new Date();
        while (completedSet.has(fmt(cur, 'yyyy-MM-dd'))) { streak++; cur = sd(cur, 1); }
        const multiplier = streak >= 14 ? 1.3 : streak >= 7 ? 1.2 : streak >= 3 ? 1.1 : 1;
        pts = Math.round(pts * multiplier);
      }

      if (alreadyDone) {
        comboRef.current = 0;
        await uncompleteTask(task.id, todayStr);
        await addPoints(-effectivePoints(task), 'task_uncomplete', { taskId: task.id });
      } else {
        await completeTask(task.id, todayStr);
        await addPoints(pts, 'task_complete', { taskId: task.id });
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        comboRef.current += 1;
        const combo = comboRef.current;
        if (combo === 3) {
          await addPoints(5, 'combo_bonus');
          Alert.alert('3 in a row! 🔥', '+5 bonus points!');
        } else if (combo === 5) {
          await addPoints(10, 'combo_bonus');
          Alert.alert('5 in a row! ⚡', '+10 bonus points!');
        } else if (combo === 10) {
          await addPoints(25, 'combo_bonus');
          Alert.alert('10 in a row! 🌟', '+25 bonus points!');
        }

        if (task.parentGoalId) {
          const goal = tasks.find((t) => t.id === task.parentGoalId && t.isGoal);
          if (goal && goal.bonusPoints > 0 && !(await wasGoalBonus(goal.id))) {
            const siblings = tasks.filter((t) => t.parentGoalId === task.parentGoalId && !t.archivedAt);
            const newDone = new Set([...completedTodayIds, task.id]);
            if (siblings.every((s) => newDone.has(s.id))) {
              await addPoints(goal.bonusPoints, 'goal_bonus', { taskId: goal.id });
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Goal complete! 🎉', `You earned ${goal.bonusPoints} bonus points!`);
            }
          }
        }

        try {
          const [totalRows, ledgerRows, bonusRows] = await Promise.all([
            db.select({ c: count() }).from(completions),
            db.select({ s: sum(pointsLedger.delta) }).from(pointsLedger),
            db.select({ c: count() }).from(pointsLedger).where(
              (await import('drizzle-orm')).eq(pointsLedger.reason, 'goal_bonus')
            ),
          ]);
          const totalCompletions = totalRows[0]?.c ?? 0;
          const lifetimePoints   = Math.max(0, Number(ledgerRows[0]?.s ?? 0));
          const goalBonusCount   = bonusRows[0]?.c ?? 0;

          let streak = 0;
          const { subDays: sd, format: fmt } = await import('date-fns');
          let cur = new Date();
          const allCompletionRows = await db.select({ forDate: completions.forDate }).from(completions);
          const completedSet = new Set(allCompletionRows.map((r) => r.forDate));
          while (completedSet.has(fmt(cur, 'yyyy-MM-dd'))) { streak++; cur = sd(cur, 1); }

          await checkAchievements({ totalCompletions, streak, goalBonusCount, lifetimePoints, redeemCount: 0 });
        } catch { /* achievements are non-critical */ }
      }
    },
    [tasks, completedTodayIds, todayStr, isToday],
  );

  const handleLongPress = useCallback((task: Task) => {
    Alert.alert(task.title, '', [
      { text: 'Edit', onPress: () => router.push(`/task/${task.id}`) },
      { text: 'Duplicate', onPress: () => duplicateTask(task.id) },
      { text: 'Archive', style: 'destructive', onPress: () =>
        Alert.alert('Archive task?', `"${task.title}" will be hidden.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Archive', style: 'destructive', onPress: () => archiveTask(task.id) },
        ])
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [duplicateTask, archiveTask]);

  const weekDays = buildWeekDays(weekStart);

  return (
    <Screen edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, backgroundColor: C.bgPage }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '700', color: C.textDim }}>
              {isToday ? 'Today' : format(selectedDate, 'EEE, MMM d')}
            </Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'list' ? 'compact' : 'list')}
              style={{ backgroundColor: viewMode === 'compact' ? C.primary : C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 }}
            >
              <Text style={{ fontSize: 13, color: viewMode === 'compact' ? '#fff' : C.textSecondary }}>☰</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Alert.alert('Sort tasks', '', [
                { text: sortMode === 'default' ? '✓ Default' : 'Default', onPress: () => setSortMode('default') },
                { text: sortMode === 'points_desc' ? '✓ Points (high first)' : 'Points (high first)', onPress: () => setSortMode('points_desc') },
                { text: sortMode === 'alpha' ? '✓ Alphabetical' : 'Alphabetical', onPress: () => setSortMode('alpha') },
                { text: sortMode === 'category' ? '✓ By category' : 'By category', onPress: () => setSortMode('category') },
                { text: 'Cancel', style: 'cancel' },
              ])}
              style={{ backgroundColor: sortMode !== 'default' ? C.primary : C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 }}
            >
              <Text style={{ fontSize: 13, color: sortMode !== 'default' ? '#fff' : C.textSecondary }}>↕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCalendarMode((m) => m === 'week' ? 'month' : 'week')}
              style={{ backgroundColor: calendarMode === 'month' ? C.primary : C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 }}
            >
              <Text style={{ fontSize: 13, color: calendarMode === 'month' ? '#fff' : C.textSecondary }}>
                {calendarMode === 'week' ? '⊞' : '▦'}
              </Text>
            </TouchableOpacity>
            {isToday && (
              <TouchableOpacity
                onPress={() => router.push('/focus')}
                style={{ backgroundColor: C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 }}
              >
                <Text style={{ fontSize: 13, color: C.textSecondary }}>◎</Text>
              </TouchableOpacity>
            )}
            <View style={{ backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>⭐ {balance}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Calendar: week strip OR month grid */}
      <View style={{ backgroundColor: C.bgPage, paddingBottom: 4 }}>
        {calendarMode === 'week' ? (
          <View style={{ paddingBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 6 }}>
              <TouchableOpacity onPress={() => setWeekStart((w) => subWeeks(w, 1))} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18, color: C.textSecondary }}>‹</Text>
              </TouchableOpacity>

              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
                {weekDays.map((day) => {
                  const dayStr     = format(day, 'yyyy-MM-dd');
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDay = isSameDay(day, todayDate);
                  return (
                    <TouchableOpacity
                      key={dayStr}
                      onPress={() => handleSelectDate(day)}
                      style={{
                        alignItems: 'center', paddingVertical: 6, paddingHorizontal: 6,
                        borderRadius: 10,
                        backgroundColor: isSelected ? C.primary : 'transparent',
                        minWidth: 38,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: isSelected ? C.primaryLight : C.textMuted, fontWeight: '500' }}>
                        {DAY_LABELS[day.getDay()]}
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 1, color: isSelected ? '#fff' : isTodayDay ? C.primary : C.text }}>
                        {format(day, 'd')}
                      </Text>
                      {isTodayDay && !isSelected && (
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary, marginTop: 2 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity onPress={() => setWeekStart((w) => addWeeks(w, 1))} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18, color: C.textSecondary }}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 }}>
              <TouchableOpacity onPress={() => setMonthView((m) => subMonths(m, 1))} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18, color: C.textSecondary }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: C.textDim }}>
                {format(monthView, 'MMMM yyyy')}
              </Text>
              <TouchableOpacity onPress={() => setMonthView((m) => addMonths(m, 1))} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18, color: C.textSecondary }}>›</Text>
              </TouchableOpacity>
            </View>
            <MonthCalendar
              month={monthView}
              selectedDate={selectedDate}
              today={todayDate}
              dueDates={monthDueDates}
              onSelectDate={handleSelectDate}
            />
          </View>
        )}

        {!isToday && (
          <TouchableOpacity
            onPress={() => {
              setSelectedDate(todayDate);
              setWeekStart(startOfWeek(todayDate, { weekStartsOn: 1 }));
              setMonthView(todayDate);
            }}
            style={{ alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, backgroundColor: C.primaryBg, marginBottom: 4 }}
          >
            <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>Jump to Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      {totalCount > 0 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 12, color: C.textSecondary, fontWeight: '500' }}>
              {doneCount} of {totalCount} done
            </Text>
            <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View style={{ height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: progress === 1 ? C.success : C.primary,
                borderRadius: 3,
              }}
            />
          </View>
        </View>
      )}

      {/* Task list */}
      {loading && (
        <View style={{ padding: 16, gap: 10 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      )}
      {!loading && (() => {
        const emptyComponent = (
          <View style={{ alignItems: 'center', marginTop: 48 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{isToday ? '🎉' : '📅'}</Text>
            <Text style={{ fontSize: 16, color: C.textSecondary, fontWeight: '600' }}>
              {isToday ? 'Nothing due today' : 'No tasks on this day'}
            </Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
              {isToday ? 'Add a task to get started' : 'Schedule tasks to see them here'}
            </Text>
          </View>
        );

        const renderTaskItem = (item: Task) => (
          <SwipeableRow
            key={item.id}
            disabled={!isToday}
            onSwipeLeft={isToday && !completedIds.has(item.id)
              ? () => handleComplete(item)
              : isToday && completedIds.has(item.id)
                ? () => handleComplete(item)
                : undefined}
            onSwipeRight={isToday ? () => handleLongPress(item) : undefined}
            leftColor={C.success}
            rightColor={C.border}
            leftLabel="✓"
            rightLabel="···"
          >
            <TaskCard
              task={item}
              completed={completedIds.has(item.id)}
              onComplete={isToday ? () => handleComplete(item) : undefined}
              onPress={() => router.push(`/task/${item.id}`)}
              onLongPress={isToday ? () => handleLongPress(item) : undefined}
              readonly={!isToday}
              compact={viewMode === 'compact'}
            />
          </SwipeableRow>
        );

        if (sortMode === 'category') {
          const catName = (t: Task) => categories.find((c) => c.id === t.categoryId)?.name ?? 'Uncategorised';
          const sectionMap = new Map<string, Task[]>();
          for (const t of todayTasks) {
            const name = catName(t);
            if (!sectionMap.has(name)) sectionMap.set(name, []);
            sectionMap.get(name)!.push(t);
          }
          const sections = Array.from(sectionMap.entries()).map(([title, data]) => ({ title, data }));

          return (
            <SectionList
              sections={sections}
              keyExtractor={(t) => t.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
              ListEmptyComponent={emptyComponent}
              renderSectionHeader={({ section: { title } }) => (
                <View style={{ paddingVertical: 6, paddingHorizontal: 2, marginTop: 8, marginBottom: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={{ marginBottom: 10 }}>
                  {renderTaskItem(item)}
                </View>
              )}
            />
          );
        }

        return (
          <FlatList
            data={todayTasks}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
            ListEmptyComponent={emptyComponent}
            renderItem={({ item }) => renderTaskItem(item)}
          />
        );
      })()}

      {/* FAB group (only on today) */}
      {isToday && (
        <>
          <TouchableOpacity
            onPress={() => router.push('/inbox')}
            style={{
              position: 'absolute', bottom: 100, right: 24,
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: C.bgCard,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
              borderWidth: 1, borderColor: C.border,
            }}
          >
            <Text style={{ fontSize: 18 }}>📥</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/new-task')}
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
        </>
      )}
    </Screen>
  );
}
