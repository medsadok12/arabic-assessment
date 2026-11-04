// A tab-local invalidation timestamp, never student data. A prefetched page may
// be restored by the router after play; do not trust its older progress snapshot.
let changedAt=0;
export function invalidateTopicCatalog(){changedAt=Date.now()}
export function topicCatalogIsFresh(loadedAt){
 const age=Date.now()-loadedAt;
 return Number.isFinite(loadedAt)&&age>=0&&age<15000&&loadedAt>=changedAt;
}
