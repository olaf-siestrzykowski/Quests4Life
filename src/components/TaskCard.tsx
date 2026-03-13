import React from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import type { Task } from '@db/schema';
import { useCategoryStore } from '@store/index';
import { deserializeRule, formatRuleSummary } from '@lib/recurrence';
import { effectivePoints } from '@lib/difficulty';

type Props = {
  task: Task;
  completed?: boolean;
  onComplete?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
  readonly?: boolean;
  /** Show ▲/▼ reorder buttons */
  reordering?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Compact mode: only checkbox + title, reduced height */
  compact?: boolean;
  /** Current streak for this task (consecutive days) */
  streak?: number;
};

export function TaskCard({
  task,
  completed = false,
  onComplete,
  onPress,
  onLongPress,
  readonly = false,
  reordering = false,
  onMoveUp,
  onMoveDown,
  compact = false,
  streak,
}: Props) {
  const categories = useCategoryStore((s) => s.categories);
  const category   = categories.find((c) => c.id === task.categoryId);

  let scheduleSummary = '';
  try { scheduleSummary = formatRuleSummary(deserializeRule(task.scheduleRule)); } catch {}

  const cardBg = readonly ? '#f8fafc' : '#ffffff';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => ({
        backgroundColor: cardBg,
        borderRadius: 16,
        overflow: 'hidden',
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
      {/* Category colour bar */}
      <View style={{
        width: 4,
        alignSelf: 'stretch',
        backgroundColor: category?.color ?? 'transparent',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
      }} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: compact ? 9 : 14, paddingRight: 16 }}>
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
            fontSize: compact ? 14 : 15,
            fontWeight: '500',
            color: readonly && completed ? '#b0bec5' : completed ? '#94a3b8' : readonly ? '#64748b' : '#1e293b',
            textDecorationLine: completed ? 'line-through' : 'none',
            opacity: readonly && completed ? 0.6 : 1,
          }}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {!compact && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            {category && (
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>{category.name}</Text>
            )}
            {scheduleSummary ? (
              <Text style={{ fontSize: 11, color: '#cbd5e1' }}>
                {category ? '· ' : ''}{scheduleSummary}
              </Text>
            ) : null}
            {streak !== undefined && streak >= 2 && (
              <Text style={{ fontSize: 11, color: '#f59e0b', fontWeight: '600' }}>🔥 {streak}</Text>
            )}
          </View>
        )}
      </View>

      {/* Difficulty badge (easy/hard only) */}
      {!reordering && task.difficulty && task.difficulty !== 'normal' && (
        <View style={{
          paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5,
          backgroundColor: task.difficulty === 'easy' ? '#dcfce7' : '#fee2e2',
          marginRight: 2,
        }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: task.difficulty === 'easy' ? '#16a34a' : '#dc2626' }}>
            {task.difficulty.toUpperCase()}
          </Text>
        </View>
      )}

      {/* Points */}
      {!reordering && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: completed ? '#cbd5e1' : readonly ? '#cbd5e1' : '#0ea5e9' }}>
          +{effectivePoints(task)}
        </Text>
      )}
      </View>
    </Pressable>
  );
}
