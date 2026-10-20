'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase';
import { getRole } from '../../../../lib/auth-role';
import { sceneApi } from '../../../../lib/scene-story-client';
import { MODE_INFO, BAND_INFO } from '../../../../lib/scene-story';
import { ADMIN_CSS, Modal, Notice } from '../../games/word-wheel/settings/_admin-ui';
import SceneEditor from './_scene-editor';
import Inbox from './_inbox';

/* ════════════════════════════════════════════════════════════════
   لوحة «مشهدٌ وحكاية» — للمعلم والمشرف والمدير، تحكم كامل بلا كود:
   🖼️ المشاهد (إضافة، تعديل، إخفاء، حذف، معاينة كطالب)
   📥 صندوق الحكايات (قراءة، استماع، تكبير، نجوم وملصقات وتعليق)
   المشرف يرى كل المشاهد والردود؛ المعلم مشاهد الإدارة العامة ومشاهده،
   وردود طلابه وردود مشاهده. ?tab=inbox يفتح الصندوق مباشرة (رابط الإشعار).
════════════════════════════════════════════════════════════════ */

const STAFF = ['teacher', 'admin', 'super_admin'];

const MANAGE_CSS = `
  .sm-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
  .sm-scene{ background:#fff; border-radius:20px; border:1px solid #EDE5D8; box-shadow:0 4px 14px rgba(26,43,74,.07); overflow:hidden; display:flex; flex-direction:column; }
  .sm-scene.off{ opacity:.62; }
  .sm-thumb{ aspect-ratio:16/9; background:#DDF3EF; position:relative; }
  .sm-thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
  .sm-thumb .wa-badge{ position:absolute; top:8px; right:8px; box-shadow:0 2px 8px rgba(0,0,0,.15); }
  .sm-body{ padding:12px 14px; display:flex; flex-direction:column; gap:8px; flex:1; }
  .sm-body b{ font-size:1.05rem; font-weight:900; }
  .sm-body p{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .sm-counts{ display:flex; gap:8px; flex-wrap:wrap; font-weight:800; font-size:.85rem; }
  .sm-counts button{ border:none; background:#F4EFE6; color:#1A2B4A; border-radius:999px; padding:4px 12px; font-family:inherit; font-weight:800; cursor:pointer; min-height:36px; }
  .sm-counts button.hot{ background:#FFF6DF; color:#92400E; }
  .sm-actions{ display:grid; grid-template-columns:repeat(auto-fit,minmax(96px,1fr)); gap:6px; padding:0 14px 14px; }
  .sm-actions .wa-btn{ text-decoration:none; }
  .sm-tabcount{ display:inline-grid; place-items:center; min-width:24px; height:24px; border-radius:999px; background:#E8B84B; color:#1A2B4A; font-size:.78rem; padding:0 6px; margin-inline-start:6px; }

  .sm-drop{ display:flex; flex-direction:column; align-items:center; gap:6px; border:3px dashed #E8B84B; border-radius:20px; padding:26px 16px; background:#FFF8E6; text-align:center; cursor:pointer; position:relative; }
  .sm-drop span{ font-size:2.6rem; line-height:1; }
  .sm-drop small{ color:#64748B; font-weight:600; }
  .sm-file{ position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; overflow:hidden; }
  .sm-file-btn{ position:relative; }
  .sm-editor-img{ display:flex; flex-direction:column; gap:10px; }
  .sm-img-wrap{ position:relative; border-radius:18px; overflow:hidden; border:3px solid #EDE5D8; background:#fff; }
  .sm-img-wrap img{ display:block; width:100%; height:auto; max-height:60vh; object-fit:contain; }
  .sm-img-wrap.placing{ cursor:crosshair; border-color:#1A2B4A; box-shadow:0 0 0 4px rgba(232,184,75,.4); }
  .sm-lens{ position:absolute; transform:translate(-50%,-50%); width:38px; height:38px; border-radius:50%; background:#E8B84B; border:3px solid #fff; color:#1A2B4A;
    font-weight:900; display:grid; place-items:center; box-shadow:0 3px 10px rgba(0,0,0,.25); pointer-events:none; }
  .sm-lens.static{ position:static; transform:none; flex-shrink:0; }
  .sm-lens-hint{ position:absolute; left:10px; right:10px; bottom:10px; background:rgba(26,43,74,.92); color:#fff; border-radius:14px; padding:10px; text-align:center; font-weight:800; pointer-events:none; }
  .sm-lens-row{ display:flex; gap:8px; align-items:center; }
  .sm-chips{ display:flex; flex-wrap:wrap; gap:6px; }
  .sm-chip{ display:inline-flex; align-items:center; gap:6px; background:#F4EFE6; border-radius:999px; padding:4px 6px 4px 12px; font-weight:800; font-size:.95rem; }
  .sm-chip button{ border:none; background:#fff; color:#475569; border-radius:999px; width:30px; height:30px; cursor:pointer; font-family:inherit; font-size:.8rem; }
  .sm-chip.word{ padding:4px 6px; font-size:1.05rem; }
  .sm-chip.word button:first-child{ font-size:1rem; }
  .sm-chip.gold{ background:#E8B84B; }
  .sm-chip.tile{ background:#fff; border:2px solid #EDE5D8; padding:4px 12px; }
  .sm-add{ display:flex; gap:8px; align-items:center; }
  .sm-add .wa-input{ flex:1; min-width:0; }
  .sm-list{ display:flex; flex-direction:column; gap:8px; }
  .sm-modes{ display:flex; gap:8px; flex-wrap:wrap; }

  .sm-inbox{ display:flex; flex-direction:column; gap:12px; }
  .sm-select{ width:auto; max-width:260px; min-height:44px; }
  .sm-sub{ display:grid; grid-template-columns:auto minmax(0,1fr); gap:12px; background:#fff; border-radius:20px; padding:14px; border:1px solid #EDE5D8;
    box-shadow:0 4px 14px rgba(26,43,74,.06); border-inline-start:5px solid #E8B84B; }
  .sm-sub.done{ border-inline-start-color:#2ABB7A; }
  .sm-avatar{ width:48px; height:48px; border-radius:50%; display:grid; place-items:center; font-weight:900; font-size:1.2rem; background:#3FA796; color:#fff; }
  .sm-sub-main{ display:flex; flex-direction:column; gap:8px; min-width:0; }
  .sm-sub-head{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
  .sm-sub-head b{ font-size:1.05rem; font-weight:900; }
  .sm-sub-scene{ display:flex; align-items:center; gap:8px; font-weight:800; font-size:.85rem; color:#475569; }
  .sm-sub-scene img{ width:44px; height:32px; border-radius:8px; object-fit:cover; }
  .sm-sub-text{ margin:0; font-family:var(--font-tajawal),'Tajawal',sans-serif; font-size:1.12rem; line-height:2; white-space:pre-wrap; background:#FFFDF8;
    border:1.5px solid #EDE5D8; border-radius:14px; padding:10px 12px; }
  .sm-audio{ width:100%; max-width:480px; }
  .sm-photo{ position:relative; border:none; padding:0; background:none; cursor:zoom-in; align-self:flex-start; border-radius:14px; overflow:hidden; }
  .sm-photo img{ display:block; max-width:min(320px,100%); max-height:240px; object-fit:cover; border-radius:14px; border:2px solid #EDE5D8; }
  .sm-photo span{ position:absolute; bottom:8px; left:8px; background:rgba(26,43,74,.85); color:#fff; border-radius:999px; padding:3px 10px; font-weight:800; font-size:.8rem; }
  .sm-zoom{ width:100%; height:auto; border-radius:14px; }
  .sm-review{ display:flex; flex-direction:column; gap:10px; background:#FAF7F2; border-radius:16px; padding:12px; }
  .sm-rubric{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
  .sm-crit{ background:#fff; border-radius:14px; padding:8px; text-align:center; display:flex; flex-direction:column; gap:2px; border:1.5px solid #EDE5D8; }
  .sm-crit b{ font-size:.88rem; }
  .sm-crit button{ border:none; background:none; font-size:1.7rem; line-height:1; cursor:pointer; color:#D9CFBE; padding:4px; min-width:40px; min-height:40px; }
  .sm-crit button.on{ color:#E8B84B; }
  .sm-sticker{ border:2px solid #EDE5D8; background:#fff; color:#1A2B4A; border-radius:999px; padding:6px 12px; font-weight:800; cursor:pointer; font-family:inherit; min-height:40px; }
  .sm-sticker.on{ background:#E8B84B; border-color:#E8B84B; }
  .sm-quick{ display:flex; flex-wrap:wrap; gap:6px; }
  .sm-quick button{ border:1.5px dashed #CBD5E1; background:#fff; color:#475569; border-radius:999px; padding:4px 10px; font-family:inherit; font-weight:700; font-size:.8rem; cursor:pointer; min-height:34px; }

  @media (max-width: 640px){
    .sm-grid{ grid-template-columns:minmax(0,1fr); }
    .sm-rubric{ grid-template-columns:minmax(0,1fr); }
    .sm-crit{ flex-direction:row; justify-content:space-between; align-items:center; }
    .sm-sub{ grid-template-columns:minmax(0,1fr); }
    .sm-avatar{ display:none; }
    .sm-select{ max-width:100%; width:100%; }
  }
`;

