// Suggestions are the reviewed document lists; adding/removing still requires a teacher save.
import {bankKey} from './picture-quest-bank';
import data from './picture-quest-curriculum-data.json';
export function suggestedStageWords(bank,topicId,stage){
 const world=data.worlds.find(t=>t.id===topicId),existing=new Set(bank.words.filter(w=>w.topicId===topicId&&!w.curriculumExcluded).map(w=>bankKey(w.label)));
 return (world?.words||[]).filter(w=>w.stage===stage&&!existing.has(bankKey(w.label))).map(w=>w.label);
}
