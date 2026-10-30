'use client';
import {useEffect,useState} from 'react';
export function useLearningStreak(initial,userId){
 const[live,setLive]=useState(null);
 useEffect(()=>{let alive=true,busy=false;setLive(null);
 const refresh=async()=>{if(busy||document.visibilityState==='hidden')return;busy=true;try{const r=await fetch(`/api/streak?child=${encodeURIComponent(userId||'self')}`,{cache:'no-store'}),d=await r.json();if(alive&&r.ok&&d.ok&&(!userId||d.user_id===userId))setLive(d)}catch{}finally{busy=false}};
 refresh();const timer=setInterval(refresh,60000);window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',refresh);
 return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',refresh)};
 },[userId]);return live||initial;
}
