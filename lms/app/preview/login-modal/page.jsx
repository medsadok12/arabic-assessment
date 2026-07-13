'use client';
import { useState } from 'react';

// ── Design tokens (mirrors globals.css) ──────────────────────────────────────
const C = {
  primary:   '#185FA5',
  primaryDk: '#104880',
  primaryLt: '#e8f0fb',
  accent:    '#F5A623',
  accentDk:  '#d4891a',
  text:      '#1a1a2e',
  muted:     '#6b7280',
  border:    '#d1d5db',
  bg:        '#f4f7fc',
  white:     '#ffffff',
};

// ── Inline keyframes injected once ───────────────────────────────────────────
const KEYFRAMES = `
  @keyframes fadeIn  { from { opacity:0 }                to { opacity:1 } }
  @keyframes slideUp { from { opacity:0; transform:translateY(28px) scale(.97) }
                       to   { opacity:1; transform:translateY(0)     scale(1)  } }
  @keyframes spin    { to { transform:rotate(360deg) } }
`;

// ── Small reusable pieces ─────────────────────────────────────────────────────

function Input({ label, type = 'text', placeholder, icon }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700,
                      color: C.text, marginBottom: 5 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', right: 12, top: '50%',
                         transform: 'translateY(-50%)', fontSize: '1rem',
                         pointerEvents: 'none' }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          style={{
            width: '100%', padding: icon ? '10px 38px 10px 14px' : '10px 14px',
            border: `1.5px solid ${C.border}`, borderRadius: 10,
            fontSize: '.9rem', fontFamily: 'inherit', color: C.text,
            background: C.white, outline: 'none', direction: 'rtl',
            transition: 'border-color .18s, box-shadow .18s',
          }}
          onFocus={e => {
            e.target.style.borderColor = C.primary;
            e.target.style.boxShadow = `0 0 0 3px ${C.primaryLt}`;
          }}
          onBlur={e => {
            e.target.style.borderColor = C.border;
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>
    </div>
  );
}

