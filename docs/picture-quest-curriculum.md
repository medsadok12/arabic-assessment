# Picture quest academic curriculum v1.1 implementation

Scope: only the existing topic-based Discover Picture exercise. Other games,
readers, points configuration, recorded audio and completion celebrations remain.

The source manifest is `lms/lib/picture-quest-curriculum-data.json`: 20 worlds in
document order, 600 ordinary slots (5/10/15) and 60 optional final enrichment slots.
Repeated vocabulary is explicitly allowed across worlds for review; duplicates
within an active world remain invalid. These numbers are local design decisions,
not official ACTFL/CEFR proficiency levels or certification.

## Installation and continuity

`installQuestCurriculum` runs only when `curriculumVersion < 1`. It keeps stable
IDs for matched old words and preserves uploads, recording URLs, media switches,
stage switches, reward settings and progress epochs. Built-in seed placeholders
can receive their first real illustration. Old unmatched words are retained with
`curriculumExcluded` rather than deleted. Existing saved attempts keep their own
question snapshots; old stage completions remain game completions, not new
claims that every revised word has been assessed independently.

Only the published bank's content is updated. No student progress, results,
mastery records or points are bulk rewritten. Root settings use an updated_at
compare-and-swap on installation to reject concurrent teacher edits. Drafts are
not overwritten. Teacher saves after installation are authoritative, including
removal, disabling and custom world ordering.

## Runtime and teacher controls

The existing map uses the new order while retaining each world's stable sprite
index. Sequential access remains; already started worlds keep their access.
Stages start in document vocabulary order, with two answer choices. Teachers
can still enable the existing shuffle switch; disabling it restores document order. Curated
choices avoid sorting the entire vocabulary bank for every question. The child
catalog contains world/stage summaries, never the 660-word editor bank.

Prompts distinguish colours, shapes, activities and relationship diagrams.
The teacher editor supports per-word prompts and ordering, original upload and
enable/disable controls, and restoration of archived words. All 660 SVGs are
self-hosted, with local attribution; no remote image dependency or synthesized
voice is introduced. New words without uploaded teacher recordings remain silent.

Family trees, parts, seasons, professions and scientific illustrations need the
teacher's usual semantic review with learners; game completion is not a general
language proficiency score. Reserved unseen words remain enrichment.

## Verification

Automated tests cover all 60 stages, exact counts, scoped duplicates, two choices,
reserved-word isolation, editable metadata, independent switches, preserved IDs
and uploads, non-resurrection after edits, sequential access, old progress and
read-only previews. All SVGs parse successfully. Browser checks cover full-screen
map and entrance, question preparation, two options, and return to stages/map on
mobile, tablet and desktop. Assets are checked with a complete labelled gallery.

The public SVG whitelist is restricted to the dedicated curriculum-v1 path; path
traversal, arbitrary nested directories and remote URLs remain rejected.
