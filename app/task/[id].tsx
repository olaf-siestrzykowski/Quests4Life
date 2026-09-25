import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '@components/Screen';
import { useTaskStore } from '@store/index';
import { CategoryPicker } from '@components/CategoryPicker';
import { ScheduleRulePicker } from '@components/ScheduleRulePicker';
import { deserializeRule, serializeRule } from '@lib/recurrence';
import type { ScheduleRule } from '@lib/recurrence';
import { useColors } from '@lib/colors';

const POINT_PRESETS = [5, 10, 15, 25, 50];

export default function TaskDetailScreen() {
  const C = useColors();
  const { id }      = useLocalSearchParams<{ id: string }>();
  const tasks       = useTaskStore((s) => s.tasks);
  const updateTask  = useTaskStore((s) => s.updateTask);
  const archiveTask = useTaskStore((s) => s.archiveTask);

  const task = tasks.find((t) => t.id === id);

  const [title, setTitle]           = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(task?.categoryId ?? null);
  const [pointValue, setPointValue] = useState(task?.pointValue ?? 10);
  const [endDate, setEndDate]       = useState<string | null>(task?.scheduleEndDate ?? null);
  const [rule, setRule]             = useState<ScheduleRule>(() => {
    try { return deserializeRule(task?.scheduleRule ?? '{}'); }
    catch { return { type: 'daily', startDate: new Date().toISOString().slice(0, 10) }; }
  });
  const [dirty, setDirty] = useState(false);

  if (!task) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textMuted }}>Task not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: C.primary }}>Go back</Text>
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
      scheduleEndDate: endDate,
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

  const label = { fontSize: 11, fontWeight: '700' as const, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 8 };
  const input = { backgroundColor: C.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.borderLight };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.borderLight }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: C.primary }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: C.textDim }}>Edit Task</Text>
        <TouchableOpacity onPress={dirty ? handleSave : () => router.back()}>
          <Text style={{ fontSize: 16, color: dirty ? C.primary : C.textMuted, fontWeight: '600' }}>
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
          <Text style={label}>Title</Text>
          <TextInput
            style={input}
            value={title}
            onChangeText={(v) => markDirty(() => setTitle(v))}
            placeholder="Task title"
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View>
          <Text style={label}>Notes</Text>
          <TextInput
            style={[input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
            value={description}
            onChangeText={(v) => markDirty(() => setDescription(v))}
            placeholder="Add notes..."
            placeholderTextColor={C.textMuted}
            multiline
          />
        </View>

        <View>
          <Text style={label}>Category</Text>
          <CategoryPicker value={categoryId} onChange={(v) => markDirty(() => setCategoryId(v))} />
        </View>

        <View>
          <Text style={label}>Schedule</Text>
          <ScheduleRulePicker
            value={rule}
            onChange={(v) => markDirty(() => setRule(v))}
            endDate={endDate}
            onEndDateChange={(v) => markDirty(() => setEndDate(v))}
          />
        </View>

        <View>
          <Text style={label}>Points</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {POINT_PRESETS.map((pts) => {
              const active = pointValue === pts;
              return (
                <TouchableOpacity
                  key={pts}
                  onPress={() => markDirty(() => setPointValue(pts))}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                    backgroundColor: active ? C.primary : C.bgCard,
                    borderColor: active ? C.primary : C.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : C.textSecondary }}>
                    ⭐ {pts}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleArchive}
          style={{ marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.dangerLight, alignItems: 'center', borderWidth: 1, borderColor: C.danger }}
        >
          <Text style={{ fontSize: 15, color: C.danger, fontWeight: '600' }}>Archive Task</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
