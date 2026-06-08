'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, UserPlus, LogIn, BookOpen } from 'lucide-react';

const WHATSAPP_HREF = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';

const EMPTY_FORM = { parent_name: '', student_name: '', phone: '', message: '' };

function RailItem({ type, href, external, Icon, label, cls, onClick }) {
  const inner = (
    <>
      <span className="fsr-icon"><Icon size={22} strokeWidth={1.7} /></span>
      <span className="fsr-label">{label}</span>
    </>
  );
  const shared = { className: `fsr-item ${cls}` };

  if (onClick) return <button onClick={onClick} {...shared}>{inner}</button>;
  if (type === 'link') return <Link href={href} {...shared}>{inner}</Link>;
  return (
    <a href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      {...shared}>
      {inner}
    </a>
  );
}

export default function FloatingSidebar() {
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(false);
  const [err,     setErr]     = useState('');

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.parent_name.trim() || !form.message.trim()) {
      setErr('يرجى ملء الاسم والرسالة'); return;
    }
    setSending(true); setErr('');
    try {
      const res  = await fetch('/api/contact/supervisor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'حدث خطأ'); setSending(false); return; }
      setDone(true);
    } catch {
      setErr('تعذّر الإرسال — تحقق من الاتصال'); setSending(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => { setForm(EMPTY_FORM); setDone(false); setErr(''); }, 300);
  }

  return (
    <>
      <nav className="fsr" aria-label="روابط الطالب السريعة">
        <RailItem type="link" href="/auth/register" Icon={UserPlus} label={'تسجيل\nالطالب'} cls="fsr-reg" />
        <RailItem type="link" href="/auth/login"    Icon={LogIn}     label={'دخول\nالطالب'}  cls="fsr-login" />
        <RailItem type="a"    href={WHATSAPP_HREF}  Icon={MessageCircle} label={'تواصل\nمعنا'} cls="fsr-wa" external />
        <RailItem Icon={BookOpen} label={'راسل\nالمرشد'} cls="fsr-sup" onClick={() => setOpen(true)} />
      </nav>

      {/* ── Contact Modal ── */}
      {open && (
        <div
          className="fsr-modal-overlay"
          onClick={e => e.target === e.currentTarget && handleClose()}
        >
          <div className="fsr-modal" dir="rtl">
            <div className="fsr-modal-hdr">
              <div>
                <h2 className="fsr-modal-title">📩 رسالة للمرشد التربوي</h2>
                <p className="fsr-modal-sub">سيردّ عليك المرشد أو الإدارة في أقرب وقت</p>
              </div>
              <button onClick={handleClose} className="fsr-modal-close">×</button>
            </div>

            {done ? (
              <div className="fsr-modal-done">
                <div className="fsr-done-icon">✅</div>
                <p className="fsr-done-title">وصلت رسالتك بنجاح!</p>
                <p className="fsr-done-sub">سيتواصل معك المرشد التربوي قريباً</p>
                <button onClick={handleClose} className="fsr-btn-primary">حسناً</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="fsr-modal-form">
                <div className="fsr-field">
                  <label className="fsr-label-txt">اسم ولي الأمر <span className="fsr-req">*</span></label>
                  <input
                    className="fsr-input" type="text"
                    placeholder="اسمك الكامل"
                    value={form.parent_name} onChange={set('parent_name')} required
                  />
                </div>
                <div className="fsr-field">
                  <label className="fsr-label-txt">اسم الطالب</label>
                  <input
                    className="fsr-input" type="text"
                    placeholder="اسم ابنك / ابنتك (اختياري)"
                    value={form.student_name} onChange={set('student_name')}
                  />
                </div>
                <div className="fsr-field">
                  <label className="fsr-label-txt">رقم التواصل</label>
                  <input
                    className="fsr-input" type="tel" dir="ltr"
                    placeholder="+44 7400 000000 (اختياري)"
                    value={form.phone} onChange={set('phone')}
                  />
                </div>
                <div className="fsr-field">
                  <label className="fsr-label-txt">رسالتك <span className="fsr-req">*</span></label>
                  <textarea
                    className="fsr-input fsr-textarea"
                    placeholder="اكتب ما تودّ إيصاله للمرشد..."
                    value={form.message} onChange={set('message')}
                    rows={4} required maxLength={1000}
                  />
                  <div className="fsr-char-count">{form.message.length}/1000</div>
                </div>
                {err && <div className="fsr-err">{err}</div>}
                <div className="fsr-modal-actions">
                  <button type="submit" disabled={sending} className="fsr-btn-primary">
                    {sending ? 'جارٍ الإرسال...' : '📩 إرسال الرسالة'}
                  </button>
                  <button type="button" onClick={handleClose} className="fsr-btn-outline">إلغاء</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
