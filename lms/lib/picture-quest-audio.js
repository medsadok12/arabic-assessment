// One unlocked WebAudio channel per game; recordings and effects cannot overlap.
export function createQuestAudio(){
 let context,source=null,generation=0,disposed=false;const cache=new Map();
 const open=()=>{if(disposed)return null;if(!context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;context=new AC()}context.resume().catch(()=>{});return context};
 const preload=url=>{if(url&&!cache.has(url))cache.set(url,fetch(url).then(r=>{if(!r.ok)throw Error();return r.arrayBuffer()}).catch(()=>null));};
 const stop=()=>{generation++;try{source?.stop()}catch{}source=null};
 async function play(url){const c=open();stop();const ticket=generation;if(!c||!url)return false;preload(url);const data=await cache.get(url);if(!data||ticket!==generation)return false;try{const buffer=await c.decodeAudioData(data.slice(0));if(ticket!==generation)return false;const s=c.createBufferSource();s.buffer=buffer;s.connect(c.destination);source=s;s.start();return true}catch{return false}}
 function tone(notes){const c=open();if(!c)return;stop();for(const[f,offset,duration,volume]of notes){const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+offset;o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume||.08,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.03)}}
 const tunes={tap:[[520,0,.08,.035]],reveal:[[370,0,.1,.04],[550,.07,.14,.05]],success:[[523,0,.15],[659,.1,.15],[784,.2,.18],[1047,.32,.28]],wrong:[[330,0,.12,.04],[294,.12,.15,.03]],hint:[[587,0,.12,.04],[784,.12,.2,.04]],finish:[[523,0,.18],[659,.12,.18],[784,.24,.18],[1047,.4,.45]]};
 return{unlock:open,preload,play,stop,async effect(type,url){if(disposed)return;if(url&&await play(url))return;if(disposed)return;tone(tunes[type]||tunes.tap)},dispose(){disposed=true;stop();context?.close().catch(()=>{});cache.clear()}};
}
