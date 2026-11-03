import{freshQuestBank,stageReadiness,stageWords,bankQuestion}from'./picture-quest-bank';
import{freshPictureQuest}from'./picture-quest';
import{completeQuestWorlds}from'./picture-quest-content-pack';
// Staff-only read-only construction. Never alters published content or progress.
export function buildQuestStaffPreview(bank,{topicId,stage}){
 const topic=bank.topics.find(t=>t.id===topicId),final=topicId==='final'&&stage===4;
 if(!final&&(!topic||![1,2,3].includes(stage)))throw Object.assign(Error('اختر عالمًا ومرحلة صحيحة للمعاينة.'),{status:400});
 let demo=false,samples;
 function group(t,n){let source=bank,id=t.id;if(!stageReadiness(bank,id,n).ready){demo=true;samples??=completeQuestWorlds(freshQuestBank(),freshPictureQuest());source=samples;id=['animals','fruit','school'].includes(t.id)?t.id:'animals';}return stageWords(source,id,n,'staff-preview').map(w=>({...bankQuestion(source,w,w.level,'staff-preview'),id:'preview-'+t.id+'-'+w.id}));}
 const groups=final?bank.topics.filter(t=>t.enabled).map(t=>group(t,4)):[group(topic,stage)];
 const questions=final?Array.from({length:3},(_,i)=>groups.map(g=>g[i]).filter(Boolean)).flat():groups[0];
 if(!questions.length)throw Object.assign(Error('أضف عالمًا للمعاينة أولًا.'),{status:409});
 return{demo,config:{...freshPictureQuest(),title:final?'مرحلة الأذكياء':topic.title+' · المرحلة '+stage,subtitle:demo?'كلمات تجريبية للمعاينة · بلا نقاط فعلية':'معاينة بلا نقاط فعلية',settings:structuredClone(bank.settings),questions}};
}
