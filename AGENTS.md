# Arem Academy project instructions

- User-facing training numbers must use Western digits `0–9`, including in Arabic interfaces. This is Mohamed's standing requirement (2026-10-31) for current training edits and all future training work.
- Use `lms/lib/display-number.js` for counters, scores, progress, rewards and result totals. With `Intl` formatters explicitly set `numberingSystem: 'latn'`.
- Do not convert display numbers to Arabic-Indic or Persian digits. Keep Arabic text and RTL layout intact.
- Changing number presentation must not modify stored points, calculations, answer data, media, animations or unrelated exercises.
- Read the relevant project context in `CLAUDE.md` before broader project changes. Preserve the user's requested scope.
