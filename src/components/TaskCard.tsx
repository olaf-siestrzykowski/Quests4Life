import React from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import type { Task } from '@db/schema';
import { useCategoryStore } from '@store/index';
import { deserializeRule, formatRuleSummary } from '@lib/recurrence';
import { effectivePoints } from '@lib/difficulty';
import { useColors } from '@lib/colors';

type Props = {
  task: Task;
  completed?: boolean;
  onComplete?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
  readonly?: boolean;
  reordering?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  compact?: boolean;
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
  const C = useColors();
  const categories = useCategoryStore((s) => s.categories);
  const category   = categories.find((c) => c.id === task.categoryId);

  let scheduleSummary = '';
  try { scheduleSummary = formatRuleSummary(deserializeRule(task.scheduleRule)); } catch {}

  const cardBg = readonly ? C.bgPage : C.bgCard;

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
      {reordering ? (
        <View style={{ gap: 2 }}>
          <TouchableOpacity
            onPress={onMoveUp}
            hitSlop={6}
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: C.borderLight }}
          >
            <Text style={{ fontSize: 14, color: C.textSecondary }}>▲</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMoveDown}
            hitSlop={6}
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: C.borderLight }}
          >
            <Text style={{ fontSize: 14, color: C.textSecondary }}>▼</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={readonly ? undefined : onComplete}
          hitSlop={8}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: readonly ? C.border : completed ? C.primary : C.textDisabled,
            backgroundColor: completed ? C.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {completed && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
        </TouchableOpacity>
      )}

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: compact ? 14 : 15,
            fontWeight: '500',
            color: completed ? C.textMuted : readonly ? C.textSecondary : C.text,
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
              <Text style={{ fontSize: 11, color: C.textMuted }}>{category.name}</Text>
            )}
            {scheduleSummary ? (
              <Text style={{ fontSize: 11, color: C.textDisabled }}>
                {category ? '· ' : ''}{scheduleSummary}
              </Text>
            ) : null}
            {streak !== undefined && streak >= 2 && (
              <Text style={{ fontSize: 11, color: C.warning, fontWeight: '600' }}>🔥 {streak}</Text>
            )}
          </View>
        )}
      </View>

      {!reordering && task.difficulty && task.difficulty !== 'normal' && (
        <View style={{
          paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5,
          backgroundColor: task.difficulty === 'easy' ? C.successLight : C.dangerLight,
          marginRight: 2,
        }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: task.difficulty === 'easy' ? C.successDark : C.dangerDark }}>
            {task.difficulty.toUpperCase()}
          </Text>
        </View>
      )}

      {!reordering && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: completed ? C.textDisabled : readonly ? C.textDisabled : C.primary }}>
          +{effectivePoints(task)}
        </Text>
      )}
      </View>
    </Pressable>
  );
}
