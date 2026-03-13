/**
 * Centralised color constants for quests4life.
 *
 * Usage:
 *   import { Colors } from '@lib/colors';
 *   style={{ color: Colors.primary }}
 *
 * These are the light-mode palette values. Dark mode support (P2-A) will extend
 * this to a useColors() hook that switches based on the current theme setting.
 */
export const Colors = {
  // Brand
  primary:        '#0ea5e9',   // sky-500 — main accent
  primaryLight:   '#bae6fd',   // sky-200
  primaryDark:    '#0369a1',   // sky-700
  primaryBg:      '#f0f9ff',   // sky-50

  // Semantic
  success:        '#22c55e',   // green-500
  successLight:   '#dcfce7',   // green-100
  successDark:    '#16a34a',   // green-600

  warning:        '#f59e0b',   // amber-500
  warningLight:   '#fef9c3',   // yellow-100
  warningDark:    '#d97706',   // amber-600

  danger:         '#ef4444',   // red-500
  dangerLight:    '#fee2e2',   // red-100
  dangerDark:     '#dc2626',   // red-600

  purple:         '#8b5cf6',   // violet-500

  // Neutrals
  text:           '#0f172a',   // slate-900
  textSecondary:  '#64748b',   // slate-500
  textMuted:      '#94a3b8',   // slate-400
  textDisabled:   '#cbd5e1',   // slate-300

  border:         '#e2e8f0',   // slate-200
  borderLight:    '#f1f5f9',   // slate-100

  bgCard:         '#ffffff',
  bgPage:         '#f8fafc',   // slate-50
  bgInput:        '#f8fafc',

  // Overlay
  overlay:        'rgba(0,0,0,0.4)',
} as const;

export type ColorKey = keyof typeof Colors;
