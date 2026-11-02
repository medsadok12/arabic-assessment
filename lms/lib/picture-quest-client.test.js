// @vitest-environment jsdom
import{afterEach,beforeEach,describe,it,expect,vi}from'vitest';
import{mountPictureQuest}from'./picture-quest-client';
import{freshPictureQuest,publicQuestQuestion}from'./picture-quest';
import{QUEST_MARKUP}from'./picture-quest-shell';
const sound=vi.hoisted(()=>({unlock:vi.fn(),preload:vi.fn(),prepare:vi.fn(),stop:vi.fn(),effect:vi.fn(),tick:vi.fn(),success:vi.fn().mockResolvedValue(true),dispose:vi.fn()}));
vi.mock('./picture-quest-audio',()=>({createQuestAudio:()=>sound}));
let dispose;
beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('requestAnimationFrame',cb=>setTimeout(()=>cb(0),16));vi.stubGlobal('cancelAnimationFrame',clearTimeout);document.body.innerHTML=QUEST_MARKUP;});
afterEach(()=>{dispose?.();dispose=null;vi.useRealTimers();vi.unstubAllGlobals()});
describe('responsive picture quest interaction',()=>{
 it('acknowledges a touch immediately without announcing correctness before verification',async()=>{const c=freshPictureQuest(),root=document.querySelector('#arem-quest');let resolveAnswer;const request=vi.fn(body=>body.action==='start'?Promise.resolve({question:publicQuestQuestion(c.questions[0]),settings:c.settings,index:0,total:6,points:0,sessionId:'session',title:c.title}):new Promise(resolve=>{resolveAnswer=resolve}));dispose=mountPictureQuest(root,{request});await Promise.resolve();const b=root.querySelectorAll('.answer')[1];b.click();expect(b.classList.contains('pending-choice')).toBe(true);expect(b.classList.contains('correct')).toBe(false);expect(root.getAttribute('aria-busy')).toBe('true');resolveAnswer({right:true,word:'قِطٌّ',points:10,reward:10});await Promise.resolve();expect(b.classList.contains('pending-choice')).toBe(false);expect(b.classList.contains('correct')).toBe(true);expect(root.hasAttribute('aria-busy')).toBe(false);expect(root.querySelector('.particles').children).toHaveLength(0);await vi.advanceTimersByTimeAsync(16);expect(root.querySelectorAll('.fx-star')).toHaveLength(c.settings.stars)});
 it('shows server-verified correctness before reward completion without granting points or advancing',async()=>{const c=freshPictureQuest(),root=document.querySelector('#arem-quest');let verify,complete;const onPoints=vi.fn(),request=(body,onVerified)=>body.action==='start'?Promise.resolve({question:publicQuestQuestion(c.questions[0]),settings:c.settings,index:0,total:6,points:40,title:c.title}):new Promise(resolve=>{verify=onVerified;complete=resolve});dispose=mountPictureQuest(root,{request,onPoints});await Promise.resolve();onPoints.mockClear();const b=root.querySelectorAll('.answer')[1];b.click();verify({right:true,word:'قِطٌّ',answer_audio:'/picture-quest/cat.mp3'});expect(b.classList.contains('correct')).toBe(true);expect(root.querySelector('.score strong').textContent).toBe('40');expect(root.querySelector('.next').disabled).toBe(true);expect(onPoints).not.toHaveBeenCalled();expect(sound.success).toHaveBeenCalledTimes(1);complete({right:true,word:'قِطٌّ',answer_audio:'/picture-quest/cat.mp3',points:50,reward:10});await Promise.resolve();expect(root.querySelector('.score strong').textContent).toBe('50');expect(root.querySelector('.next').disabled).toBe(false);expect(sound.success).toHaveBeenCalledTimes(1)});
 it('does not initialize audio on a muted touch response',()=>{const c=freshPictureQuest();c.settings.sound=false;dispose=mountPictureQuest(document.querySelector('#arem-quest'),{staff:true,config:c});document.querySelectorAll('.answer')[1].click();expect(sound.unlock).not.toHaveBeenCalled();expect(sound.effect).not.toHaveBeenCalled();expect(sound.success).not.toHaveBeenCalled();expect(document.querySelectorAll('.answer')[1].classList.contains('correct')).toBe(true)});
 it('prepares teacher narration before the answer and keeps the configured delay',()=>{const c=freshPictureQuest();c.questions[0].answer_audio='/picture-quest/cat.mp3';c.settings.answerDelayMs=1000;dispose=mountPictureQuest(document.querySelector('#arem-quest'),{staff:true,config:c});expect(sound.prepare).toHaveBeenCalledWith('/picture-quest/cat.mp3');document.querySelectorAll('.answer')[1].click();expect(sound.success).toHaveBeenCalledWith('','/picture-quest/cat.mp3',1000)});
 it('cancels queued celebration frames when moving to the next question',async()=>{dispose=mountPictureQuest(document.querySelector('#arem-quest'),{staff:true,config:freshPictureQuest()});document.querySelectorAll('.answer')[1].click();document.querySelector('.next').click();await vi.advanceTimersByTimeAsync(16);expect(document.querySelectorAll('.fx-star')).toHaveLength(0);expect(document.querySelector('.picture').classList.contains('pop')).toBe(false)});
 it('releases pending acknowledgement after a network failure',async()=>{const c=freshPictureQuest(),root=document.querySelector('#arem-quest');const request=body=>body.action==='start'?Promise.resolve({question:publicQuestQuestion(c.questions[0]),settings:c.settings,index:0,total:6,points:0,title:c.title}):Promise.reject(Error('retry'));dispose=mountPictureQuest(root,{request});await Promise.resolve();const b=root.querySelectorAll('.answer')[1];b.click();await Promise.resolve();expect(b.classList.contains('pending-choice')).toBe(false);expect(b.classList.contains('correct')).toBe(false);expect(root.hasAttribute('aria-busy')).toBe(false);expect(b.disabled).toBe(false)});
});

