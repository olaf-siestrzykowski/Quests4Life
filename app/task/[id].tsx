import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '@components/Screen';
import { useTaskStore } from '@store/index';
import { useCategoryStore } from '@store/index';
import { CategoryPicker } from '@components/CategoryPicker';
import { ScheduleRulePicker } from '@components/ScheduleRulePicker';
import { deserializeRule, serializeRule } from '@lib/recurrence';
import type { ScheduleRule } from '@lib/recurrence';

const POINT_PRESETS = [5, 10, 15, 25, 50];

export default function TaskDetailScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const tasks       = useTaskStore((s) => s.tasks);
  const updateTask  = useTaskStore((s) => s.updateTask);
  const archiveTask = useTaskStore((s) => s.archiveTask);

  const task = tasks.find((t) => t.id === id);

  const [title, setTitle]           = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(task?.categoryId ?? null);
  const [pointValue, setPointValue] = useState(task?.pointValue ?? 10);
  const [rule, setRule]             = useState<ScheduleRule>(() => {
    try { return deserializeRule(task?.scheduleRule ?? '{}'); }
    catch { return { type: 'daily', startDate: new Date().toISOString().slice(0, 10) }; }
  });
  const [dirty, setDirty] = useState(false);

  if (!task) {
    return (
      <Screen backgroundColor="#fff" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#94a3b8' }}>Task not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#0ea5e9' }}>Go back</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required');
      return;
    }
    await updateTask(id, {
      title: title.trim(),
      description: description.trim() || null,
      categoryId,
      pointValue,
      scheduleRule: serializeRule(rule),
    });
    router.back();
  };

  const handleArchive = () => {
    Alert.alert(`Archive "${task.title}"?`, 'The task will be hidden from all views.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => { await archiveTask(id); router.back(); },
      },
    ]);
  };

  const markDirty = (fn: () => void) => { fn(); setDirty(true); };

  return (
    <Screen edges={['top', 'bottom']} backgroundColor="#ffffff">
      {/* Nav bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: '#0ea5e9' }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#0f172a' }}>Edit Task</Text>
        <TouchableOpacity onPress={dirty ? handleSave : () => router.back()}>
          <Text style={{ fontSize: 16, color: dirty ? '#0ea5e9' : '#94a3b8', fontWeight: '600' }}>
            {dirty ? 'Save' : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(v) => markDirty(() => setTitle(v))}
            placeholder="Task title"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
            value={description}
            onChangeText={(v) => markDirty(() => setDescription(v))}
            placeholder="Add notes..."
            placeholderTextColor="#94a3b8"
            multiline
          />
        </View>

        <View>
          <Text style={styles.label}>Category</Text>
          <CategoryPicker value={categoryId} onChange={(v) => markDirty(() => setCategoryId(v))} />
        </View>

        <View>
          <Text style={styles.label}>Schedule</Text>
          <ScheduleRulePicker value={rule} onChange={(v) => markDirty(() => setRule(v))} />
        </View>

        <View>
          <Text style={styles.label}>Points</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {POINT_PRESETS.map((pts) => {
              const active = pointValue === pts;
              return (
                <TouchableOpacity
                  key={pts}
                  onPress={() => markDirty(() => setPointValue(pts))}
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
          </View>
        </View>

        {/* Archive */}
        <TouchableOpacity
          onPress={handleArchive}
          style={{ marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#fff5f5', alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' }}
        >
          <Text style={{ fontSize: 15, color: '#ef4444', fontWeight: '600' }}>Archive Task</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
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
