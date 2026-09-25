import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import type { Task } from '@db/schema';
import { useCategoryStore } from '@store/index';
import { useColors } from '@lib/colors';

type Props = {
  goal: Task;
  childTasks: Task[];
  completedTodayIds: Set<string>;
  onPress?: () => void;
  periodDone?: number;
  periodLabel?: string;
  periodDaysLeft?: number;
};

export function GoalCard({ goal, childTasks, completedTodayIds, onPress, periodDone, periodLabel, periodDaysLeft }: Props) {
  const C = useColors();
  const categories = useCategoryStore((s) => s.categories);
  const category = categories.find((c) => c.id === goal.categoryId);

  const total = childTasks.length;
  const done = childTasks.filter((t) => completedTodayIds.has(t.id)).length;
  const progress = total > 0 ? done / total : 0;
  const isComplete = done === total && total > 0;

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
        backgroundColor: C.bgCard,
        borderRadius: 16,
        padding: 16,
        opacity: pressed ? 0.85 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: isComplete ? 2 : 0,
        borderColor: C.success,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }} numberOfLines={1}>
            {goal.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {category && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: category.color }} />
                <Text style={{ fontSize: 11, color: C.textMuted }}>{category.name}</Text>
              </View>
            )}
            {showPeriod && (
              <Text style={{ fontSize: 11, color: C.textSecondary }}>
                {periodDone} completions {periodLabel}
              </Text>
            )}
            {periodDaysLeft !== undefined && periodDaysLeft > 0 && (
              <View style={{ backgroundColor: C.borderLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, color: C.textSecondary }}>{periodDaysLeft}d left</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: C.warning, fontWeight: '600' }}>+{goal.bonusPoints} bonus</Text>
          <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
            {done}/{total} today
          </Text>
          {isComplete && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }], width: 22, height: 22, borderRadius: 11, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
            </Animated.View>
          )}
        </View>
      </View>

      {total > 0 && (
        <View style={{ marginTop: 10, height: 4, backgroundColor: C.borderLight, borderRadius: 2, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: progress === 1 ? C.success : C.primary,
              borderRadius: 2,
            }}
          />
        </View>
      )}

      {total === 0 && (
        <Text style={{ fontSize: 12, color: C.textDisabled, marginTop: 8 }}>No tasks yet — add some!</Text>
      )}
    </Pressable>
  );
}
