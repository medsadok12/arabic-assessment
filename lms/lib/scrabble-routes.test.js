import { beforeEach,describe,it,expect,vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { freshScrabble } from './scrabble';
const db=vi.hoisted(()=>({tables:{},user:null,child:null,fail:null,seq:0}));
vi.mock('./supabase-server',()=>({createClient:()=>({auth:{getUser:async()=>({data:{user:db.user}})}})}));
vi.mock('./active-child',()=>({resolveActiveIdentity:async u=>({effectiveUserId:db.child||u.id})}));
vi.mock('./supabase-admin',()=>{
 class Q{
 constructor(t){this.t=t;this.filters=[];this.op='read';this.one=false;}
 select(){return this}eq(k,v){this.filters.push(r=>{const [field,json]=k.split('->>');return String(json?r[field]?.[json]:r[k])===String(v)});return this}maybeSingle(){this.one=true;return this}single(){this.one=true;return this}
 insert(p){this.op='insert';this.p=p;return this}update(p){this.op='update';this.p=p;return this}delete(){this.op='delete';return this}
 then(ok,fail){return Promise.resolve().then(()=>{if(db.fail===`${this.t}:${this.op}`)return{data:null,error:{code:'FAILED'}};let rows=db.tables[this.t]||=[];let matches=rows.filter(r=>this.filters.every(f=>f(r)));if(this.op==='insert'){const key=this.t==='game_settings'?'game_id':this.t==='user_points'?'user_id':null;if(key&&rows.some(r=>r[key]===this.p[key]))return{data:null,error:{code:'23505'}};const r={id:String(++db.seq),...structuredClone(this.p)};rows.push(r);matches=[r]}else if(this.op==='update')matches.forEach(r=>Object.assign(r,structuredClone(this.p)));else if(this.op==='delete')db.tables[this.t]=rows.filter(r=>!matches.includes(r));return{data:structuredClone(this.one?matches[0]||null:matches),error:null}}).then(ok,fail)}
 }
 return{createAdminClient:()=>({from:t=>new Q(t)})};
});
const configApi=await import('../app/api/games/scrabble/route');
const gameApi=await import('../app/api/games/scrabble/session/route');
const request=(body,method='POST',suffix='')=>new Request('https://www.aarem.net/api/games/scrabble'+suffix,{method,body:body===null?undefined:JSON.stringify(body)});
async function call(body,api=gameApi,method='POST',suffix=''){const r=await api[method](request(body,method,suffix));return {status:r.status,body:await r.json(),headers:r.headers}}
const start=async()=>{const r=await call({action:'start',boardId:'first-garden'});expect(r.status).toBe(200);return r.body};
const answer=(s,placements=[{pos:20,char:'ا'},{pos:26,char:'ب'}],index=0)=>({action:'answer',sessionId:s.sessionId,index,requestId:randomUUID(),placements});
const hint=s=>({action:'hint',sessionId:s.sessionId,index:0,pos:20});
const balance=()=>db.tables.user_points.find(r=>r.user_id===(db.child||db.user.id))?.total;
beforeEach(()=>{db.user={id:'student',app_metadata:{role:'student'}};db.child=null;db.fail=null;db.seq=0;db.tables={game_settings:[],user_points:[{user_id:'student',total:40}],points_log:[],game_results:[]}});
describe('مسارات السكرابل والنقاط',()=>{
 it('يرفض غير المسجل ويمنع الطالب من التحرير',async()=>{db.user=null;expect((await call(null,configApi,'GET')).status).toBe(401);db.user={id:'student',app_metadata:{role:'student'}};expect((await call({config:freshScrabble()},configApi,'PUT')).status).toBe(403);expect((await call(null,configApi,'GET','?manage=1')).status).toBe(403)});
 it('يرفض الدور المزيّف في بيانات المستخدم والحساب الموقوف',async()=>{db.user={id:'student',user_metadata:{role:'admin'}};expect((await call(null,configApi,'GET')).status).toBe(401);db.user={id:'student',app_metadata:{role:'student',status:'suspended'}};expect((await call(null,configApi,'GET')).status).toBe(401)});
 it('يقرأ إعدادات حيّة بلا كاش',async()=>{const r=await call(null,configApi,'GET');expect(r.body.config.title).toBe('سكرابل الصغار');expect(r.headers.get('Cache-Control')).toContain('no-store')});
 it('المسوّدة شخصية ولا تغيّر المنشور والحفظ المشروط يمنع الكتابة فوق زميل',async()=>{db.user={id:'teacher',app_metadata:{role:'teacher'}};const c=freshScrabble();c.title='مسوّدة';let d=await call({config:c,version:null,draftVersion:null,action:'draft'},configApi,'PUT');expect(d.status).toBe(200);expect((await call(null,configApi,'GET')).body.config.title).toBe('سكرابل الصغار');expect((await call(null,configApi,'GET','?manage=1')).body.config.title).toBe('مسوّدة');const p=await call({...d.body,action:'publish'},configApi,'PUT');expect(p.status).toBe(200);expect((await call(null,configApi,'GET')).body.config.title).toBe('مسوّدة');expect((await call({config:c,version:null,draftVersion:null,action:'publish'},configApi,'PUT')).status).toBe(409)});
 it('يرفض التعارض الهندسي قبل حفظ الإعدادات',async()=>{db.user={id:'teacher',app_metadata:{role:'teacher'}};const c=freshScrabble();c.boards[0].rounds[0].row=5;expect((await call({config:c,version:null,draftVersion:null,action:'publish'},configApi,'PUT')).status).toBe(400);expect(db.tables.game_settings).toHaveLength(0)});
 it('يأخذ رصيدًا موحّدًا حقيقيًا ويخصم المساعدة مرة واحدة',async()=>{const s=await start();expect(s.points).toBe(40);const h=await call({...hint(s),helpCost:-500});expect(h.body.hint).toEqual({pos:20,char:'ا'});expect(balance()).toBe(35);expect((await call(hint(s))).body.hint.char).toBe('ا');expect(balance()).toBe(35);expect(db.tables.points_log.filter(r=>r.delta<0)).toHaveLength(1)});
 it('لا يخصم عند نقص الرصيد وتعمل المساعدة بعد اكتساب نقاط',async()=>{db.tables.user_points[0].total=0;const s=await start();expect((await call(hint(s))).body.state).toBe('insufficient');expect(balance()).toBe(0);db.tables.user_points[0].total=10;expect((await call(hint(s))).body.hint.char).toBe('ا');expect(balance()).toBe(5)});
 it('يرفض المساعدة خارج الجولة ولا يثق بخانة من المتصفح',async()=>{const s=await start();expect((await call({...hint(s),index:1})).status).toBe(409);expect((await call({...hint(s),pos:0})).status).toBe(400);expect(balance()).toBe(40)});
 it('يفحص الكلمة المكتملة ويمنع مكافأة الخطأ أو القفز على الكلمات',async()=>{const s=await start();expect((await call(answer(s,undefined,1))).status).toBe(409);let wrong=await call(answer(s,[{pos:20,char:'ب'},{pos:26,char:'ا'}]));expect(wrong.body.right).toBe(false);expect(wrong.body.cursor).toBe(0);expect(balance()).toBe(40);const right=await call(answer(s));expect(right.body.right).toBe(true);expect(right.body.cursor).toBe(1);expect(balance()).toBe(43)});
 it('لا يمنح الكلمة نفسها مرتين بإعادة الإرسال أو ببدء جلسة جديدة',async()=>{const s=await start(),a=answer(s);await call(a);await call(a);expect(balance()).toBe(43);const s2=await start();await call(answer(s2));expect(balance()).toBe(43)});
 it('يربط معرف المحاولة بمحتواها ولا يقبل إعادة استعماله لإجابة أخرى',async()=>{const s=await start(),a=answer(s);await call(a);expect((await call({...a,placements:[{pos:20,char:'ب'},{pos:26,char:'ا'}]})).status).toBe(409)});
 it('يعزل الطفل النشط ويمنع جلسة أخيه',async()=>{db.child='child-a';db.tables.user_points.push({user_id:'child-a',total:20},{user_id:'child-b',total:70});const s=await start();await call(hint(s));expect(balance()).toBe(15);db.child='child-b';expect((await call(hint(s))).status).toBe(404);expect(balance()).toBe(70)});
 it('معاينة المعلم لا تحفظ جلسة أو نتيجة ولا تخصم رصيدًا',async()=>{db.user={id:'teacher',app_metadata:{role:'teacher'}};const s=await start();expect(s.preview).toBe(true);expect(db.tables.game_settings).toHaveLength(0);expect((await call(hint(s))).status).toBe(403);expect(db.tables.points_log).toHaveLength(0)});
 it('يرفض حروفًا ليست من الصندوق والطلبات الناقصة',async()=>{const s=await start();expect((await call(answer(s,[{pos:20,char:'ز'},{pos:26,char:'ب'}]))).status).toBe(400);expect((await call(answer(s,[]))).status).toBe(400);expect(balance()).toBe(40)});
 it('فشل الرصيد لا يخصم شيئًا ولا يمنح مساعدة مجانًا',async()=>{const s=await start();db.fail='user_points:update';expect((await call(hint(s))).status).toBe(409);expect(balance()).toBe(40);db.fail=null;expect((await call(hint(s))).body.hint.char).toBe('ا');expect(balance()).toBe(35)});
 it('فشل قراءة المحتوى لا يرجع إعدادات افتراضية تتجاوز تعطيل المعلم',async()=>{db.fail='game_settings:read';expect((await call(null,configApi,'GET')).status).toBe(503)});
});
