'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import LessonLogbookView from './LessonLogbookView';
import TeacherSpace from './TeacherSpace';
import NotificationBell from './NotificationBell';
import { createClient } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function fmtDate(iso, lang) {
  if (!iso) return '';
  if (lang !== 'ar') {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`;
}

export default function SupervisorContent({ user, assessments, displayName }) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [messages,   setMessages]  = useState(null);
  const [msgsLoaded, setMsgsLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/auth/login');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (activeTab !== 'messages' || msgsLoaded) return;
    fetch('/api/contact/supervisor')
      .then(r => r.json())
      .then(d => { setMessages(d.messages ?? []); setMsgsLoaded(true); });
  }, [activeTab, msgsLoaded]);

  async function markRead(id) {
    await fetch('/api/contact/supervisor', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const total      = assessments.length;
  const uniqueIds  = new Set(assessments.map(a => a.user_id)).size;
  const avgScore   = total > 0
    ? Math.round(assessments.reduce((s, a) => s + (a.score ?? 0), 0) / total)
    : 0;
  const passCount  = assessments.filter(a => (a.score ?? 0) >= 60).length;
  const passRate   = total > 0 ? Math.round((passCount / total) * 100) : 0;

  const recent = assessments.slice(0, 50);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const statCards = [
    { label: t('supervisor.totalStudents'),    value: uniqueIds,           color: '#185FA5' },
    { label: t('supervisor.totalAssessments'), value: total,               color: '#7c3aed' },
    { label: t('supervisor.avgScore'),         value: `${avgScore}%`,      color: '#059669' },
    { label: t('supervisor.passRate'),         value: `${passRate}%`,      color: '#d97706' },
  ];

  return (
    <>
      <Navbar />
      <main dir={dir} style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
              {t('supervisor.title')}
            </h1>
            <p style={{ color: '#64748b', marginTop: 4, fontSize: '.95rem' }}>
              {t('supervisor.greeting')}، <strong>{displayName}</strong> — {t('supervisor.role')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NotificationBell userId={user?.id} role={user?.user_metadata?.role} lang={lang} />
            <span style={{
              background: '#f0f6ff', color: '#185FA5', border: '1.5px solid #bfdbfe',
              borderRadius: 20, padding: '4px 14px', fontSize: '.82rem', fontWeight: 600,
            }}>
              {t('supervisor.readOnly')}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
          {[
            { key: 'overview',  label: lang === 'ar' ? '📊 نتائج الطلاب'    : '📊 Student Results' },
            { key: 'logbook',   label: lang === 'ar' ? '📓 كراس الدروس'     : '📓 Lesson Logbook'  },
            { key: 'space',     label: lang === 'ar' ? '🏫 فضاء المعلم'     : '🏫 Teacher Space'   },
            { key: 'messages',  label: lang === 'ar' ? '📩 رسائل الأولياء'  : '📩 Parent Messages' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '.9rem', fontFamily: 'inherit',
                borderBottom: activeTab === tab.key ? '3px solid var(--primary)' : '3px solid transparent',
                background: 'transparent',
                color: activeTab === tab.key ? 'var(--primary)' : '#64748b',
                marginBottom: -2,
                transition: 'all .15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (<>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}>
          {statCards.map(card => (
            <div key={card.label} style={{
              background: '#fff', borderRadius: 18,
              border: '1.5px solid var(--border)',
              padding: '20px 22px',
              boxShadow: '0 2px 12px rgba(24,95,165,.06)',
            }}>
              <p style={{ color: '#64748b', fontSize: '.85rem', margin: '0 0 6px', fontWeight: 500 }}>
                {card.label}
              </p>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: card.color, margin: 0 }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Recent activity table */}
        <div style={{
          background: '#fff', borderRadius: 20,
          border: '1.5px solid var(--border)',
          boxShadow: '0 2px 12px rgba(24,95,165,.06)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
              {t('supervisor.recentActivity')}
            </h2>
          </div>

          {recent.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '1rem' }}>
              {t('supervisor.noActivity')}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {[
                      t('supervisor.studentName'),
                      t('supervisor.level'),
                      t('supervisor.score'),
                      t('supervisor.date'),
                    ].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: 'start',
                        fontWeight: 600, color: '#475569',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((a, i) => {
                    const pct = a.score ?? 0;
                    const passed = pct >= 60;
                    return (
                      <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                        <td style={{ padding: '10px 16px', color: '#1e293b', fontWeight: 500 }}>
                          {a.student_name ?? '—'}
                        </td>
                        <td style={{ padding: '10px 16px', color: '#334155' }}>
                          {lang === 'ar' ? `المستوى ${a.level ?? '—'}` : `Level ${a.level ?? '—'}`}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            fontWeight: 700,
                            color: passed ? '#1a7c40' : '#e53e3e',
                            background: passed ? '#f0fdf4' : '#fff5f5',
                            padding: '2px 10px', borderRadius: 10, fontSize: '.85rem',
                          }}>
                            {pct}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '.85rem' }}>
                          {fmtDate(a.completed_at, lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        </>)}

        {/* ── Logbook Tab ── */}
        {activeTab === 'logbook' && (
          <div>
            <div style={{ marginBottom: 22 }}>
              <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                📓 {lang === 'ar' ? 'كراس الدروس الرقمي' : 'Digital Lesson Logbook'}
              </h2>
              <p style={{ color: '#64748b', fontSize: '.88rem' }}>
                {lang === 'ar'
                  ? 'اعرض كراس أي معلم وأضف توجيهاتك التربوية مباشرة'
                  : 'View any teacher\'s logbook and add your educational guidance directly'}
              </p>
            </div>
            <div style={{
              background: '#fff', borderRadius: 20,
              border: '1.5px solid var(--border)',
              padding: '24px',
              boxShadow: '0 2px 12px rgba(24,95,165,.05)',
            }}>
              <LessonLogbookView lang={lang} />
            </div>
          </div>
        )}

        {/* ── Teacher Space Tab ── */}
        {activeTab === 'space' && (
          <TeacherSpace currentUser={user} />
        )}

        {/* ── Parent Messages Tab ── */}
        {activeTab === 'messages' && (
          <ParentMessagesPanel
            messages={messages}
            loaded={msgsLoaded}
            lang={lang}
            onMarkRead={markRead}
          />
        )}

      </main>
    </>
  );
}

function ParentMessagesPanel({ messages, loaded, lang, onMarkRead }) {
  const unread = messages ? messages.filter(m => !m.is_read).length : 0;

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
          📩 {lang === 'ar' ? 'رسائل الأولياء' : 'Parent Messages'}
          {unread > 0 && (
            <span style={{ background: '#dc2626', color: '#fff', fontSize: '.75rem',
              borderRadius: 20, padding: '2px 9px', marginRight: 10, fontWeight: 700 }}>
              {unread} {lang === 'ar' ? 'جديدة' : 'new'}
            </span>
          )}
        </h2>
        <p style={{ color: '#64748b', fontSize: '.88rem' }}>
          {lang === 'ar'
            ? 'رسائل أولياء الأمور المُرسَلة عبر الموقع'
            : 'Messages sent by parents through the website'}
        </p>
      </div>

      {!loaded ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>جارٍ التحميل...</div>
      ) : messages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: '#fff',
          borderRadius: 16, border: '1.5px solid var(--border)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📭</div>
          <p style={{ color: '#94a3b8', fontWeight: 600 }}>
            {lang === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map(m => (
            <div key={m.id} style={{
              background: '#fff', borderRadius: 14,
              border: `1.5px solid ${m.is_read ? 'var(--border)' : '#c4b5fd'}`,
              padding: '16px 20px',
              borderRight: `4px solid ${m.is_read ? '#e2e8f0' : '#7c3aed'}`,
              opacity: m.is_read ? .8 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '.97rem', color: '#1e293b' }}>
                    {m.is_read ? '' : '🔵 '}{m.parent_name}
                    {m.student_name && (
                      <span style={{ fontWeight: 600, color: '#7c3aed', fontSize: '.85rem', marginRight: 8 }}>
                        — {lang === 'ar' ? 'طالب:' : 'student:'} {m.student_name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '.8rem', color: '#94a3b8', marginTop: 3 }}>
                    {new Date(m.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    {m.phone && <span style={{ marginRight: 12 }}>📞 <a href={`tel:${m.phone}`} style={{ color: '#185FA5' }}>{m.phone}</a></span>}
                  </div>
                </div>
                {!m.is_read && (
                  <button
                    onClick={() => onMarkRead(m.id)}
                    style={{ background: '#f3f0ff', border: 'none', borderRadius: 8,
                      padding: '5px 12px', fontSize: '.78rem', fontWeight: 700,
                      color: '#7c3aed', cursor: 'pointer', flexShrink: 0 }}
                  >
                    ✓ {lang === 'ar' ? 'تمّ الاطلاع' : 'Mark read'}
                  </button>
                )}
              </div>
              <div style={{ marginTop: 12, padding: '12px 14px', background: '#fafafa',
                borderRadius: 10, fontSize: '.9rem', color: '#334155', lineHeight: 1.7,
                borderRight: '3px solid #e2e8f0' }}>
                {m.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
