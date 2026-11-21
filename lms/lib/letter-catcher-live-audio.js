/**
 * Corrected recordings must reach resumed rounds without changing their saved
 * questions, choices or progress. Match the teaching target as well as its ID
 * so a teacher's replacement word cannot change a historical question's audio.
 */
export function refreshLcRoundAudio(items, currentWords) {
  if (!Array.isArray(items) || !Array.isArray(currentWords) || !currentWords.length) return items;
  const byId = new Map(currentWords.filter(word => word?.id != null).map(word => [String(word.id), word]));
  let changed = false;
  const refreshed = items.map(item => {
    if (item?.id == null) return item;
    const current = byId.get(String(item.id));
    if (!current || current.word !== item.word || current.missing_letter !== item.missing_letter
        || !Object.prototype.hasOwnProperty.call(current, 'audio_url') || current.audio_url === item.audio_url) return item;
    changed = true;
    return { ...item, audio_url: current.audio_url };
  });
  return changed ? refreshed : items;
}
