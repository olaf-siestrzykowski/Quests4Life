import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@store/settingsStore';

export const lightColors = {
  primary:       '#0ea5e9',
  primaryLight:  '#bae6fd',
  primaryDark:   '#0369a1',
  primaryBg:     '#f0f9ff',

  success:       '#22c55e',
  successLight:  '#dcfce7',
  successDark:   '#16a34a',

  warning:       '#f59e0b',
  warningLight:  '#fef9c3',
  warningDark:   '#d97706',

  danger:        '#ef4444',
  dangerLight:   '#fee2e2',
  dangerDark:    '#dc2626',

  purple:        '#8b5cf6',

  text:          '#1e293b',
  textDim:       '#0f172a',
  textSecondary: '#64748b',
  textMuted:     '#94a3b8',
  textDisabled:  '#cbd5e1',

  border:        '#e2e8f0',
  borderLight:   '#f1f5f9',

  bgCard:        '#ffffff',
  bgPage:        '#f8fafc',
  bgInput:       '#f8fafc',

  overlay:       'rgba(0,0,0,0.4)',
} as const;

export const darkColors = {
  primary:       '#0ea5e9',
  primaryLight:  '#0369a1',
  primaryDark:   '#7dd3fc',
  primaryBg:     '#0c2a3a',

  success:       '#4ade80',
  successLight:  '#052e16',
  successDark:   '#86efac',

  warning:       '#fbbf24',
  warningLight:  '#1c1400',
  warningDark:   '#fde68a',

  danger:        '#f87171',
  dangerLight:   '#1f0000',
  dangerDark:    '#fca5a5',

  purple:        '#a78bfa',

  text:          '#e2e8f0',
  textDim:       '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted:     '#64748b',
  textDisabled:  '#475569',

  border:        '#334155',
  borderLight:   '#1e293b',

  bgCard:        '#1e293b',
  bgPage:        '#0f172a',
  bgInput:       '#334155',

  overlay:       'rgba(0,0,0,0.6)',
} as const;

// Kept for backward compatibility (light palette)
export const Colors = lightColors;
export type ColorKey = keyof typeof lightColors;
export type AppColors = typeof lightColors;

export function useColors(): AppColors {
  const scheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const isDark = themeMode === 'dark' || (themeMode === 'system' && scheme === 'dark');
  return isDark ? darkColors : lightColors;
}
