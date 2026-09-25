import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@components/Screen';
import { format } from 'date-fns';
import { useTaskStore } from '@store/index';
import { useSettingsStore } from '@store/index';
import { ScheduleRulePicker } from '@components/ScheduleRulePicker';
import { CategoryPicker } from '@components/CategoryPicker';
import type { ScheduleRule } from '@lib/recurrence';
import { serializeRule } from '@lib/recurrence';
import type { Difficulty } from '@lib/difficulty';
import { DIFFICULTY_LABELS } from '@lib/difficulty';
import { useColors } from '@lib/colors';

const POINT_PRESETS = [5, 10, 15, 25, 50];

export default function NewTaskScreen() {
  const C = useColors();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const addTask           = useTaskStore((s) => s.addTask);
  const defaultPointValue = useSettingsStore((s) => s.defaultPointValue);
  const today             = format(new Date(), 'yyyy-MM-dd');

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pointValue, setPointValue] = useState(() => defaultPointValue);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [rule, setRule]             = useState<ScheduleRule>({ type: 'daily', startDate: today });
  const [endDate, setEndDate]       = useState<string | null>(null);

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
      scheduleEndDate: endDate,
      pointValue,
      difficulty,
      parentGoalId: goalId ?? null,
      isGoal: false,
      bonusPoints: 0,
    });
    router.back();
  };

  const label = { fontSize: 11, fontWeight: '700' as const, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 8 };
  const input = { backgroundColor: C.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.borderLight };

  const DIFF_COLORS = { easy: C.success, normal: C.primary, hard: C.danger };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.borderLight }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: C.primary }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: C.textDim }}>New Task</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={{ fontSize: 16, color: C.primary, fontWeight: '600' }}>Add</Text>
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
            placeholder="What do you want to do?"
            placeholderTextColor={C.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />
        </View>

        <View>
          <Text style={label}>Notes (optional)</Text>
          <TextInput
            style={[input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="Add notes..."
            placeholderTextColor={C.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View>
          <Text style={label}>Category</Text>
          <CategoryPicker value={categoryId} onChange={setCategoryId} />
        </View>

        <View>
          <Text style={label}>Schedule</Text>
          <ScheduleRulePicker value={rule} onChange={setRule} endDate={endDate} onEndDateChange={setEndDate} />
        </View>

        <View>
          <Text style={label}>Difficulty</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => {
              const active = difficulty === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDifficulty(d)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, alignItems: 'center',
                    backgroundColor: active ? DIFF_COLORS[d] : C.bgCard,
                    borderColor: active ? DIFF_COLORS[d] : C.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : C.textSecondary }}>
                    {DIFFICULTY_LABELS[d]}
                  </Text>
                  <Text style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.8)' : C.textMuted, marginTop: 1 }}>
                    {d === 'easy' ? '×0.5' : d === 'hard' ? '×2' : '×1'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={label}>Points</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {POINT_PRESETS.map((pts) => {
              const active = pointValue === pts;
              return (
                <TouchableOpacity
                  key={pts}
                  onPress={() => setPointValue(pts)}
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
            {!POINT_PRESETS.includes(pointValue) && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: C.primary }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>⭐ {pointValue}</Text>
              </View>
            )}
          </View>
          <TextInput
            style={[input, { width: 100, marginTop: 10 }]}
            placeholder="Custom"
            placeholderTextColor={C.textMuted}
            keyboardType="number-pad"
            value={POINT_PRESETS.includes(pointValue) ? '' : String(pointValue)}
            onChangeText={(t) => {
              const n = parseInt(t, 10);
              if (!isNaN(n) && n > 0) setPointValue(n);
            }}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
