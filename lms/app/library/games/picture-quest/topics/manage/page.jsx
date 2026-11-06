import{redirect}from'next/navigation';
import Navbar from'../../../../../../components/Navbar';
import{questUser}from'../../../../../../lib/picture-quest-server';
import BankEditor from'./BankEditor';
export const dynamic='force-dynamic';
export const metadata={title:'بنك الكلمات والموضوعات — أكاديمية عارم'};
export default async function ManageBank(){const auth=await questUser(true);if(auth.error)redirect('/library');return <><Navbar user={auth.user}/><main className="page-wrap pqb-admin-page"><BankEditor/></main></>}
