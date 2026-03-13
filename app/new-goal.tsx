import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@components/Screen';
import { format } from 'date-fns';
import { useTaskStore } from '@store/index';
import { ScheduleRulePicker } from '@components/ScheduleRulePicker';
import { CategoryPicker } from '@components/CategoryPicker';
import type { ScheduleRule } from '@lib/recurrence';
import { serializeRule } from '@lib/recurrence';
import { GOAL_TEMPLATES } from '@lib/goalTemplates';

const BONUS_PRESETS = [25, 50, 100, 200, 500];

export default function NewGoalScreen() {
  const addTask = useTaskStore((s) => s.addTask);
  const today   = format(new Date(), 'yyyy-MM-dd');
  const [showTemplates, setShowTemplates] = useState(false);

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [bonusPoints, setBonusPoints] = useState(100);
  const [rule, setRule]             = useState<ScheduleRule>({
    type: 'monthly',
    dayOfMonth: 1,
    startDate: today,
  });

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a goal title.');
      return;
    }
    await addTask({
      title: title.trim(),
      description: description.trim() || null,
      categoryId,
      scheduleRule: serializeRule(rule),
      pointValue: 0,
      bonusPoints,
      isGoal: true,
      parentGoalId: null,
    });
    router.back();
  };

  const handleUseTemplate = async (templateId: string) => {
    const tpl = GOAL_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setShowTemplates(false);
    const goal = await addTask({
      title: tpl.goal.title,
      description: tpl.goal.description,
      categoryId: null,
      scheduleRule: serializeRule(tpl.goal.rule),
      pointValue: 0,
      bonusPoints: tpl.goal.bonusPoints,
      isGoal: true,
      parentGoalId: null,
    });
    for (const t of tpl.tasks) {
      await addTask({
        title: t.title,
        description: null,
        categoryId: null,
        scheduleRule: serializeRule(t.rule),
        pointValue: t.pointValue,
        isGoal: false,
        bonusPoints: 0,
        parentGoalId: goal.id,
      });
    }
    router.back();
  };

  return (
    <Screen edges={['top', 'bottom']} backgroundColor="#ffffff">
      {/* Nav bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: '#0ea5e9' }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#0f172a' }}>New Goal</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={{ fontSize: 16, color: '#0ea5e9', fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Template picker */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        <TouchableOpacity onPress={() => setShowTemplates((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: '#0ea5e9', fontWeight: '600' }}>
            {showTemplates ? 'Hide templates ▲' : 'Use a template ▼'}
          </Text>
        </TouchableOpacity>
        {showTemplates && (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {GOAL_TEMPLATES.map((tpl) => (
              <TouchableOpacity
                key={tpl.id}
                onPress={() => handleUseTemplate(tpl.id)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd' }}
              >
                <Text style={{ fontSize: 13, color: '#0369a1', fontWeight: '600' }}>{tpl.emoji} {tpl.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={styles.label}>Goal</Text>
          <TextInput
            style={styles.input}
            placeholder="What do you want to achieve?"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
        </View>

        <View>
          <Text style={styles.label}>Why it matters (optional)</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="Describe your motivation..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View>
          <Text style={styles.label}>Category</Text>
          <CategoryPicker value={categoryId} onChange={setCategoryId} />
        </View>

        <View>
          <Text style={styles.label}>Cycle</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            How often does this goal reset?
          </Text>
          <ScheduleRulePicker value={rule} onChange={setRule} />
        </View>

        <View>
          <Text style={styles.label}>Completion Bonus</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
            Bonus points when all tasks in this goal are done.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {BONUS_PRESETS.map((pts) => {
              const active = bonusPoints === pts;
              return (
                <TouchableOpacity
                  key={pts}
                  onPress={() => setBonusPoints(pts)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor: active ? '#f59e0b' : '#fff',
                    borderColor: active ? '#f59e0b' : '#e2e8f0',
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
