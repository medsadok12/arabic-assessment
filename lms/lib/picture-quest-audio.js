// One unlocked WebAudio channel per game; recordings and effects cannot overlap.
export function createQuestAudio(){
 let context,generation=0,disposed=false;const cache=new Map(),decoded=new Map(),sources=new Set();
 const open=()=>{if(disposed)return null;if(!context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;context=new AC()}context.resume().catch(()=>{});return context};
 const preload=url=>{if(url&&!cache.has(url))cache.set(url,fetch(url).then(r=>{if(!r.ok)throw Error();return r.arrayBuffer()}).catch(()=>null));};
 const stop=()=>{generation++;for(const s of sources){try{s.stop()}catch{}}sources.clear()};
 const track=s=>{sources.add(s);s.onended=()=>{sources.delete(s);s.disconnect()};return s};
 function decode(c,url){if(!url)return Promise.resolve(null);if(!decoded.has(url)){preload(url);decoded.set(url,(async()=>{const data=await cache.get(url);if(!data||disposed)return null;try{return await c.decodeAudioData(data.slice(0))}catch{return null}})())}return decoded.get(url)}
 const prepare=url=>{preload(url);if(context&&url)void decode(context,url)};
 const unlock=()=>{const c=open();if(c)for(const url of cache.keys())void decode(c,url);return c};

 function bufferSource(c,buffer,at,until){const s=track(c.createBufferSource());s.buffer=buffer;s.connect(c.destination);s.start(at);if(until!==undefined)s.stop(until)}
 async function play(url){const c=open();stop();const ticket=generation;if(!c||!url)return false;const buffer=await decode(c,url);if(disposed||ticket!==generation)return null;if(!buffer)return false;bufferSource(c,buffer,c.currentTime);return true}
 const tunes={tap:[[520,0,.08,.035]],reveal:[[370,0,.1,.04],[550,.07,.14,.05]],success:[[523,0,.15],[659,.1,.15],[784,.2,.18],[1047,.32,.28]],wrong:[[330,0,.12,.04],[294,.12,.15,.03]],hint:[[587,0,.12,.04],[784,.12,.2,.04]],finish:[[523,0,.18],[659,.12,.18],[784,.24,.18],[1047,.4,.45]]};
 function tone(c,notes,at=c.currentTime,until=Infinity){for(const[f,offset,duration,volume]of notes){const t=at+offset;if(t>=until)continue;const o=track(c.createOscillator()),g=c.createGain(),end=Math.min(t+duration,until);o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume||.08,Math.min(t+.015,end));g.gain.exponentialRampToValueAtTime(.001,end);o.connect(g);g.connect(c.destination);o.start(t);o.stop(Math.min(t+duration+.03,until))}}
 // Decode first, then schedule both sounds on the same audio clock, exactly delayMs apart.
 async function success(url,narration,delayMs=1000){const c=open();stop();const ticket=generation;if(!c)return false;const [jingle,voice]=await Promise.all([decode(c,url),decode(c,narration)]);if(disposed||ticket!==generation)return null;const at=c.currentTime,delay=Number.isFinite(delayMs)?Math.min(5000,Math.max(0,delayMs))/1000:1,voiceAt=at+delay;if(jingle)bufferSource(c,jingle,at,voice?voiceAt:undefined);else tone(c,tunes.success,at,voice?voiceAt:Infinity);if(!voice)return false;bufferSource(c,voice,voiceAt);return true}
 return{unlock,preload,prepare,play,stop,success,async effect(type,url){const c=open();stop();const ticket=generation;if(!c)return;const buffer=await decode(c,url);if(disposed||ticket!==generation)return;if(buffer)bufferSource(c,buffer,c.currentTime);else tone(c,tunes[type]||tunes.tap)},dispose(){disposed=true;stop();context?.close().catch(()=>{});cache.clear();decoded.clear()}};
}
