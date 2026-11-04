'use client';
import{useEffect,useState}from'react';
import Link from'next/link';
import{getActiveChildTab}from'../lib/child-fetch';

export function questTopicsHref(href,child){
 if(typeof href!=='string'||!/^\/library\/games\/picture-quest\/topics(?:[?#]|$)/.test(href)||!child)return href;
 const url=new URL(href,'https://www.aarem.net');url.searchParams.set('child',child);return url.pathname+url.search+url.hash;
}
// Full prefetch of this dynamic route prepares authenticated data before entry.
// Include the tab's identity so a sibling's cookie cannot select the wrong child.
export default function QuestTopicsLink({href,children,prefetch,...props}){
 const[context,setContext]=useState({ready:false,child:null});
 useEffect(()=>{const update=()=>setContext({ready:true,child:getActiveChildTab()});update();window.addEventListener('focus',update);return()=>window.removeEventListener('focus',update)},[]);
 const quest=typeof href==='string'&&/^\/library\/games\/picture-quest\/topics(?:[?#]|$)/.test(href);
 return <Link {...props} href={questTopicsHref(href,context.child)} prefetch={quest?context.ready:prefetch}>{children}</Link>;
}
