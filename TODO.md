# quests4life — Development Roadmap
> Last updated: 2026-10-04. Open items verified against the live codebase; completed work is logged at the bottom.

---

## 🔜 NEXT UP

### Rewards expansion (remainder)
**Files**: `app/(tabs)/rewards.tsx`, `app/new-reward.tsx`, `app/reward/[id].tsx`
- Reward image (`rewards.imageUri` exists in schema, never rendered/input) — needs `expo-image-picker` (not installed); 56×56 thumbnail, gift placeholder
- Animated "unlock" moment when balance crosses a reward's threshold (currently: static "Ready to redeem" state + "Next unlock" hint)

### P4-J: Unit tests for remaining stores
- ✅ `pointsStore` (19), ✅ `rewardsStore` (11), ✅ `recurrence.ts` (54)
- Still missing: `taskStore` (completeTask, uncompleteTask, archiveTask, goal bonus flow, getTaskStreak), `categoryStore`

### P4-K: Accessibility (a11y) pass
**Files**: all screen and component files (currently zero `accessibilityLabel`s)
- `accessibilityLabel` / `accessibilityRole` / `accessibilityHint` on all touchables
- `testID` on interactive elements for E2E support
- `accessibilityLiveRegion="polite"` on point balance
- Contrast audit for both light and dark palettes in `src/lib/colors.ts` (e.g. `#f59e0b` on white = 3.06:1, fails AA)

---

## Bugs

### B5. Pre-existing typecheck errors from dark mode (a2b5b19)
- `src/lib/colors.ts:85` — `darkColors` typed as `typeof lightColors`, but `as const` makes every hex a literal type. Type palettes as `Record<ColorKey, string>` (or drop `as const`).
- `app/goal/[id].tsx:64-65` — same root cause.

### B6. `npm run lint` broken
- ESLint 9 is installed but config is `.eslintrc.json`; needs migration to `eslint.config.js` (flat config).

### B3. Goals screen — archived count / empty state
- "0 active goals" should also surface the archived count with a "show archived" link.

### B4. Web proxy — broad worker URL match
- `isWorkerRequest` check (`url.includes('expo-sqlite') && url.includes('worker')`) is broad. Safe as-is, but document it in `web-proxy.mjs`.

---

## Open — Settings & preferences

### P2-B: Accent color picker
- `accentColor` setting (default `#0ea5e9`), row of 8 preset swatches in Settings
- Feed into `useColors()` so `C.primary` follows the accent

### P2-C: Week start day preference
- `weekStartsOn: 0 | 1` setting (default 1). Currently hardcoded `{ weekStartsOn: 1 }` in `index.tsx`, `goals.tsx`, `stats.tsx`, `weekly-review.tsx`, `goal/[id].tsx`, `MonthCalendar.tsx`
- MonthCalendar weekday headers must follow the setting

### P2-F (remainder): Notification quiet hours + custom title/body

### EX-P2: Category icon support
- `categories.icon` exists but is always set to `'tag'` and never displayed
- Emoji picker in the Settings category editor; show icon on TaskCard / GoalCard

### EX-P4: Settings — category statistics
- Each category row shows "X tasks · Y goals"

---

## Open — Task & goal UX

### New Task / New Goal refinements
- Icon/emoji and accent color for goals (`tasks.icon`, `tasks.accentColor` — schema change)
- Live recurrence preview: "Next due: tomorrow" / next 3 due dates

### P4-D: Reversible "Weekdays only" shortcut
- "Weekdays only →" in Daily switches to weekly Mon–Fri; add a way back to Daily that preserves intent

### P2-P (remainder): "Move to goal" in task long-press menu
- Menu currently has Edit / Duplicate / Archive

### EX-P2: Search tasks and goals
- Header search icon → inline input; filter loaded arrays by title/description (Today + Goals)

### EX-P2: Category filter chips on Goals and Today screens

