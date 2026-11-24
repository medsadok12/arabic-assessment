# Letter Catcher: Fahim overlay in all categories

## Current contract — 2026-11-24

Mohamed explicitly requested applying the approved animal mascot appearance to every section: «طبق التغيير على كل الأقسام كما طبقته في قسم الحيوانات». The animal-only mascot restriction below is superseded.

- In every canonical and custom category, display the same transparent moving Fahim at the upper right of the encouragement row. This also applies to resumed mixed rounds.
- Keep the vocabulary picture centered at its existing size. Showing, fading and hiding Fahim must not translate or scale that picture, alter the word/answer layout, or introduce a duplicate mascot in the footer.
- Play the word first, then the existing Fahim encouragement recording. Dismiss the overlay after his speech; missing, blocked or stalled audio must still allow the visual celebration and a bounded exit. Leaving, restarting or advancing must cancel obsolete playback.
- Prepare the shared sprite for all categories, and reserve the save-status area so a final-answer message cannot shift the picture or controls during the celebration.
- This request expands the mascot's appearance only. The Naskh whole-word frame, fixed missing-letter marker and separated dammatan remain animal-only. The friend-duel scope remains animals and two players.
- Reuse the existing sprite, recording and playback lifecycle. No word-bank, scoring, topic progression or media data change is part of this appearance change.

Validation of this expansion: 1,473 tests across 113 files passed, including six shared-overlay checks and the existing playback cancellation/blocked-audio tests. Actual Next UI checks used isolated fixtures: weather on phone 390×844, school on tablet 820×1024 and fruit on desktop 1280×800. Picture/card, word-control and answer-control rectangles matched exactly before and during encouragement in all three checks; weather and fruit remained unchanged after encouragement as well; no video elements were rendered. The sprite advanced to frame 35 and disappeared after playback. Non-animal questions retained their existing word tiles. No production learner records were written during QA. The service-worker cache advances to `aarem-v18`. The production build passed before release. The results below describe the original trial.

## Original animal-only trial — 2026-11-22

Mohamed approved applying the interactive mascot example to animal questions only, so he can try it in the live game before deciding whether to expand it.

- Show the transparent moving mascot at the upper right of the encouragement row. The animal picture stays centered at its original size; the word and answer controls do not reflow during the celebration.
- Preserve word pronunciation first, followed by the original Fahim recording. Dismiss the mascot after the recording finishes. Blocked or missing audio must still allow the full visual celebration.
- Gate the behavior with the actual word's animal category, including mixed rounds. Other categories retain their previous video and picture layout.
- Keep the existing Naskh word rendering, contextual joins, fixed missing-letter marker and separated dammatan unchanged.
- Hide the footer's duplicate mascot for animal questions, retaining its space so the footer stays stable.

`LetterCatcherFahimOverlay` displays 36 frames from the existing three-second clip in a transparent 6×6 WebP sheet, using a bounded animation-frame loop. The sheet and original extracted MP3 total 154,937 bytes. The first and next animal questions prepare the sheet in parallel with their vocabulary picture. No video decoding or runtime background removal is required for animal motion.

`playAnimalFahimCelebration` starts visual feedback immediately, waits for actual audio completion before fading, and bounds missing, blocked, delayed or stalled audio. Run ownership prevents an obsolete callback from interrupting a newer question. Navigation and replay cancel previous playback and timers.

Animal questions reserve both ordinary status lines so the final-answer summary cannot push the scene down. The service worker cache advances to `aarem-v10` for existing installations.

Validation: 17 new playback lifecycle tests, alongside the existing celebration, word-frame, category and game tests. Browser QA uses the actual game with local test data and no production writes.

Browser checks covered a cow on a 390×844 phone, turkey on an 820×1180 tablet, and fox on a 1280×800 desktop, with student and teacher test roles. The vocabulary picture and word-row rectangles were identical before and during motion on each size. Success samples showed changing sprite frames and a transparent background. A school question had no animal overlay and retained its original playing `/media/elephant.mp4` video. A pre-existing 9.36px final-answer jump was eliminated for animals by reserving the status summary line.
