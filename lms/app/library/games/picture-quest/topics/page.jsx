import{redirect}from'next/navigation';
import Navbar from'../../../../../components/Navbar';
import{questUser}from'../../../../../lib/picture-quest-server';
import TopicHub from'./TopicHub';
export const dynamic='force-dynamic';
export const metadata={title:'مغامرات الكلمات — أكاديمية عارم'};
export default async function TopicsPage(){const auth=await questUser();if(auth.error)redirect('/auth/login');return <><Navbar user={auth.user}/><main className="page-wrap pq-page"><TopicHub staff={auth.staff}/></main></>}
