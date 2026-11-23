# Letter Catcher: «تحدي صديق»

Mohamed approved a two-player friend challenge using animal words, with encouraging points for each child's own answer. The existing single-player game, other categories and legacy `/library/games/challenge` remain intact.

## Scope and teacher controls

`game_settings` stores the feature under `letter-catcher.settings.duel`. Availability defaults to disabled; the teacher can enable it and edit its title, description, question count and independent sound, motion and encouragement switches. Disabling retains settings and uploaded media. Existing rooms retain their creation-time question/settings snapshot.

The default is 10 questions; the teacher can choose any integer from 5 through 10. Every question has exactly 3 choices. Questions come from distinct, valid, edited animal words in `letter_catcher_words`; insufficient content returns a helpful error. Room creation does not use the single-player fallback list. The approved Naskh word frame, contextual joins, fixed missing-letter marker and separated dammatan are reused.

## Shared match and points

The server generates a 6-digit invitation code and allows exactly two distinct active-child identities. Siblings can participate through their separate identities. The API resolves display names; emails and authentication metadata are not shared.

Both children receive the same question snapshot. Both mark themselves ready before a 3-second countdown. A question lasts 20 seconds; one child's correct answer leaves the other child time to finish. Review begins when both finish or the server deadline expires. Both use «التالي» before the next question starts.

| Each child's answer | Question points |
| --- | ---: |
| Fastest correct first attempt | 15 |
| Correct first attempt within 500ms of the fastest, inclusive | 15 |
| Later correct first attempt | 10 |
| Correct answer after retrying | 5 |
| Wrong or unanswered by the deadline | 0 |

Retrying requires a 700ms cooldown. There are no point deductions. Timing comes from the server; paused time and the resume countdown are excluded from the first-attempt comparison. The browser animates confirmed awards and the child's own total.

Account points are credited after completion through `deliverVerifiedEffect` and `awardVerifiedPoints`, once per room and active child. The credit equals that child's confirmed question total, bounded by 15 per question and 150 per match. Repeated result requests do not repeat the credit. Staff-created preview rooms and staff result requests award no account points.

## Persistence and recovery

The additive `letter_catcher_duels` table stores private snapshots and a numeric version. Restrictive RLS denies direct client access; server-role permissions are limited to select, insert and update. The table is not published to Realtime. The authenticated `/api/games/letter-catcher/duel` API checks membership and active-child identity, with polling/heartbeat synchronization and throttled room creation/joining.

Room updates use compare-and-swap on `id` and `version`, with bounded retries. Answers include the current question index and a deduplicated event ID. Client-supplied clocks, points, participants and question pools are not authoritative. Public responses omit private questions and other players' answers; the solution and pronunciation become available in settled review.

A missing heartbeat pauses play after 10 seconds. Reconnection has a 30-second grace period and preserves elapsed play time; resuming an active question uses a fresh countdown. Waiting rooms expire after 30 minutes, matches after 60 minutes, and the stored room expiry is 2 hours.

Teacher «إنهاء التحديات المفتوحة» performs a soft reset: open rooms become cancelled through CAS. Completed rooms, previous results, credited points, words, recordings and settings are retained. Reset processes bounded batches and reports whether another batch remains.

## Release checks

Apply `supabase/letter_catcher_duels.sql` before enabling the feature. It creates the new table and its restrictive access rules without changing legacy challenge tables. The service-worker cache advances to `aarem-v11`; API responses remain private and uncached.

Verify identity/membership checks, matching question snapshots, 500/501ms tie boundaries, 699/700ms retry boundaries, concurrent answers, duplicate requests, deadlines, disconnect/reconnect, final credit, staff preview and soft reset. Check all teacher switches and the unchanged single-player and school paths. Exercise lobby, ready, countdown, answer, review, next and results at 390×844, 820×1180 and 1280×800, including audio blocked and reduced-motion settings. Record final test/build and browser results after verification.

2026-11-22 verification: the full suite passed 1,387 tests across 106 files, followed by the focused route suite after Arabic error-message changes. The production build completed successfully. A local proxy exercised the actual Next API and reducer with isolated fixture authentication/storage: 10 rounds, sibling scores 140/150, concurrent commands, hidden active solutions, retry cooldown, duplicate final credits and staff reset passed. Two browser tabs verified room creation/joining, readiness, the same animal question, 15/10 awards and the own-star flight; refresh restored the room, and leaving cancelled it for the other player. Browser layouts fit 390×844, 820×1180 and 1280×800 without internal overflow. The staff panel displayed all duel controls and saved the independent motion switch. Production animal content contains 31 words with three choices, images and recordings. Browser QA used isolated fixtures rather than real student accounts.

## Account profile photos — 2026-11-23

Mohamed requested the normal uploaded account photo in place of the fixed child illustrations. The world-path invitation displays the verified active player's photo beside a neutral unknown-friend placeholder. The initial duel lobby shows the same account photo. Once joined, both players' server-provided photos appear with their names in the waiting room, score cards and final results. All photos use a shared circular frame with cover sizing; a missing or failed image falls back only for that account.

`GET /api/games/letter-catcher/duel?profile=1` returns only the authenticated active participant's public display identity in a private, uncached response. The page uses `childFetch` and refreshes it when returning or refocusing. Child profiles are resolved from their own verified auth account, without falling back to a guardian or sibling. Participant photos never come from the request body. The existing room synchronization refreshes each authenticated member's own profile photo, so both screens can receive photo changes without changing membership, answers or scoring.

No schema migration, production learner writes or changes to account-photo upload controls are required. The existing friend-duel switch still controls the feature. Animal scenes, other worlds, the single-player game, Naskh words, points and settings retain their current behavior. The service-worker cache advances from `aarem-v13` to `aarem-v14`.

Verification: all 1,421 tests across 110 files passed, including active-child photo ownership, private profile lookup, URL/cache-buster handling, ignored client avatars, independent image failures, identity changes and the last-review-to-results transition. The production build completed with exit 0. The actual Next UI was exercised in two isolated sibling tabs and a teacher profile. Both children saw the same correct photos in waiting, play and results; removing or breaking one photo changed only that account on both screens, and restoring it recovered the image. A complete 10-question fixture match retained the photos while points changed and credited 135/85 once; the existing confirmation retry recovered one transient result request. Phone 390×844, tablet 820×1024 and desktop 1280×800 were visually checked. Results show exactly two photos with names and scores, without duplicating the upper scoreboard or horizontal overflow. QA used local photo fixtures with different aspect ratios, never real learner records.
