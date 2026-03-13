# quests4life — Development Roadmap
> Last updated: 2026-03-12. All items reviewed against live codebase.

---

## PRIORITY 1 — Core UX improvements (next session)

### 1. ✅ Responsive / device-size container — DONE 2026-03-12 (modals: 2026-03-13)
**Problem**: On web/tablet the layout stretches full-width — looks broken.
**Fix**: Wrap the root in a max-width centered shell.
- Add a `<View style={{ maxWidth: 430, width: '100%', alignSelf: 'center', flex: 1 }}>` wrapper at the `Stack` level in `app/_layout.tsx` and in the SafeAreaView of each tab.
- 430px = iPhone 16 Pro Max width. On web this gives a phone-frame feel.
- Apply to: `app/(tabs)/index.tsx`, `goals.tsx`, `rewards.tsx`, `stats.tsx`, `settings.tsx`, and all modals.
- Consider a `src/components/Screen.tsx` wrapper component that applies this + safe area, so it's not duplicated everywhere.

### 2. ✅ Today screen — Month calendar view toggle — DONE 2026-03-12
**Problem**: Only week strip visible; no way to see monthly overview.
**Files**: `app/(tabs)/index.tsx`
**Plan**:
- Add `viewMode: 'week' | 'month'` state (default `'week'`).
- A small calendar icon button in the header toggles between modes.
- **Week mode** (current): 7-day strip + prev/next arrows.
- **Month mode**: Full grid calendar (6 rows × 7 cols), show a dot/indicator on days with tasks due, highlight today, highlight selected, allow tap to select date.
- Keep all the existing logic (selectedDate, historicIds, etc.) — only the date picker UI changes.
- Month navigation: prev/next month arrows + display "March 2026".
- Dots on month cells: compute if any task is due that day using `dueDatesInRange` (already imported).
- Implementation: a new `MonthCalendar` component in `src/components/MonthCalendar.tsx`.

### 3. ✅ Goals screen — Weekly / monthly progress context — DONE 2026-03-12
**Problem**: Goals show `completedTodayIds` only — no sense of weekly/monthly cycle progress.
**Files**: `app/(tabs)/goals.tsx`, `src/components/GoalCard.tsx`, `app/goal/[id].tsx`
**Plan**:
- For each goal, compute "period completions" based on its `scheduleRule`:
  - `weekly` goal: count completions for each child task within the current Mon–Sun week.
  - `monthly` goal: count completions within the current calendar month.
  - `daily` goal: current day (existing behaviour).
- Pass `periodCompletionMap: Map<taskId, number>` to `GoalCard` and `GoalDetailScreen`.
- Show progress as "X/Y this week" or "X/Y this month" below the card title.
- Add a small time-remaining badge: "3 days left" for weekly, "19 days left" for monthly.
- This requires a new store method: `taskStore.completionsForPeriod(taskIds, from, to): Promise<Map<taskId, count>>`.
- Fetch in `GoalsScreen` via `useEffect` on mount.

### ✅ 4. Goal detail — Period progress — DONE 2026-03-13
- Period stats card shows completions count "this week" or "this month"
- Weekly heatmap strip (Mon–Sun cells: green=all, light=partial, gray=none/future)
- Bug B1 fixed: uncompleteTask now passes explicit forDate

---

## PRIORITY 2 — Advanced recurrence conditioning

### 5. ScheduleRulePicker improvements
**Files**: `src/components/ScheduleRulePicker.tsx`, `src/lib/recurrence.ts`

**5a. ✅ Weekdays-only shortcut** — DONE 2026-03-12 (Daily → "Weekdays only →" button switches to weekly Mon-Fri)

**5a2. Weekly — "X times per week" mode**
- Currently: pick specific days of week.
- Add: toggle between "specific days" (current) and "X times per week" (any X days).
- New rule type: `{ type: 'weekly_count'; timesPerWeek: number; startDate: string }`.
- Logic: task is due if completionCount(this week) < timesPerWeek.
- Update `dueDatesInRange` and `nextDueDate` to support this — it's satisfied on any day of the week until quota reached.

**5b. Monthly — "Nth weekday" option**
- Currently: only "day of month" (1–31).
- Add dropdown/picker for: "1st Monday", "last Friday", "2nd Wednesday", etc.
- New rule field: `{ type: 'monthly'; mode: 'day' | 'nth_weekday'; dayOfMonth?: number; nth?: number; weekday?: number; startDate: string }`.

**5c. ✅ Start date for recurring rules — DONE 2026-03-12**
- ‹ date › navigator now shown under all recurring rules (daily/weekly/monthly/custom).

**5d. End date / occurrences limit**
- Optional field: `endDate?: string` on any rule.
- `dueDatesInRange` already handles this naturally (just stop at endDate).
- Show in picker as "No end" (default) or "Ends on [date]".

**5e. "Weekdays only" shortcut**
- A single toggle on Daily rule: "Skip weekends".
- Internally stores as `{ type: 'weekly', daysOfWeek: [1,2,3,4,5], startDate }`.

---

## PRIORITY 3 — Task views & UI polish

### 6. Today screen — alternate task views
**Files**: `app/(tabs)/index.tsx`
- Add a view toggle button in header: list (current) / grouped-by-category / compact.
- **Grouped view**: tasks grouped under category color headers. Uses existing `categoryId`.
- **Compact view**: smaller card with just checkbox + title (no description/points preview). Good for many tasks.
- Persist preference in `appSettings` so it survives reload.

### 7. TaskCard improvements
**Files**: `src/components/TaskCard.tsx`
- Show category color dot on left edge of card.
- Show schedule summary below title: "Daily" / "Mon, Wed, Fri" / "Every 3 days".
- Show point value badge top-right (currently shown but could be more prominent).
- For readonly past-day cards: subtle gray overlay + strikethrough on completed ones.

### 8. New Task / New Goal — UI refinements
**Files**: `app/new-task.tsx`, `app/new-goal.tsx`
- Add icon/emoji picker for goals (stored in a new `icon` field on tasks, or use title emoji).
- Add color accent picker for goals.
- Show live preview of recurrence: "Next due: tomorrow" / "Next 3 due dates: Mon, Tue, Wed".

### ✅ 9. Stats screen — actual charts — DONE 2026-03-13
- 14-day points earned bar chart (pure Views)
- Completions by day of week 7-bar chart
- 30-day streak calendar grid

### 10. Rewards screen improvements
**Files**: `app/(tabs)/rewards.tsx`, `app/new-reward.tsx`
- Show progress bar on each reward card: `(balance / pointCost) * 100%`.
- "Unlock" animation when balance crosses threshold.
- Sort by: affordable first / cheapest first / most recently added.
- Redeem history tab (show past redemptions from ledger).