function PrimaryBtn({ children, style }) {
  return (
    <button
      style={{
        width: '100%', padding: '12px', background: C.primary,
        color: C.white, fontWeight: 800, fontSize: '1rem',
        border: 'none', borderRadius: 12, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'background .18s, transform .12s',
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.background = C.primaryDk}
      onMouseLeave={e => e.currentTarget.style.background = C.primary}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(.97)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {children}
    </button>
  );
}

// ── Tab: دخول (Login) ─────────────────────────────────────────────────────────

function LoginTab() {
  return (
    <div>
      <Input label="البريد الإلكتروني" type="email" placeholder="example@email.com" icon="📧" />
      <Input label="كلمة المرور"        type="password" placeholder="••••••••"     icon="🔒" />

      <div style={{ textAlign: 'left', marginBottom: 18, marginTop: -6 }}>
        <a href="#" style={{ fontSize: '.8rem', color: C.primary, textDecoration: 'none', fontWeight: 600 }}
           onMouseEnter={e => e.target.style.textDecoration='underline'}
           onMouseLeave={e => e.target.style.textDecoration='none'}>
          نسيت كلمة المرور؟
        </a>
      </div>

      <PrimaryBtn>دخول إلى لوحة الطالب ←</PrimaryBtn>

      <div style={{ textAlign: 'center', marginTop: 18, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        <span style={{ fontSize: '.82rem', color: C.muted }}>أو الدخول بـ </span>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10,
          padding: '9px 20px', border: `1.5px solid ${C.border}`, borderRadius: 10,
          background: C.white, cursor: 'pointer', fontFamily: 'inherit',
          fontSize: '.88rem', fontWeight: 600, color: C.text, width: '100%',
          justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.7 29.3 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.7-.2-3.4-.9-5z"/>
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.6 18.9 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 7.1 29.3 5 24 5 16.2 5 9.5 9 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 45c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 36.4 26.8 37 24 37c-5.2 0-9.6-2.9-11.3-7l-6.5 5C9.6 41.2 16.4 45 24 45z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.7 2-2.1 3.8-3.9 5.1l6.2 5.2c-.4.3 6.8-5 6.8-13.3 0-1.7-.2-3.4-.8-5z"/>
          </svg>
          متابعة بحساب Google
        </button>
      </div>
    </div>
  );
}

// ── Tab: تسجيل جديد (Register) ────────────────────────────────────────────────

function RegisterTab() {
  return (
    <div>
      <Input label="الاسم الكامل"        placeholder="محمد أحمد..."  icon="👤" />
      <Input label="البريد الإلكتروني"  type="email"    placeholder="example@email.com" icon="📧" />
      <Input label="كلمة المرور"         type="password" placeholder="6 أحرف على الأقل"  icon="🔒" />
      <Input label="تأكيد كلمة المرور"   type="password" placeholder="••••••••"           icon="🔒" />

      <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700,
                        color: C.text, marginBottom: 5 }}>
          كود الأكاديمية <span style={{ color: C.primary }}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', right: 12, top: '50%',
                         transform: 'translateY(-50%)', fontSize: '1rem' }}>🎓</span>
          <input
            placeholder="أدخل الكود المُرسل إليك"
            style={{
              width: '100%', padding: '10px 38px 10px 14px',
              border: `1.5px solid ${C.accent}`, borderRadius: 10,
              fontSize: '.9rem', fontFamily: 'inherit', color: C.text,
              background: '#fffdf5', outline: 'none', direction: 'rtl',
            }}
            onFocus={e => {
              e.target.style.borderColor = C.accentDk;
              e.target.style.boxShadow = '0 0 0 3px #fef3c740';
            }}
            onBlur={e => {
              e.target.style.borderColor = C.accent;
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        <p style={{ fontSize: '.75rem', color: C.muted, marginTop: 4 }}>
          * يُرسله معلمك أو الأكاديمية لتفعيل حسابك
        </p>
      </div>

      <PrimaryBtn style={{ background: C.accent, color: C.primaryDk }}
        onMouseEnter={e => e.currentTarget.style.background = C.accentDk}
        onMouseLeave={e => e.currentTarget.style.background = C.accent}>
        إنشاء الحساب ✓
      </PrimaryBtn>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function LoginModal({ onClose }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,26,60,.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn .22s ease',
      }}
    >
      <div style={{
        background: C.white, borderRadius: 20, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 60px rgba(0,0,0,.22)',
        animation: 'slideUp .28s cubic-bezier(.22,.68,0,1.2)',
        overflow: 'hidden',
      }}>

        {/* Header strip */}
        <div style={{
          background: `linear-gradient(135deg, ${C.primaryDk} 0%, ${C.primary} 100%)`,
          padding: '22px 24px 18px',
          position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, left: 14,
            background: 'rgba(255,255,255,.15)', border: 'none',
            borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
            color: '#fff', fontSize: '1rem', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>✕</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44, height: 44, background: 'rgba(255,255,255,.15)',
              borderRadius: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.5rem',
            }}>📚</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
                أكاديمية عارم
              </div>
              <div style={{ color: 'rgba(255,255,255,.72)', fontSize: '.78rem' }}>
                لوحة الطالب
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          background: C.primaryLt, padding: '6px',
          gap: 4,
        }}>
          {[
            { key: 'login',    label: 'دخول',         icon: '🔑' },
            { key: 'register', label: 'تسجيل جديد',   icon: '✨' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 0', borderRadius: 10, border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
              fontSize: '.9rem', transition: 'all .18s',
              background: tab === t.key ? C.white : 'transparent',
              color:      tab === t.key ? C.primary : C.muted,
              boxShadow:  tab === t.key ? '0 2px 10px rgba(24,95,165,.14)' : 'none',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px 24px' }}>
          {tab === 'login'    ? <LoginTab />    : <RegisterTab />}
        </div>
      </div>
    </div>
  );
}

// ── Preview page ──────────────────────────────────────────────────────────────

export default function PreviewLoginModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ── Navbar ── */}
      <header style={{
        background: `linear-gradient(90deg, ${C.primaryDk} 0%, ${C.primary} 100%)`,
        height: 64, display: 'flex', alignItems: 'center',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,.22)',
      }}>
        <div style={{
          width: '100%', maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, background: 'rgba(255,255,255,.15)',
              borderRadius: 10, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.35rem',
            }}>📚</div>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>
              أكاديمية عارم
            </span>
          </div>

          {/* Nav links (decorative) */}
          <nav style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {['الرئيسية', 'عن الأكاديمية', 'الأسعار'].map(label => (
              <a key={label} href="#" style={{
                color: 'rgba(255,255,255,.8)', textDecoration: 'none',
                padding: '6px 14px', borderRadius: 50, fontSize: '.85rem',
                fontWeight: 600, border: '1.5px solid rgba(255,255,255,.18)',
                background: 'rgba(255,255,255,.07)', transition: 'all .18s',
              }}
              onMouseEnter={e => {
                e.target.style.background = 'rgba(255,255,255,.18)';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.target.style.background = 'rgba(255,255,255,.07)';
                e.target.style.color = 'rgba(255,255,255,.8)';
              }}>
                {label}
              </a>
            ))}

            {/* CTA button */}
            <button onClick={() => setOpen(true)} style={{
              marginRight: 8,
              padding: '8px 20px', borderRadius: 50,
              background: C.accent, border: 'none', cursor: 'pointer',
              color: C.primaryDk, fontWeight: 800, fontSize: '.9rem',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: `0 4px 14px ${C.accent}55`,
              transition: 'transform .15s, box-shadow .15s, background .15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = C.accentDk;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 6px 18px ${C.accent}66`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = C.accent;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 14px ${C.accent}55`;
            }}>
              🎓 لوحة الطالب
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero (placeholder content behind navbar) ── */}
      <main style={{
        minHeight: 'calc(100vh - 64px)',
        background: `radial-gradient(ellipse at 10% 0%, ${C.primaryLt} 0%, ${C.bg} 55%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, padding: 24,
      }}>
        <div style={{
          background: C.white, borderRadius: 20, padding: '40px 48px',
          boxShadow: '0 4px 32px rgba(24,95,165,.1)',
          textAlign: 'center', maxWidth: 480,
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📚</div>
          <h1 style={{ color: C.primary, fontWeight: 900, fontSize: '1.7rem', marginBottom: 8 }}>
            أكاديمية عارم
          </h1>
          <p style={{ color: C.muted, fontSize: '.95rem', marginBottom: 24, lineHeight: 1.7 }}>
            منصة تعليمية متكاملة لتعليم اللغة العربية — اضغط على زر
            <strong style={{ color: C.primary }}> لوحة الطالب </strong>
            في الشريط العلوي لتجربة نافذة الدخول الجديدة
          </p>
          <button onClick={() => setOpen(true)} style={{
            padding: '12px 32px', background: C.primary, color: '#fff',
            border: 'none', borderRadius: 50, cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 800, fontSize: '.95rem',
            boxShadow: `0 6px 18px ${C.primary}44`,
            transition: 'transform .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            🎓 افتح لوحة الطالب
          </button>
        </div>

        {/* Preview label */}
        <div style={{
          background: `${C.accent}22`, border: `1px solid ${C.accent}55`,
          borderRadius: 50, padding: '6px 16px',
          fontSize: '.78rem', fontWeight: 700, color: C.accentDk,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          🔍 صفحة معاينة — /preview/login-modal
        </div>
      </main>

      {/* ── Modal ── */}
      {open && <LoginModal onClose={() => setOpen(false)} />}
    </>
  );
}
