import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '@db/index';
import migrations from '@db/migrations/migrations';
import { useTaskStore, usePointsStore, useRewardsStore, useCategoryStore, useSettingsStore } from '@store/index';
import { View, Text, ActivityIndicator } from 'react-native';
import { seedDefaults } from '@db/seed';
import '../global.css';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const loadTasks      = useTaskStore((s) => s.load);
  const loadPoints     = usePointsStore((s) => s.load);
  const loadRewards    = useRewardsStore((s) => s.load);
  const loadCategories = useCategoryStore((s) => s.load);
  const loadSettings   = useSettingsStore((s) => s.load);

  useEffect(() => {
    if (!success) return;

    (async () => {
      await seedDefaults();
      await Promise.all([
        loadTasks(),
        loadPoints(),
        loadRewards(),
        loadCategories(),
        loadSettings(),
      ]);

      // Schedule daily reminder if enabled — wrapped so any failure doesn't block the app
      try {
        const { notificationsEnabled, notificationHour, notificationMinute } =
          useSettingsStore.getState();

        if (notificationsEnabled) {
          const { requestNotificationPermissions, scheduleDailyReminder } =
            await import('@lib/notifications');
          const granted = await requestNotificationPermissions();
          if (granted) {
            await scheduleDailyReminder(notificationHour, notificationMinute);
          }
        }
      } catch (e) {
        console.warn('Notification setup failed (non-fatal):', e);
      }
    })();
  }, [success]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 }}>
        <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 16, marginBottom: 8 }}>Migration error</Text>
        <Text style={{ color: '#64748b', fontSize: 13, textAlign: 'center' }}>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="new-task"   options={{ presentation: 'modal' }} />
      <Stack.Screen name="new-goal"   options={{ presentation: 'modal' }} />
      <Stack.Screen name="new-reward" options={{ presentation: 'modal' }} />
      <Stack.Screen name="task/[id]"  options={{ presentation: 'modal' }} />
      <Stack.Screen name="goal/[id]"  options={{ presentation: 'modal' }} />
    </Stack>
  );
}
