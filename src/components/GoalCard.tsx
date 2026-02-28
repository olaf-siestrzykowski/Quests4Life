import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Task } from '@db/schema';
import { useCategoryStore } from '@store/index';

type Props = {
  goal: Task;
  childTasks: Task[];
  completedTodayIds: Set<string>;
  onPress?: () => void;
};

export function GoalCard({ goal, childTasks, completedTodayIds, onPress }: Props) {
  const categories = useCategoryStore((s) => s.categories);
  const category = categories.find((c) => c.id === goal.categoryId);

  const total = childTasks.length;
  const done = childTasks.filter((t) => completedTodayIds.has(t.id)).length;
  const progress = total > 0 ? done / total : 0;

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
      })}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e293b' }} numberOfLines={1}>
            {goal.title}
          </Text>
          {category && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: category.color }} />
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>{category.name}</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: '#f59e0b', fontWeight: '600' }}>+{goal.bonusPoints} bonus</Text>
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
            {done}/{total} tasks
          </Text>
        </View>
      </View>

      {/* Progress bar */}
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
