import { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useTaskStore } from '@store/index';
import { ScheduleRulePicker } from '@components/ScheduleRulePicker';
import { CategoryPicker } from '@components/CategoryPicker';
import type { ScheduleRule } from '@lib/recurrence';
import { serializeRule } from '@lib/recurrence';

const POINT_PRESETS = [5, 10, 15, 25, 50];

export default function NewTaskScreen() {
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const addTask    = useTaskStore((s) => s.addTask);
  const today      = format(new Date(), 'yyyy-MM-dd');

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pointValue, setPointValue] = useState(10);
  const [rule, setRule]             = useState<ScheduleRule>({ type: 'daily', startDate: today });

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a task title.');
      return;
    }
    await addTask({
      title: title.trim(),
      description: description.trim() || null,
      categoryId,
      scheduleRule: serializeRule(rule),
      pointValue,
      parentGoalId: goalId ?? null,
      isGoal: false,
      bonusPoints: 0,
    });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      {/* Nav bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: '#0ea5e9' }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#0f172a' }}>New Task</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={{ fontSize: 16, color: '#0ea5e9', fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What do you want to do?"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />
        </View>

        {/* Notes */}
        <View>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="Add notes..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {/* Category */}
        <View>
          <Text style={styles.label}>Category</Text>
          <CategoryPicker value={categoryId} onChange={setCategoryId} />
        </View>

        {/* Schedule */}
        <View>
          <Text style={styles.label}>Schedule</Text>
          <ScheduleRulePicker value={rule} onChange={setRule} />
        </View>

        {/* Points */}
        <View>
          <Text style={styles.label}>Points</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {POINT_PRESETS.map((pts) => {
              const active = pointValue === pts;
              return (
                <TouchableOpacity
                  key={pts}
                  onPress={() => setPointValue(pts)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor: active ? '#0ea5e9' : '#fff',
                    borderColor: active ? '#0ea5e9' : '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : '#475569' }}>
                    ⭐ {pts}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {/* Custom point value input */}
            {!POINT_PRESETS.includes(pointValue) && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0ea5e9' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>⭐ {pointValue}</Text>
              </View>
            )}
          </View>
          <TextInput
            style={[styles.input, { width: 100, marginTop: 10 }]}
            placeholder="Custom"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            value={POINT_PRESETS.includes(pointValue) ? '' : String(pointValue)}
            onChangeText={(t) => {
              const n = parseInt(t, 10);
              if (!isNaN(n) && n > 0) setPointValue(n);
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
};
