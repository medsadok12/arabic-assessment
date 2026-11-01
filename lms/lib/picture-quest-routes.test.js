import { beforeEach,describe,it,expect,vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import {freshPictureQuest,PICTURE_QUEST_ID} from './picture-quest';
const db=vi.hoisted(()=>({tables:{},user:null,child:null,fail:null,seq:0}));
vi.mock('./supabase-server',()=>({createClient:()=>({auth:{getUser:async()=>({data:{user:db.user}})}})}));
vi.mock('./active-child',()=>({resolveActiveIdentity:async u=>({effectiveUserId:db.child||u.id})}));
vi.mock('./supabase-admin',()=>{
 class Q{
 constructor(t){this.t=t;this.filters=[];this.op='read';this.one=false;}
 select(){return this}eq(k,v){this.filters.push(r=>{const [field,json]=k.split('->>');return String(json?r[field]?.[json]:r[k])===String(v)});return this}maybeSingle(){this.one=true;return this}single(){this.one=true;return this}
 insert(p){this.op='insert';this.p=p;return this}update(p){this.op='update';this.p=p;return this}delete(){this.op='delete';return this}
 then(ok,fail){return Promise.resolve().then(async()=>{if(this.t==='game_settings'&&this.op==='update'&&db.holdProgress)await db.holdProgress;if(this.t==='user_points'&&this.op==='update'&&db.holdReward)await db.holdReward;if(db.fail===`${this.t}:${this.op}`)return{data:null,error:{code:'FAILED'}};let rows=db.tables[this.t]||=[];let matches=rows.filter(r=>this.filters.every(f=>f(r)));if(this.op==='insert'){const key=this.t==='game_settings'?'game_id':this.t==='user_points'?'user_id':null;if(key&&rows.some(r=>r[key]===this.p[key]))return{data:null,error:{code:'23505'}};const r={id:String(++db.seq),...structuredClone(this.p)};rows.push(r);matches=[r]}else if(this.op==='update')matches.forEach(r=>Object.assign(r,structuredClone(this.p)));else if(this.op==='delete')db.tables[this.t]=rows.filter(r=>!matches.includes(r));return{data:structuredClone(this.one?matches[0]||null:matches),error:null}}).then(ok,fail)}
 }
 return{createAdminClient:()=>({from:t=>new Q(t)})};
});
const configApi=await import('../app/api/games/picture-quest/route');
const gameApi=await import('../app/api/games/picture-quest/session/route');
const request=(body,method='POST',suffix='')=>new Request('https://www.aarem.net/api/games/picture-quest'+suffix,{method,body:body===null?undefined:JSON.stringify(body)});
async function call(body,api=gameApi,method='POST',suffix=''){const r=await api[method](request(body,method,suffix));return {status:r.status,body:await r.json(),headers:r.headers}}
const student='11111111-1111-4111-8111-111111111111';
const teacher='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{db.user={id:student,app_metadata:{role:'student'}};db.child=null;db.fail=null;db.seq=0;db.holdReward=null;db.holdProgress=null;db.tables={game_settings:[],user_points:[{user_id:student,total:40}],points_log:[],game_results:[]}});
const start=async()=>{const r=await call({action:'start'});expect(r.status).toBe(200);return r.body};
const answer=(s,choiceId='choice-1')=>({action:'answer',sessionId:s.sessionId,requestId:randomUUID(),choiceId});
const hint=s=>({action:'hint',sessionId:s.sessionId});
const balance=()=>db.tables.user_points.find(x=>x.user_id===(db.child||student))?.total;
function publishConfig(config){const row=db.tables.game_settings.find(r=>r.game_id===PICTURE_QUEST_ID);if(row)row.settings=config;else db.tables.game_settings.push({game_id:PICTURE_QUEST_ID,settings:config,updated_at:'2026-10-29T10:00:00Z'})}
describe('permissions and drafts',()=>{
 it('rejects unauthenticated, forged role, suspended users and student editing',async()=>{db.user=null;expect((await call(null,configApi,'GET')).status).toBe(401);db.user={id:student,user_metadata:{role:'admin'}};expect((await call(null,configApi,'GET')).status).toBe(401);db.user={id:student,app_metadata:{role:'student',status:'suspended'}};expect((await call(null,configApi,'GET')).status).toBe(401);db.user={id:student,app_metadata:{role:'student'}};expect((await call(null,configApi,'GET','?manage=1')).status).toBe(403);expect((await call({config:freshPictureQuest()},configApi,'PUT')).status).toBe(403)});
 it('keeps the catalog private and supplies feedback only for the active question without caching',async()=>{const r=await call(null,configApi,'GET');expect(r.headers.get('cache-control')).toContain('no-store');expect(r.body.config.questions).toBeUndefined();const s=await start();for(const k of['correctId','answer_audio','hint'])expect(s.question[k]).toBeUndefined();expect(s.feedback.correctChoiceId).toBe('choice-1');expect(s.feedback.word).toBe(s.question.options[1].label);expect(s.feedback.questions).toBeUndefined()});
 it('isolates drafts and prevents overwriting a newer version',async()=>{db.user={id:teacher,app_metadata:{role:'teacher'}};const c=freshPictureQuest();c.title='صور جديدة';const draft=await call({config:c,action:'draft',version:null,draftVersion:null},configApi,'PUT');expect(draft.status).toBe(200);expect((await call(null,configApi,'GET')).body.config.title).not.toBe(c.title);expect((await call(null,configApi,'GET','?manage=1')).body.config.title).toBe(c.title);db.user={id:'33333333-3333-4333-8333-333333333333',app_metadata:{role:'teacher'}};expect((await call(null,configApi,'GET','?manage=1')).body.config.title).not.toBe(c.title);db.user={id:teacher,app_metadata:{role:'teacher'}};expect((await call({...draft.body,action:'publish'},configApi,'PUT')).status).toBe(200);expect((await call({config:c,action:'publish',version:null,draftVersion:null},configApi,'PUT')).status).toBe(409)});
 it('staff preview cannot grant points',async()=>{db.user={id:teacher,app_metadata:{role:'teacher'}};expect((await call({action:'start'})).status).toBe(403);expect(db.tables.points_log).toHaveLength(0)});
 it('disabled game and failed database reads fail closed',async()=>{const c=freshPictureQuest();c.enabled=false;publishConfig(c);expect((await call({action:'start'})).status).toBe(409);db.fail='game_settings:read';expect((await call(null,configApi,'GET')).status).toBe(503)});
});
describe('authoritative quiz sessions',()=>{
 it('validates answers and ignores forged rewards',async()=>{const s=await start();expect((await call(answer(s,'fake'))).status).toBe(400);expect((await call(answer(s,'choice-0'))).body.right).toBe(false);expect(balance()).toBe(40);const right=await call({...answer(s),reward:99999});expect(right.body.right).toBe(true);expect(right.body.reward).toBe(10);expect(right.body.assisted).toBe(true);expect(balance()).toBe(50);expect((await start()).question.id).toBe('apple')});
 it('streams a persisted verified answer before the point write completes',async()=>{const s=await start();let release;db.holdReward=new Promise(resolve=>{release=resolve});const response=await gameApi.POST(request({...answer(s),stream:true})),reader=response.body.getReader();expect(response.headers.get('content-type')).toContain('application/x-ndjson');const first=JSON.parse(new TextDecoder().decode((await reader.read()).value).trim());expect(first.type).toBe('verified');expect(first.data.right).toBe(true);expect(first.data.points).toBeUndefined();expect(balance()).toBe(40);release();let tail='';while(true){const part=await reader.read();if(part.done)break;tail+=new TextDecoder().decode(part.value)}expect(JSON.parse(tail.trim()).data.points).toBe(50);expect(balance()).toBe(50)});
 it('concurrent submissions and retries cannot duplicate rewards',async()=>{const s=await start(),body=answer(s);await Promise.all([call(body),call(body)]);await call(body);expect(balance()).toBe(50);expect(db.tables.points_log).toHaveLength(1);expect((await call({...body,choiceId:'choice-0'})).status).toBe(409)});
 it('hint is free and stable across retries',async()=>{const s=await start(),h=await call(hint(s));expect(h.status).toBe(200);expect(h.body.rejected).toHaveLength(1);expect(h.body.rejected).not.toContain('choice-1');expect((await call(hint(s))).body.rejected).toEqual(h.body.rejected);expect(balance()).toBe(40);expect((await start()).hintUsed).toBe(true);expect((await call(answer(s))).body.assisted).toBe(true)});
 it('isolates children and rejects stale sessions',async()=>{db.child='33333333-3333-4333-8333-333333333333';db.tables.user_points.push({user_id:db.child,total:0});const a=await start();await call(answer(a));expect(balance()).toBe(10);db.child='44444444-4444-4444-8444-444444444444';expect((await start()).question.id).toBe('cat');expect((await call(answer(a))).status).toBe(409);expect(balance()).toBeUndefined()});
 it('changed question invalidates stale answer',async()=>{const s=await start(),c=freshPictureQuest();c.questions[0].image_url='/picture-quest/apple.svg';publishConfig(c);expect((await call(answer(s))).status).toBe(409)});
 it('replay has no new rewards or duplicate results',async()=>{const c=freshPictureQuest();c.questions=c.questions.slice(0,1);publishConfig(c);let s=await start();await call(answer(s));expect((await start()).finished).toBe(true);expect(db.tables.game_results).toHaveLength(1);s=(await call({action:'replay'})).body;expect(s.review).toBe(true);expect((await call(answer(s))).body.reward).toBe(0);expect(balance()).toBe(50);expect(db.tables.game_results).toHaveLength(1)});
 it('resumes reward after a failed point write',async()=>{const s=await start();db.fail='user_points:update';expect((await call(answer(s))).status).toBe(409);expect(balance()).toBe(40);db.fail=null;expect((await start()).question.id).toBe('apple');expect(balance()).toBe(50);await start();expect(balance()).toBe(50)});
});

describe('correctness is independent of storage latency',()=>{
 it.each(['choice-1','choice-0'])('streams checked feedback for %s while progress persistence is stalled',async choice=>{
  const s=await start();let release;db.holdProgress=new Promise(resolve=>{release=resolve});
  const response=await gameApi.POST(request({...answer(s,choice),stream:true})),reader=response.body.getReader();
  const early=JSON.parse(new TextDecoder().decode((await reader.read()).value).trim());expect(early.type).toBe('verified');expect(early.data.right).toBe(choice==='choice-1');expect(early.data.points).toBeUndefined();expect(balance()).toBe(40);expect(db.tables.game_settings.find(r=>r.game_id.includes(':progress:')).settings.completed).toHaveLength(0);
  release();let tail='';while(true){const p=await reader.read();if(p.done)break;tail+=new TextDecoder().decode(p.value)}expect(JSON.parse(tail.trim()).type).toBe('result');
 });
 it('does not send a solution or reward for an invalid option or session',async()=>{
  const s=await start();for(const body of [{...answer(s),choiceId:'forged'},{...answer(s),sessionId:randomUUID()}]){
   const response=await gameApi.POST(request({...body,stream:true}));const lines=(await response.text()).trim().split('\n').map(JSON.parse);expect(lines.map(e=>e.type)).toEqual(['error']);expect(balance()).toBe(40);
  }
 });
});

describe('prepared next-question sessions',()=>{
 it('preloads only the upcoming image and persists an immediately usable successor with the answer',async()=>{
  const s=await start();expect(s.upcomingImage).toBe('/picture-quest/apple.svg');
  const a=(await call(answer(s))).body;expect(a.next.question.id).toBe('apple');expect(a.next.sessionId).not.toBe(s.sessionId);expect(a.next.points).toBe(50);expect(a.next.upcomingImage).toBe('/picture-quest/book.svg');
  const second=await call(answer(a.next,'choice-2'));expect(second.status).toBe(200);expect(second.body.right).toBe(true);expect(second.body.next.question.id).toBe('book');expect(balance()).toBe(60);
 });
 it('keeps the successor nonce stable when an answer is retried or the page resumes',async()=>{
  const s=await start(),body=answer(s),a=(await call(body)).body,b=(await call(body)).body;
  expect(b.next.sessionId).toBe(a.next.sessionId);expect((await start()).sessionId).toBe(a.next.sessionId);expect(balance()).toBe(50);expect(db.tables.points_log).toHaveLength(1);
 });
 it('does not prepare the next question after a wrong answer',async()=>{
  const s=await start(),a=(await call(answer(s,'choice-0'))).body;expect(a.next).toBeUndefined();expect((await start()).sessionId).toBe(s.sessionId);
 });
 it('supports completion and an entire review using prepared sessions without repeated rewards',async()=>{
  const c=freshPictureQuest();c.questions=c.questions.slice(0,2);publishConfig(c);
  let s=await start();s=(await call(answer(s))).body.next;s=(await call(answer(s,'choice-2'))).body.next;expect(s.finished).toBe(true);expect(s.upcomingImage).toBe('');expect(s.independent).toBe(2);expect(balance()).toBe(60);
  s=(await call({action:'replay'})).body;expect(s.review).toBe(true);s=(await call(answer(s))).body.next;expect(s.review).toBe(true);s=(await call(answer(s,'choice-2'))).body.next;expect(s.finished).toBe(true);expect(s.review).toBe(true);expect(balance()).toBe(60);expect(db.tables.game_results).toHaveLength(1);
 });
 it('rejects a prepared session if the teacher changes its question before the next answer',async()=>{
  const s=await start(),next=(await call(answer(s))).body.next,c=freshPictureQuest();c.questions[1].prompt='سؤال محدّث';publishConfig(c);expect((await call(answer(next,'choice-2'))).status).toBe(409);expect(balance()).toBe(50);
 });
});
