/**
 * Keep a resumed round's grading/order/audio snapshot intact while refreshing
 * only its picture from the current word bank. A changed word is a different
 * teaching target, so its historical round keeps its original illustration.
 */
export function refreshLcRoundImages(items, currentWords) {
  if (!Array.isArray(items) || !Array.isArray(currentWords) || !currentWords.length) return items;
  const byId = new Map(currentWords.filter(word => word?.id != null).map(word => [String(word.id), word]));
  let changed = false;
  const refreshed = items.map(item => {
    if (item?.id == null) return item;
    const current = byId.get(String(item.id));
    if (!current || current.word !== item.word || current.missing_letter !== item.missing_letter
        || !Object.prototype.hasOwnProperty.call(current, 'image_url') || current.image_url === item.image_url) return item;
    changed = true;
    return { ...item, image_url: current.image_url };
  });
  return changed ? refreshed : items;
}
