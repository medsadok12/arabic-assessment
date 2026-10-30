import { redirect } from 'next/navigation';
import Navbar from '../../../../../components/Navbar';
import { scrabbleUser } from '../../../../../lib/scrabble-server';
import Editor from './Editor';
export const dynamic='force-dynamic';
export const metadata={title:'تحرير السكرابل — أكاديمية عارم'};
export default async function ScrabbleManage(){const auth=await scrabbleUser(true);if(auth.error)redirect('/library');return <><Navbar user={auth.user}/><main className="page-wrap"><Editor/></main></>}
