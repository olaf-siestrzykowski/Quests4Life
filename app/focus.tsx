import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@components/Screen';
import { format } from 'date-fns';
import { useTaskStore, usePointsStore } from '@store/index';
import * as Haptics from '@lib/haptics';
import { deserializeRule, dueDatesInRange, formatRuleSummary } from '@lib/recurrence';
import { effectivePoints } from '@lib/difficulty';
import { useColors } from '@lib/colors';

export default function FocusScreen() {
  const C = useColors();
  const tasks             = useTaskStore((s) => s.tasks);
  const completedTodayIds = useTaskStore((s) => s.completedTodayIds);
  const completeTask      = useTaskStore((s) => s.completeTask);
  const addPoints         = usePointsStore((s) => s.addPoints);
  const wasGoalBonus      = usePointsStore((s) => s.wasGoalBonusGrantedToday);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const dueTasks = useMemo(() => {
    const today = new Date();
    return tasks.filter((t) => {
      if (t.isGoal || t.archivedAt) return false;
      try {
        const rule = deserializeRule(t.scheduleRule);
        const dates = dueDatesInRange(rule, today, today);
        return dates.includes(todayStr);
      } catch {
        return false;
      }
    });
  }, [tasks, todayStr]);

  const pending = dueTasks.filter((t) => !completedTodayIds.has(t.id));
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const remaining = pending.filter((t) => !skipped.has(t.id));
  const current   = remaining[0];
  const total     = dueTasks.length;
  const done      = total - remaining.length;

  const handleDone = async () => {
    if (!current) return;
    const pts = effectivePoints(current);
    await completeTask(current.id, todayStr);
    await addPoints(pts, 'task_complete', { taskId: current.id });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (current.parentGoalId) {
      const goal = tasks.find((t) => t.id === current.parentGoalId && t.isGoal);
      if (goal && goal.bonusPoints > 0 && !(await wasGoalBonus(goal.id))) {
        const siblings = tasks.filter((t) => t.parentGoalId === current.parentGoalId && !t.archivedAt);
        const newDone = new Set([...completedTodayIds, current.id]);
        if (siblings.every((s) => newDone.has(s.id))) {
          await addPoints(goal.bonusPoints, 'goal_bonus', { taskId: goal.id });
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Goal complete! 🎉', `+${goal.bonusPoints} bonus points!`);
        }
      }
    }
  };

  const handleSkip = () => {
    if (!current) return;
    setSkipped((s) => new Set([...s, current.id]));
  };

  const progressPct = total > 0 ? (done / total) * 100 : 100;

  if (!current) {
    return (
      <Screen edges={['top', 'bottom']} style={{ backgroundColor: C.primary }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🎉</Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
            All done for today!
          </Text>
          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center' }}>
            You completed {dueTasks.filter((t) => completedTodayIds.has(t.id)).length} tasks today.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 32, paddingHorizontal: 32, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
          >
            <Text style={{ fontSize: 16, color: '#fff', fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  let scheduleSummary = '';
  try { scheduleSummary = formatRuleSummary(deserializeRule(current.scheduleRule)); } catch {}

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: C.primary }}>✕ Exit</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 14, color: C.textSecondary, fontWeight: '600' }}>
          Focus Mode
        </Text>
        <Text style={{ fontSize: 14, color: C.textMuted }}>{done}/{total}</Text>
      </View>

      <View style={{ marginHorizontal: 20, height: 4, backgroundColor: C.border, borderRadius: 2, marginBottom: 32 }}>
        <View style={{ height: 4, width: `${progressPct}%`, backgroundColor: C.primary, borderRadius: 2 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <View style={{
          backgroundColor: C.bgCard,
          borderRadius: 24,
          padding: 28,
          shadowColor: C.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 8,
          borderWidth: 1,
          borderColor: C.primaryLight,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
            Task {done + 1} of {total}
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '700', color: C.textDim, lineHeight: 34, marginBottom: 12 }}>
            {current.title}
          </Text>
          {current.description && (
            <Text style={{ fontSize: 15, color: C.textSecondary, lineHeight: 22, marginBottom: 16 }}>
              {current.description}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ backgroundColor: C.primaryBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.primary }}>
                ⭐ +{effectivePoints(current)}
              </Text>
            </View>
            {scheduleSummary && (
              <Text style={{ fontSize: 12, color: C.textMuted }}>{scheduleSummary}</Text>
            )}
          </View>
        </View>

        {remaining.length > 1 && (
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            {remaining.slice(1, 3).map((t) => (
              <Text key={t.id} style={{ fontSize: 13, color: C.textDisabled, marginBottom: 4 }}>
                {t.title}
              </Text>
            ))}
            {remaining.length > 3 && (
              <Text style={{ fontSize: 12, color: C.border }}>{remaining.length - 3} more</Text>
            )}
          </View>
        )}
      </View>

      <View style={{ padding: 24, gap: 12 }}>
        <TouchableOpacity
          onPress={handleDone}
          style={{
            backgroundColor: C.primary,
            borderRadius: 18,
            paddingVertical: 18,
            alignItems: 'center',
            shadowColor: C.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>✓ Done</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} style={{ paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, color: C.textMuted }}>Skip →</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