const pointer=(target,type,extra={})=>{const e=new Event(type,{bubbles:true});Object.assign(e,{pointerType:'touch',pointerId:1,isPrimary:true,clientX:20,clientY:20,...extra});target.dispatchEvent(e)};
describe('mobile pointer input',()=>{
 it('submits on touch release before click and ignores the duplicate synthesized click',async()=>{
  const c=freshPictureQuest(),root=document.querySelector('#arem-quest');const request=vi.fn(body=>body.action==='start'?Promise.resolve({question:publicQuestQuestion(c.questions[0]),settings:c.settings,index:0,total:6,points:40,title:c.title}):new Promise(()=>{}));
  dispose=mountPictureQuest(root,{request});await Promise.resolve();const b=root.querySelectorAll('.answer')[1];
  pointer(b,'pointerdown');expect(b.classList.contains('touch-pressed')).toBe(true);expect(request).toHaveBeenCalledTimes(1);
  pointer(b,'pointerup');expect(request).toHaveBeenCalledTimes(2);expect(b.classList.contains('pending-choice')).toBe(true);expect(b.classList.contains('touch-pressed')).toBe(false);
  b.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));expect(request).toHaveBeenCalledTimes(2);
 });
 it.each(['pointermove','pointercancel','pointerleave'])('does not submit when a touch is cancelled by %s or scrolling',async type=>{
  const c=freshPictureQuest(),root=document.querySelector('#arem-quest');const request=vi.fn(()=>Promise.resolve({question:publicQuestQuestion(c.questions[0]),settings:c.settings,index:0,total:6,points:0,title:c.title}));
  dispose=mountPictureQuest(root,{request});await Promise.resolve();const b=root.querySelector('.answer');pointer(b,'pointerdown');pointer(b,type,{clientY:80});pointer(b,'pointerup');b.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));expect(request).toHaveBeenCalledTimes(1);expect(b.classList.contains('touch-pressed')).toBe(false);
 });
 it('shows an early wrong answer once, keeps saving locked, and unlocks the other choices after persistence',async()=>{
  const c=freshPictureQuest(),root=document.querySelector('#arem-quest');let verify,complete;const request=(body,cb)=>body.action==='start'?Promise.resolve({question:publicQuestQuestion(c.questions[0]),settings:c.settings,index:0,total:6,points:40,title:c.title}):new Promise(resolve=>{verify=cb;complete=resolve});
  dispose=mountPictureQuest(root,{request});await Promise.resolve();const b=root.querySelector('.answer');b.click();verify({right:false});expect(b.classList.contains('wrong')).toBe(true);expect(b.disabled).toBe(true);complete({right:false,points:40});await Promise.resolve();expect(root.querySelectorAll('.answer')[1].disabled).toBe(false);expect(b.disabled).toBe(true);expect(sound.effect.mock.calls.filter(([type])=>type==='wrong')).toHaveLength(1);
 });
 it('rolls back early correctness when progress cannot be persisted and can retry the same request',async()=>{
  const c=freshPictureQuest(),root=document.querySelector('#arem-quest');let verify,reject;const request=vi.fn((body,cb)=>body.action==='start'?Promise.resolve({question:publicQuestQuestion(c.questions[0]),settings:c.settings,index:0,total:6,points:40,title:c.title}):new Promise((_,fail)=>{verify=cb;reject=fail}));
  dispose=mountPictureQuest(root,{request});await Promise.resolve();const b=root.querySelectorAll('.answer')[1];b.click();verify({right:true,word:'قط'});reject(Error('retry'));await Promise.resolve();expect(b.classList.contains('correct')).toBe(false);expect(b.querySelector('.mark')).toBeNull();expect(root.querySelector('.score strong').textContent).toBe('40');expect(root.querySelector('.next').disabled).toBe(true);b.click();expect(request.mock.calls[1][0]).toEqual(request.mock.calls[2][0]);
 });
});

