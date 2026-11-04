import{redirect}from'next/navigation';
import Navbar from'../../../../components/Navbar';
import{createAdminClient}from'../../../../lib/supabase-admin';
import{questUser,loadPictureQuest}from'../../../../lib/picture-quest-server';
import{publicQuestConfig}from'../../../../lib/picture-quest';
import Game from'./Game';
export const dynamic='force-dynamic';
export const metadata={title:'اكتشف الصورة — أكاديمية عارم'};
export default async function PictureQuestPage({searchParams}={}){const auth=await questUser();if(auth.error)redirect('/auth/login');if(searchParams?.classic!=='1')redirect('/library/games/picture-quest/topics'+(typeof searchParams?.child==='string'&&searchParams.child?'?child='+encodeURIComponent(searchParams.child):''));let content;try{const live=await loadPictureQuest(createAdminClient());content=auth.staff?live.config:publicQuestConfig(live.config)}catch{}return <><Navbar user={auth.user}/><main className="page-wrap pq-page"><Game staff={auth.staff} config={content}/></main></>}
