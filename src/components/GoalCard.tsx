import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import type { Task } from '@db/schema';
import { useCategoryStore } from '@store/index';

type Props = {
  goal: Task;
  childTasks: Task[];
  completedTodayIds: Set<string>;
  onPress?: () => void;
  /** How many child-task completions have occurred in the current period */
  periodDone?: number;
  /** Human-readable period label: "today" | "this week" | "this month" */
  periodLabel?: string;
  /** Remaining days in the period, for the badge */
  periodDaysLeft?: number;
};

export function GoalCard({ goal, childTasks, completedTodayIds, onPress, periodDone, periodLabel, periodDaysLeft }: Props) {
  const categories = useCategoryStore((s) => s.categories);
  const category = categories.find((c) => c.id === goal.categoryId);

  const total = childTasks.length;
  // today's progress (for the progress bar)
  const done = childTasks.filter((t) => completedTodayIds.has(t.id)).length;
  const progress = total > 0 ? done / total : 0;
  const isComplete = done === total && total > 0;

  // period-level: max possible completions = tasks × days-in-period (we show raw count)
  const showPeriod = periodLabel && periodLabel !== 'today' && periodDone !== undefined;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isComplete) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isComplete]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        opacity: pressed ? 0.85 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: isComplete ? 2 : 0,
        borderColor: '#22c55e',
      })}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e293b' }} numberOfLines={1}>
            {goal.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {category && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: category.color }} />
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>{category.name}</Text>
              </View>
            )}
            {showPeriod && (
              <Text style={{ fontSize: 11, color: '#64748b' }}>
                {periodDone} completions {periodLabel}
              </Text>
            )}
            {periodDaysLeft !== undefined && periodDaysLeft > 0 && (
              <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, color: '#64748b' }}>{periodDaysLeft}d left</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: '#f59e0b', fontWeight: '600' }}>+{goal.bonusPoints} bonus</Text>
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
            {done}/{total} today
          </Text>
          {isComplete && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }], width: 22, height: 22, borderRadius: 11, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Progress bar (today) */}
      {total > 0 && (
        <View style={{ marginTop: 10, height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: progress === 1 ? '#22c55e' : '#0ea5e9',
              borderRadius: 2,
            }}
          />
        </View>
      )}

      {total === 0 && (
        <Text style={{ fontSize: 12, color: '#cbd5e1', marginTop: 8 }}>No tasks yet — add some!</Text>
      )}
    </Pressable>
  );
}