---

## PRIORITY 4 — Quality of life

### 11. Task edit (parity with goal edit)
**Files**: `app/task/[id].tsx`
- Currently task detail shows info but no inline edit.
- Add Edit button + inline form (same pattern as `goal/[id].tsx` edit mode).

### ✅ 12. Haptics on web (P1-A) — DONE 2026-03-12 (no-op shim)
**Problem**: `expo-haptics` crashes silently on web, produces console warning.
**Fix**: Wrap all haptics calls in `if (Platform.OS !== 'web')` guards, or create a `src/lib/haptics.ts` shim that no-ops on web.

### 13. Web — persistent DB between reloads
**Problem**: expo-sqlite on web uses an in-memory WASM DB — data is lost on page refresh (needs OPFS or IndexedDB backend).
**Fix**: Research expo-sqlite OPFS support in v16. May need `SQLite.openDatabaseAsync('habitual.db', { useNewConnection: true })` with OPFS flag, or a localStorage-based migration seed.
**Note**: This is a known expo-sqlite web limitation as of SDK 54.

### ✅ 14. "Jump to today" auto-scroll
**Files**: `app/(tabs)/index.tsx`
- When navigating back to Today tab from another tab, if selected date ≠ today, auto-jump back to today.
- Use `useFocusEffect` from expo-router.

---

## Bugs to fix

### ✅ B1. Goal detail — uncomplete task missing `forDate` — FIXED 2026-03-13

### ✅ B2. Weekly rule — duplicate day labels — FIXED 2026-03-12

### B3. Goals screen — no "Add first goal" prompt from FAB when filtering archived
- Minor: FAB shows even when user already has goals — fine. But the "0 active goals" count should maybe also show archived count with a "show archived" link.

### B4. Web proxy — patch warning for non-worker expo-sqlite URLs
- The `isWorkerRequest` check is broad (`url.includes('expo-sqlite') && url.includes('worker')`). Safe as-is, but document it.

---

## Schema changes needed (will require `npm run db:generate` + migration)

| Change | Reason | Priority |
|--------|--------|----------|
| `tasks.icon` text nullable | Goal icon/emoji | P3 |
| `tasks.accentColor` text nullable | Goal color | P3 |
| `tasks.scheduleEndDate` text nullable | End date for rules | P2 |
| New rule type `weekly_count` | X-times-per-week | P2 |

---

## Architecture notes for next sessions

- **Max-width shell**: Create `src/components/Screen.tsx` — single place to manage max-width + safe area. All screens use it.
- **Period completions**: Add `taskStore.completionsInRange(taskIds, from, to)` that queries `completions` table with `WHERE task_id IN (?) AND for_date BETWEEN ? AND ?`.
- **`dueDatesInRange` performance**: Currently called per task on every render. Memoize with `useMemo` keyed on `[tasks, selectedDate]`.
- **Stats screen data**: Add `pointsStore.ledgerInRange(from, to)` and `taskStore.completionStats(days)` convenience queries.
- **Web-specific**: The OPFS fix (item 13) should be attempted before shipping to web users. Without it, all data is lost on refresh.

---

## Dev workflow reminder

```bash
# Terminal 1
npm run web          # Metro on :8081

# Terminal 2
npm run web:proxy    # Proxy on :8088 (adds COOP/COEP + patches expo-sqlite worker bug)

# Browser
open http://localhost:8088

# Physical device (Expo Go)
npx expo start --tunnel --clear
# scan QR with Expo Go
```

> The expo-sqlite web worker has a bug (Uint8Array length truncated to low byte for results >255 bytes).
> It is patched at runtime by `web-proxy.mjs`. If expo-sqlite is upgraded, re-test: if the "[proxy] WARNING: patch not found" log appears, find the new minified form of `resultArray.set(new Uint32Array([length]), 0)` in the bundle and update `web-proxy.mjs`.

---

## EXPANSION — Comprehensive improvements (added 2026-03-12)

> Items below are organised by priority tier. P1 = no schema changes, quick wins. P2 = medium effort.
> P3 = new screens / features. P4 = advanced recurrence + tech debt. P5 = future / research only.

---

### ✅ P1-A: Web platform guards (haptics + notifications) — DONE 2026-03-12
**Files**: any file calling `Haptics.*` (`index.tsx`, `rewards.tsx`, `goal/[id].tsx`, `task/[id].tsx`)
- Create `src/lib/haptics.ts` shim: exports same API as `expo-haptics` but no-ops on `Platform.OS === 'web'`
- Replace all direct `expo-haptics` imports with the shim
- Add `Platform.OS !== 'web'` guard in `app/_layout.tsx` before scheduling notifications

### ✅ P1-B: Performance — memoize `dueDatesInRange` — DONE 2026-03-12
**File**: `app/(tabs)/index.tsx`
- Wrap the per-task `dueDatesInRange` calls in `useMemo([tasks, selectedDate.toString()])` so they don't recompute on every render

### ✅ P1-C: Performance — fix O(n) goal bonus guard — DONE 2026-03-12
**File**: `src/store/pointsStore.ts`, `wasGoalBonusGrantedToday()`
- Currently iterates entire `history` array. Replace with a targeted DB query:
  `WHERE reason='goal_bonus' AND task_id=? AND created_at LIKE 'YYYY-MM-DD%'`
- Add new `checkGoalBonusToday(goalId)` that queries DB instead of scanning store state

### ✅ P1-D: Category cascade delete — DONE 2026-03-12
**File**: `src/store/categoryStore.ts` `removeCategory()`
- Before hard-deleting, run: `UPDATE tasks SET category_id = NULL WHERE category_id = ?`
- Prevents orphaned task rows with missing foreign key

### ✅ P1-E: `deserializeRule` validation — DONE 2026-03-12
**File**: `src/lib/recurrence.ts`
- Wrap `JSON.parse` in `deserializeRule` with a type-guard that verifies required fields per rule type
- Return a sensible default (daily) on parse failure instead of crashing

---

### P2-A: Dark mode
**Files**: `app/(tabs)/settings.tsx`, `src/store/settingsStore.ts`, `app.json`, `tailwind.config.js`
- Add `themeMode: 'light' | 'dark' | 'system'` setting to store + DB
- Use `useColorScheme()` from `react-native` when mode = 'system'
- Create `src/lib/colors.ts` with a `useColors()` hook returning the current palette
- Update `tailwind.config.js` to add `darkMode: 'class'` and dark variants
- Replace all hardcoded `#0f172a`, `#0ea5e9`, etc. with `colors.primary` etc.
- `app.json`: change `"userInterfaceStyle": "light"` → `"automatic"`
- Settings UI: 3-way toggle (Light / Dark / System)

