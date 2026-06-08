'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import ParentPanel from './ParentPanel';
import FaheemWidget from './FaheemWidget';
import LifeSceneSimulator from './LifeSceneSimulator';
import { useLanguage } from '../contexts/LanguageContext';

export default function DashboardContent({ user, assessments, role, isStudent, upcomingSessions, displayName, studentGender }) {
  const { t, lang } = useLanguage();

  const locale = 'en-GB';

  // Compute stats
  const avgScore = assessments?.length
    ? Math.round(assessments.reduce((s, a) => s + (a.score ?? 0), 0) / assessments.length)
    : null;

  const stats = isStudent
    ? [
        { icon: '📊', val: assessments?.length ?? 0,                         lbl: t('dashboard.myAssessments') },
        { icon: '✅', val: assessments?.length ? t('dashboard.completed') : '—', lbl: t('dashboard.assessmentStatus') },
      ]
    : [
        { icon: '📊', val: assessments?.length ?? 0,                              lbl: t('dashboard.myAssessments') },
        { icon: '⭐', val: avgScore != null ? avgScore + '%' : '—',               lbl: t('dashboard.avgScore') },
        { icon: '🏅', val: assessments?.[0]?.level ? `${t('dashboard.level')} ${assessments[0].level}` : '—', lbl: t('dashboard.lastLevel') },
      ];

  const actions = [
    { icon: '📅', title: t('dashboard.myCalendar'),  desc: t('dashboard.calendarDesc'),  href: '/dashboard/calendar' },
    { icon: '📖', title: t('dashboard.wordBank'),    desc: t('dashboard.wordBankDesc'),  href: '/dashboard/lexicon' },
    { icon: '📈', title: t('dashboard.progress'),    desc: t('dashboard.progressDesc'),  href: '/dashboard/progress' },
    { icon: '👤', title: t('dashboard.myProfile'),   desc: t('dashboard.profileDesc'),   href: '/dashboard/profile' },
  ];

  // Upcoming session countdown
  const nextSession = upcomingSessions[0] ?? null;
  let timeLabel = '';
  let joinable  = false;
  if (nextSession) {
    const now       = new Date();
    const sessionDT = new Date(`${nextSession.session_date}T${nextSession.start_time}`);
    const diffMins  = Math.round((sessionDT - now) / 60000);
    joinable = diffMins <= 30;
    if (diffMins <= 0)        timeLabel = t('dashboard.liveSoon');
    else if (diffMins < 60)   timeLabel = `${t('dashboard.startingIn')} ${diffMins} ${t('dashboard.minutes')}`;
    else if (diffMins < 1440) timeLabel = `${t('dashboard.startingIn')} ${Math.floor(diffMins / 60)} ${t('dashboard.hours')}`;
    else {
      const d = Math.floor(diffMins / 1440);
      timeLabel = `${t('dashboard.startingIn')} ${d} ${d === 1 ? t('dashboard.day') : t('dashboard.days')}`;
    }
  }

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container">
          <h1 className="dash-welcome">{t('dashboard.greeting')}، {displayName} 👋</h1>

          {role === 'super_admin' && (
            <div style={{ marginBottom: 24 }}>
              <Link href="/bogga" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                ⚙️ {t('nav.admin')}
              </Link>
            </div>
          )}

          {/* Next session card */}
          {nextSession && (
            <div style={{
              background: joinable
                ? 'linear-gradient(135deg, #1a7c40, #15803d)'
                : 'linear-gradient(135deg, #185FA5, #1d4ed8)',
              borderRadius: 18, padding: '22px 26px', marginBottom: 28,
              color: '#fff', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
              boxShadow: '0 6px 24px rgba(24,95,165,.22)',
            }}>
              <div style={{ fontSize: '2.6rem', lineHeight: 1 }}>📅</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: '.8rem', opacity: .8, marginBottom: 4, fontWeight: 600 }}>
                  {t('dashboard.upcomingSession')}
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.12rem', marginBottom: 8 }}>
                  {nextSession.subject || t('dashboard.general')}
                </div>
                <div style={{ fontSize: '.85rem', opacity: .9, display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span>👤 {nextSession.teacher_name}</span>
                  <span>📅 {new Date(nextSession.session_date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  <span>⏰ {nextSession.start_time?.slice(0, 5)}</span>
                  {nextSession.duration_minutes && <span>⏱️ {nextSession.duration_minutes} {lang === 'ar' ? 'دقيقة' : 'min'}</span>}
                </div>
                <span style={{ display: 'inline-block', background: 'rgba(255,255,255,.2)', padding: '4px 12px', borderRadius: 20, fontSize: '.8rem', fontWeight: 700 }}>
                  {timeLabel}
                </span>
              </div>
              <a
                href={nextSession.meet_link || `https://meet.jit.si/${nextSession.room_name}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  background: joinable ? '#fff' : 'rgba(255,255,255,.18)',
                  color: joinable ? '#15803d' : '#fff',
                  borderRadius: 12, padding: '12px 22px', fontWeight: 800, fontSize: '.92rem',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7,
                  border: joinable ? 'none' : '1.5px solid rgba(255,255,255,.4)', whiteSpace: 'nowrap',
                }}>
                🎥 {joinable ? t('dashboard.joinSession') : lang === 'ar' ? 'رابط الحصة' : 'Session Link'}
              </a>
            </div>
          )}

          {/* Other upcoming sessions */}
          {upcomingSessions.length > 1 && (
            <div className="dash-section" style={{ marginTop: 0, marginBottom: 24 }}>
              <div className="dash-section-title">📋 {lang === 'ar' ? 'حصص أخرى قادمة' : 'Other Upcoming Sessions'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingSessions.slice(1).map(s => (
                  <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{s.subject || t('dashboard.general')}</div>
                      <div style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                        <span>👤 {s.teacher_name}</span>
                        <span>📅 {new Date(s.session_date).toLocaleDateString(locale)}</span>
                        <span>⏰ {s.start_time?.slice(0, 5)}</span>
                      </div>
                    </div>
                    <a href={s.meet_link || `https://meet.jit.si/${s.room_name}`}
                      target="_blank" rel="noopener noreferrer"
                      className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }}>
                      🎥 {lang === 'ar' ? 'رابط الحصة' : 'Session Link'}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {stats.map(s => (
              <div key={s.lbl} className="stat-card">
                <span className="stat-icon">{s.icon}</span>
                <div>
                  <div className="stat-val">{s.val}</div>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="dash-section">
            <div className="dash-section-title">{lang === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</div>
            <div className="card-grid">
              {actions.map(a => (
                <Link key={a.href} href={a.href} className="dash-action-card">
                  <span className="dash-action-icon">{a.icon}</span>
                  <div className="dash-action-title">{a.title}</div>
                  <div className="dash-action-desc">{a.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          {!isStudent && <ParentPanel assessments={assessments ?? []} />}
          {isStudent && <FaheemWidget studentName={displayName} studentGender={studentGender} />}

          {/* Life-Scene Simulator for students */}
          {isStudent && (
            <div className="dash-section">
              <div className="dash-section-title">🎭 {lang === 'ar' ? 'مشاهد الحياة التفاعلية' : 'Interactive Life Scenes'}</div>
              <LifeSceneSimulator role="student" />
            </div>
          )}

          {/* Assessment history */}
          <div className="dash-section">
            <div className="dash-section-title">{t('dashboard.assessmentHistory')}</div>
            {assessments && assessments.length > 0 ? (
              isStudent ? (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('dashboard.level')}</th>
                        <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                        <th>{t('dashboard.date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.slice(0, 5).map(a => (
                        <tr key={a.id}>
                          <td><span className="badge badge-blue">{t('dashboard.level')} {a.level}</span></td>
                          <td><span className="badge badge-green">{lang === 'ar' ? 'تم الإرسال ✓' : 'Submitted ✓'}</span></td>
                          <td style={{ direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left' }}>
                            {a.completed_at ? new Date(a.completed_at).toLocaleDateString(locale) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('dashboard.level')}</th>
                        <th>{t('dashboard.score')}</th>
                        <th>{t('dashboard.date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.slice(0, 5).map(a => (
                        <tr key={a.id}>
                          <td><span className="badge badge-blue">{t('dashboard.level')} {a.level}</span></td>
                          <td>
                            <span className={`badge ${(a.score ?? 0) >= 70 ? 'badge-green' : 'badge-orange'}`}>
                              {a.score ?? 0}%
                            </span>
                          </td>
                          <td style={{ direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left' }}>
                            {a.completed_at ? new Date(a.completed_at).toLocaleDateString(locale) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="empty-state card">
                <span className="empty-icon">📋</span>
                <p>{t('dashboard.noAssessments')}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
