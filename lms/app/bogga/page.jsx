'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import AssessmentCodes from '../../components/AssessmentCodes';
import GroupsManager from '../../components/GroupsManager';

const SETUP_SQL = `-- تشغيل هذا SQL في Supabase SQL Editor لتهيئة الجداول اللازمة:

-- جدول طلبات التوظيف
CREATE TABLE IF NOT EXISTS recruitment_applications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  phone       TEXT,
  experience  TEXT,
  specialty   TEXT,
  notes       TEXT,
  cv_path     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول بنك الكلمات
CREATE TABLE IF NOT EXISTS lexicon_words (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  word       TEXT        NOT NULL,
  word_type  TEXT        NOT NULL,
  sentence   TEXT,
  topic      TEXT,
  grade_from INT         NOT NULL DEFAULT 1,
  grade_to   INT         NOT NULL DEFAULT 7,
  syllables  TEXT,
  root       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- bucket مخصص للسير الذاتية (شغّل من Storage في Supabase)
-- اسم الـ bucket: recruitment-cvs  |  نوع: private`;

const STATUS_LABELS = { pending: 'قيد المراجعة', reviewed: 'تمت المراجعة', accepted: 'مقبول', rejected: 'مرفوض' };
const STATUS_COLORS = { pending: '#b56a00', reviewed: '#185FA5', accepted: '#1a7c40', rejected: '#e53e3e' };

