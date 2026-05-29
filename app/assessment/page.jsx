import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import Navbar from '../../components/Navbar';

export default async function AssessmentPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  return (
    <>
      <Navbar user={user} />
      <main style={{ padding: '16px' }}>
        <iframe
          src="https://arabic-assessment.vercel.app"
          className="assessment-frame"
          title="تقييم اللغة العربية"
          allow="microphone"
        />
      </main>
    </>
  );
}
