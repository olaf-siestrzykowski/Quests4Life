import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTaskStore } from '@store/index';
import { GoalCard } from '@components/GoalCard';

export default function GoalsScreen() {
  const tasks             = useTaskStore((s) => s.tasks);
  const completedTodayIds = useTaskStore((s) => s.completedTodayIds);

  const goals = tasks.filter((t) => t.isGoal && !t.archivedAt);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#0f172a' }}>Goals</Text>
        <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 1 }}>
          {goals.length} active goal{goals.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 64 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎯</Text>
            <Text style={{ fontSize: 16, color: '#64748b', fontWeight: '600' }}>No goals yet</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              Tap + to create your first goal
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const childTasks = tasks.filter((t) => t.parentGoalId === item.id && !t.archivedAt);
          return (
            <GoalCard
              goal={item}
              childTasks={childTasks}
              completedTodayIds={completedTodayIds}
              onPress={() => router.push(`/goal/${item.id}`)}
            />
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/new-goal')}
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
    </SafeAreaView>
  );
}