describe('network-independent active-question feedback',()=>{
 it.each([true,false])('renders correctness %s immediately even when the answer request never resolves',async right=>{
  const c=freshPictureQuest(),root=document.querySelector('#arem-quest'),onPoints=vi.fn();c.questions[0].answer_audio='/picture-quest/cat.mp3';
  const request=vi.fn(body=>body.action==='start'?Promise.resolve({question:publicQuestQuestion(c.questions[0]),feedback:{correctChoiceId:'choice-1',word:'قط',answer_audio:c.questions[0].answer_audio},settings:c.settings,index:0,total:6,points:40,title:c.title}):new Promise(()=>{}));
  dispose=mountPictureQuest(root,{request,onPoints});await Promise.resolve();onPoints.mockClear();expect(sound.prepare).toHaveBeenCalledWith('/picture-quest/cat.mp3');
  const b=root.querySelectorAll('.answer')[right?1:0];pointer(b,'pointerdown');pointer(b,'pointerup');expect(b.classList.contains(right?'correct':'wrong')).toBe(true);expect(root.querySelector('.score strong').textContent).toBe('40');expect(root.querySelector('.next').disabled).toBe(true);expect(onPoints).not.toHaveBeenCalled();
 });
 it('reconciles a stale local prediction with the server and never duplicates the success sound',async()=>{
  const c=freshPictureQuest(),root=document.querySelector('#arem-quest');let verify,complete;
  const request=(body,cb)=>body.action==='start'?Promise.resolve({question:publicQuestQuestion(c.questions[0]),feedback:{correctChoiceId:'choice-0',word:'كلب'},settings:c.settings,index:0,total:6,points:40,title:c.title}):new Promise(resolve=>{verify=cb;complete=resolve});
  dispose=mountPictureQuest(root,{request});await Promise.resolve();const b=root.querySelectorAll('.answer')[1];b.click();expect(b.classList.contains('wrong')).toBe(true);verify({right:true,word:'قط',answer_audio:'/picture-quest/cat.mp3'});expect(b.classList.contains('wrong')).toBe(false);expect(b.classList.contains('correct')).toBe(true);complete({right:true,word:'قط',answer_audio:'/picture-quest/cat.mp3',points:50,reward:10});await Promise.resolve();expect(sound.success).toHaveBeenCalledTimes(1);expect(root.querySelector('.score strong').textContent).toBe('50');
 });
});

