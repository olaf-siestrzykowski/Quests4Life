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
import { useColors } from '@lib/colors';

const BONUS_PRESETS = [25, 50, 100, 200, 500];

export default function NewGoalScreen() {
  const C = useColors();
  const addTask = useTaskStore((s) => s.addTask);
  const today   = format(new Date(), 'yyyy-MM-dd');
  const [showTemplates, setShowTemplates] = useState(false);

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [bonusPoints, setBonusPoints] = useState(100);
  const [rule, setRule]             = useState<ScheduleRule>({ type: 'monthly', dayOfMonth: 1, startDate: today });

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

  const label = { fontSize: 11, fontWeight: '700' as const, color: C.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 8 };
  const input = { backgroundColor: C.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.borderLight };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.borderLight }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: C.primary }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: C.textDim }}>New Goal</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={{ fontSize: 16, color: C.primary, fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        <TouchableOpacity onPress={() => setShowTemplates((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: C.primary, fontWeight: '600' }}>
            {showTemplates ? 'Hide templates ▲' : 'Use a template ▼'}
          </Text>
        </TouchableOpacity>
        {showTemplates && (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {GOAL_TEMPLATES.map((tpl) => (
              <TouchableOpacity
                key={tpl.id}
                onPress={() => handleUseTemplate(tpl.id)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primaryLight }}
              >
                <Text style={{ fontSize: 13, color: C.primaryDark, fontWeight: '600' }}>{tpl.emoji} {tpl.label}</Text>
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
          <Text style={label}>Goal</Text>
          <TextInput
            style={input}
            placeholder="What do you want to achieve?"
            placeholderTextColor={C.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
        </View>

        <View>
          <Text style={label}>Why it matters (optional)</Text>
          <TextInput
            style={[input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="Describe your motivation..."
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
          <Text style={label}>Cycle</Text>
          <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
            How often does this goal reset?
          </Text>
          <ScheduleRulePicker value={rule} onChange={setRule} />
        </View>

        <View>
          <Text style={label}>Completion Bonus</Text>
          <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
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
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                    backgroundColor: active ? C.warning : C.bgCard,
                    borderColor: active ? C.warning : C.border,
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
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
