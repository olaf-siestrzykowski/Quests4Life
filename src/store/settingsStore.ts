import { create } from 'zustand';
import { db } from '@db/index';
import { appSettings } from '@db/schema';
import { eq } from 'drizzle-orm';

interface SettingsStore {
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  load: () => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setNotificationTime: (hour: number, minute: number) => Promise<void>;
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

  load: async () => {
    const rows = await db.select().from(appSettings);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    set({
      notificationsEnabled: map['notifications_enabled'] !== 'false',
      notificationHour: parseInt(map['notification_hour'] ?? '8', 10),
      notificationMinute: parseInt(map['notification_minute'] ?? '0', 10),
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
}));
