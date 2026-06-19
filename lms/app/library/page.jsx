import { redirect } from 'next/navigation';
import { createClient }      from '../../lib/supabase-server';
import { createAdminClient } from '../../lib/supabase-admin';
import Navbar       from '../../components/Navbar';
import LibraryGrid  from './LibraryGrid';

export default async function LibraryPage() {
  let user;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) redirect('/auth/login');
    user = data.user;
  } catch {
    redirect('/auth/login');
  }

  const role      = user?.user_metadata?.role ?? '';
  const isTeacher = ['super_admin', 'admin', 'teacher'].includes(role);

  // fetch card customizations (ignore errors — page still works without them)
  let initialMeta = {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.from('library_card_meta').select('*');
    (data || []).forEach(c => { initialMeta[c.card_key] = c; });
  } catch {}

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container">
          <div style={{ textAlign:'center', padding:'8px 0 28px' }}>
            <h1 style={{ fontSize:'1.9rem', fontWeight:900, color:'#1e3a5f', margin:'0 0 6px' }}>
              المكتبة التعليمية 📚
            </h1>
            <p style={{ color:'#64748b', fontSize:'.95rem', margin:0 }}>
              اختر نشاطاً وابدأ رحلة تعلّم اللغة العربية!
              {isTeacher && (
                <span style={{ marginRight:10, background:'#f0fdf4', color:'#15803d', borderRadius:20, padding:'2px 10px', fontSize:'.78rem', fontWeight:700, border:'1px solid #86efac' }}>
                  ✏️ حرّك الماوس فوق أي بطاقة للتعديل
                </span>
              )}
            </p>
          </div>
          <LibraryGrid initialMeta={initialMeta} isTeacher={isTeacher} />
        </div>
      </main>
    </>
  );
}
