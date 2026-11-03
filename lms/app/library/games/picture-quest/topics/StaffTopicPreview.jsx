'use client';
import{useEffect,useRef,useState}from'react';
import{QUEST_MARKUP}from'../../../../../lib/picture-quest-shell';
import{mountPictureQuest}from'../../../../../lib/picture-quest-client';
import{childFetch}from'../../../../../lib/child-fetch';
import'../quest.css';
export default function StaffTopicPreview({selection,onExit,exitRequest=0}){
 const holder=useRef(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[retry,setRetry]=useState(0),handledExit=useRef(exitRequest);
 useEffect(()=>{if(handledExit.current!==exitRequest){handledExit.current=exitRequest;onExit()}},[exitRequest,onExit]);
 useEffect(()=>{document.documentElement.classList.add('pq-focus');return()=>document.documentElement.classList.remove('pq-focus')},[]);
 useEffect(()=>{let disposed=false,cleanup;setError('');setReady(false);const h=holder.current;h.textContent='نجهّز معاينة المرحلة…';childFetch('/api/games/picture-quest/topics/preview?topic='+encodeURIComponent(selection.topicId)+'&stage='+selection.stage,{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error('preview');if(disposed)return;h.innerHTML=QUEST_MARKUP;const root=h.querySelector('#arem-quest'),back=document.createElement('button');back.type='button';back.className='pq-mobile-back';back.textContent='→ المراحل';back.addEventListener('click',onExit);root.querySelector('.header').prepend(back);cleanup=mountPictureQuest(root,{staff:true,config:data.config,request:async()=>{throw Error('هذه معاينة بلا حفظ.');},onSession:()=>{root.querySelector('.footer').textContent=data.demo?'كلمات تجريبية للمعاينة · لا يتغيّر تقدم الطالب أو رصيده.':'معاينة بلا نقاط فعلية · لا يتغيّر تقدم الطالب أو رصيده.';},onFinish:(_data,summary)=>{const back=document.createElement('button');back.type='button';back.className='again';back.textContent='عودة إلى المراحل ←';back.addEventListener('click',onExit);summary.prepend(back);}});setReady(true);}).catch(()=>{if(!disposed){h.textContent='';setError('تعذّر فتح معاينة المرحلة. أعد المحاولة.');}});return()=>{disposed=true;cleanup?.()};},[selection,onExit,retry]);
 return <div className="pq-screen"><div className={'pq-page-tools'+(!ready?' pq-staff-tools':'')}><button type="button" onClick={onExit}>→ المراحل</button><span>معاينة بلا نقاط فعلية</span></div>{error&&<div role="alert"><p>{error}</p><button type="button" onClick={()=>setRetry(n=>n+1)}>أعد المحاولة</button></div>}<div className="pq-game-host" ref={holder}/></div>;
}
