import{redirect}from'next/navigation';
import Navbar from'../../../../../components/Navbar';
import{questUser}from'../../../../../lib/picture-quest-server';
import Editor from'./Editor';
export const dynamic='force-dynamic';
export const metadata={title:'تحرير اكتشف الصورة — أكاديمية عارم'};
export default async function PictureQuestManage(){const auth=await questUser(true);if(auth.error)redirect('/library');return <><Navbar user={auth.user}/><main className="page-wrap"><Editor/></main></>}
