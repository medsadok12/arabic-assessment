'use client';
import { useCallback, useEffect, useState } from 'react';
import { sceneApi, timeAgo } from '../../../../lib/scene-story-client';
import { CRITERIA, STICKERS, FEELINGS, reviewStars, wordNoun } from '../../../../lib/scene-story';
import { Modal, Notice } from '../../games/word-wheel/settings/_admin-ui';

/* ════════════════════════════════════════════════════════════════
   صندوق الحكايات — يقرأ المعلم ويستمع ويكبّر الصورة، ثم يقيّم بثلاثة
   معايير (1–3 نجوم) وملصقات وكلمة تشجيع. أول تقييم يمنح الطفل نقاطاً
   بعدد النجوم ويصله إشعاراً. المعلم يرى ردود طلابه وردود مشاهده فقط.
════════════════════════════════════════════════════════════════ */

const QUICK = ['أحسنت! حكاية جميلة 🌟', 'أعجبني خيالك الواسع 🎨', 'جرّب كلمات السلّة في المرة القادمة 🧺', 'انتبه لعلامات الترقيم في آخر الجملة ✏️', 'صوتك واضح ومعبّر 🎙️'];
const FILTERS = [
  { id: 'submitted', label: '⏳ تنتظر تقييمك' },
  { id: 'reviewed', label: '⭐ قيّمتها' },
  { id: 'all', label: 'الكل' },
];

