import{redirect}from'next/navigation';
import{cookies}from'next/headers';
import{questUser}from'../../../../../lib/picture-quest-server';
import{createAdminClient}from'../../../../../lib/supabase-admin';
import{ACTIVE_CHILD_COOKIE}from'../../../../../lib/active-child';
import{loadTopicCatalog}from'../../../../../lib/picture-quest-catalog-server';
import TopicHub from'./TopicHub';
export const dynamic='force-dynamic';
export const metadata={title:'مغامرات الكلمات — أكاديمية عارم'};
export default async function TopicsPage({searchParams}={}){
 const auth=await questUser();if(auth.error)redirect('/auth/login');
 const child=typeof searchParams?.child==='string'&&searchParams.child?searchParams.child:cookies().get(ACTIVE_CHILD_COOKIE)?.value||'self';
 let initialCatalog=null;
 try{
  const req=new Request('https://www.aarem.net/library/games/picture-quest/topics?child='+encodeURIComponent(child));
  initialCatalog={child,value:await loadTopicCatalog(createAdminClient(),auth,req),loadedAt:Date.now()};
 }catch{} // The client retains its authenticated retry path on a server read failure.
 return <div className="page-wrap pq-page">{initialCatalog?.value.journeyEnabled!==false&&<link rel="preload" as="image" href="/picture-quest/journey-worlds-v1.webp"/>}<TopicHub staff={auth.staff} initialCatalog={initialCatalog}/></div>;
}