### P2-B: Accent color picker
**Files**: `app/(tabs)/settings.tsx`, `src/store/settingsStore.ts`
- Add `accentColor: string` setting (default `#0ea5e9`)
- Settings UI: row of 8 preset color swatches (blue, indigo, violet, emerald, rose, amber, orange, cyan)
- Pass `accentColor` via context or hook; replace hardcoded `#0ea5e9` throughout

### P2-C: Week start day preference
**Files**: `app/(tabs)/settings.tsx`, `src/store/settingsStore.ts`, `app/(tabs)/index.tsx`, `src/components/MonthCalendar.tsx`, `app/goal/[id].tsx`
- Add `weekStartsOn: 0 | 1` (Sun/Mon, default 1)
- Pass to all `startOfWeek(..., { weekStartsOn })` calls
- Update MonthCalendar weekday headers accordingly

### ✅ P2-D: Haptics toggle — DONE 2026-03-13
**Files**: `app/(tabs)/settings.tsx`, `src/store/settingsStore.ts`, `src/lib/haptics.ts`
- Add `hapticsEnabled: boolean` setting (default true)
- `haptics.ts` shim checks both `Platform.OS !== 'web'` AND setting

### ✅ P2-E: Default task point value — DONE 2026-03-13
**Files**: `app/(tabs)/settings.tsx`, `src/store/settingsStore.ts`, `app/new-task.tsx`
- Add `defaultPointValue: number` setting (default 10)
- New-task form initialises `pointValue` from this setting instead of hardcoding 10

### ✅ P2-F: Notification enhancements — DONE 2026-03-13 (test button + permission badge; quiet hours deferred)
**Files**: `app/(tabs)/settings.tsx`, `src/lib/notifications.ts`, `src/store/settingsStore.ts`
- **Test notification button**: "Send test now" fires a notification immediately using `scheduleNotificationAsync` with `seconds: 1` trigger
- **Quiet hours**: Add `quietStartHour` / `quietEndHour` settings; notifications check if current time is in quiet window before scheduling
- **Notification title/body customisation**: Text inputs in settings for custom title/body (stored in appSettings)
- **Permission state indicator**: Show "Granted / Denied / Not asked" badge next to toggle; if denied, show "Open Settings →" button
- **Hot reload fix**: Call `scheduleDailyReminder(hour, minute)` immediately in `handleSave` — currently requires cold restart to take effect

### ✅ P2-G: Export / backup — DONE 2026-03-13 (JSON export via Share API; web logs to console)
**Files**: `app/(tabs)/settings.tsx`
- Add "Export data" button in settings (new section "Data")
- Generates a JSON blob: `{ tasks, completions, points, rewards, categories }` pulled from DB
- On mobile: uses `expo-sharing` to share the JSON file
- On web: triggers a browser download

### ✅ P2-H: Reset / clear data — DONE 2026-03-13 (2-step confirmation, deletes all rows)
**Files**: `app/(tabs)/settings.tsx`
- Add "Reset all data" button (destructive, red) with 2-step confirmation
- Drops and recreates all tables via migrations re-run
- Confirm: "Type RESET to confirm" text input modal

### ✅ P2-I: About / version screen — DONE 2026-03-13
**Files**: `app/(tabs)/settings.tsx`
- Add "About" row at bottom of settings showing: app name, version from `package.json`, build date
- Tap → inline expansion with attribution, open-source notice

### ✅ P2-J: Difficulty levels on tasks — DONE 2026-03-13 (schema + picker + ×0.5/×1/×2 multiplier)
**Files**: `src/db/schema.ts`, `app/new-task.tsx`, `app/task/[id].tsx`, `src/store/taskStore.ts`
- Add `difficulty: 'easy' | 'normal' | 'hard'` field (nullable, default 'normal')
- Multipliers: easy = 0.5×, normal = 1×, hard = 2× of base `pointValue`
- Point calculation at completion time uses effective value = `pointValue * multiplierForDifficulty`
- Task card shows small pill "EASY / HARD" if not normal
- New/edit task form: 3 button selector under points picker

### ✅ P2-K: Streak multiplier (opt-in) — DONE 2026-03-13 (+10/20/30% on 3/7/14-day streaks)
**Files**: `src/store/pointsStore.ts`, `app/(tabs)/index.tsx`, `src/store/settingsStore.ts`
- Add `streakBonusEnabled: boolean` setting (default false, opt-in)
- If enabled: streak length (consecutive days with ≥1 completion) earns bonus % on each task
  - Streak 3–6: +10%, 7–13: +20%, 14+: +30%
- Multiplier applied when `addPoints` is called with `reason='task_complete'`
- Show multiplier badge in Today header when active (e.g., "🔥 +20%")

### ✅ P2-L: Per-task streak tracking — DONE 2026-03-13 (getTaskStreak + streak prop on TaskCard)
**Files**: `src/store/taskStore.ts`, `src/db/schema.ts`
- No new table needed: compute from `completions WHERE task_id = ? ORDER BY for_date DESC`
- Add `taskStore.getTaskStreak(taskId)` that counts consecutive days ending today
- Show streak badge on TaskCard: "🔥 N" if streak >= 2
- Show full per-task streak in `app/task/[id].tsx`

### ✅ P2-M: Achievements / badges — DONE 2026-03-13 (11 achievements, toast, screen, stats integration)
**Files**: `src/db/schema.ts`, new `src/store/achievementsStore.ts`, new `src/components/AchievementToast.tsx`, `app/(tabs)/stats.tsx`
- New `achievements` table: `(id, key, unlockedAt, seen)`
- Achievement keys + unlock conditions:
  - `first_task` — complete first task ever
  - `streak_7` — 7-day streak
  - `streak_30` — 30-day streak
  - `tasks_100` — 100 total completions
  - `tasks_500` — 500 total completions
  - `goal_crusher` — complete a full goal bonus 10 times
  - `high_roller` — accumulate 1000 lifetime points
  - `collector` — create 10 goals
  - `category_organiser` — assign categories to 20+ tasks
- `AchievementToast` — small overlay toast from the top (animated, auto-dismiss 3s)
- Check achievements in `taskStore.completeTask` + `rewardsStore.redeemReward` after each mutation
- Stats screen: new "Achievements" section at top showing earned badges as emoji grid

