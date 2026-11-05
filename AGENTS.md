# Arem Academy project instructions

- User-facing training numbers must use Western digits `0–9`, including in Arabic interfaces. This is Mohamed's standing requirement (2026-10-31) for current training edits and all future training work.
- Use `lms/lib/display-number.js` for counters, scores, progress, rewards and result totals. With `Intl` formatters explicitly set `numberingSystem: 'latn'`.
- Do not convert display numbers to Arabic-Indic or Persian digits. Keep Arabic text and RTL layout intact.
- Changing number presentation must not modify stored points, calculations, answer data, media, animations or unrelated exercises.
- Read the relevant project context in `CLAUDE.md` before broader project changes. Preserve the user's requested scope.

- Standing requirement from Mohamed (2026-11-02): every optional training feature, uploaded media item, recording, interaction sound and visual effect must have independent enable/disable controls in the admin/teacher editor. Disabling must preserve uploaded file URLs and configured values, suppress built-in fallback sounds too, persist through draft/publish and match live preview. Keep core navigation usable; do not remove data to simulate disabling. Apply this to every new training and future edits to existing trainings.

- Standing visual continuity requirement from Mohamed (2026-11-05): keep each training world a single coherent full-screen scene across stage selection, gate opening, character arrival, celebration and return. Preserve the active portrait/landscape canvas, camera scale, landmark placement and aspect ratio through transitions. Never replace a landscape scene with a narrow portrait panel over a second enlarged background, repeat scenery at side seams, or introduce detached margins during celebrations. Use matching responsive assets and in-scene overlays; verify desktop, tablet and phone, including the celebration itself, before publishing.