describe('instant prepared next-picture navigation',()=>{
 function setup({finished=false}={}){
  const c=freshPictureQuest(),root=document.querySelector('#arem-quest');
  const session=(i)=>({question:publicQuestQuestion(c.questions[i]),feedback:{correctChoiceId:c.questions[i].correctId,word:c.questions[i].options.find(o=>o.id===c.questions[i].correctId).label},upcomingImage:c.questions[i+1]?.image_url||'',settings:c.settings,index:i,total:6,points:i?50:40,sessionId:'session-'+i,title:c.title});
  const next=finished?{...session(1),finished:true,question:null,total:1,independent:1}:session(1);
  const request=vi.fn(body=>body.action==='start'?Promise.resolve(session(0)):Promise.resolve({right:true,word:'قط',points:50,reward:10,next}));
  dispose=mountPictureQuest(root,{request});return{root,request,c};
 }
 it('renders the saved next question synchronously on touch release, with no extra network request or duplicate advance',async()=>{
  const{root,request,c}=setup();await Promise.resolve();root.querySelectorAll('.answer')[1].click();await Promise.resolve();const next=root.querySelector('.next');
  expect(next.disabled).toBe(false);pointer(next,'pointerdown');expect(next.classList.contains('touch-pressed')).toBe(true);pointer(next,'pointerup');
  expect(root.querySelector('.picture img').getAttribute('src')).toBe(c.questions[1].image_url);expect(root.querySelector('.round').textContent).toBe('الصورة 2 من 6');expect(request).toHaveBeenCalledTimes(2);
  next.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));expect(root.querySelector('.round').textContent).toBe('الصورة 2 من 6');expect(request).toHaveBeenCalledTimes(2);
 });
 it('fetches and decodes the upcoming image before next is pressed',async()=>{
  const loaded=[],decode=vi.fn().mockResolvedValue();vi.stubGlobal('Image',class{set src(url){loaded.push(url)}decode(){return decode()}});
  const{root,c}=setup();await Promise.resolve();expect(loaded).toContain(c.questions[1].image_url);expect(decode).toHaveBeenCalled();root.querySelectorAll('.answer')[1].click();await Promise.resolve();expect(loaded).toContain(c.questions[2].image_url);
 });
 it('does not navigate on a next-button drag and keeps keyboard navigation working',async()=>{
  const{root}=setup();await Promise.resolve();root.querySelectorAll('.answer')[1].click();await Promise.resolve();const next=root.querySelector('.next');pointer(next,'pointerdown');pointer(next,'pointermove',{clientY:80});pointer(next,'pointerup');next.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));expect(root.querySelector('.round').textContent).toBe('الصورة 1 من 6');next.click();expect(root.querySelector('.round').textContent).toBe('الصورة 2 من 6');
 });
 it('opens the prepared completion summary without a request',async()=>{
  const{root,request}=setup({finished:true});await Promise.resolve();root.querySelectorAll('.answer')[1].click();await Promise.resolve();root.querySelector('.next').click();expect(root.querySelector('.summary').hidden).toBe(false);expect(request).toHaveBeenCalledTimes(2);
 });
});