### EX-P2: Goal list reordering
- "Reorder" toggle on Goals screen with ▲/▼ — `taskStore.reorderTask()` already works for goals

### EX-P2: Undo last action
- Snackbar "Task completed · Undo" (4s); reverses via `uncompleteTask()` + negative ledger entry
- Same for archive via `unarchiveTask()` (already exists)

### EX-P2: Skip this occurrence / Postpone to tomorrow
- New table `skipped_dates (id, taskId, skippedDate)`; `dueDatesInRange` excludes skipped dates
- Skips don't break streaks or count against completion rate
- Postpone: `once` → move date; recurring → skip today
- Long-press menu entries + faint "—" in MonthCalendar

### EX-P3: Past-due / missed task handling
- Collapsible "Overdue" section on Today: tasks due in the last 7 days with no completion/skip
- "Done back then" (backdated `completeTask`) + "Skip"

### EX-P3: Bulk actions on Today screen
- Multi-select mode → Complete / Skip / Archive selected; "Complete all today" in header menu

### EX-P3: Per-task custom reminder
- `tasks.reminderTime TEXT NULL` ("HH:MM"); notification id `task-reminder-{taskId}`; cancel on archive

### EX-P3: Completion notes (journal)
- `completions.note TEXT NULL`; long-press completed checkbox → add note; show in task detail

### EX-P3: First-run onboarding
- 3-screen flow (Welcome / How it works / seed example data), `appSettings.onboarding_complete`

### EX-P3: Point milestone celebrations
- All-time milestones 100/500/1k/5k/10k; track in `appSettings.celebratedMilestones`; confetti toast

### EX-P3: "Point economy" hint in new-task form
- "Your average task earns X pts · Rewards start at Y pts" (only with ≥3 tasks and ≥1 reward)

### EX-P4: Task detail history
- Per-task streak, best streak, 35-day completion grid, total completions (`getTaskStreak` exists)

### EX-P4: Long-running goal history
- Last 8 weeks / 6 months per goal: progress bar + ★ if bonus earned — `taskStore.goalPeriodHistory()`

### EX-P4: Deep links
- `app.json` already has `scheme: "habitual"`; add "Copy link" to task/goal menus

### EX-P4: Date/time localization groundwork
- Replace hardcoded English month/day names with `Intl.DateTimeFormat`

---

## Open — Stats

### P3-O: Task-level analytics
- Completion rate panel (done / due) for today / week / month
- Top 5 most-completed tasks leaderboard (tap → task detail)
- Heatmap intensity (4-shade scale instead of binary)
- Points breakdown by source (`pointsStore.pointsByReason(from, to)`)
- Consistency score 0–100 with trend vs prior 30 days
- Week-over-week delta badges on stat pills

### P3-P (remainder): Goal analytics
- ✅ Goals at a glance done
- Goal completion rate over last 8 weeks, most consistent goals, goal streaks, bonus points per goal

### P3-Q (remainder): Category / project drilldown
- ✅ Top-5 category chart done
- Expandable per-category cards, cross-category comparison, time-invested placeholder

### P3-S: Store queries to support the above
- `taskStore.completionRate`, `topTasksByCompletions`, `statsPerCategory`
- `pointsStore.pointsByReason`, `goalBonusByWeek`, `goalBonusForGoal`

---

## Open — Platform

### Web — persistent DB between reloads
- expo-sqlite on web uses in-memory WASM — data lost on refresh. Research OPFS/IndexedDB backend.
- Must be solved before shipping to web users.

---

## P5 — Future / research
- **Cloud sync**: expo-sqlite + PowerSync / rxdb → Supabase
- **iOS widget**: "tasks today" home screen widget
- **App icon badge**: badge count = incomplete today tasks
- **Calendar export**: `expo-calendar`
- **Pomodoro timer**: `app/timer.tsx`, logs time per task/category
- **Markdown task notes**
- **Keyboard shortcuts (web)**: ⌘K add task, ⌘F search
- **Import from CSV**
- **Share my week**: PNG stats card via `react-native-view-shot`

