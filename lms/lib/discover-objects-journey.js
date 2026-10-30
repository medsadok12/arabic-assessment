// مسار المشاهد: إنجازات الخادم هي المرجع، ولا يُمحى فتح مشهد عند إعادة اللعب.
export const DISCOVER_COVERS = Object.fromEntries(['garden', 'bedroom', 'kitchen', 'school', 'market', 'farm', 'beach', 'city', 'forest', 'professions'].map(id => [id, `/discover-objects/covers/${id}.webp`]));
export const discoverSceneCover = scene => scene.cover || DISCOVER_COVERS[scene.id] || scene.background || scene.objects.find(o => o.image)?.image || '/faheem.png';
export function discoverJourney(config, solvedIds = [], preview = false) {
  const solved = new Set(solvedIds);
  let previousComplete = true;
  return config.scenes.filter(s => s.enabled && s.rounds.some(r => r.enabled)).map(scene => {
    const rounds = scene.rounds.filter(r => r.enabled);
    const count = rounds.filter(r => solved.has(r.id)).length;
    const complete = count === rounds.length;
    const unlocked = preview || config.sequentialScenes === false || previousComplete;
    previousComplete = previousComplete && complete;
    return { id: scene.id, complete, unlocked, solved: count, total: rounds.length };
  });
}