describe('first question image readiness',()=>{
 it('keeps the initial shell in its loading state until the current image is decoded',async()=>{
  let decoded;
  vi.stubGlobal('Image',class{set src(value){this.url=value}decode(){return new Promise(resolve=>{if(this.url.includes('/cat.'))decoded=resolve})}});
  const c=freshPictureQuest(),root=document.querySelector('#arem-quest');
  expect(root.querySelector('.picture img').hidden).toBe(true);
  const request=vi.fn(()=>Promise.resolve({question:publicQuestQuestion(c.questions[0]),settings:c.settings,index:0,total:6,points:628,title:c.title}));
  dispose=mountPictureQuest(root,{request});await Promise.resolve();
  expect(root.classList.contains('pq-loading')).toBe(true);
  expect(root.getAttribute('aria-busy')).toBe('true');
  expect(root.querySelector('.score strong').textContent).toBe('628');
  decoded();await Promise.resolve();await Promise.resolve();
  expect(root.classList.contains('pq-loading')).toBe(false);
  expect(root.hasAttribute('aria-busy')).toBe(false);
  expect(root.querySelector('.picture img').hidden).toBe(false);
 });
 it('opens the question with its fallback when the first image fails instead of leaving a broken image or loading forever',async()=>{
  vi.stubGlobal('Image',class{decode(){return Promise.reject(Error('offline'))}});
  const c=freshPictureQuest(),root=document.querySelector('#arem-quest');
  dispose=mountPictureQuest(root,{request:()=>Promise.resolve({question:publicQuestQuestion(c.questions[0]),settings:c.settings,index:0,total:6,points:628,title:c.title})});
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  expect(root.classList.contains('pq-loading')).toBe(false);
  expect(root.querySelector('.picture img').hidden).toBe(true);
  expect(root.querySelector('.fallback').hidden).toBe(false);
  expect(root.querySelector('.fallback').textContent).toBe(c.questions[0].emoji);
 });
});

describe('timed picture selection',()=>{
 function setup(){const c=freshPictureQuest();c.questions.forEach(q=>q.image_url='');const root=document.querySelector('#arem-quest');dispose=mountPictureQuest(root,{staff:true,config:c});return root}
 it('gives 3 seconds preparation then 15 seconds and blocks late choices',async()=>{const root=setup();await vi.advanceTimersByTimeAsync(3000);expect(root.querySelector('.countdown strong').textContent).toBe('15');await vi.advanceTimersByTimeAsync(1000);expect(root.querySelector('.countdown strong').textContent).toBe('14');await vi.advanceTimersByTimeAsync(14000);expect(root.querySelector('.countdown strong').textContent).toBe('0');expect(root.querySelector('.timeout-overlay').hidden).toBe(false);expect(root.querySelector('.timeout-card').textContent).toContain('حاول مرة أخرى');expect(document.activeElement).toBe(root.querySelector('.timeout-close'));expect(root.querySelector('.game').inert).toBe(true);expect(root.querySelector('.next').disabled).toBe(false);root.querySelectorAll('.answer')[1].click();expect(root.querySelector('.score strong').textContent).toBe('0');root.querySelector('.timeout-close').click();expect(root.querySelector('.timeout-overlay').hidden).toBe(true);expect(root.querySelector('.game').inert).toBe(false);expect(root.querySelector('.stage').classList.contains('timeout-leave')).toBe(true);await vi.advanceTimersByTimeAsync(150);expect(root.querySelector('.stage').classList.contains('timeout-arrive')).toBe(true);expect(root.querySelector('.round').textContent).toBe('الصورة 2 من 6');await vi.advanceTimersByTimeAsync(3000);expect(root.querySelector('.countdown strong').textContent).toBe('15')});
 it('stops on a correct selection and cancels expiry on disposal',async()=>{const root=setup();await vi.advanceTimersByTimeAsync(4000);root.querySelectorAll('.answer')[1].click();await vi.advanceTimersByTimeAsync(20000);expect(root.querySelector('.feedback').textContent).not.toContain('انتهى الوقت');expect(root.querySelector('.score strong').textContent).toBe('10');dispose();dispose=null;expect(vi.getTimerCount()).toBe(0)});
 it('waits for image decoding before preparation',async()=>{let decoded;vi.stubGlobal('Image',class{decode(){return new Promise(r=>decoded=r)}});const c=freshPictureQuest();c.questions=c.questions.slice(0,1);const root=document.querySelector('#arem-quest');dispose=mountPictureQuest(root,{staff:true,config:c});await vi.advanceTimersByTimeAsync(20000);expect(root.querySelector('.countdown strong').textContent).toBe('15');decoded();await vi.advanceTimersByTimeAsync(4000);expect(root.querySelector('.countdown strong').textContent).toBe('14')});
});


