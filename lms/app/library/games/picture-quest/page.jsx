import{redirect}from'next/navigation';
import Navbar from'../../../../components/Navbar';
import{createAdminClient}from'../../../../lib/supabase-admin';
import{questUser,loadPictureQuest}from'../../../../lib/picture-quest-server';
import{publicQuestConfig}from'../../../../lib/picture-quest';
import Game from'./Game';
export const dynamic='force-dynamic';
export const metadata={title:'اكتشف الصورة — أكاديمية عارم'};
export default async function PictureQuestPage(){const auth=await questUser();if(auth.error)redirect('/auth/login');let content;try{const live=await loadPictureQuest(createAdminClient());content=auth.staff?live.config:publicQuestConfig(live.config)}catch{}return <><Navbar user={auth.user}/><main className="page-wrap"><Game staff={auth.staff} config={content}/></main></>}
