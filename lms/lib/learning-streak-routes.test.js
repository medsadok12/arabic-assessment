import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const db=vi.hoisted(()=>({tables:{},user:null,fail:null,seq:0,writes:[],calls:[],race:false}));
vi.mock('./supabase-server',()=>({createClient:()=>({auth:{getUser:async()=>({data:{user:db.user}})}})}));
vi.mock('./active-child',()=>({resolveActiveIdentity:async(u,a,req)=>({effectiveUserId:new URL(req.url).searchParams.get('child')==='child-a'?'child-a':u.id})}));
vi.mock('./supabase-admin',()=>{
 class Q{
 constructor(t){this.t=t;this.filters=[];this.op='read';this.one=false;this.start=0;this.end=Infinity;this.orders=[]}
 select(){return this}eq(k,v){this.filters.push(r=>r[k]===v);return this}like(k,v){this.filters.push(r=>r[k]?.startsWith(v.replace(/%$/,'')));return this}order(k){this.orders.push(k);return this}range(a,b){this.start=a;this.end=b;return this}maybeSingle(){this.one=true;return this}
 insert(p){this.op='insert';this.p=p;return this}upsert(p){this.op='upsert';this.p=p;return this}update(p){this.op='update';this.p=p;return this}
 then(ok,no){return Promise.resolve().then(()=>{db.calls.push(`${this.t}:${this.op}`);if(db.fail===`${this.t}:${this.op}`)return{data:null,error:{code:'FAILED'}};let rows=db.tables[this.t]||=[],matches=rows.filter(r=>this.filters.every(f=>f(r)));
 if(this.op==='insert'||this.op==='upsert'){let out=[];for(const p of Array.isArray(this.p)?this.p:[this.p]){const key=this.t==='game_settings'?'game_id':this.t==='user_points'?'user_id':null,old=key&&rows.find(r=>r[key]===p[key]);if(old){if(this.op==='insert')return{data:null,error:{code:'23505'}};out.push(old);continue}const r={id:String(++db.seq),...structuredClone(p)};rows.push(r);out.push(r)}matches=out;db.writes.push({table:this.t,op:this.op,data:this.p})}
 else if(this.op==='update'){if(this.t==='streak_freezes'&&db.race){db.race=false;rows[0].balance++;return{data:null,error:null}}matches.forEach(r=>Object.assign(r,structuredClone(this.p)));db.writes.push({table:this.t,op:'update',data:this.p})}
 for(const k of this.orders.reverse())matches=matches.toSorted((a,b)=>String(a[k]).localeCompare(String(b[k])));return{data:structuredClone(this.one?matches[0]||null:matches.slice(this.start,this.end+1)),error:null};}).then(ok,no)}
 }return{createAdminClient:()=>({from:t=>new Q(t)})};
});
const{createAdminClient}=await import('./supabase-admin');const{recordLearningDay,loadLearningStreak}=await import('./learning-streak-server');const api=await import('../app/api/streak/route');
const admin=()=>createAdminClient(),now=new Date('2026-10-30T10:00:00Z');
const call=async(method='GET',suffix='')=>{const r=await api[method](new Request(`https://aarem.net/api/streak${suffix}`,{method}));return{status:r.status,body:await r.json()}};
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(now);db.user={id:'student',app_metadata:{role:'student'}};db.fail=null;db.race=false;db.seq=0;db.calls=[];db.writes=[];db.tables={game_settings:[],daily_logs:[],game_results:[],story_reads:[],huroof_progress:[],streak_freezes:[{user_id:'student',balance:2}],user_points:[{user_id:'student',total:100}],points_log:[]}});afterEach(()=>vi.useRealTimers());
const game=(date,user='student')=>db.tables.game_results.push({id:String(++db.seq),user_id:user,played_at:`${date}T10:00:00Z`,total:3});const stock=()=>db.tables.streak_freezes[0].balance;
it('visits cannot record attendance or rewards',async()=>{expect((await call()).body.streak).toBe(0);expect((await call('POST')).body.streak).toBe(0);expect(db.writes).toHaveLength(0)});
it('auth, suspension, staff preview',async()=>{db.user=null;expect((await call()).status).toBe(401);db.user={id:'student',app_metadata:{status:'suspended'}};expect((await call()).status).toBe(401);db.user.app_metadata={role:'teacher'};expect((await call()).body.preview).toBe(true);expect(db.writes).toHaveLength(0)});
it('completed learning bonus only once',async()=>{game('2026-10-30');expect((await call()).body.logged_today).toBe(true);await call();expect(db.tables.points_log).toHaveLength(1);expect(db.tables.user_points[0].total).toBe(110)});
it('does not duplicate an old same-day reward',async()=>{game('2026-10-30');db.tables.points_log.push({user_id:'student',reason:'daily_login:2026-10-30'});await call();expect(db.tables.user_points[0].total).toBe(100)});
it('separate child history',async()=>{game('2026-10-30','child-a');expect((await call()).body.streak).toBe(0);expect((await call('GET','?child=child-a')).body).toMatchObject({streak:1,user_id:'child-a'});expect(db.tables.game_settings.filter(r=>r.game_id.startsWith('attendance-day:student:'))).toHaveLength(0)});
it('idempotent checkpoint uses Qatar day',async()=>{await recordLearningDay(admin(),'student',new Date('2026-10-29T21:10:00Z'));await recordLearningDay(admin(),'student');expect(db.tables.game_settings).toHaveLength(1);expect(db.tables.game_settings[0].settings.date).toBe('2026-10-30')});
it('activity remains after game reset',async()=>{game('2026-10-30');await call();db.tables.game_results=[];expect((await call()).body.total_learning_days).toBe(1)});
it('legacy continuity never fabricated as actual learning',async()=>{db.tables.daily_logs=[{user_id:'student',log_date:'2026-10-30'}];expect((await call()).body).toMatchObject({streak:1,logged_today:false,total_learning_days:0,legacy_days:1})});
it('paginates beyond 1000 rows',async()=>{for(let i=0;i<1001;i++)game('2026-10-29');game('2026-10-30');expect((await call()).body.total_learning_days).toBe(2);expect(db.calls.filter(x=>x==='game_results:read').length).toBe(2)});
it('read errors visible, never reset to zero',async()=>{db.fail='game_results:read';expect((await call()).status).toBe(503);expect(db.writes).toHaveLength(0)});
it('concurrent consumption exactly once',async()=>{game('2026-10-28');game('2026-10-30');await Promise.all([call(),call(),call()]);expect(stock()).toBe(1);const r=await call();expect(r.body).toMatchObject({streak:3,total_learning_days:2});expect(r.body.last_7.at(-2).frozen).toBe(true)});
it('no debit without durable protection journal',async()=>{game('2026-10-28');game('2026-10-30');db.fail='game_settings:insert';await call();expect(stock()).toBe(2)});
it('retry explicit debit failure',async()=>{game('2026-10-28');game('2026-10-30');db.fail='streak_freezes:update';await call();expect(stock()).toBe(2);db.fail=null;expect((await call()).body.streak).toBe(3);expect(stock()).toBe(1)});
it('concurrent purchase preserved',async()=>{game('2026-10-28');game('2026-10-30');db.tables.streak_freezes[0].balance=1;db.race=true;await call();expect(stock()).toBe(1)});
it('no wasted stock for an unbridgeable gap',async()=>{game('2026-10-26');game('2026-10-30');expect((await call()).body.streak).toBe(1);expect(stock()).toBe(2)});
it('staff report has no writes',async()=>{game('2026-10-28');game('2026-10-30');await loadLearningStreak(admin(),'student',{now,applyFreeze:false});expect(db.writes).toHaveLength(0)});