describe('circular clock cues',()=>{
 function setup(muted=false){const c=freshPictureQuest();c.settings.sound=!muted;c.questions.forEach(q=>q.image_url='');const root=document.querySelector('#arem-quest');dispose=mountPictureQuest(root,{staff:true,config:c});return root}
 it('ticks after preparation, accelerates in the last 5 seconds and glows red',async()=>{const root=setup();expect(root.querySelector('.countdown').parentElement.className).toBe('hud');await vi.advanceTimersByTimeAsync(2999);expect(sound.tick).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(1);expect(sound.tick).toHaveBeenCalledTimes(1);await vi.advanceTimersByTimeAsync(1000);expect(sound.tick).toHaveBeenCalledTimes(2);await vi.advanceTimersByTimeAsync(9000);expect(root.querySelector('.countdown').classList.contains('urgent')).toBe(true);expect(root.querySelector('.countdown strong').textContent).toBe('5');sound.tick.mockClear();await vi.advanceTimersByTimeAsync(1000);expect(sound.tick).toHaveBeenCalledTimes(4);root.querySelectorAll('.answer')[1].click();sound.tick.mockClear();await vi.advanceTimersByTimeAsync(10000);expect(sound.tick).not.toHaveBeenCalled()});
 it('honours mute and stops ticking on expiration',async()=>{const root=setup(true);await vi.advanceTimersByTimeAsync(4000);expect(sound.tick).not.toHaveBeenCalled();root.querySelector('.sound').click();await vi.advanceTimersByTimeAsync(1000);expect(sound.tick).toHaveBeenCalled();await vi.advanceTimersByTimeAsync(13000);sound.tick.mockClear();await vi.advanceTimersByTimeAsync(5000);expect(sound.tick).not.toHaveBeenCalled()});
});


describe('time-up confirmation navigation',()=>{
 it('queues an early confirmation until the timeout is saved, then advances once',async()=>{const c=freshPictureQuest();c.questions.forEach(q=>q.image_url='');const root=document.querySelector('#arem-quest');let save;const session=i=>({question:publicQuestQuestion(c.questions[i]),settings:c.settings,index:i,total:6,points:40,sessionId:'s'+i,title:c.title});const request=vi.fn(body=>body.action==='start'?Promise.resolve(session(0)):new Promise(resolve=>save=resolve));dispose=mountPictureQuest(root,{request});await vi.advanceTimersByTimeAsync(18000);root.querySelector('.timeout-close').click();expect(root.querySelector('.timeout-close').disabled).toBe(true);expect(root.querySelector('.round').textContent).toBe('الصورة 1 من 6');save({timedOut:true,points:40,next:session(1)});await Promise.resolve();expect(root.querySelector('.timeout-overlay').hidden).toBe(true);await vi.advanceTimersByTimeAsync(150);expect(root.querySelector('.round').textContent).toBe('الصورة 2 من 6');expect(request).toHaveBeenCalledTimes(2);root.querySelector('.timeout-close').click();expect(root.querySelector('.round').textContent).toBe('الصورة 2 من 6')});
 it('opens the results when confirming the last picture timeout',async()=>{const c=freshPictureQuest();c.questions=c.questions.slice(0,1);c.questions[0].image_url='';const root=document.querySelector('#arem-quest');dispose=mountPictureQuest(root,{staff:true,config:c});await vi.advanceTimersByTimeAsync(18000);root.querySelector('.timeout-close').click();expect(root.querySelector('.timeout-overlay').hidden).toBe(true);await vi.advanceTimersByTimeAsync(150);expect(root.querySelector('.summary').hidden).toBe(false)});
});


it('skips transition delays for reduced motion',async()=>{vi.stubGlobal('matchMedia',()=>({matches:true}));const c=freshPictureQuest();c.questions.forEach(q=>q.image_url='');const root=document.querySelector('#arem-quest');dispose=mountPictureQuest(root,{staff:true,config:c});await vi.advanceTimersByTimeAsync(18000);root.querySelector('.timeout-close').click();expect(root.querySelector('.round').textContent).toBe('الصورة 2 من 6');expect(root.querySelector('.stage').classList.contains('timeout-leave')).toBe(false)});