function ReviewForm({ response, onSaved }) {
  const [r, setR] = useState(() => ({ idea: 0, words: 0, order: 0, stickers: [], comment: '', ...(response.review || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const complete = CRITERIA.every(c => r[c.id] >= 1);
  const toggleSticker = (id) => setR(x => ({ ...x, stickers: x.stickers.includes(id) ? x.stickers.filter(s => s !== id) : [...x.stickers, id] }));
  const addQuick = (q) => setR(x => ({ ...x, comment: (x.comment ? `${x.comment.trim()} ${q}` : q).slice(0, 500) }));

  const save = async () => {
    if (!complete || saving) return;
    setSaving(true);
    setError(null);
    const { ok, data } = await sceneApi(`/api/scenes/responses/${response.id}/review`, { method: 'PUT', body: r });
    setSaving(false);
    if (!ok) { setError(data.error || 'تعذّر حفظ التقييم'); return; }
    onSaved(data.response);
  };

  return (
    <div className="sm-review">
      <div className="sm-rubric">
        {CRITERIA.map(c => (
          <div key={c.id} className="sm-crit">
            <b>{c.icon} {c.label}</b>
            <div role="radiogroup" aria-label={c.label}>
              {[1, 2, 3].map(n => (
                <button key={n} type="button" role="radio" aria-checked={r[c.id] === n} aria-label={`${n} نجوم`}
                  className={n <= r[c.id] ? 'on' : ''} onClick={() => setR(x => ({ ...x, [c.id]: n }))}>★</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="sm-chips">
        {STICKERS.map(s => (
          <button key={s.id} type="button" className={`sm-sticker${r.stickers.includes(s.id) ? ' on' : ''}`} aria-pressed={r.stickers.includes(s.id)} onClick={() => toggleSticker(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <textarea className="wa-textarea" value={r.comment} maxLength={500} placeholder="كلمة تشجيع للطفل (اختياري)…" onChange={e => setR(x => ({ ...x, comment: e.target.value }))} />
      <div className="sm-quick">
        {QUICK.map(q => <button key={q} type="button" onClick={() => addQuick(q)}>{q}</button>)}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="button" className="wa-btn" onClick={save} disabled={!complete || saving}>
        {saving ? '⏳ نحفظ…'
          : !complete ? 'اختر نجوم المعايير الثلاثة'
          : response.status === 'reviewed' ? `💾 حدّث التقييم (${reviewStars(r)} نجوم)`
          : `⭐ أرسل ${reviewStars(r)} نجوم لـ${response.student_name || 'الطالب'}`}
      </button>
    </div>
  );
}

export default function Inbox({ scenes, sceneFilter, setSceneFilter, onReviewed, say }) {
  const [status, setStatus]   = useState('submitted');
  const [list, setList]       = useState(null);
  const [error, setError]     = useState(null);
  const [needSql, setNeedSql] = useState(false);
  const [zoom, setZoom]       = useState(null);
  const [openId, setOpenId]   = useState(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ t: String(Date.now()) });
    if (status !== 'all') q.set('status', status);
    if (sceneFilter) q.set('scene', sceneFilter);
    const { ok, data } = await sceneApi(`/api/scenes/inbox?${q}`);
    if (!ok) { setNeedSql(!!data.need_sql); setError(data.need_sql ? null : data.error || 'تعذّر تحميل الحكايات'); setList([]); return; }
    setError(null);
    setNeedSql(false);
    setList(data.responses || []);
  }, [status, sceneFilter]);

  useEffect(() => { setList(null); load(); }, [load]);
  useEffect(() => {
    const onBack = () => { if (document.visibilityState === 'visible' && !openId) load(); };
    document.addEventListener('visibilitychange', onBack);
    return () => document.removeEventListener('visibilitychange', onBack);
  }, [load, openId]);

  const saved = (prev, next) => {
    onReviewed(prev, next);
    say(prev.status === 'reviewed' ? `💾 حُدِّث تقييم ${next.student_name || 'الطالب'}` : `⭐ وصل تقييمك لـ${next.student_name || 'الطالب'}`);
    setOpenId(null);
    setList(l => (status === 'submitted' ? l.filter(x => x.id !== next.id) : l.map(x => (x.id === next.id ? { ...x, ...next } : x))));
  };

  return (
    <div className="sm-inbox">
      <div className="wa-row">
        <div className="wa-filters">
          {FILTERS.map(f => (
            <button key={f.id} type="button" className={`wa-chipbtn${status === f.id ? ' on' : ''}`} onClick={() => setStatus(f.id)}>{f.label}</button>
          ))}
        </div>
        <span className="wa-spacer" />
        <select className="wa-input sm-select" value={sceneFilter || ''} onChange={e => setSceneFilter(e.target.value || null)} aria-label="المشهد">
          <option value="">كل المشاهد</option>
          {(scenes || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      {needSql && <Notice tone="warn">⚙️ النشاط يحتاج تحديث قاعدة البيانات (lms/supabase/scene_story.sql).</Notice>}
      {error && <Notice tone="error">{error} <button type="button" className="wa-btn ghost sm" onClick={load}>🔁 أعد المحاولة</button></Notice>}
      {!list && <div className="wa-card wa-sub">⏳ نحضر الحكايات…</div>}
      {list && list.length === 0 && !error && !needSql && (
        <div className="wa-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>{status === 'submitted' ? '🎉' : '📭'}</div>
          <h3>{status === 'submitted' ? 'لا حكايات تنتظرك — أحسنت!' : 'لا حكايات هنا بعد'}</h3>
          <p className="wa-sub">تصل حكايات طلابك هنا مع إشعار عند كل إرسال جديد.</p>
        </div>
      )}

      {list?.map(r => {
        const f = FEELINGS.find(x => x.id === r.feeling);
        const open = openId === r.id;
        return (
          <article key={r.id} className={`sm-sub${r.status === 'reviewed' ? ' done' : ''}`}>
            <div className="sm-avatar" aria-hidden="true">{(r.student_name || '؟').trim()[0]}</div>
            <div className="sm-sub-main">
              <div className="sm-sub-head">
                <b>{r.student_name || r.student_email}</b>
                {r.student_grade && <span className="wa-sub">· الصف {r.student_grade}</span>}
                <span className="wa-sub">· {timeAgo(r.updated_at)}</span>
                {r.status === 'reviewed' && <span className="wa-badge ok">⭐ {reviewStars(r.review)}/9</span>}
              </div>
              {r.scene && (
                <div className="sm-sub-scene">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.scene.image_url} alt="" />
                  <span>{r.scene.title}</span>
                </div>
              )}
              <div className="wa-badges">
                {r.text && <span className="wa-badge">✍️ {r.word_count} {wordNoun(r.word_count)}</span>}
                {r.gold_used > 0 && <span className="wa-badge warn">⭐ {r.gold_used} {r.gold_used === 1 ? 'كلمة ذهبية' : 'ذهبية'}</span>}
                {r.audio_path && <span className="wa-badge">🎙️ صوت</span>}
                {r.photo_path && <span className="wa-badge">📷 صورة</span>}
                {f && <span className="wa-badge muted">{f.icon} {f.label}</span>}
              </div>
              {r.text && <p className="sm-sub-text">{r.text}</p>}
              {r.audio_url && <audio controls preload="none" src={r.audio_url} className="sm-audio" />}
              {r.photo_url && (
                <button type="button" className="sm-photo" onClick={() => setZoom(r)} aria-label="كبّر الصورة">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.photo_url} alt={`صورة ${r.student_name || ''}`} />
                  <span>🔍 كبّر</span>
                </button>
              )}
              {open
                ? <ReviewForm response={r} onSaved={(next) => saved(r, next)} />
                : (
                  <div className="wa-row">
                    <button type="button" className={`wa-btn sm${r.status === 'reviewed' ? ' ghost' : ''}`} onClick={() => setOpenId(r.id)}>
                      {r.status === 'reviewed' ? '✏️ عدّل التقييم' : '⭐ قيّم الحكاية'}
                    </button>
                  </div>
                )}
            </div>
          </article>
        );
      })}

      {zoom && (
        <Modal wide title={`📷 ${zoom.student_name || ''} — ${zoom.scene?.title || ''}`} onClose={() => setZoom(null)}
          footer={<a className="wa-btn ghost" href={zoom.photo_url} target="_blank" rel="noopener noreferrer">⬇️ افتح الصورة كاملة</a>}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.photo_url} alt="" className="sm-zoom" />
        </Modal>
      )}
    </div>
  );
}