### ✅ P2-N: Combo bonus — DONE 2026-03-13 (3/5/10 in a row: +5/10/25 pts)
**Files**: `src/store/pointsStore.ts`, `app/(tabs)/index.tsx`
- If user completes N tasks in a row without any other action (within same session):
  - 3 in a row: +5 pts "Combo!" toast
  - 5 in a row: +10 pts "Super combo!" toast
  - 10 in a row: +25 pts "Unstoppable!" toast
- Track combo count in transient session state (not persisted, resets on app restart)

### P2-O: Swipe actions on task cards
**Files**: `src/components/TaskCard.tsx`
- Swipe-left → complete (green), swipe-right → skip/archive (red)
- Use `react-native-gesture-handler` (already installed as expo dep) + `Animated`
- Show colored background with icon as card slides
- iOS: matches system swipe pattern; Android: same but with ripple

### P2-P: Long-press context menu on task cards
**Files**: `src/components/TaskCard.tsx`
- Long press → bottom sheet with: Edit, Duplicate, Archive, Move to Goal (if standalone task)
- Use `Alert.alert` action sheet as simple implementation (no extra dep)

### ✅ P2-R: Pull to refresh — DONE 2026-03-12
**Files**: `app/(tabs)/index.tsx`, `app/(tabs)/goals.tsx`, `app/(tabs)/rewards.tsx`
- Add `refreshControl` prop on FlatList / ScrollView
- On refresh: re-run `taskStore.load()` + relevant store loads

### ✅ P2-S: Task duplication — DONE 2026-03-12
**Files**: `src/store/taskStore.ts`, context menu (P2-P)
- Add `duplicateTask(id)` action: copies title, description, category, scheduleRule, pointValue; resets completions; inserts with new ID
- Available from long-press context menu

---

### ✅ P3-A: Inbox / Quick-capture — DONE 2026-03-13 (app/inbox.tsx, 📥 FAB on Today)
**Files**: new `app/inbox.tsx`, `app/(tabs)/_layout.tsx`
- A 5th (or modal) screen accessible from a global FAB or tab
- Ultra-minimal form: title + optional notes, no schedule/category required
- Tasks land in an "Inbox" state (`scheduleRule = null`) and appear on Today screen under "Inbox" section
- User can promote them: tap → assign schedule/category
- Inspired by GTD capture workflow

### P3-B: Weekly Review screen
**Files**: new `app/weekly-review.tsx`, `app/(tabs)/stats.tsx`
- Accessible from Stats tab as "Review this week →" button
- Shows: completion rate, goals progress, points earned vs last week (% change), streak status
- "What went well?" / "What to improve?" — free text notes stored in appSettings with date key
- Read-only summary, no actions

### ✅ P3-C: Focus mode — DONE 2026-03-13 (app/focus.tsx, one-task-at-a-time full screen)
**Files**: new `app/focus.tsx`, FAB long-press in Today
- Show ONE task at a time (highest priority or next due)
- Full-screen card: task name, description, point value, schedule
- Big "Done" button + "Skip" button
- Progress indicator at top showing how many tasks remain

### ✅ P3-D: Achievements screen — DONE 2026-03-13 (app/achievements.tsx + stats link)
**Files**: new `app/achievements.tsx`, link from `app/(tabs)/stats.tsx`
- Grid of all achievement badges (locked = gray, unlocked = colored)
- Each tappable to see name + unlock condition + date earned
- Link: "Achievements →" in Stats header

### P3-E: Task list grouping views
**Files**: `app/(tabs)/index.tsx`
- Add view toggle in header: List (current) / By Category / Compact
- **By Category**: tasks grouped under colored category headers (SectionList with sticky headers)
- **Compact**: TaskCard renders only checkbox + title — 36px height vs 72px
- Persist preference in `appSettings` key `todayViewMode`

### P3-F: Sort options for Today tasks
**Files**: `app/(tabs)/index.tsx`
- Sort menu (gear icon in header): "By Schedule" (default) / "By Points (desc)" / "Alphabetical" / "By Category"
- Persist preference in `appSettings` key `todayTaskSort`

### ✅ P3-G: "Jump to today" on tab focus — DONE 2026-03-12
**Files**: `app/(tabs)/index.tsx`
- Use `useFocusEffect` from `expo-router`
- If `selectedDate !== today`, automatically snap back to today when user switches to Today tab

### ✅ P3-H: Task card schedule summary — DONE 2026-03-12
**Files**: `src/components/TaskCard.tsx`, `src/lib/recurrence.ts`
- Add 1-line schedule description below title: "Daily · starts Mar 1" / "Mon, Wed, Fri" / "Every 3 days"
- Add `formatRuleSummary(rule): string` utility in `src/lib/recurrence.ts`

### ✅ P3-I: Category color bar on task card — DONE 2026-03-12
**Files**: `src/components/TaskCard.tsx`
- Add a 4px wide vertical color bar on the left edge of each card (like Gmail categories)
- If task has no category: bar is transparent / #e2e8f0

### ✅ P3-J: Past-day card visual treatment — DONE 2026-03-12
**Files**: `src/components/TaskCard.tsx`, `app/(tabs)/index.tsx`
- When `readonly=true` (past/future date): card background becomes #f8fafc (slightly muted)
- Completed + readonly: title gets strikethrough + reduced opacity
- Subtle lock icon in top-right of readonly cards

### ✅ P3-K: Goal completion celebration state — DONE 2026-03-13 (green border + pulse checkmark)
**Files**: `src/components/GoalCard.tsx`
- When `done === childTasks.length && childTasks.length > 0`: card border turns green, checkmark icon appears top-right
- Pulse animation on the checkmark when it first appears (Animated.loop on scale)

### ✅ P3-L: Archive indicator + "show archived" toggle — DONE 2026-03-13
**Files**: `app/(tabs)/goals.tsx`
- If there are archived goals: show "X archived →" link at bottom of list
- Tapping toggles showing archived goals with muted styling (opacity 0.5, italic title)
- Allow unarchiving from this view

### ✅ P3-M: Goal templates — DONE 2026-03-13 (4 templates: morning routine, fitness, reading, deep work)
**Files**: `app/(tabs)/goals.tsx`, `app/new-goal.tsx`, new `src/lib/goalTemplates.ts`
- Add "From template" option when creating a goal
- Bundled templates: "Morning Routine" (3 tasks), "Weekly Fitness" (5 tasks), "Read Daily" (1 task)
- Templates stored as hardcoded JSON in `src/lib/goalTemplates.ts`
- Creates the goal + child tasks in one action

---
> **Rewards screen improvements are deferred** to a dedicated Rewards expansion session.
> Tracked items: progress bar on cards, sort options (affordable-first/cheapest/most expensive),
> reward unlock notification, edit reward screen, redemption history tab, `updateReward` store action,
> long-press context menu on cards. See original plan notes for details.

