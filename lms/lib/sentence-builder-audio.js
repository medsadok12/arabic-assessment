// قناة واحدة للتسجيلات والمؤثرات؛ الضغط التالي يوقف السابق دائمًا.
// onEnd يُستدعى مرة واحدة حين ينتهي التسجيل أو يتوقف (صوت آخر، جملة جديدة) أو يتعذّر تشغيله.
export function sentenceAudio(){
 let audio=null,context=null,nodes=[],ticket=0,ending=null;const raw=new Map(),decoded=new Map();
 function finish(){const done=ending;ending=null;done?.()}
 function stop(){ticket++;if(audio){audio.pause();audio.src='';audio=null}nodes.forEach(n=>{try{n.stop()}catch{}});nodes=[];finish()}
 async function recording(url,onEnd){stop();const token=ticket;if(!url)return false;const a=new Audio(url);audio=a;ending=onEnd||null;a.onended=()=>{if(audio===a){audio=null;finish()}};try{await a.play();return token===ticket?true:null}catch{if(audio===a){audio=null;finish()}return token===ticket?false:null}}
 // مقاطع المعلم (اختيار كلمة، جملة صحيحة…): تُجلب مسبقًا وتُشغَّل عبر WebAudio — HTMLAudio بعد انتظار الخادم يحجبه سفاري
 function preload(urls){urls.forEach(url=>{if(url&&!raw.has(url))raw.set(url,fetch(url).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null))})}
 async function clip(url){
  stop();const token=ticket;
  try{const Engine=window.AudioContext||window.webkitAudioContext;if(!Engine||!url)return false;context ||=new Engine();if(context.state==='suspended')await context.resume();
   if(!decoded.has(url)){preload([url]);decoded.set(url,raw.get(url).then(b=>b?new Promise((ok,no)=>context.decodeAudioData(b.slice(0),ok,no)):null).catch(()=>null))}
   const buffer=await decoded.get(url);if(token!==ticket)return null;if(!buffer){decoded.delete(url);raw.delete(url);return false}
   const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start();nodes.push(source);source.onended=()=>{source.disconnect();nodes=nodes.filter(n=>n!==source)};return true;
  }catch{return token===ticket?false:null}
 }
 async function effect(kind,step=0){
  stop();const token=ticket;
  try{const Engine=window.AudioContext||window.webkitAudioContext;if(!Engine)return;context ||=new Engine();if(context.state==='suspended')await context.resume();if(token!==ticket)return;
   const notes=kind==='success'?[[523.25,0,.2],[659.25,.085,.22],[783.99,.17,.24],[1046.5,.29,.32]]:kind==='undo'?[[392,0,.09]]:[[[523.25,587.33,659.25,783.99,880][step%5],0,.12]];
   const now=context.currentTime+.008;notes.forEach(([pitch,delay,length])=>{const tone=context.createOscillator(),gain=context.createGain();tone.type='sine';tone.frequency.value=pitch;gain.gain.setValueAtTime(0,now+delay);gain.gain.linearRampToValueAtTime(.13,now+delay+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+delay+length);tone.connect(gain);gain.connect(context.destination);tone.start(now+delay);tone.stop(now+delay+length+.02);nodes.push(tone);tone.onended=()=>{tone.disconnect();gain.disconnect();nodes=nodes.filter(n=>n!==tone)}});
  }catch{/* يبقى التدريب متاحًا إن رفض المتصفح الصوت. */}
 }
 return{stop,recording,effect,clip,preload,dispose(){stop();context?.close().catch(()=>{})}};
}
