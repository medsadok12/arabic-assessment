import {redirect} from 'next/navigation';
import Navbar from '../../../../../components/Navbar';
import {sentenceUser} from '../../../../../lib/sentence-builder-server';
import Editor from './Editor';
export const dynamic='force-dynamic';
export const metadata={title:'تحرير تدريب الجملة — أكاديمية عارم'};
export default async function SentenceManage(){const auth=await sentenceUser(true);if(auth.error)redirect('/library');return <><Navbar user={auth.user}/><main className="page-wrap"><Editor/></main></>}
