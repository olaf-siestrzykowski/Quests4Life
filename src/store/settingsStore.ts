import { create } from 'zustand';
import { db } from '@db/index';
import { appSettings } from '@db/schema';
import { eq } from 'drizzle-orm';

interface SettingsStore {
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  hapticsEnabled: boolean;
  defaultPointValue: number;
  streakBonusEnabled: boolean;
  load: () => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setNotificationTime: (hour: number, minute: number) => Promise<void>;
  setHapticsEnabled: (v: boolean) => Promise<void>;
  setDefaultPointValue: (v: number) => Promise<void>;
  setStreakBonusEnabled: (v: boolean) => Promise<void>;
}

async function upsertSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  notificationsEnabled: true,
  notificationHour: 8,
  notificationMinute: 0,
  hapticsEnabled: true,
  defaultPointValue: 10,
  streakBonusEnabled: false,

  load: async () => {
    const rows = await db.select().from(appSettings);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    set({
      notificationsEnabled: map['notifications_enabled'] !== 'false',
      notificationHour: parseInt(map['notification_hour'] ?? '8', 10),
      notificationMinute: parseInt(map['notification_minute'] ?? '0', 10),
      hapticsEnabled: map['haptics_enabled'] !== 'false',
      defaultPointValue: parseInt(map['default_point_value'] ?? '10', 10),
      streakBonusEnabled: map['streak_bonus_enabled'] === 'true',
    });
  },

  setNotificationsEnabled: async (enabled) => {
    await upsertSetting('notifications_enabled', String(enabled));
    set({ notificationsEnabled: enabled });
  },

  setNotificationTime: async (hour, minute) => {
    await Promise.all([
      upsertSetting('notification_hour', String(hour)),
      upsertSetting('notification_minute', String(minute)),
    ]);
    set({ notificationHour: hour, notificationMinute: minute });
  },

  setHapticsEnabled: async (v) => {
    await upsertSetting('haptics_enabled', String(v));
    set({ hapticsEnabled: v });
  },

  setDefaultPointValue: async (v) => {
    await upsertSetting('default_point_value', String(v));
    set({ defaultPointValue: v });
  },

  setStreakBonusEnabled: async (v) => {
    await upsertSetting('streak_bonus_enabled', String(v));
    set({ streakBonusEnabled: v });
  },
}));