---

### ✅ P3-N: Stats — Summary header card — DONE 2026-03-13 (monthly summary + trends)
**Files**: `app/(tabs)/stats.tsx`
- Top card replaces sparse balance display: "This week: X tasks done · Y pts earned · Z-day streak"
- Secondary row: "vs last week: +N tasks (+M%)" with green/red arrow
- Tertiary row: "This month: X tasks · Y pts" with month-over-month delta
- Required queries: `taskStore.completionStats(7)`, `taskStore.completionStats(30)`, `pointsStore.ledgerInRange(from, to)`

### P3-O: Stats — Task-level analytics
**Files**: `app/(tabs)/stats.tsx`, `src/store/taskStore.ts`

**Completion rate panel**
- % of due tasks actually completed, computed per period (today / this week / this month)
- Formula: `completions.count / dueDatesInRange.count` across all active tasks for the period
- Show as a large percentage + thin ring or bar below the summary card

**Top tasks leaderboard**
- "Most completed" list: top 5 tasks by all-time completion count
- Show task title, category color dot, total completions, and current streak badge
- Tap → navigate to `task/[id].tsx`
- Query: `SELECT task_id, COUNT(*) as cnt FROM completions GROUP BY task_id ORDER BY cnt DESC LIMIT 5`

**Task completion heatmap (existing — extend)**
- Currently: 30-day streak calendar. Extend to show intensity (0 / 1–2 / 3–5 / 6+ tasks) via 4-shade green scale instead of binary on/off

**Points breakdown by source**
- Horizontal bar chart: points from task completions vs goal bonuses vs combo bonuses (last 30 days)
- Derived from `points_ledger.reason` grouping
- Add `pointsStore.pointsByReason(from, to): Promise<Map<reason, number>>`

**Consistency score**
- Single number 0–100: "X% of due tasks done on time in last 30 days"
- Show trend arrow (up/down vs prior 30 days)

**Trend indicators on existing stat pills**
- Each pill (Tasks Done, Earned, Streak): add small "+N" or "−N" footer badge comparing this week vs last week

### P3-P: Stats — Goal / group analytics
**Files**: `app/(tabs)/stats.tsx`, `src/store/taskStore.ts`

**Goals at a glance (new section)**
- One row per active goal showing: goal title, current period progress bar (X/Y tasks), period type badge (weekly/monthly), days-left badge
- Color: green = on track (≥50% done with ≤50% period elapsed), amber = at risk, red = behind
- "On track / At risk / Behind" counts as 3-pill summary at top of section
- Requires `taskStore.completionsForPeriod()` (already planned) + period elapsed calculation

**Goal completion rate over time**
- Bar chart: one bar per week for last 8 weeks, height = % of goals with ≥1 bonus earned that week
- Shows momentum across goal completion, not just individual task counts
- Query: `points_ledger WHERE reason='goal_bonus' GROUP BY strftime('%Y-%W', created_at)`

**Most consistent goals**
- "Best performing goals" mini-list: top 3 goals by bonus completion rate (bonuses earned / periods elapsed since creation)
- Shows which goals are sticking vs which are ignored

**Goal streak**
- Per goal: consecutive periods (weeks/months) where the goal bonus was earned
- Show in goals-at-a-glance row as "🔥 N periods" badge
- Query: `points_ledger WHERE reason='goal_bonus' AND task_id=? ORDER BY created_at DESC`

**Bonus points earned per goal**
- Small table or sorted list: goal name → total bonus points earned all-time
- Useful to see which goals drive the most reward economy

### ✅ P3-Q (partial): Category breakdown chart — DONE 2026-03-13 (top 5 categories by pts, last 30 days)
**Files**: `app/(tabs)/stats.tsx`, `src/store/taskStore.ts`, `src/store/categoryStore.ts`

> "Projects" are categories used as a grouping lens — all goals + standalone tasks sharing a category
> represent a project. No new data model needed; category IS the project in Phase 1.

**Project summary cards**
- One card per category that has ≥2 tasks: shows category name + color, total tasks, active goals count, completion rate for current month, points earned this month
- Collapsed by default; tappable to expand into full project drilldown
- Add `taskStore.statsPerCategory(from, to): Promise<CategoryStats[]>` query

**Project drilldown (expanded card)**
- Task list with completion indicators for current week (Mon–Sun dots, same as goal detail heatmap)
- Goal progress bars (all goals in this category, current period)
- Points earned trend: 4-week sparkline (tiny bar chart, 4 bars)
- "X tasks · Y goals · Z pts this month" summary line

**Cross-project comparison chart**
- Horizontal bar chart: one bar per category, length = tasks completed this month
- Same color as category accent
- Shows where effort is going at a project level

**Time invested indicator (future)**
- If Pomodoro timer (P5) is added, show "X hours logged" per project
- Placeholder section in stats with "Start logging time →" CTA pointing to future timer feature

### ✅ P3-R: Stats — Personal bests & history — DONE 2026-03-13 (best day pts, most tasks, streak)
**Files**: `app/(tabs)/stats.tsx`

**Personal bests panel**
- Best single day: most tasks in one day + date + points earned
- Longest streak ever: N days, from [date] to [date]
- Best week: most points in a 7-day window
- Best goal run: longest consecutive period bonus for a single goal
- Pull from full `completions` + `points_ledger` history

**Weekly review entry point**
- "Review this week →" button at bottom of stats, links to P3-B weekly review screen
- Shows last review date: "Last reviewed: Mon Mar 9"

### P3-S: Stats — Required new store queries
**Files**: `src/store/taskStore.ts`, `src/store/pointsStore.ts`

Add the following query methods to support all stats above:
- `taskStore.completionRate(from, to)` → `{ due: number, done: number, rate: number }`
- `taskStore.topTasksByCompletions(limit)` → `{ taskId, title, count, streak }[]`
- `taskStore.statsPerCategory(from, to)` → `{ categoryId, name, color, taskCount, goalCount, completions, points }[]`
- `taskStore.goalsAtAGlance(today)` → `{ goalId, title, scheduleRule, periodDone, periodTotal, daysLeft }[]`
- `pointsStore.pointsByReason(from, to)` → `Map<reason, number>`
- `pointsStore.goalBonusByWeek(weeks)` → `{ week: string, bonusCount: number }[]`
- `pointsStore.goalBonusForGoal(goalId)` → `{ total: number, streak: number, lastEarned: string | null }`

---

