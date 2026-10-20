'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { childFetch } from '../../../lib/child-fetch';
import { sceneApi } from '../../../lib/scene-story-client';
import { MODE_INFO } from '../../../lib/scene-story';
import { SC_CSS } from './_ui';

/* ════════════════════════════════════════════════════════════════
   «مشهدٌ وحكاية» — قائمة المشاهد: صورة يضعها المعلم أو الإدارة، ويحكي
   الطفل عنها كتابةً أو بصوته أو بصورة ورقته. البيانات حيّة وتتجدّد عند
   العودة للتبويب (القسم 9.5). الطاقم يرى رابط «لوحة المشاهد».
════════════════════════════════════════════════════════════════ */

function statusChip(s) {
  if (s.scheduled) return <span className="sc-chip soon">🕒 مجدول</span>;
  if (!s.mine) return <span className="sc-chip new">✨ جديد</span>;
  if (s.mine.status === 'reviewed') return <span className="sc-chip done">⭐ {s.mine.stars}/9 من معلمك</span>;
  return <span className="sc-chip sent">📨 وصلت لمعلمك</span>;
}

export default function ScenesPage() {
  const [data, setData]     = useState(null);
  const [failed, setFailed] = useState(null);
  const [points, setPoints] = useState(null);

  const load = useCallback(async () => {
    const { ok, data: d } = await sceneApi(`/api/scenes?t=${Date.now()}`);
    if (ok && Array.isArray(d.scenes)) { setData(d); setFailed(null); }
    else setFailed(d.error || 'تعذّر تحميل المشاهد');
  }, []);

  useEffect(() => {
    load();
    childFetch('/api/points').then(r => r.json()).then(j => setPoints(j.points ?? null)).catch(() => {});
    const onBack = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onBack);
    return () => document.removeEventListener('visibilitychange', onBack);
  }, [load]);

  const scenes = data?.scenes || [];
  const staff = !!data?.is_staff;
  const fresh = scenes.filter(s => !s.mine && !s.scheduled).length;

  return (
    <div className="sc">
      <style dangerouslySetInnerHTML={{ __html: SC_CSS }} />
      <header className="sc-top">
        <div className="sc-top-in">
          <Link href="/library" className="sc-back">→ المكتبة</Link>
          <h1>📝 مشهدٌ وحكاية</h1>
          {staff
            ? <Link href="/library/scenes/manage" className="sc-pill gold">⚙️ لوحة المشاهد</Link>
            : <span className="sc-pill">⭐ {points ?? '…'}</span>}
        </div>
      </header>

      <main className="sc-main">
        <section className="sc-hero">
          <span className="sc-hero-ico" aria-hidden="true">🖼️</span>
          <div>
            <h2>انظر… تخيّل… واحكِ!</h2>
            <p>
              {staff
                ? 'هكذا يرى طلابك المشاهد. افتح أي مشهد لمعاينته، أو أضف مشهداً جديداً من لوحة المشاهد.'
                : fresh
                  ? `ينتظرك ${fresh === 1 ? 'مشهد جديد' : fresh === 2 ? 'مشهدان جديدان' : `${fresh} مشاهد جديدة`} — اختر صورة واحكِ حكايتها بالكتابة أو بصوتك أو بصورة ورقتك ✨`
                  : 'اختر صورة واحكِ حكايتها بالكتابة أو بصوتك أو بصورة ورقتك ✨'}
            </p>
          </div>
        </section>

        {data?.need_sql && staff && (
          <div className="sc-note warn">⚙️ النشاط يحتاج تحديث قاعدة البيانات (lms/supabase/scene_story.sql) قبل إضافة أول مشهد.</div>
        )}

        {failed && !data && (
          <div className="sc-empty">
            <span className="big" aria-hidden="true">🌥️</span>
            <h3>لم نستطع فتح المشاهد الآن</h3>
            <p>{failed}</p>
            <button type="button" className="sc-soft" onClick={load}>🔁 حاول مرة أخرى</button>
          </div>
        )}

        {!data && !failed && (
          <div className="sc-grid" aria-busy="true">
            {[0, 1, 2].map(i => <div key={i} className="sc-skel" style={{ height: 260 }} />)}
          </div>
        )}

        {data && scenes.length === 0 && (
          <div className="sc-empty">
            <span className="big" aria-hidden="true">🌈</span>
            <h3>{staff ? 'لا توجد مشاهد بعد' : 'مشهدك الأول في الطريق!'}</h3>
            <p>{staff ? 'أضف أول مشهد: صورة وسؤال، ويبدأ طلابك بالحكي.' : 'سيضع معلمك مشهداً جديداً قريباً — عُد إلينا لتحكي حكايتك.'}</p>
            {staff && <Link href="/library/scenes/manage" className="sc-pill gold">➕ أضف مشهداً</Link>}
          </div>
        )}

        {scenes.length > 0 && (
          <div className="sc-grid">
            {scenes.map(s => (
              <Link key={s.id} href={`/library/scenes/${s.id}`} className="sc-card">
                <div className="sc-card-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image_url} alt="" loading="lazy" />
                  {statusChip(s)}
                </div>
                <div className="sc-card-body">
                  <h3>{s.title}</h3>
                  <p>{s.prompt}</p>
                  <div className="sc-modes">
                    {(s.modes || []).map(m => MODE_INFO[m] && (
                      <span key={m} className="sc-mode-tag">{MODE_INFO[m].icon} {MODE_INFO[m].label}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
