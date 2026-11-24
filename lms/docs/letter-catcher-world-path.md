# Letter Catcher: «مسار العوالم»

## Welcoming wait — 2026-11-24

Mohamed requested Fahim welcoming the learner during the initial wait instead of the plain text-only loading card. Use the existing transparent `/faheem-loading-sm.webp` (15,712 bytes), the short greeting «أهلًا بك يا بطل!» and gentle CSS motion inside the current world scenery. The card adapts to short phone screens. No audio or artificial minimum waiting time is added; the worlds replace the greeting immediately when the existing readiness gates pass. Failed loads retain retry and library navigation, with motion stopped.

Teacher settings `loading_welcome` and `loading_welcome_motion` independently control visibility and motion; both default to true. Reduced-motion preferences suppress the animation. Old editors must preserve either saved setting when omitted. The progress-path and friend-duel motion settings remain independent.

Validation: all 1,493 tests across 113 files passed, including independent flag validation, persistence and omitted-setting compatibility. The actual Next UI was checked with held metadata at phone 360×640, tablet 820×1024 and desktop 1280×800: the smiling mascot and greeting fit without horizontal overflow, and loading completion removed the welcome immediately. Separate fixture settings confirmed a still mascot and fully disabled welcome; a metadata error stopped motion, retained retry, and recovered to the 16-world path. No production learner records were written. The production build passed. Cache version: `aarem-v20`.

## Initial world artwork — 2026-11-24

Mohamed reported that the animal island first showed a stock lion and then changed to the configured savanna image. His correction applies to every world, including custom topics.

- Do not treat missing initial metadata as evidence that a world has no configured image. Use a neutral reserved loading state until live metadata is known.
- When a teacher image is configured, show only that artwork after it is ready. Loading and image errors must not substitute a lion, category emoji or another representational illustration. Keep the island window's dimensions stable.
- A category genuinely configured without an image may use its final configured/default emoji after metadata has loaded successfully.
- Preserve current good artwork while refreshing metadata in the background. Reject stale metadata/image completions so a delayed old request cannot replace a later teacher edit.
- Category GET failures return HTTP 503 with a friendly message and `Cache-Control: no-store, max-age=0`; a successful empty configuration remains HTTP 200. The page must offer retry for failures instead of presenting them as an empty successful configuration.

The initial path also waits for live words and the active learner's points, saved results and topic access, so it does not briefly show zero points or incorrect locks. Background refresh retains confirmed data; request tickets and active-child checks reject obsolete responses, including the end-of-round results refresh.

Browser validation used the actual Next UI with isolated local fixture data: metadata was held separately from image requests at phone 390×844. Before metadata, only the neutral loading screen appeared; after metadata, configured image windows stayed neutral until the approved files loaded and decoded. The first animal picture was the savanna, with no lion emoji; its card dimensions stayed 248×236.9375 CSS pixels before and after reveal. HTTP 503 metadata failure offered retry and recovered through the real retry button. Broken-image responses remained neutral at tablet 820×1024. Normal and repeat entry at desktop 1280×800, including the lazy school image after scrolling, loaded the configured artwork without horizontal overflow. No production learner records were written during QA.

Release checks: all 1,478 tests across 113 files passed, including the A → B → A image-element readiness regression and explicit metadata-failure responses. The production build passed. The service-worker cache advances to `aarem-v19`.

## Current contract: topics only — 2026-11-24 clarification

Mohamed explicitly rejected division within a topic: «أريد يدخل الحيوانات فيلعب حيوانات، التقسيم يكون خارجيا في المواضيع يعني لا يكون داخل نفس الموضوع تقسيم آخر».

- Selecting a world starts its full set of live playable words directly. «الحيوانات» starts the animal words; it does not open a second screen of numbered stages or divide those words into groups of 5. The same rule applies to canonical and custom topics. Numbers remain ordered from 0.
- Progression and locks belong to the topic path. Completing a topic opens the following topic; there are no additional locks within the same topic. Existing historical access and saved progress remain preserved.
- «العب الكل» stays removed. New play selects one topic rather than mixing all worlds.
- The teacher editor explains that the complete topic is played and that its word bank determines the question count. Stored `stage_size` and `words_per_round` values may remain for compatibility with existing data and saved rounds; they do not shorten new topic play.
- Server validation checks the selected topic's complete playable word set and topic access. Previously saved internal-stage or mixed rounds remain resumable without deleting learner records or duplicating rewards.
- Preserve the island path, live teacher artwork, word frames, audio, celebrations, scoring, active-child identity and optional friend-duel behavior.

Validation for this correction: 1,467 tests across 112 files passed, including full-topic starts, rejected five-word subsets, topic locks, saved old rounds, sibling isolation and idempotent completion. The actual Next UI was checked with isolated fixture data at phone 390×844, tablet 820×1024 and desktop 1280×800: choosing animals started 31 words directly without an internal selector; an answered question was retained when resuming the same 31-word topic. No production learner records were written during QA. The service-worker cache advances to `aarem-v17`. The production build passed before release.

## Superseded internal-stage attempt — 2026-11-24

The assistant chose a default split of 5 words per internal stage during implementation, including six stages of 5 animal words and a final stage of 1. This was not a teaching method agreed with Mohamed. He subsequently rejected that split and clarified the topic-only contract above. Do not restore the internal stage selector or treat its former documentation as authorization.

The superseded attempt stored child-scoped stage records under `lc-stage:<effective-user-id>:<stage-id>` and used cache version `aarem-v16`. Retain historical records and saved-round compatibility where needed; they are not new topic subdivisions.

Historical validation of that superseded attempt: 1,472 tests across 113 files passed, with a production build and local browser checks of the former stage selector. These results describe that earlier implementation only.

On 2026-11-23, Mohamed selected the third start-screen concept: worlds displayed as islands along a path. This is a change to world selection only. The existing question screen, teaching sequence, animal word rendering and celebrations retain their approved appearance and behavior.

## Data and interaction contract

| Element | Preserved source and behavior |
| --- | --- |
| Worlds and order | Loaded canonical categories and the existing ordering helpers, including custom categories; no fixed list or truncated subset. |
| Names, pictures and emojis | Live category metadata and existing fallbacks; teacher edits remain visible. |
| Student progress and stars | Existing saved results and star calculations; decorative path states do not invent completion. |
| Locked worlds | Existing unlock rules and teacher access bypass; the visual path does not change access. |
| World selection | Selecting an island starts that topic's complete playable word set directly, following the current topic-only contract. |
| Main actions | The optional «تحدي صديق» entry follows its current settings and animal-only scope; «العب الكل» is removed. |

The path adapts to the actual available worlds and viewport. Keep labels, images, stars and topic locks readable on phone, tablet and desktop. Keep the last world and teacher controls reachable without a play-all dock or reserved gap for it.

## Scope and release

The current correction does not delete word-bank media, answers, learner records or existing rewards. New starts follow the topic-only contract. Saved earlier rounds and the friend-duel mechanics retain their compatibility contracts.

API requests remain uncached. The `aarem-v11` to `aarem-v12` cache change belonged to the original 2026-11-23 path release; the final cache version for the current correction is set during implementation.

Before release, verify direct complete-topic play, absence of internal stage controls and play-all, dynamic/custom worlds, live teacher artwork and emojis, topic locks, historical and unfinished progress, teacher bypass and duel availability across phone, tablet and desktop. Record the final test, build and browser validation after QA.

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
