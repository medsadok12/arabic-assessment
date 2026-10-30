# Learning attendance — 2026-10-30

Dashboard, progress, the attendance API and administration student reports use `loadLearningStreak`. New dates use Asia/Qatar. A page visit creates no attendance; the former POST is a read-only compatibility alias.

Server-side completed game results, story completions, solved letter exercises and flashcard review checkpoints establish real learning. Proven dates are retained as `attendance-day:<user>:<date>` rows in existing `game_settings`, so resetting exercises does not erase attendance. Queries paginate past 1000 rows, and streaks have no 21/365-day cap. Existing `daily_logs` preserve legacy continuity but are not relabelled as proven attendance. No migration or historic deletion.

The current streak may end yesterday; today requires actual activity. Best streak, current streak and actual learning-day totals are distinct. Calendars show the last 7/21 days ending today, distinguishing activity, frozen absence and old unclassified records. Server identity checks isolate each child, navigation carries that child, and failed client refreshes retain confirmed values.

Freeze purchases retain the existing atomic RPC: 100 points, cap 2. On actual return, only a fully coverable gap is protected. A unique durable effect journal stores protected dates before stock debit; balance compare-and-swap preserves concurrent purchases. Explicit failures can retry. Ambiguous operations (`working`/`review`) keep protection and cannot charge twice. This is an application journal rather than a new multi-table SQL transaction; administrators can inspect `attendance-freeze:*` rows if an infrastructure interruption leaves an operation uncertain. Frozen absence never counts as actual learning.

The existing 10-point daily reward now requires learning, retaining `daily_login:<date>` deduplication. Teacher previews do not record learning.

Tests cover academy midnight, leap dates, 430-day streaks, legacy preservation, child isolation, no attendance from visits, paginated recovery, concurrent freeze debit/purchase, storage failures and reward deduplication. See `learning-streak*.test.js`.
