import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCategoryStore, useSettingsStore } from '@store/index';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelAllReminders,
} from '@lib/notifications';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function SettingsScreen() {
  const categories     = useCategoryStore((s) => s.categories);
  const addCategory    = useCategoryStore((s) => s.addCategory);
  const removeCategory = useCategoryStore((s) => s.removeCategory);

  const notificationsEnabled  = useSettingsStore((s) => s.notificationsEnabled);
  const notificationHour      = useSettingsStore((s) => s.notificationHour);
  const notificationMinute    = useSettingsStore((s) => s.notificationMinute);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const setNotificationTime   = useSettingsStore((s) => s.setNotificationTime);

  const [name, setName]     = useState('');
  const [color, setColor]   = useState(PRESET_COLORS[3]);
  const [adding, setAdding] = useState(false);

  const [hourInput, setHourInput]     = useState(String(notificationHour));
  const [minuteInput, setMinuteInput] = useState(pad(notificationMinute));

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addCategory({ name: trimmed, color, icon: 'tag' });
    setName('');
    setColor(PRESET_COLORS[3]);
    setAdding(false);
  };

  const handleDelete = (id: string, catName: string) => {
    Alert.alert(`Delete "${catName}"?`, 'Tasks in this category will lose their category tag.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeCategory(id) },
    ]);
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Please allow notifications in your device settings to enable reminders.',
        );
        return;
      }
      await setNotificationsEnabled(true);
      await scheduleDailyReminder(notificationHour, notificationMinute);
    } else {
      await setNotificationsEnabled(false);
      await cancelAllReminders();
    }
  };

  const handleSaveTime = async () => {
    const h = parseInt(hourInput, 10);
    const m = parseInt(minuteInput, 10);
    if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
      Alert.alert('Invalid time', 'Enter a valid hour (0–23) and minute (0–59).');
      return;
    }
    await setNotificationTime(h, m);
    if (notificationsEnabled) {
      await scheduleDailyReminder(h, m);
    }
    Alert.alert('Saved', `Daily reminder set for ${pad(h)}:${pad(m)}.`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#0f172a', marginBottom: 20 }}>Settings</Text>

        {/* ── Notifications ─────────────────────────────────── */}
        <Text style={sectionLabel}>Notifications</Text>
        <View style={card}>
          {/* Toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: '#1e293b', fontWeight: '500' }}>Daily reminder</Text>
              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                Get nudged every day at a set time
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#e2e8f0', true: '#bae6fd' }}
              thumbColor={notificationsEnabled ? '#0ea5e9' : '#cbd5e1'}
            />
          </View>

          {/* Time picker (shown when enabled) */}
          {notificationsEnabled && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 0.5, borderTopColor: '#f1f5f9' }}>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 12, marginBottom: 8 }}>Reminder time</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={timeInput}
                  value={hourInput}
                  onChangeText={setHourInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="08"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={{ fontSize: 18, color: '#475569', fontWeight: '700' }}>:</Text>
                <TextInput
                  style={timeInput}
                  value={minuteInput}
                  onChangeText={setMinuteInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  onPress={handleSaveTime}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0ea5e9' }}
                >
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Categories ────────────────────────────────────── */}
        <Text style={[sectionLabel, { marginTop: 24 }]}>Categories</Text>
        <View style={card}>
          {categories.map((cat, idx) => (
            <View
              key={cat.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 13,
                borderTopWidth: idx === 0 ? 0 : 0.5,
                borderTopColor: '#f1f5f9',
              }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat.color, marginRight: 12 }} />
              <Text style={{ flex: 1, fontSize: 15, color: '#1e293b' }}>{cat.name}</Text>
              <TouchableOpacity onPress={() => handleDelete(cat.id, cat.name)} hitSlop={8}>
                <Text style={{ fontSize: 18, color: '#cbd5e1' }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add category row */}
          {!adding ? (
            <TouchableOpacity
              onPress={() => setAdding(true)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: categories.length ? 0.5 : 0, borderTopColor: '#f1f5f9' }}
            >
              <Text style={{ fontSize: 22, color: '#0ea5e9', marginRight: 10, lineHeight: 26 }}>+</Text>
              <Text style={{ fontSize: 15, color: '#0ea5e9', fontWeight: '500' }}>New Category</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ padding: 16, borderTopWidth: categories.length ? 0.5 : 0, borderTopColor: '#f1f5f9' }}>
              <TextInput
                autoFocus
                placeholder="Category name"
                value={name}
                onChangeText={setName}
                style={{ backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' }}
              />
              {/* Color swatches */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: c,
                      borderWidth: color === c ? 3 : 0,
                      borderColor: '#0f172a',
                    }}
                  />
                ))}
              </View>
              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => { setAdding(false); setName(''); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748b' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAdd}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0ea5e9', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const sectionLabel: object = {
  fontSize: 13,
  fontWeight: '600',
  color: '#94a3b8',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  marginBottom: 10,
};

const card: object = {
  backgroundColor: '#fff',
  borderRadius: 16,
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 1,
};

const timeInput: object = {
  width: 52,
  backgroundColor: '#f8fafc',
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 8,
  fontSize: 16,
  color: '#1e293b',
  borderWidth: 1,
  borderColor: '#e2e8f0',
  textAlign: 'center',
  fontWeight: '600',
};