### P4-A: X times per week (`weekly_count` rule)
**Files**: `src/lib/recurrence.ts`, `src/components/ScheduleRulePicker.tsx` (schema migration needed)
- New rule: `{ type: 'weekly_count'; timesPerWeek: number; startDate: string }`
- `dueDatesInRange`: task is "due" on any day of the week if weekly completion count < timesPerWeek
- Toggle in Weekly picker: "Specific days" (current) ↔ "X times this week"
- Picker: stepper 1–7 for timesPerWeek

### P4-B: Monthly Nth weekday
**Files**: `src/lib/recurrence.ts`, `src/components/ScheduleRulePicker.tsx`
- Extend monthly rule: add `mode: 'day' | 'nth_weekday'`, `nth?: number`, `weekday?: number`
- UI toggle: "Day X" (current) ↔ "Nth weekday" → "1st / 2nd / 3rd / 4th / Last" + day name picker

### P4-C: Recurrence end date (schema change)
**Files**: `src/lib/recurrence.ts`, `src/components/ScheduleRulePicker.tsx`, `src/db/schema.ts`
- Add optional `endDate?: string` to all recurring rule types
- `dueDatesInRange` already handles naturally (stop at endDate)
- Show in picker as "No end" toggle + date navigator when enabled
- New schema column: `tasks.scheduleEndDate TEXT NULL`

### P4-D: "Skip weekends" toggle for Daily (persistent)
**Files**: `src/components/ScheduleRulePicker.tsx`
- Currently "Weekdays only →" button switches rule type. Make it also reversible:
  if daysOfWeek=[1,2,3,4,5], preserve it when user toggles back to Daily

### ✅ P4-E: ESLint + Prettier setup — DONE 2026-03-13 (.eslintrc.json + .prettierrc + npm run format)
**Files**: `.eslintrc.json` (new), `.prettierrc` (new), `package.json` (devDeps)
- Add `eslint`, `@typescript-eslint/parser`, `eslint-plugin-react-native`, `prettier`
- Config: strict TypeScript rules, React hooks rules, import order
- Add `npm run format` script

### ✅ P4-F: Centralise color constants — DONE 2026-03-13 (src/lib/colors.ts with Colors object)
**Files**: new `src/lib/colors.ts`, all screen files
- Extract all hardcoded hex values into named exports: `Colors.primary`, `Colors.accent`, `Colors.success`, etc.
- Prerequisite for P2-A (dark mode)

### ✅ P4-G: Error boundaries — DONE 2026-03-12
**Files**: new `src/components/ErrorBoundary.tsx`, `app/_layout.tsx`
- Wrap root in `ErrorBoundary` that shows a friendly "Something went wrong" screen + "Reload" button
- Prevents blank white screen on unhandled JS errors

### P4-H: Loading skeleton states
**Files**: new `src/components/SkeletonCard.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/goals.tsx`
- While `taskStore.loading === true`, render 3–4 placeholder skeleton cards (gray animated shimmer)
- Removes current empty-render-then-populate flicker

### P4-I: Unit tests for recurrence logic
**Files**: new `src/__tests__/recurrence.test.ts`
- Test all rule types: once, daily, weekly (specific days + weekdays-only), monthly, custom
- Edge cases: Feb 28/29, DST transitions, empty daysOfWeek, endDate before startDate

### P4-J: Unit tests for store actions
**Files**: new `src/__tests__/taskStore.test.ts`, `src/__tests__/pointsStore.test.ts`
- Mock `db` with in-memory drizzle (or jest.mock)
- Test: completeTask, uncompleteTask, archiveTask, goal bonus guard, addPoints, wasGoalBonusGrantedToday

### P4-K: Accessibility (a11y) pass
**Files**: all screen and component files
- Add `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` to all `TouchableOpacity` buttons
- Add `testID` to all interactive elements for E2E test support
- Add `accessibilityLiveRegion="polite"` to point balance (screen reader announces changes)
- Color contrast audit: `#f59e0b` on white = 3.06:1 (fails WCAG AA for small text) → darken to `#d97706`

---

### P5 — Future / research

- **Cloud sync**: Research expo-sqlite + PowerSync / rxdb for offline-first sync to Supabase
- **iOS widget**: `expo-widget-kit` (experimental) for home screen "tasks today" count widget
- **App icon badge**: Use `expo-notifications` badge count = number of incomplete today tasks
- **Calendar export**: `expo-calendar` — export task due dates to device calendar
- **Pomodoro timer**: `app/timer.tsx` — 25-min countdown with task context, logs time to ledger
- **Markdown task notes**: Replace plain `description` TextInput with a minimal MD renderer (bold, lists)
- **Keyboard shortcuts (web)**: Add web keyboard shortcuts (⌘K to add task, ⌘/ for help)
- **Import from CSV**: Accept CSV with columns: title, scheduleType, pointValue — batch insert tasks
- **Sharing stats**: "Share my week" — generates a static PNG card (via react-native-view-shot) showing week stats

---

---

## EXPANSION 2 — Additional work (added 2026-03-12)

> New areas surfaced by full codebase audit. Items below are not covered by any earlier section.

---

### ✅ EX-P1: Keyboard-avoiding forms — DONE 2026-03-12
**Files**: `app/new-task.tsx`, `app/new-goal.tsx`, `app/new-reward.tsx`, `app/task/[id].tsx`, `app/goal/[id].tsx`
- On iOS the bottom half of the form (point picker, schedule rule) gets hidden under the software keyboard when the title/notes input is focused
- Wrap each modal's `ScrollView` with `KeyboardAvoidingView behavior="padding"` + set `keyboardShouldPersistTaps="handled"`
- Test on iPhone SE (smallest viewport) — most likely to clip

### ✅ EX-P1: Background / foreground refresh — DONE 2026-03-12
**Files**: `app/_layout.tsx`, all store `load()` calls
- When the app is suspended and resumed (device lock, app switch), SQLite state is stale
- Use `AppState` from `react-native`: on `change` event where `nextState === 'active'`, call `taskStore.load()` + `pointsStore.load()`
- Prevents "phantom" completion checkboxes on the Today screen after crossing midnight in background

### ✅ EX-P1: Midnight date rollover — DONE 2026-03-12
**Files**: `app/(tabs)/index.tsx`
- `todayStr` is computed once at mount. If the app stays open past midnight, "today" points to yesterday
- Fix: subscribe to `AppState` active event (same as above) and re-derive `todayStr = format(new Date(), 'yyyy-MM-dd')`; clear selectedDate if it was "today" so it snaps to the new day

---