export default function BruteAdminPage() {
  const supabase       = createClient();
  const router         = useRouter();
  const [user, setUser]           = useState(null);
  const [role, setRole]           = useState('');
  const [tab, setTab]             = useState('overview');
  const [apps, setApps]           = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [stats, setStats]         = useState({ assessments: 0, pass: 0, avg: 0, applications: 0 });
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return; }
      const r = u.user_metadata?.role ?? '';
      if (r !== 'admin' && r !== 'super_admin') { router.push('/dashboard'); return; }
      setUser(u); setRole(r);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    loadStats();
    if (tab === 'recruitment' && role === 'super_admin') loadApps();
  }, [user, tab]);

  async function loadStats() {
    const [{ count: assessCount }, { count: passCount }, { data: scoresData }, { count: appCount }] = await Promise.all([
      supabase.from('assessments').select('id', { count: 'exact', head: true }),
      supabase.from('assessments').select('id', { count: 'exact', head: true }).gte('score', 70),
      supabase.from('assessments').select('score'),
      supabase.from('recruitment_applications').select('id', { count: 'exact', head: true }),
    ]);
    const avg = scoresData?.length
      ? Math.round(scoresData.reduce((s, a) => s + (a.score ?? 0), 0) / scoresData.length)
      : 0;
    setStats({ assessments: assessCount ?? 0, pass: passCount ?? 0, avg, applications: appCount ?? 0 });
  }

  async function loadApps() {
    setAppsLoading(true);
    const { data } = await supabase
      .from('recruitment_applications')
      .select('*')
      .order('created_at', { ascending: false });
    setApps(data ?? []);
    setAppsLoading(false);
  }

  async function updateAppStatus(id, status) {
    await supabase.from('recruitment_applications').update({ status }).eq('id', id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  function copySetupSql() {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!user) return null;

  const isSuperAdmin = role === 'super_admin';

  const TABS = [
    { id: 'overview',    label: '📊 نظرة عامة',         show: true },
    { id: 'codes',       label: '🔑 أكواد التقييم',      show: true },
    { id: 'groups',      label: '👥 إدارة الطلاب',       show: true },
    { id: 'lexicon',     label: '📖 بنك الكلمات',         show: true },
    { id: 'recruitment', label: '📋 طلبات التوظيف',      show: isSuperAdmin },
    { id: 'setup',       label: '⚙️ إعداد قاعدة البيانات', show: isSuperAdmin },
  ].filter(t => t.show);

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap" dir="rtl">
        <div className="container">

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                🏰 حصن الإدارة
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
                {isSuperAdmin ? '👑 مدير مطلق — صلاحيات كاملة' : '🛡️ مشرف مساعد — صلاحيات محدودة'}
              </p>
            </div>
            <div style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
              <Link href="/bogga/lexicon" className="btn btn-outline btn-sm">📖 بنك الكلمات</Link>
              {isSuperAdmin && (
                <Link href="/admin" className="btn btn-ghost btn-sm">← اللوحة القديمة</Link>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28, borderBottom: '2px solid var(--border)', paddingBottom: 14 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 700,
                  background: tab === t.id ? 'var(--primary)' : 'var(--bg)',
                  color: tab === t.id ? '#fff' : 'var(--muted)',
                  transition: 'all .15s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Overview Tab ── */}
          {tab === 'overview' && (
            <div>
              <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 32 }}>
                {[
                  { icon: '📋', val: stats.assessments, lbl: 'إجمالي التقييمات' },
                  { icon: '✅', val: stats.pass,         lbl: 'ناجحون (≥70%)' },
                  { icon: '📊', val: stats.avg + '%',    lbl: 'متوسط النتائج' },
                  ...(isSuperAdmin ? [{ icon: '📄', val: stats.applications, lbl: 'طلبات التوظيف' }] : []),
                ].map(s => (
                  <div key={s.lbl} className="stat-card">
                    <span className="stat-icon">{s.icon}</span>
                    <div><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div></div>
                  </div>
                ))}
              </div>

              {/* Admin permissions summary */}
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>
                  {isSuperAdmin ? '👑 صلاحيات المدير المطلق' : '🛡️ صلاحياتك كمشرف مساعد'}
                </h3>
                {isSuperAdmin ? (
                  <ul style={{ paddingRight: 20, lineHeight: 2.2, color: 'var(--text)' }}>
                    <li>✅ تعديل وحذف أي شيء في المنصة</li>
                    <li>✅ إدارة المشرفين المساعدين</li>
                    <li>✅ الاطلاع على طلبات التوظيف والسير الذاتية</li>
                    <li>✅ تعديل بنك الكلمات اللغوية</li>
                    <li>✅ حذف حسابات الطلاب عند الضرورة</li>
                    <li>✅ توليد أكواد التقييم والدعوة</li>
                  </ul>
                ) : (
                  <ul style={{ paddingRight: 20, lineHeight: 2.2, color: 'var(--text)' }}>
                    <li>✅ مراقبة الصفوف ومتابعة نتائج الطلاب</li>
                    <li>✅ توليد وإصدار أكواد التقييم للطلاب</li>
                    <li>✅ الاطلاع على بنك الكلمات</li>
                    <li>🚫 لا يمكن حذف الحسابات أو تعديل المعجم</li>
                    <li>🚫 لا يمكن الاطلاع على طلبات التوظيف</li>
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ── Codes Tab ── */}
          {tab === 'codes' && <AssessmentCodes />}

          {/* ── Groups Tab ── */}
          {tab === 'groups' && <GroupsManager />}

          {/* ── Lexicon Tab ── */}
          {tab === 'lexicon' && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📖</div>
              <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>بنك الكلمات اللغوية</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
                إدارة الكلمات المشكولة وتعديلها وإضافة الجذور والمقاطع الصوتية لكل صف
              </p>
              <Link href="/bogga/lexicon" className="btn btn-primary btn-lg">
                فتح لوحة بنك الكلمات
              </Link>
            </div>
          )}

          {/* ── Recruitment Tab (Super Admin only) ── */}
          {tab === 'recruitment' && isSuperAdmin && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)' }}>📋 طلبات الترشح للتوظيف</h2>
                <button onClick={loadApps} className="btn btn-outline btn-sm">🔄 تحديث</button>
              </div>
              {appsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                </div>
              ) : apps.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <p>لا توجد طلبات توظيف بعد</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {apps.map(app => (
                    <div key={app.id} className="card" style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>{app.name}</div>
                          <div style={{ fontSize: '.85rem', color: 'var(--muted)', lineHeight: 1.9 }}>
                            📧 {app.email} &nbsp;|&nbsp; 📱 <bdi dir="ltr">{app.phone}</bdi><br />
                            💼 {app.experience} &nbsp;|&nbsp; 🎓 {app.specialty}
                          </div>
                          {app.notes && (
                            <div style={{ marginTop: 8, fontSize: '.83rem', color: '#475569', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8 }}>
                              {app.notes}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                          <span style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: '.78rem', fontWeight: 700,
                            background: STATUS_COLORS[app.status] + '20',
                            color: STATUS_COLORS[app.status],
                          }}>
                            {STATUS_LABELS[app.status] ?? app.status}
                          </span>
                          <select
                            value={app.status}
                            onChange={e => updateAppStatus(app.id, e.target.value)}
                            style={{
                              fontSize: '.8rem', padding: '4px 8px', borderRadius: 8,
                              border: '1.5px solid var(--border)', fontFamily: 'inherit',
                            }}>
                            {Object.entries(STATUS_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                          {app.cv_path && (
                            <a
                              href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/recruitment-cvs/${app.cv_path}?token=VIEW`}
                              target="_blank" rel="noopener noreferrer"
                              className="btn btn-outline btn-sm">
                              📄 السيرة الذاتية
                            </a>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 10 }}>
                        {new Date(app.created_at).toLocaleString('ar-SA')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Setup Tab (Super Admin only) ── */}
          {tab === 'setup' && isSuperAdmin && (
            <div>
              <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 16 }}>⚙️ تهيئة قاعدة البيانات</h2>
              <div className="alert alert-info" style={{ marginBottom: 20 }}>
                افتح <strong>Supabase → SQL Editor</strong> ثم الصق هذا الكود وشغّله لإنشاء الجداول اللازمة للمنصة.
              </div>
              <div style={{ position: 'relative' }}>
                <pre style={{
                  background: '#1a1a2e', color: '#e2e8f0', borderRadius: 14,
                  padding: '24px 20px', fontSize: '.82rem', lineHeight: 1.8,
                  overflowX: 'auto', whiteSpace: 'pre-wrap',
                  fontFamily: "'Courier New', monospace",
                }}>
                  {SETUP_SQL}
                </pre>
                <button onClick={copySetupSql} className="btn btn-sm"
                  style={{
                    position: 'absolute', top: 12, left: 12,
                    background: copied ? '#1a7c40' : 'rgba(255,255,255,.15)',
                    color: '#fff', border: 'none',
                  }}>
                  {copied ? '✅ تم النسخ' : '📋 نسخ'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
