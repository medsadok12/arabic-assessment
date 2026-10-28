// Prototype state only. Never reused by the production reader, points or reports.
export const STORY_PREVIEW_VERSION = 1;
export const STORY_WORLDS = [
  { id: 'adventure', name: 'مغامرات واكتشاف', icon: '🧭' },
  { id: 'family', name: 'أسرتي وأصدقائي', icon: '🏡' },
  { id: 'nature', name: 'حيوانات وطبيعة', icon: '🌿' },
  { id: 'other', name: 'حكايات متنوعة', icon: '📚' },
];
export const emptyStoryPreview = () => ({ version: STORY_PREVIEW_VERSION, favorites: [], finished: [], bookmarks: {}, notes: {}, reflections: {} });
export const storySearchText = value => String(value || '').normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase();
export function proposedStoryWorld(story) {
  const title = storySearchText(story.title);
  if (title.includes('مريم') || title.includes('زقزوق')) return 'nature';
  if (title.includes('راشد')) return 'family';
  if (title.includes('فهيم')) return 'adventure';
  return 'other';
}
export function normalizeStoryPreview(raw, stories) {
  const clean = emptyStoryPreview();
  if (!raw || raw.version !== STORY_PREVIEW_VERSION) return clean;
  const ids = new Set(stories.map(s => String(s.id)));
  for (const key of ['favorites', 'finished']) clean[key] = [...new Set((Array.isArray(raw[key]) ? raw[key] : []).filter(id => ids.has(id)))];
  for (const id of ids) {
    const b = raw.bookmarks?.[id];
    if (b && Number.isInteger(b.page) && b.page >= 0 && Number.isInteger(b.total) && b.total > b.page && b.total <= 300 && typeof b.version === 'string') {
      clean.bookmarks[id] = { page: b.page, total: b.total, version: b.version.slice(0, 150), at: Number.isFinite(b.at) ? b.at : 0 };
    }
    const n = raw.notes?.[id];
    if (n && typeof n.blurb === 'string' && STORY_WORLDS.some(w => w.id === n.world)) clean.notes[id] = { blurb: n.blurb.slice(0, 240), world: n.world };
    if (typeof raw.reflections?.[id] === 'string') clean.reflections[id] = raw.reflections[id].slice(0, 160);
  }
  return clean;
}
export function previewResumePage(bookmark, version, total) {
  return bookmark && bookmark.version === version && Number.isInteger(bookmark.page) && bookmark.page >= 0 && bookmark.page < total ? bookmark.page : 0;
}