### EX-P2: Search tasks and goals
**Files**: new header search bar in `app/(tabs)/index.tsx` + `app/(tabs)/goals.tsx`
- Magnifying glass icon in header → expands to an inline search input (animated width from 0)
- Today screen: filters visible task list to titles containing query (case-insensitive)
- Goals screen: filters goal list by title or description
- No new store method needed — filter the already-loaded arrays in component state
- Clear button (×) dismisses search and restores full list
- On web: also responds to keyboard shortcut ⌘F

### EX-P2: Category filter chips on Goals and Today screens
**Files**: `app/(tabs)/goals.tsx`, `app/(tabs)/index.tsx`
- Horizontal chip strip below the header (collapsible) listing all categories with task/goal counts
- Tap a chip to filter the list to that category only; "All" chip always first
- Active chip highlighted (category color bg); inactive chips are gray outlines
- Store selected filter in component state (not persisted — reset on tab focus)

### EX-P2: Category icon support
**Files**: `app/(tabs)/settings.tsx`, `src/components/TaskCard.tsx`, `src/components/GoalCard.tsx`
- `categories.icon` field exists in DB schema but is never set or displayed
- Settings — category editor: add emoji picker row (grid of 30 common emojis, tappable)
- TaskCard + GoalCard: show icon next to category color dot if set
- Default: no icon (existing behaviour unchanged)

### EX-P2: Reward card image display
**Files**: `app/(tabs)/rewards.tsx`, `app/new-reward.tsx`
- `rewards.imageUri` field exists in schema and store but is never rendered or input
- New-reward form: add "Add image" row — on mobile uses `expo-image-picker` (photo library); on web uses `<input type="file">`
- Reward card: if `imageUri` set, show a 56×56 thumbnail on the left side of the card
- If not set: show a placeholder icon (gift box) of the same size

### EX-P2: Goal list reordering
**Files**: `app/(tabs)/goals.tsx`, `src/store/taskStore.ts`, `src/db/schema.ts`
- Currently tasks within a goal can be reordered (▲/▼ buttons in goal detail), but goals themselves have no order
- Add `tasks.sortOrder` is already present for tasks — it applies to goals too (they are tasks with `isGoal=true`)
- Goals screen: add "Reorder" toggle button in header → shows ▲/▼ buttons per goal card (same UX as goal detail)
- `taskStore.reorderTask()` already works for any task ID — no new store method needed

### EX-P2: Undo last action
**Files**: `src/store/taskStore.ts`, `src/store/pointsStore.ts`, `app/(tabs)/index.tsx`
- After completing a task, briefly show a bottom snackbar: "Task completed · Undo" (visible 4s)
- Tapping Undo calls `uncompleteTask()` + inserts a negative ledger entry to reverse the points
- Same for archiving: "Goal archived · Undo" → calls a new `unarchiveTask(id)` that sets `archivedAt = null`
- Undo state: single-entry; second action replaces previous undo target
- No persistent undo stack needed — just transient state in the component

### EX-P2: "Skip this occurrence" for recurring tasks
**Files**: `src/db/schema.ts`, `src/store/taskStore.ts`, `app/(tabs)/index.tsx`, `src/components/TaskCard.tsx`
- New table: `skipped_dates (id, taskId, skippedDate TEXT)` — records deliberate skips
- Long-press context menu (P2-P) gains a "Skip today" option for recurring tasks
- `dueDatesInRange` checks `skipped_dates` and excludes those dates from due list
- Skipped date is treated as neither done nor failed — doesn't break streaks, doesn't count against completion rate
- Show a faint "—" indicator on the date in MonthCalendar instead of a dot
- `taskStore.skipTask(taskId, date)` + `taskStore.unskipTask(taskId, date)`

### EX-P2: Postpone task to tomorrow
**Files**: `src/store/taskStore.ts`, long-press context menu (P2-P)
- Long-press context menu gains "Postpone to tomorrow"
- For `once` tasks: updates `scheduleRule.date` to tomorrow's ISO date
- For recurring tasks: uses `skipTask(taskId, today)` (skip today) — task will reappear tomorrow naturally via recurrence
- Visible feedback: task disappears from today's list, snackbar "Task moved to tomorrow · Undo"

---

### EX-P3: First-run onboarding
**Files**: new `app/onboarding.tsx`, `app/_layout.tsx`, `src/store/settingsStore.ts`
- On first launch (no `appSettings` row for `onboarding_complete`), show onboarding before tabs
- 3-screen horizontal swipe flow:
  1. **Welcome** — app name, tagline ("Build habits. Earn rewards.")
  2. **How it works** — Tasks earn points → Goals group tasks → Rewards spend points (3 icon rows)
  3. **Seed data prompt** — "Start with example data?" Yes / No. If Yes: create 1 example goal ("Morning Routine") with 3 child tasks (Make bed / Drink water / Stretch), 1 reward ("Coffee treat", 50pts)
- After onboarding: set `appSettings.onboarding_complete = '1'`, navigate to tabs
- Skip button always visible (top-right) to bypass all 3 screens

### EX-P3: Completion notes (journal)
**Files**: `src/db/schema.ts`, `src/store/taskStore.ts`, `src/components/TaskCard.tsx`, `app/task/[id].tsx`
- Add `completions.note TEXT NULL` column (requires migration)
- Long-press on a completed checkbox → small modal: "Add a note to this completion" (1–2 line text input, Save / Skip)
- Notes visible in task detail under "Recent completions" list
- In stats recent activity feed: show note beneath the completion entry if present
- Enables light journaling without a separate journaling feature

### EX-P3: Point milestone celebrations
**Files**: `src/store/pointsStore.ts`, new `src/components/MilestoneToast.tsx`
- After any `addPoints` that results in balance or all-time total crossing a milestone: show a full-screen confetti burst + large toast
- All-time earned milestones: 100, 500, 1000, 5000, 10000 pts
- Track which milestones have been celebrated in `appSettings` key `celebratedMilestones` (comma-separated)
- Toast shows: "🎉 1,000 points earned all time!" with particle animation (use `react-native-confetti-cannon` or a pure-Animated implementation)
- Auto-dismiss after 3s or tap to dismiss

### EX-P3: Past-due / missed task handling
**Files**: `app/(tabs)/index.tsx`, `src/store/taskStore.ts`, `src/components/TaskCard.tsx`

**Problem**: Recurring tasks that were not completed on past days simply vanish — there is no overdue concept.

