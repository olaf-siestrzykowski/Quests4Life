import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, TextInput, TouchableOpacity, Alert, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@components/Screen';
import { useTaskStore, useSettingsStore } from '@store/index';
import { format } from 'date-fns';

/**
 * Inbox — quick-capture screen (GTD-inspired).
 * Tasks created here use a 'once' rule for today and no category.
 * They show up on the Today screen and can be promoted to recurring tasks
 * from the task detail screen.
 */
export default function InboxScreen() {
  const tasks          = useTaskStore((s) => s.tasks);
  const addTask        = useTaskStore((s) => s.addTask);
  const archiveTask    = useTaskStore((s) => s.archiveTask);
  const defaultPts     = useSettingsStore((s) => s.defaultPointValue);

  const [title, setTitle]     = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);

  // "Inbox" tasks: standalone, scheduleRule = once for today, no category
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const inboxTasks = tasks.filter(
    (t) => !t.isGoal && !t.archivedAt && !t.parentGoalId && t.scheduleRule.includes('"type":"once"') && t.scheduleRule.includes(todayStr),
  );

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    await addTask({
      title: trimmed,
      description: notes.trim() || null,
      categoryId: null,
      scheduleRule: JSON.stringify({ type: 'once', date: todayStr }),
      pointValue: defaultPts,
      parentGoalId: null,
      isGoal: false,
      bonusPoints: 0,
    });
    setTitle('');
    setNotes('');
    setSaving(false);
  };

  const handleDelete = (id: string, taskTitle: string) => {
    Alert.alert(`Archive "${taskTitle}"?`, '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => archiveTask(id) },
    ]);
  };

  return (
    <Screen edges={['top', 'bottom']} backgroundColor="#ffffff">
      {/* Nav bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: '#0ea5e9' }}>Done</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#0f172a' }}>Inbox</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Quick input */}
        <View style={{ padding: 16, backgroundColor: '#f8fafc', borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' }}>
          <TextInput
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              color: '#1e293b',
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
            placeholder="Capture a task..."
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="send"
            onSubmitEditing={handleAdd}
          />
          <TextInput
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 14,
              color: '#64748b',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              marginTop: 8,
              height: 52,
              textAlignVertical: 'top',
              paddingTop: 10,
            }}
            placeholder="Notes (optional)"
            placeholderTextColor="#94a3b8"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <TouchableOpacity
            onPress={handleAdd}
            disabled={!title.trim() || saving}
            style={{
              marginTop: 10,
              backgroundColor: title.trim() ? '#0ea5e9' : '#e2e8f0',
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: title.trim() ? '#fff' : '#94a3b8' }}>
              Add to inbox
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inbox list */}
        <FlatList
          data={inboxTasks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📥</Text>
              <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '600' }}>Inbox is empty</Text>
              <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
                Capture tasks quickly — no schedule needed.{'\n'}They show up on Today and you can promote them later.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 14,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 1,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#1e293b' }}>{item.title}</Text>
                {item.description && (
                  <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }} numberOfLines={1}>{item.description}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => router.push(`/task/${item.id}`)}>
                <Text style={{ fontSize: 13, color: '#0ea5e9', fontWeight: '500' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.title)} hitSlop={8}>
                <Text style={{ fontSize: 18, color: '#cbd5e1' }}>×</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
