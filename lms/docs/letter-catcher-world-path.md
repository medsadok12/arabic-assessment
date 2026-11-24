# Letter Catcher: «مسار العوالم»

## Sequential stages — 2026-11-24

Mohamed requested removal of «العب الكل» and sequential play within each world. This supersedes the older play-all entry and direct whole-world round described below.

- Each world now opens a numbered stage selector. Stages contain 5 words by default; the teacher can set 5, 10 or 15 words per stage independently of the retained legacy round setting. Every playable word appears in exactly one stage, including a shorter final stage. Numbers remain ordered from 0.
- A completed stage unlocks the next. The following world opens after all stages of its predecessor are complete. Historical world access stays available, without treating earlier random rounds as new stage completions.
- Stage identity includes its canonical world, position and the exact ordered word IDs. Changed partitions do not inherit unrelated completion; image/audio edits retain progress. Start requests and exact stage membership are checked on the server.
- Child-scoped progress is stored in private `game_settings` rows under `lc-stage:<effective-user-id>:<stage-id>`. Enrollment never means completion. Completion settles through the existing verified effects and CAS flow; retries cannot duplicate points or completion. Existing `game_results` records remain intact and retain readable world names.
- New student starts require a valid stage. Already saved legacy and mixed rounds can still resume. Teacher previews and fallback demos do not write official progress or points; demo progress stays in the current component only.
- The stage dialog includes loading/retry states, keyboard focus handling and save-retry controls. Results offer the next stage, replay and the world's stage selector. The world path, friend duel, word frames, audio and celebrations retain their existing implementations.
- Service-worker cache advances to `aarem-v16`.

Validation: 1,472 tests across 113 files passed, including stage partitioning, locks, legacy access, verified completion/retries, sibling isolation, teacher settings and stage selector states. The production build passed. The actual Next UI was checked against an isolated local fixture at phone 390×844, tablet 820×1024 and desktop 1280×800: play-all absent, five-word stage completion, reload/resume at the exact unfinished question, next-stage start, subsequent stage/world locks, retained progress after resizing, dialog focus and Escape restoration. The tablet/desktop dialog measured 560px without horizontal overflow. No production learner records were written during QA.

On 2026-11-23, Mohamed selected the third start-screen concept: worlds displayed as islands along a path. This is a change to world selection only. The existing question screen, teaching sequence, animal word rendering and celebrations retain their approved appearance and behavior.

## Data and interaction contract

| Element | Preserved source and behavior |
| --- | --- |
| Worlds and order | Loaded canonical categories and the existing ordering helpers, including custom categories; no fixed list or truncated subset. |
| Names, pictures and emojis | Live category metadata and existing fallbacks; teacher edits remain visible. |
| Student progress and stars | Existing saved results and star calculations; decorative path states do not invent completion. |
| Locked worlds | Existing unlock rules and teacher access bypass; the visual path does not change access. |
| World selection | Existing selection callbacks and start flow; selecting an island opens the same training. |
| Main actions | Sticky play-all access and the existing optional «تحدي صديق» entry, following its current settings and animal-only scope. |

The path adapts to the actual available worlds and viewport. Keep labels, images, stars and locks readable on phone, tablet and desktop. Scrolling must leave the sticky actions usable without covering the last world or trapping teacher controls.

## Scope and release

No word-bank, answer, scoring, reward, progress-storage or database migration changes are part of this design. Mixed rounds, individual world training and the friend-duel mechanics keep their existing contracts.

The service-worker cache advances from `aarem-v11` to `aarem-v12` for existing installations. API requests remain uncached.

Before release, verify dynamic/custom worlds, live teacher artwork and emojis, empty and completed progress, locks, teacher bypass, world selection, play-all and duel availability across phone, tablet and desktop. Record the final test, build and browser validation after QA.

## Verification — 2026-11-23

- Full Vitest suite: 1,392 tests across 107 files passed. The five new component checks cover canonical/custom worlds, saved access, teacher bypass, real stars/counts, teacher artwork, Western digits, the duel switch and empty setup. Focused checks also passed after the final accessibility-label adjustment.
- Production build completed with exit 0. The game route is 39.5kB with 149kB first-load JavaScript (previously 37.8kB/147kB); no dependencies or illustration downloads were added.
- Actual Next UI tested in two child fixture profiles and a teacher profile against local isolated storage: 16 worlds/272 items, custom animal artwork, emoji-only weather, saved 30-correct/1-retry results, no progress and all-complete progress. Phone 390×844, tablet 820×1180, desktop 1280×800 and short phone 360×640 had no horizontal overflow.
- A locked island could not open a question; the teacher could open the last island. Its bottom remained about 80px above the fixed play-all button after scrolling. Play-all opened the existing round modal, and the friend entry opened the existing duel lobby. Disabling the duel hid the entry; failed category images returned to their scene/emoji fallback without a broken-image icon.
- A real solo round started from an island, accepted an answer, credited 5 fixture points and returned to the path. Its word frame, three choices, recording/celebration and next control remained on the existing question implementation. No production learner records were written during QA.
- Teacher artwork now uses contain sizing so the animal remains whole inside its world preview. The compact header and invitation leave more room for the path; the configured duel subtitle remains available to assistive technology and in the existing lobby/settings.

## Animal island scene — 2026-11-23

Mohamed requested naturally spaced animals within the savanna, replacing the rectangular animal collage. The animal category now uses a single coherent scene with a zebra, elephant and giraffe on shared ground. The optimized asset is `/media/letter-catcher-worlds/animals-savanna-v1.webp` (1200×800, 129,400 bytes).

Update only `lc_category_meta.image_url` for `الحيوانات`, after the asset is deployed. The source-specific `worldSceneImage` style fills the island window without padding; it applies only to this asset in the animal category. Future teacher image replacements keep their original contain sizing. All other category pictures, word-bank media, Fahim, labels, stars, locks and gameplay remain unchanged. Category GET responses are dynamic with `Cache-Control: no-store, max-age=0`, and the service-worker cache advances from `aarem-v12` to `aarem-v13`.

The previous category image is retained for rollback: `https://uqspozzkzyytwwidojxv.supabase.co/storage/v1/object/public/media/lc-category/migrated-19756a76-5001-4407-ab31-bdb8ff583bc0-1782885814894.jpeg`. Its URL MD5 is `ef9d4bd52790fb89e15f7a75ebc076e3`; use a matching-value update to avoid overwriting a concurrent teacher edit. No schema migration is required.

Verification: all 1,396 tests across 108 files passed, including new checks for fresh category metadata and the source/category-specific scene style. The production build completed with exit 0. The actual Next UI loaded the new asset and was visually checked at phone 390×844, tablet 820×1024 and desktop 1280×800: all three animals remain complete and separated, without the old rectangular collage. No production learner records were written during QA.
