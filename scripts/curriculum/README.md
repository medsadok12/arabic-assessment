# Reviewed picture vocabulary curriculum

The authoritative editable source is `lms/lib/picture-quest-curriculum-data.json`,
transcribed from Arem Academy's reviewed academic plan v1.1 (4 November 2026).
There are 20 ordered worlds, 5/10/15 ordinary entries and 3 reserved enrichment
entries per world. Repeated forms retain `reviewOf`; these are 600 slots, not a
claim of 600 new meanings or an ACTFL/CEFR certification.

`lms/lib/picture-quest-curriculum.js` installs the content once without changing
progress epochs or deleting old word IDs. It preserves teacher uploads and off
switches, and moves superseded entries outside the active curriculum. An empty,
disabled, unmodified built-in seed placeholder in an originally hidden world can
be activated when its actual illustration is supplied. Later teacher saves are
authoritative: the installation marker prevents deleted content from returning.

## Artwork

The checked-in SVG files are served locally. To rebuild from a reviewed manifest:

1. Obtain `@twemoji/svg@15.0.0` from npm and extract it outside the repository.
2. From the repository root, with the existing `lms/node_modules` installed, run:
   `TWEMOJI_SVG_DIR=/path/to/extracted/package node scripts/curriculum/build-art.mjs`
3. Inspect the resulting illustrations, especially arrows, family reference
   trees, part/whole distinctions, professions, seasons and scientific diagrams.

The generator uses the existing React/Lucide dependencies and original SVG
scenes. No remote image request or emoji font is needed when playing. Attribution
is included in `lms/public/picture-quest/curriculum-v1/ATTRIBUTION.txt`.

Teacher recordings are retained but are not synthesized for new words. Content,
media, question prompts and ordering remain editable in the existing teacher UI.