it('uses independent recordings for a wrong choice and time expiry',async()=>{const c=freshPictureQuest();c.questions.forEach(q=>q.image_url='');c.settings.sounds.wrong='/picture-quest/retry.mp3';c.settings.sounds.timeout='/picture-quest/time-up.mp3';const root=document.querySelector('#arem-quest');dispose=mountPictureQuest(root,{staff:true,config:c});root.querySelectorAll('.answer')[0].click();expect(sound.effect).toHaveBeenCalledWith('wrong','/picture-quest/retry.mp3');sound.effect.mockClear();await vi.advanceTimersByTimeAsync(18000);expect(sound.effect).toHaveBeenCalledWith('timeout','/picture-quest/time-up.mp3');expect(sound.effect.mock.calls.some(([type])=>type==='wrong')).toBe(false)});

it('disables each interaction effect without deleting its recording or falling back',()=>{const c=freshPictureQuest();c.settings.soundEnabled.wrong=false;c.settings.sounds.wrong='/picture-quest/retry.mp3';dispose=mountPictureQuest(document.querySelector('#arem-quest'),{staff:true,config:c});document.querySelector('.answer').click();expect(sound.effect.mock.calls.some(([type])=>type==='wrong')).toBe(false);expect(c.settings.sounds.wrong).toBe('/picture-quest/retry.mp3')});
it('can disable the timer and its ticks independently while answers remain usable',async()=>{const c=freshPictureQuest();c.settings.controls.timer=false;c.questions.forEach(q=>q.image_url='');const root=document.querySelector('#arem-quest');dispose=mountPictureQuest(root,{staff:true,config:c});await vi.advanceTimersByTimeAsync(30000);expect(root.querySelector('.countdown').hidden).toBe(true);expect(root.querySelector('.timeout-overlay').hidden).toBe(true);expect(sound.tick).not.toHaveBeenCalled();root.querySelectorAll('.answer')[1].click();expect(root.querySelector('.next').disabled).toBe(false)});
it('keeps the countdown active when only ticking is disabled',async()=>{const c=freshPictureQuest();c.settings.controls.ticking=false;c.questions.forEach(q=>q.image_url='');dispose=mountPictureQuest(document.querySelector('#arem-quest'),{staff:true,config:c});await vi.advanceTimersByTimeAsync(18000);expect(document.querySelector('.timeout-overlay').hidden).toBe(false);expect(sound.tick).not.toHaveBeenCalled()});
it('disables success music independently of the answer narration',()=>{const c=freshPictureQuest();c.settings.soundEnabled.success=false;c.questions[0].answer_audio='/picture-quest/answer.mp3';dispose=mountPictureQuest(document.querySelector('#arem-quest'),{staff:true,config:c});document.querySelectorAll('.answer')[1].click();expect(sound.success).toHaveBeenCalledWith('','/picture-quest/answer.mp3',0,false)});
it('suppresses disabled question audio, narration and stars in preview without losing uploads',async()=>{const c=freshPictureQuest(),q=c.questions[0];q.audio_url='/picture-quest/question.mp3';q.answer_audio='/picture-quest/answer.mp3';q.mediaEnabled.audio_url=false;q.mediaEnabled.answer_audio=false;c.settings.controls.stars=false;c.settings.controls.reward=false;dispose=mountPictureQuest(document.querySelector('#arem-quest'),{staff:true,config:c});expect(document.querySelector('.question-audio').hidden).toBe(true);document.querySelectorAll('.answer')[1].click();await vi.advanceTimersByTimeAsync(16);expect(sound.success).not.toHaveBeenCalled();expect(document.querySelectorAll('.fx-star')).toHaveLength(0);expect(document.querySelector('.score strong').textContent).toBe('0');expect(q.answer_audio).toBe('/picture-quest/answer.mp3')});
