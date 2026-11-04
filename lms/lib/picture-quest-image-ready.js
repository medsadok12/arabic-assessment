// A small, disposable image cache shared only by one hub and its active game.
export function createQuestImagePreparer(){
 const images=new Map();
 function prepare(url){
  if(!url||typeof Image==='undefined')return null;
  if(images.has(url)){const saved=images.get(url);if(!saved.failed)return saved;images.delete(url);}
  const image=new Image();image.decoding='async';let finish,failed=false;
  const ready=new Promise(resolve=>{let done=false;const timer=setTimeout(()=>settle(false),8000);function settle(ok){if(done)return;done=true;failed=!ok;clearTimeout(timer);resolve(ok)}finish=settle;image.onerror=()=>settle(false);image.onload=()=>{if(typeof image.decode!=='function')settle(true)}});
  const entry={image,ready,get failed(){return failed},dispose:()=>finish(false)};images.set(url,entry);
  image.src=url;if(typeof image.decode==='function')image.decode().then(()=>finish(true),()=>finish(!!image.naturalWidth));else if(image.complete)finish(!!image.naturalWidth);
  while(images.size>3){const key=images.keys().next().value;images.get(key).dispose();images.delete(key)}
  return entry;
 }
 return{prepare,dispose(){for(const entry of images.values())entry.dispose();images.clear()}};
}
