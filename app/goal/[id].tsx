import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTaskStore, usePointsStore } from '@store/index';
import { TaskCard } from '@components/TaskCard';
import type { Task } from '@db/schema';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const tasks             = useTaskStore((s) => s.tasks);
  const completedTodayIds = useTaskStore((s) => s.completedTodayIds);
  const completeTask      = useTaskStore((s) => s.completeTask);
  const uncompleteTask    = useTaskStore((s) => s.uncompleteTask);
  const archiveTask       = useTaskStore((s) => s.archiveTask);
  const reorderTask       = useTaskStore((s) => s.reorderTask);
  const addPoints         = usePointsStore((s) => s.addPoints);
  const wasGoalBonus      = usePointsStore((s) => s.wasGoalBonusGrantedToday);

  const [isReordering, setIsReordering] = useState(false);

  const goal       = tasks.find((t) => t.id === id && t.isGoal);
  const childTasks = tasks
    .filter((t) => t.parentGoalId === id && !t.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  const done = childTasks.filter((t) => completedTodayIds.has(t.id)).length;

  if (!goal) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#94a3b8' }}>Goal not found.</Text>
      </SafeAreaView>
    );
  }

  const handleComplete = async (task: Task) => {
    if (isReordering) return;
    const alreadyDone = completedTodayIds.has(task.id);
    if (alreadyDone) {
      await uncompleteTask(task.id);
      await addPoints(-task.pointValue, 'task_uncomplete', { taskId: task.id });
    } else {
      await completeTask(task.id);
      await addPoints(task.pointValue, 'task_complete', { taskId: task.id });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Goal bonus check
      if (goal.bonusPoints > 0 && !wasGoalBonus(goal.id)) {
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 16, color: '#0ea5e9' }}>‹ Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 16 }}>
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
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#0f172a' }}>{goal.title}</Text>
        {goal.description ? (
          <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{goal.description}</Text>
        ) : null}

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#0ea5e9' }}>{done}/{childTasks.length}</Text>
            <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>tasks today</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#f59e0b' }}>⭐ {goal.bonusPoints}</Text>
            <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>bonus pts</Text>
          </View>
        </View>

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
            reordering={isReordering}
            onMoveUp={index > 0 ? () => reorderTask(item.id, 'up') : undefined}
            onMoveDown={index < childTasks.length - 1 ? () => reorderTask(item.id, 'down') : undefined}
          />
        )}
      />

      {/* FAB — add task to this goal */}
      {!isReordering && (
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
    </SafeAreaView>
  );
}
