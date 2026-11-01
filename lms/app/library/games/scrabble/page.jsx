import { redirect } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { scrabbleUser, loadScrabble } from '../../../../lib/scrabble-server';
import Game from './Game';
import FocusFrame from './FocusFrame';
export const dynamic='force-dynamic';
export const metadata={title:'سكرابل الصغار — أكاديمية عارم'};
export default async function ScrabblePage(){const auth=await scrabbleUser();if(auth.error)redirect('/auth/login');let initialContent=null;try{initialContent=await loadScrabble(createAdminClient())}catch{}return <><Navbar user={auth.user}/><main className="page-wrap ss-focused-page"><FocusFrame><Game initialContent={initialContent} staff={auth.staff}/></FocusFrame></main></>}
