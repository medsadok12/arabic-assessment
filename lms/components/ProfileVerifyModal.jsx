'use client';

import { useState } from 'react';
import { nameMatches } from '../lib/name-verify';

/* نافذة تحقق بالاسم مشتركة (مبدّل العائلة + بوابة الدخول الأولى).
   بألوان أكاديمية عارم: أزرق #1A2B4A، بنفسجي فهيم #7C5CD9، زر ذهبي #E8B84B.
   onSuccess تُستدعى فقط عند تطابق الاسم المُدخل مع targetName. */
export default function ProfileVerifyModal({ targetName, subtitle, onSuccess, onCancel }) {
  const [answer, setAnswer] = useState('');
  const [err, setErr]       = useState('');

  function submit(e) {
    e.preventDefault();
    if (nameMatches(answer, targetName)) onSuccess();
    else setErr('عذراً! تأكد من كتابة اسمك بشكل صحيح يا بطل 💪');
  }

  return (
    <div className="pv-backdrop" onClick={e => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <style>{`
        .pv-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:1200;
                       display:flex; align-items:center; justify-content:center; padding:16px;
                       font-family:'Cairo','Tajawal',sans-serif; direction:rtl; }
        .pv-modal { background:#fff; border-radius:20px; padding:26px 24px; width:100%; max-width:380px;
                    box-shadow:0 18px 50px rgba(26,43,74,.35); }
        .pv-emoji { text-align:center; font-size:2rem; margin-bottom:8px; }
        .pv-title { font-weight:900; font-size:1.15rem; color:#1A2B4A; text-align:center; margin-bottom:6px; }
        .pv-sub   { font-size:.85rem; color:#7C5CD9; text-align:center; font-weight:700; margin-bottom:18px; }
        .pv-err   { background:#fef2f2; border:1.5px solid #fca5a5; color:#991b1b; border-radius:10px;
                    padding:10px 14px; font-size:.88rem; margin-bottom:14px; text-align:center; font-weight:700; }
        .pv-input { width:100%; padding:12px 14px; border-radius:12px; border:1.5px solid var(--border,#EDE5D8);
                    font-size:1.1rem; font-family:inherit; box-sizing:border-box; text-align:center; font-weight:800;
                    margin-bottom:14px; }
        .pv-submit { width:100%; padding:13px; border-radius:12px; border:none; background:#E8B84B;
                     color:#1A2B4A; font-weight:900; font-size:1rem; cursor:pointer; font-family:inherit; }
        .pv-cancel { width:100%; padding:10px; border-radius:12px; border:none; background:none;
                     color:#94a3b8; font-weight:700; font-size:.85rem; cursor:pointer; margin-top:6px;
                     font-family:inherit; }
      `}</style>
      <form className="pv-modal" onSubmit={submit}>
        <div className="pv-emoji">🔒✨</div>
        <div className="pv-title">اكتب اسمك للمتابعة</div>
        <div className="pv-sub">{subtitle || `للدخول إلى حساب «${targetName}» 🌟`}</div>
        {err && <div className="pv-err">{err}</div>}
        <input
          className="pv-input"
          value={answer}
          onChange={e => { setAnswer(e.target.value); setErr(''); }}
          placeholder="اسمك هنا..."
          autoFocus
        />
        <button type="submit" className="pv-submit">دخول ←</button>
        {onCancel && <button type="button" className="pv-cancel" onClick={onCancel}>إلغاء</button>}
      </form>
    </div>
  );
}
