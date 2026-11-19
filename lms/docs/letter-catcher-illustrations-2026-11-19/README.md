# Letter Catcher illustration release — 2026-11-19

The approved release replaces all 272 word pictures across the existing 16 topics. Teaching text, categories, audio, distractors, scoring and saved progress keep their existing values.

## Artwork standard

- Calm semi-realistic educational painting, white background, natural proportions, soft shadows and generous clear margins. Whole objects and animals remain visible; occupations, relationships and places use a small explanatory scene.
- 241 individually generated illustrations, reviewed by word meaning and again as complete category contact sheets. No watermarks, brands or decorative written labels.
- 31 exact vector originals for the 10 Western digits (including 0), 11 geometric shapes and 10 color samples. Their editable sources are in `symbols/`; geometry, numeral identity and colors are deterministic.
- Every delivery file is 1024×1024 WebP. Painted masters were contained on a square without cropping or stretching. Different silhouettes retain natural proportions; equal canvas size does not mean forcing every subject into the same bounding rectangle.
- The 272 delivery images total 20,120,272 bytes (mean 73,972; largest 221,524), versus 22,275,409 bytes in the previous collection. These are file sizes, not a measured page-speed claim.

`provenance.json` records the exact final prompt, review notes and source/export SHA-256 for every word ID. The public manifest is `public/games/letter-catcher/illustrations-v1/manifest.json`. Asset names contain the word ID and content hash; future revisions must use new names.

## Integration and release order

1. Deploy this commit, including all 272 immutable static assets. Static delivery follows the site's existing local game-asset pattern and needs no privileged storage credential on a workstation.
2. Verify each production asset responds with the expected WebP byte length before changing the database.
3. Use the template `supabase/letter_catcher_images_2026_11_19.sql` with the private release payload through the authorized database connection. Source URLs and word snapshots are deliberately excluded from the repository; an empty template aborts before writing. It locks the word table, checks all 272 original IDs, teaching targets, categories and image URLs, updates only `image_url`, and rejects a change to any other word field. A concurrent teacher image edit causes an atomic abort rather than an overwrite.
4. Verify the database and game API return 272 matching new URLs, with all teaching text and audio unchanged.

Rollback uses `supabase/letter_catcher_images_2026_11_19_rollback.sql` with its corresponding private payload. It restores the previous URLs only if the released URLs are still current. Old media files are retained; no learner records are changed.

Saved rounds refresh only their picture URL from the current word bank when ID, word and missing letter still match. Their answer choices, order, audio and grading snapshot remain intact. Changed or deleted teaching targets retain their historical round image. A no-change refresh preserves object identity to avoid a render loop.

Teacher uploads now export a contained 1024-square image with white padding rather than permanently shrinking the source to 140×140. WebP encoding has a MIME-correct JPEG fallback; existing authenticated upload and storage routes are unchanged. The service-worker cache is bumped to `aarem-v9` so existing installations can receive the new client logic.

## Verification

- Every exported image decoded successfully at 1024×1024; 272 expected IDs, 272 distinct hashes and no missing assets.
- All 16 final category sheets were visually reviewed. Targeted corrections included wheat framing, museum framing, uncle margins, apricot scale and reporter gender.
- A browser gallery using the final assets was checked at 390, 820 and 1200 px container widths with contained pictures and no horizontal overflow. This is visual asset QA, not a logged-in full-game end-to-end test or a physical-device performance benchmark.
- Full Vitest suite: 1214/1214 tests passed in 99 files. The production Next build completed successfully with placeholder Supabase credentials. The final suite includes the saved-round refresh and teacher-upload cases.
