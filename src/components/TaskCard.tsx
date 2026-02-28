import React from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import type { Task } from '@db/schema';
import { useCategoryStore } from '@store/index';

type Props = {
  task: Task;
  completed?: boolean;
  onComplete?: () => void;
  onPress?: () => void;
  readonly?: boolean;
  /** Show ▲/▼ reorder buttons */
  reordering?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export function TaskCard({
  task,
  completed = false,
  onComplete,
  onPress,
  readonly = false,
  reordering = false,
  onMoveUp,
  onMoveDown,
}: Props) {
  const categories = useCategoryStore((s) => s.categories);
  const category   = categories.find((c) => c.id === task.categoryId);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.85 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      })}
    >
      {/* Reorder controls */}
      {reordering ? (
        <View style={{ gap: 2 }}>
          <TouchableOpacity
            onPress={onMoveUp}
            hitSlop={6}
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: '#f1f5f9' }}
          >
            <Text style={{ fontSize: 14, color: '#64748b' }}>▲</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMoveDown}
            hitSlop={6}
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: '#f1f5f9' }}
          >
            <Text style={{ fontSize: 14, color: '#64748b' }}>▼</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Checkbox */
        <TouchableOpacity
          onPress={readonly ? undefined : onComplete}
          hitSlop={8}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: readonly ? '#e2e8f0' : completed ? '#0ea5e9' : '#cbd5e1',
            backgroundColor: completed ? '#0ea5e9' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {completed && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
        </TouchableOpacity>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: completed ? '#94a3b8' : '#1e293b',
            textDecorationLine: completed ? 'line-through' : 'none',
          }}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {category && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: category.color }} />
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>{category.name}</Text>
          </View>
        )}
      </View>

      {/* Points */}
      {!reordering && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: completed ? '#cbd5e1' : readonly ? '#cbd5e1' : '#0ea5e9' }}>
          +{task.pointValue}
        </Text>
      )}
    </Pressable>
  );
}
