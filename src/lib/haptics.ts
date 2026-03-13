import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';
import { useSettingsStore } from '@store/index';

// Re-export enums so callers can use Haptics.ImpactFeedbackStyle etc. unchanged
export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export function impactAsync(style?: ExpoHaptics.ImpactFeedbackStyle): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (!useSettingsStore.getState().hapticsEnabled) return Promise.resolve();
  return ExpoHaptics.impactAsync(style);
}

export function notificationAsync(type?: ExpoHaptics.NotificationFeedbackType): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (!useSettingsStore.getState().hapticsEnabled) return Promise.resolve();
  return ExpoHaptics.notificationAsync(type);
}