**Plan**:
- Add an "Overdue" collapsible section at the top of Today screen (above today's tasks)
- Shows tasks that were due in the last 7 days but have no completion AND no skip entry for those dates
- Computed by: for each active recurring task, run `dueDatesInRange(rule, 7 days ago, yesterday)`, subtract completions and skips
- Each overdue item shows: task name, date missed (e.g., "yesterday" / "2 days ago"), a "Done back then" checkbox and a "Skip" button
- "Done back then" → calls `completeTask(taskId, pastDate)` — completion is backdated
- Cap at 7 days to avoid overwhelming the screen
- Collapsed by default if count > 5; "X overdue →" expand link

### EX-P3: Bulk actions on Today screen
**Files**: `app/(tabs)/index.tsx`, `src/store/taskStore.ts`
- Long-press on any task → enters multi-select mode (checkboxes appear on all cards)
- Select multiple tasks → bottom action bar appears: "Complete selected (N)" / "Skip selected" / "Archive selected"
- "Complete all today" shortcut in header menu (⋮): marks every visible incomplete task as done for the selected date
- Selection state cleared on navigation away

### EX-P3: Per-task custom reminder
**Files**: `src/db/schema.ts`, `app/new-task.tsx`, `app/task/[id].tsx`, `src/lib/notifications.ts`
- Add `tasks.reminderTime TEXT NULL` — format `"HH:MM"` (e.g. `"07:30"`)
- New/edit task form: optional "Reminder" row — time picker (hour + minute), defaulting to off
- When `reminderTime` is set: schedule a repeating daily notification at that time with the task title
- When task is archived or reminder removed: cancel the notification
- Notification identifier: `task-reminder-{taskId}` for easy cancellation
- Distinct from the global daily reminder (P2-F) — this is per-task opt-in

### EX-P3: "Point economy" guidance in new-task form
**Files**: `app/new-task.tsx`, `app/new-goal.tsx`
- Small contextual hint below the point value picker: "Your average task earns X pts · Rewards start at Y pts"
- X = `mean(pointValue)` of existing tasks; Y = `min(pointCost)` of existing rewards
- Helps the user calibrate new tasks relative to what they've already built
- Only shown if user has ≥3 tasks and ≥1 reward (otherwise too little context)

---

### EX-P4: Per-task streak in task detail
**Files**: `app/task/[id].tsx`, `src/store/taskStore.ts`
- Task detail currently shows no completion history
- Add "History" section at bottom of task detail:
  - Current streak: "🔥 N-day streak"
  - Longest streak ever: "Best: N days"
  - Completion calendar: 5×7 grid of last 35 days (same style as stats 30-day calendar), colored green on completed days
  - Total completions: "X completions all time"
- Requires `taskStore.getTaskStreak(taskId)` (already planned in P2-L) + a new `taskStore.completionDatesForTask(taskId, days)` query

### EX-P4: Date/time localization groundwork
**Files**: `app/(tabs)/index.tsx`, `src/components/MonthCalendar.tsx`, `src/lib/recurrence.ts`, `app/goal/[id].tsx`
- All month names and day-of-week abbreviations are hardcoded in English
- Replace with `Intl.DateTimeFormat` where possible: `new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)`
- Day abbreviations in MonthCalendar: derive from `Intl.DateTimeFormat` with `{ weekday: 'short' }`
- Locale: read from `Intl.DateTimeFormat().resolvedOptions().locale` (device locale) — no user-facing setting needed yet
- This unblocks future i18n without a full translation pass

### EX-P4: Deep links for tasks and goals
**Files**: `app.json`, `app/task/[id].tsx`, `app/goal/[id].tsx`
- Expo Router already generates routes for `task/[id]` and `goal/[id]` — deep links work by default with URL scheme
- Add `scheme: "quests4life"` to `app.json` → enables `quests4life://task/abc-123`
- Add a "Copy link" option in task/goal long-press menus for sharing within the same device or between devices
- On web: use `window.location.href` share; on native: use `Share.share()` from react-native

### EX-P4: Settings — category statistics
**Files**: `app/(tabs)/settings.tsx`, `src/store/categoryStore.ts`
- Each category row in Settings shows: color swatch, name, "X tasks" count
- Requires `categoryStore.load()` to also fetch task counts: `SELECT category_id, COUNT(*) FROM tasks WHERE archived_at IS NULL GROUP BY category_id`
- Goal count too: "X tasks · Y goals"
- Makes it easier to decide whether to keep/delete a category

### EX-P4: Long-running goal progress tracking
**Files**: `app/goal/[id].tsx`, `src/store/taskStore.ts`
- Currently goal detail only shows progress for the current period (this week / this month)
- Add a scrollable history section below the current-period heatmap: last 8 weeks (for weekly goals) or last 6 months (for monthly goals)
- Each past period shown as a single row: period label + mini progress bar + bonus earned indicator (★ if bonus was granted)
- Derived from `completions` + `points_ledger WHERE reason='goal_bonus'` filtered to this goal
- Add `taskStore.goalPeriodHistory(goalId, periods)` returning `{ label, done, total, bonusEarned }[]`

---

### Schema changes for Expansion 2

| Change | Reason | Priority |
|--------|--------|----------|
| `skipped_dates` table `(id, taskId, skippedDate)` | Skip recurring occurrence (EX-P2) | P2 |
| `completions.note TEXT NULL` | Completion notes / journal (EX-P3) | P3 |
| `tasks.reminderTime TEXT NULL` | Per-task custom reminder (EX-P3) | P3 |
| `categories.icon` — already in schema, needs UI | Category icons (EX-P2) | P2 |
| `rewards.imageUri` — already in schema, needs UI | Reward images (EX-P2) | P2 |

---

### Schema changes needed for expansion items

| Change | Reason | Priority |
|--------|--------|----------|
| `tasks.difficulty` text nullable | Difficulty levels (P2-J) | P2 |
| `achievements` table | Achievement system (P2-M) | P2 |
| `tasks.scheduleEndDate` text nullable | End date for rules (P4-C) | P4 |
| New rule type `weekly_count` | X-times-per-week (P4-A) | P4 |
| `themeMode` in appSettings | Dark mode (P2-A) | P2 |
| `accentColor` in appSettings | Accent picker (P2-B) | P2 |
| `weekStartsOn` in appSettings | Week start day (P2-C) | P2 |

No new schema required for the stats expansion (P3-N–S) — all queries derive from existing
`completions`, `points_ledger`, `tasks`, and `categories` tables.

---

### Verification after implementing any batch

```bash
npm run typecheck    # Zero type errors
npm run lint         # Zero lint errors (once P4-E done)
npm run web          # Open localhost:8088 via proxy, test web platform guards
npx expo start --tunnel --clear  # Test on physical device via Expo Go
```

For each new feature: manually exercise the happy path + at least one error/edge case.
For recurrence changes: run `src/__tests__/recurrence.test.ts` after each modification.
