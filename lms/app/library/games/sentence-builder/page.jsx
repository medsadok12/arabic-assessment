import {redirect} from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import {createAdminClient} from '../../../../lib/supabase-admin';
import {sentenceUser,loadSentences} from '../../../../lib/sentence-builder-server';
import {publicSentences} from '../../../../lib/sentence-builder';
import Game from './Game';
export const dynamic='force-dynamic';
export const metadata={title:'استمع ورتّب الكلمات — أكاديمية عارم'};
export default async function SentencePage(){const auth=await sentenceUser();if(auth.error)redirect('/auth/login');let initialContent=null;try{const live=await loadSentences(createAdminClient());initialContent={...live,config:auth.staff?live.config:publicSentences(live.config)}}catch{}return <><Navbar user={auth.user}/><main className="page-wrap"><Game staff={auth.staff} initialContent={initialContent}/></main></>}