export default function ScenesManage() {
  const [auth, setAuth]         = useState({ loading: true, role: null });
  const [tab, setTab]           = useState('scenes');
  const [scenes, setScenes]     = useState(null);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [needSql, setNeedSql]   = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [edit, setEdit]         = useState(null);    // { initial }
  const [confirmDel, setConfirmDel] = useState(null);
  const [busyId, setBusyId]     = useState(null);
  const [sceneFilter, setSceneFilter] = useState(null);
  const [toast, setToast]       = useState(null);

  const say = useCallback((text, tone = 'ok') => {
    setToast({ text, tone });
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), 3200);
  }, []);

  const load = useCallback(async () => {
    const { ok, data } = await sceneApi(`/api/scenes/manage?t=${Date.now()}`);
    if (!ok) {
      if (data.need_sql) { setNeedSql(true); setScenes([]); return; }
      setLoadError(data.error || 'تعذّر تحميل المشاهد');
      return;
    }
    setLoadError(null);
    setNeedSql(false);
    setIsAdmin(!!data.is_admin);
    setScenes(data.scenes || []);
  }, []);

  useEffect(() => {
    try { if (new URLSearchParams(window.location.search).get('tab') === 'inbox') setTab('inbox'); } catch {}
    createClient().auth.getUser().then(({ data }) => {
      const role = getRole(data?.user) || null;
      setAuth({ loading: false, role });
      if (STAFF.includes(role)) load();
    }).catch(() => setAuth({ loading: false, role: null }));
  }, [load]);

  // أعداد الصندوق حيّة عند العودة للتبويب (القسم 9.5)
  useEffect(() => {
    const onBack = () => { if (document.visibilityState === 'visible' && !edit && STAFF.includes(auth.role)) load(); };
    document.addEventListener('visibilitychange', onBack);
    return () => document.removeEventListener('visibilitychange', onBack);
  }, [load, edit, auth.role]);

  const switchTab = (t) => {
    setTab(t);
    try { window.history.replaceState(null, '', t === 'inbox' ? '?tab=inbox' : window.location.pathname); } catch {}
  };

  const onSaved = (row, { created }) => {
    setScenes(list => (created ? [row, ...(list || [])] : (list || []).map(s => (s.id === row.id ? { ...row, counts: s.counts } : s))));
    setEdit(null);
    say(created ? `🚀 نُشر «${row.title}»` : `✅ حُفظ «${row.title}»`);
  };
  const toggleActive = async (s) => {
    setBusyId(s.id);
    const { ok, data } = await sceneApi(`/api/scenes/manage/${s.id}`, { method: 'PUT', body: { is_active: !s.is_active } });
    setBusyId(null);
    if (!ok) { say(data.error || 'تعذّر الحفظ', 'error'); return; }
    setScenes(list => list.map(x => (x.id === s.id ? { ...data.scene, counts: x.counts } : x)));
    say(data.scene.is_active ? `👁️ «${s.title}» ظاهر للطلاب الآن` : `🙈 أُخفي «${s.title}» عن الطلاب`);
  };
  const remove = async (s) => {
    setBusyId(s.id);
    const { ok, data } = await sceneApi(`/api/scenes/manage/${s.id}`, { method: 'DELETE' });
    setBusyId(null);
    setConfirmDel(null);
    if (!ok) { say(data.error || 'تعذّر الحذف', 'error'); return; }
    setScenes(list => list.filter(x => x.id !== s.id));
    say(`🗑 حُذف «${s.title}»`);
  };
  const openInbox = (s) => { setSceneFilter(s.id); switchTab('inbox'); };
  const onReviewed = (prev, next) => {
    if (prev.status === 'reviewed') return;
    setScenes(list => (list || []).map(s => (s.id === next.scene_id
      ? { ...s, counts: { ...s.counts, pending: Math.max(0, (s.counts?.pending || 0) - 1) } } : s)));
  };

  if (auth.loading) {
    return (
      <div className="wa" style={{ display: 'grid', placeItems: 'center' }}>
        <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
        <p className="wa-sub">⏳ لحظة…</p>
      </div>
    );
  }
  if (!STAFF.includes(auth.role)) {
    return (
      <div className="wa" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
        <div className="wa-card" style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <h3>لوحة المشاهد للمعلمين والإدارة</h3>
          <p className="wa-sub">سجّل الدخول بحساب معلم لإضافة المشاهد وقراءة حكايات الطلاب.</p>
          <Link href="/library/scenes" className="wa-btn" style={{ marginTop: 14, textDecoration: 'none' }}>→ المشاهد</Link>
        </div>
      </div>
    );
  }

  const pending = (scenes || []).reduce((n, s) => n + (s.counts?.pending || 0), 0);
  const now = Date.now();

  return (
    <div className="wa">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS + MANAGE_CSS }} />
      <header className="wa-head">
        <div className="wa-head-in">
          <div className="wa-head-row">
            <Link href="/library/scenes" className="wa-link">→ المشاهد</Link>
            <h1>🎬 لوحة «مشهدٌ وحكاية»</h1>
            <button type="button" className="wa-link gold" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => setEdit({ initial: null })} disabled={needSql}>➕ مشهد جديد</button>
          </div>
          <p>{isAdmin ? 'تضع مشاهد لكل الطلاب أو لمجموعة، وتقرأ كل الحكايات.' : 'تضع مشاهد لطلابك، وتقرأ حكاياتهم وتقيّمها بالنجوم والملصقات.'}</p>
          <div className="wa-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'scenes'} className={`wa-tab${tab === 'scenes' ? ' on' : ''}`} onClick={() => switchTab('scenes')}>
              🖼️ المشاهد
            </button>
            <button type="button" role="tab" aria-selected={tab === 'inbox'} className={`wa-tab${tab === 'inbox' ? ' on' : ''}`} onClick={() => switchTab('inbox')}>
              📥 صندوق الحكايات{pending > 0 && <span className="sm-tabcount">{pending}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="wa-main">
        {needSql && <Notice tone="warn">⚙️ النشاط يحتاج تحديث قاعدة البيانات: شغّل lms/supabase/scene_story.sql في Supabase ثم أعد فتح اللوحة.</Notice>}
        {loadError && <Notice tone="error">{loadError} <button type="button" className="wa-btn ghost sm" onClick={load}>🔁 أعد المحاولة</button></Notice>}

        {tab === 'scenes' && (
          <>
            {!scenes && !loadError && <div className="wa-card wa-sub">⏳ نحضر المشاهد…</div>}
            {scenes && scenes.length === 0 && !needSql && (
              <div className="wa-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48 }}>🖼️</div>
                <h3>أضف أول مشهد</h3>
                <p className="wa-sub">صورة فيها حكاية + سؤال للطفل. أضف عدسات المحقّق وسلّة كلمات لتساعده أكثر.</p>
                <button type="button" className="wa-btn" style={{ marginTop: 12 }} onClick={() => setEdit({ initial: null })}>➕ مشهد جديد</button>
              </div>
            )}
            {scenes && scenes.length > 0 && (
              <div className="sm-grid">
                {scenes.map(s => {
                  const scheduled = Date.parse(s.publish_at) > now;
                  return (
                    <div key={s.id} className={`sm-scene${s.is_active ? '' : ' off'}`}>
                      <div className="sm-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.image_url} alt="" loading="lazy" />
                        {!s.is_active ? <span className="wa-badge muted">🙈 مخفي</span>
                          : scheduled ? <span className="wa-badge">🕒 يظهر {new Date(s.publish_at).toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                          : <span className="wa-badge ok">👁️ ظاهر</span>}
                      </div>
                      <div className="sm-body">
                        <b>{s.title}</b>
                        <p className="wa-sub">{s.prompt}</p>
                        <div className="wa-badges">
                          <span className="wa-badge muted">{s.audience === 'all' ? '🌍 لكل الطلاب' : s.created_by && s.can_edit && !isAdmin ? '👥 لطلابي' : '👥 لطلاب المنشئ'}</span>
                          <span className="wa-badge muted">{BAND_INFO[s.band] ? `${BAND_INFO[s.band].icon} ${BAND_INFO[s.band].label}` : '🎯 حسب الصف'}</span>
                          <span className="wa-badge muted">{(s.modes || []).map(m => MODE_INFO[m]?.icon).join(' ')}</span>
                          {!s.can_edit && <span className="wa-badge warn">🏫 من الإدارة</span>}
                        </div>
                        <div className="sm-counts">
                          <button type="button" onClick={() => openInbox(s)}>📥 {s.counts?.total || 0} حكاية</button>
                          {s.counts?.pending > 0 && <button type="button" className="hot" onClick={() => openInbox(s)}>⏳ {s.counts.pending} تنتظر</button>}
                        </div>
                      </div>
                      <div className="sm-actions">
                        {s.can_edit && <button type="button" className="wa-btn sm" onClick={() => setEdit({ initial: s })} disabled={busyId === s.id}>✏️ تعديل</button>}
                        {s.can_edit && (
                          <button type="button" className="wa-btn ghost sm" onClick={() => toggleActive(s)} disabled={busyId === s.id}>
                            {s.is_active ? '🙈 إخفاء' : '👁️ إظهار'}
                          </button>
                        )}
                        <Link href={`/library/scenes/${s.id}`} className="wa-btn ghost sm" target="_blank">👀 معاينة</Link>
                        {s.can_edit && <button type="button" className="wa-btn soft-red sm" onClick={() => setConfirmDel(s)} disabled={busyId === s.id}>🗑 حذف</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'inbox' && (
          <Inbox scenes={scenes} sceneFilter={sceneFilter} setSceneFilter={setSceneFilter} onReviewed={onReviewed} say={say} />
        )}
      </main>

      {edit && <SceneEditor initial={edit.initial} isAdmin={isAdmin} onClose={() => setEdit(null)} onSaved={onSaved} />}

      {confirmDel && (
        <Modal title="🗑 حذف المشهد" onClose={() => setConfirmDel(null)}
          footer={(
            <>
              <button type="button" className="wa-btn soft-red" onClick={() => remove(confirmDel)} disabled={busyId === confirmDel.id}>نعم، احذفه نهائياً</button>
              <button type="button" className="wa-btn ghost" onClick={() => setConfirmDel(null)}>تراجع</button>
            </>
          )}>
          <p className="wa-sub" style={{ fontSize: '.95rem' }}>
            سيُحذف «{confirmDel.title}» مع {confirmDel.counts?.total ? `${confirmDel.counts.total} حكاية للطلاب وتسجيلاتها وصورها` : 'إعداداته'}. لا يمكن التراجع.
            {confirmDel.counts?.total > 0 && ' للإيقاف المؤقت استعمل «🙈 إخفاء» بدلاً من الحذف.'}
          </p>
        </Modal>
      )}

      {toast && <div className={`wa-notice ${toast.tone} wa-toast`} role="status">{toast.text}</div>}
    </div>
  );
}
