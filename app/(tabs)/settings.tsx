import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Platform, Share } from 'react-native';
import { Screen } from '@components/Screen';
import { useCategoryStore, useSettingsStore } from '@store/index';
import { useColors } from '@lib/colors';
import type { ThemeMode } from '@store/settingsStore';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelAllReminders,
  sendTestNotification,
  getPermissionStatus,
} from '@lib/notifications';
import { db } from '@db/index';
import { tasks, completions, pointsLedger, rewards, categories as categoriesTable, appSettings } from '@db/schema';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light',  label: 'Light',  icon: '☀️' },
  { value: 'system', label: 'System', icon: '⚙️' },
  { value: 'dark',   label: 'Dark',   icon: '🌙' },
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function SettingsScreen() {
  const C = useColors();

  const categories     = useCategoryStore((s) => s.categories);
  const addCategory    = useCategoryStore((s) => s.addCategory);
  const removeCategory = useCategoryStore((s) => s.removeCategory);

  const notificationsEnabled  = useSettingsStore((s) => s.notificationsEnabled);
  const notificationHour      = useSettingsStore((s) => s.notificationHour);
  const notificationMinute    = useSettingsStore((s) => s.notificationMinute);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const setNotificationTime   = useSettingsStore((s) => s.setNotificationTime);

  const hapticsEnabled        = useSettingsStore((s) => s.hapticsEnabled);
  const defaultPointValue     = useSettingsStore((s) => s.defaultPointValue);
  const streakBonusEnabled    = useSettingsStore((s) => s.streakBonusEnabled);
  const setHapticsEnabled     = useSettingsStore((s) => s.setHapticsEnabled);
  const setDefaultPointValue  = useSettingsStore((s) => s.setDefaultPointValue);
  const setStreakBonusEnabled = useSettingsStore((s) => s.setStreakBonusEnabled);

  const themeMode    = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  const [name, setName]     = useState('');
  const [color, setColor]   = useState(PRESET_COLORS[3]);
  const [adding, setAdding] = useState(false);

  const [hourInput, setHourInput]     = useState(String(notificationHour));
  const [minuteInput, setMinuteInput] = useState(pad(notificationMinute));
  const [permStatus, setPermStatus]   = useState<'granted' | 'denied' | 'undetermined' | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      getPermissionStatus().then(setPermStatus);
    }
  }, []);

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
      const newStatus = await getPermissionStatus();
      setPermStatus(newStatus);
      if (!granted) {
        Alert.alert('Permission needed', 'Please allow notifications in your device settings to enable reminders.');
        return;
      }
      await setNotificationsEnabled(true);
      await scheduleDailyReminder(notificationHour, notificationMinute);
    } else {
      await setNotificationsEnabled(false);
      await cancelAllReminders();
    }
  };

  const handleTestNotification = async () => {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert('Permission denied', 'Enable notifications first.');
      return;
    }
    await sendTestNotification();
    Alert.alert('Sent!', 'You should receive a test notification in ~1 second.');
  };

  const handleExport = async () => {
    try {
      const [allTasks, allCompletions, allPoints, allRewards, allCategories] = await Promise.all([
        db.select().from(tasks),
        db.select().from(completions),
        db.select().from(pointsLedger),
        db.select().from(rewards),
        db.select().from(categoriesTable),
      ]);
      const data = JSON.stringify({ tasks: allTasks, completions: allCompletions, points: allPoints, rewards: allRewards, categories: allCategories }, null, 2);
      if (Platform.OS === 'web') {
        Alert.alert('Export (web)', 'Open browser console to copy your data.', [{ text: 'OK' }]);
        console.log('=== quests4life export ===\n', data);
        return;
      }
      await Share.share({ message: data, title: 'quests4life data export' });
    } catch {
      Alert.alert('Export failed', 'Could not export data.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset all data?',
      'This will permanently delete ALL tasks, goals, completions, points, rewards, and categories. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type "RESET" in your mind and confirm. All data will be erased.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await db.delete(completions);
                      await db.delete(pointsLedger);
                      await db.delete(tasks);
                      await db.delete(rewards);
                      await db.delete(categoriesTable);
                      await db.delete(appSettings);
                      Alert.alert('Done', 'All data has been reset. Restart the app to start fresh.');
                    } catch {
                      Alert.alert('Error', 'Reset failed. Please try again.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
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

  const sectionLabel = { fontSize: 13, fontWeight: '600' as const, color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 10 };
  const card = { backgroundColor: C.bgCard, borderRadius: 16, overflow: 'hidden' as const, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 };
  const rowBorder = { borderTopWidth: 0.5 as const, borderTopColor: C.borderLight };
  const timeInput = { width: 52, backgroundColor: C.bgInput, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border, textAlign: 'center' as const, fontWeight: '600' as const };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: C.textDim, marginBottom: 20 }}>Settings</Text>

        {/* ── Appearance ─────────────────────────────────────── */}
        <Text style={sectionLabel}>Appearance</Text>
        <View style={card}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Text style={{ fontSize: 15, color: C.text, fontWeight: '500', marginBottom: 12 }}>Theme</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {THEME_OPTIONS.map(({ value, label, icon }) => {
                const active = themeMode === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setThemeMode(value)}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 2,
                      backgroundColor: active ? C.primaryBg : C.bgPage,
                      borderColor: active ? C.primary : C.border,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{icon}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 4, color: active ? C.primary : C.textSecondary }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Notifications ─────────────────────────────────── */}
        <Text style={[sectionLabel, { marginTop: 24 }]}>Notifications</Text>
        <View style={card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 15, color: C.text, fontWeight: '500' }}>Daily reminder</Text>
                {permStatus !== null && (
                  <View style={{
                    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                    backgroundColor: permStatus === 'granted' ? C.successLight : permStatus === 'denied' ? C.dangerLight : C.borderLight,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: permStatus === 'granted' ? C.successDark : permStatus === 'denied' ? C.dangerDark : C.textSecondary }}>
                      {permStatus === 'granted' ? 'GRANTED' : permStatus === 'denied' ? 'DENIED' : 'NOT ASKED'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                Get nudged every day at a set time
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: C.border, true: C.primaryLight }}
              thumbColor={notificationsEnabled ? C.primary : C.textDisabled}
            />
          </View>

          {notificationsEnabled && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, ...rowBorder }}>
              <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 12, marginBottom: 8 }}>Reminder time</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={timeInput}
                  value={hourInput}
                  onChangeText={setHourInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="08"
                  placeholderTextColor={C.textMuted}
                />
                <Text style={{ fontSize: 18, color: C.textSecondary, fontWeight: '700' }}>:</Text>
                <TextInput
                  style={timeInput}
                  value={minuteInput}
                  onChangeText={setMinuteInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor={C.textMuted}
                />
                <TouchableOpacity
                  onPress={handleSaveTime}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: C.primary }}
                >
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>Save</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={handleTestNotification}
                style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: C.borderLight, alignSelf: 'flex-start' }}
              >
                <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '500' }}>Send test now</Text>
              </TouchableOpacity>
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
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 13,
                borderTopWidth: idx === 0 ? 0 : 0.5,
                borderTopColor: C.borderLight,
              }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat.color, marginRight: 12 }} />
              <Text style={{ flex: 1, fontSize: 15, color: C.text }}>{cat.name}</Text>
              <TouchableOpacity onPress={() => handleDelete(cat.id, cat.name)} hitSlop={8}>
                <Text style={{ fontSize: 18, color: C.textDisabled }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          {!adding ? (
            <TouchableOpacity
              onPress={() => setAdding(true)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: categories.length ? 0.5 : 0, borderTopColor: C.borderLight }}
            >
              <Text style={{ fontSize: 22, color: C.primary, marginRight: 10, lineHeight: 26 }}>+</Text>
              <Text style={{ fontSize: 15, color: C.primary, fontWeight: '500' }}>New Category</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ padding: 16, borderTopWidth: categories.length ? 0.5 : 0, borderTopColor: C.borderLight }}>
              <TextInput
                autoFocus
                placeholder="Category name"
                value={name}
                onChangeText={setName}
                placeholderTextColor={C.textMuted}
                style={{ backgroundColor: C.bgInput, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border }}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: c,
                      borderWidth: color === c ? 3 : 0,
                      borderColor: C.textDim,
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => { setAdding(false); setName(''); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.borderLight, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAdd}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Preferences ───────────────────────────────────── */}
        <Text style={[sectionLabel, { marginTop: 24 }]}>Preferences</Text>
        <View style={card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: C.text, fontWeight: '500' }}>Haptic feedback</Text>
              <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Vibration on task completion</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: C.border, true: C.primaryLight }}
              thumbColor={hapticsEnabled ? C.primary : C.textDisabled}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, ...rowBorder }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: C.text, fontWeight: '500' }}>Streak bonus</Text>
              <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>+10/20/30% pts on 3/7/14-day streaks</Text>
            </View>
            <Switch
              value={streakBonusEnabled}
              onValueChange={setStreakBonusEnabled}
              trackColor={{ false: C.border, true: C.primaryLight }}
              thumbColor={streakBonusEnabled ? C.primary : C.textDisabled}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, ...rowBorder }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: C.text, fontWeight: '500' }}>Default points</Text>
              <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Pre-filled value when creating tasks</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setDefaultPointValue(Math.max(1, defaultPointValue - 5))}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.borderLight, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 18, color: C.textSecondary }}>−</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, minWidth: 28, textAlign: 'center' }}>{defaultPointValue}</Text>
              <TouchableOpacity
                onPress={() => setDefaultPointValue(Math.min(100, defaultPointValue + 5))}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.borderLight, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 18, color: C.textSecondary }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Data ──────────────────────────────────────────── */}
        <Text style={[sectionLabel, { marginTop: 24 }]}>Data</Text>
        <View style={card}>
          <TouchableOpacity
            onPress={handleExport}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: C.text, fontWeight: '500' }}>Export data</Text>
              <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Save all tasks, goals, and history as JSON</Text>
            </View>
            <Text style={{ fontSize: 18, color: C.textMuted }}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReset}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, ...rowBorder }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: C.danger, fontWeight: '500' }}>Reset all data</Text>
              <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Permanently erase everything</Text>
            </View>
            <Text style={{ fontSize: 18, color: C.dangerLight }}>×</Text>
          </TouchableOpacity>
        </View>

        {/* ── About ─────────────────────────────────────────── */}
        <Text style={[sectionLabel, { marginTop: 24 }]}>About</Text>
        <View style={card}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Text style={{ fontSize: 15, color: C.text, fontWeight: '500' }}>quests4life</Text>
            <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Version 1.0.0 · Built with Expo + React Native</Text>
            <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Your data stays on your device.</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