---

## Schema changes still pending

| Change | Reason |
|--------|--------|
| `tasks.icon` text nullable | Goal icon/emoji |
| `tasks.accentColor` text nullable | Goal color |
| `skipped_dates` table `(id, taskId, skippedDate)` | Skip / postpone occurrence |
| `completions.note TEXT NULL` | Completion notes |
| `tasks.reminderTime TEXT NULL` | Per-task reminder |
| `accentColor`, `weekStartsOn` in appSettings | P2-B, P2-C (no migration — key/value) |

---

## Dev workflow

```bash
# Terminal 1
npm run web          # Metro on :8081

# Terminal 2
npm run web:proxy    # Proxy on :8088 (adds COOP/COEP + patches expo-sqlite worker bug)

# Browser
open http://localhost:8088

# Physical device (Expo Go)
npx expo start --tunnel --clear
```

> The expo-sqlite web worker has a bug (Uint8Array length truncated to low byte for results >255 bytes).
> It is patched at runtime by `web-proxy.mjs`. If expo-sqlite is upgraded, re-test: if the "[proxy] WARNING: patch not found" log appears, find the new minified form of `resultArray.set(new Uint32Array([length]), 0)` in the bundle and update `web-proxy.mjs`.

### Verification after any batch

```bash
npm run typecheck    # Zero type errors
npm run lint         # Zero lint errors
npx jest             # All tests pass
```

For each new feature: exercise the happy path + at least one edge case.

---

## ✅ Completed log

**2026-03-12**
- Screen.tsx max-width shell (modals 03-13) · MonthCalendar week/month toggle · Goal period progress ("X/Y this week", days left)
- ScheduleRulePicker: weekdays-only shortcut, start date for recurring rules · B2 duplicate day labels
- Haptics web shim · memoized `dueDatesInRange` · DB-based goal bonus guard · category cascade delete · `deserializeRule` validation
- Pull to refresh · `duplicateTask` · jump-to-today on focus · TaskCard schedule summary, category color bar, past-day styling
- ErrorBoundary · keyboard-avoiding forms · AppState foreground refresh · midnight rollover

**2026-03-13**
- Goal detail period stats + weekly heatmap · B1 uncomplete `forDate` · Stats charts (14-day points, day-of-week, 30-day calendar)
- Settings: haptics toggle, default point value, test notification + permission badge, JSON export, reset data, About
- Difficulty levels (×0.5/×1/×2) · streak multiplier · per-task streak badge · achievements (11 + toast + screen) · combo bonus
- Inbox quick-capture · Focus mode · goal templates · goal completion celebration · show-archived toggle
- Stats: monthly summary + trends, personal bests, top-5 category chart · ESLint + Prettier · `colors.ts`
- Task edit screen (`app/task/[id].tsx`) · long-press menu (Edit / Duplicate / Archive) · skeleton loading cards
- Persisted sort + view modes (list / compact / by-category SectionList) · SwipeableRow (swipe-left = complete) · Weekly Review screen · Goals at a glance

**2026-09-25**
- Full dark mode: light/dark palettes, `useColors()`, theme picker (light/system/dark)
- `weekly_count` rule (N×/week) · `monthly_nth_weekday` rule · `tasks.scheduleEndDate` (migration 0004)
- Jest setup + 54 recurrence tests · 19 pointsStore tests

**2026-10-04**
- TODO.md cleanup (verified against code)
- Rewards expansion: progress bars, persisted sort (affordable / cheapest / priciest / newest), "Next unlock" hint, edit screen `app/reward/[id].tsx` + `rewardsStore.updateReward`, long-press Edit/Remove, Shop/History tabs with redemption history (archived reward names kept via `archivedRewards`)
- 11 rewardsStore tests
