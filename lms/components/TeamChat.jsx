'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '../lib/supabase';

const ALLOWED_ROLES = ['teacher', 'admin', 'super_admin'];

const ROLE_AR    = { teacher: 'معلم', admin: 'مشرف', super_admin: 'مرشد' };
const ROLE_BG    = { teacher: '#dcfce7', admin: '#fef3c7', super_admin: '#dbeafe' };
const ROLE_COLOR = { teacher: '#166534', admin: '#92400e', super_admin: '#1d4ed8' };

function initials(name) {
  return (name ?? '?').split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name, url, role, size = 30 }) {
  if (url) return (
    <img src={url} alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #e2e8f0' }}
    />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: ROLE_BG[role] ?? '#f1f5f9',
      color: ROLE_COLOR[role] ?? '#475569',
      fontWeight: 700, fontSize: size * 0.36,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(iso) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'اليوم';
  if (d.toDateString() === yesterday.toDateString()) return 'أمس';
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
}

export default function TeamChat({ user }) {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([]);
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(true);
  const [unread,  setUnread]  = useState(0);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const openRef   = useRef(false);
  openRef.current = open;

  const role = user?.user_metadata?.role;
  if (!ALLOWED_ROLES.includes(role)) return null;

  const myId = user?.id;

  // Initial message load
  useEffect(() => {
    fetch('/api/team-chat')
      .then(r => r.json())
      .then(d => { setMsgs(d.messages ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Supabase Realtime subscription
  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel('team-chat-v1')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, ({ new: m }) => {
        setMsgs(prev => [...prev, m]);
        if (!openRef.current) setUnread(n => n + 1);
      })
      .subscribe();
    return () => sb.removeChannel(ch);
  }, []);

  // Scroll to bottom when panel opens or new message arrives
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: msgs.length > 10 ? 'auto' : 'smooth' }), 60);
  }, [msgs, open]);

  // Focus input on open, reset unread
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    await fetch('/api/team-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setSending(false);
    inputRef.current?.focus();
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // Build display list with date separators
  const items = [];
  let lastDay = '';
  for (const m of msgs) {
    const day = fmtDay(m.created_at);
    if (day !== lastDay) { items.push({ _sep: true, label: day, key: `sep_${day}` }); lastDay = day; }
    items.push(m);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="محادثات الفريق"
        style={{
          position: 'fixed', bottom: 88, left: 20, zIndex: 9100,
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #1a7c40 0%, #0f5c2e 100%)',
          boxShadow: '0 4px 16px rgba(26,124,64,.45)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .18s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
        }
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#e53e3e', color: '#fff',
            borderRadius: '50%', minWidth: 20, height: 20, padding: '0 3px',
            fontSize: '.62rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff', lineHeight: 1,
          }}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 150, left: 20, zIndex: 9090,
          width: 355, maxWidth: 'calc(100vw - 28px)',
          height: 500, maxHeight: 'calc(100vh - 170px)',
          background: '#fff', borderRadius: 20,
          boxShadow: '0 12px 50px rgba(0,0,0,.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'tcUp .22s cubic-bezier(.34,1.56,.64,1)',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1a7c40 0%, #0f5c2e 100%)',
            padding: '11px 14px',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
              flexShrink: 0,
            }}>💬</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '.95rem' }}>فريق العمل</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.68rem' }}>معلمون · إدارة · مشرفون</div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.75)', cursor: 'pointer', fontSize: '1rem', padding: '4px 6px', borderRadius: 8, lineHeight: 1 }}>
              ✕
            </button>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '10px 10px 4px',
            display: 'flex', flexDirection: 'column', gap: 0, direction: 'rtl',
          }}>
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '.88rem' }}>
                ⏳ تحميل...
              </div>
            ) : items.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 8, padding: 24 }}>
                <span style={{ fontSize: '2.2rem' }}>👋</span>
                <span style={{ fontSize: '.86rem', textAlign: 'center' }}>ابدأ محادثة مع فريق العمل!</span>
              </div>
            ) : items.map((item, idx) => {
              if (item._sep) return (
                <div key={item.key} style={{ textAlign: 'center', margin: '10px 0 6px' }}>
                  <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '.66rem', padding: '3px 12px', borderRadius: 20 }}>{item.label}</span>
                </div>
              );

              const isMe = item.sender_id === myId;
              const prev = items[idx - 1];
              const next = items[idx + 1];
              const sameAsPrev = prev && !prev._sep && prev.sender_id === item.sender_id;
              const sameAsNext = next && !next._sep && next.sender_id === item.sender_id;
              const showName   = !sameAsPrev && !isMe;
              const showAvatar = !sameAsNext;

              const radius = isMe
                ? `${sameAsPrev ? 8 : 16}px 4px ${sameAsNext ? 8 : 16}px 16px`
                : `4px ${sameAsPrev ? 8 : 16}px 16px ${sameAsNext ? 8 : 16}px`;

              return (
                <div key={item.id} style={{
                  display: 'flex', flexDirection: isMe ? 'row' : 'row-reverse',
                  gap: 6, alignItems: 'flex-end',
                  marginTop: sameAsPrev ? 2 : 8,
                }}>
                  {/* Avatar placeholder / actual avatar */}
                  <div style={{ width: 30, flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}>
                    {showAvatar && !isMe && (
                      <Avatar name={item.sender_name} url={item.sender_avatar} role={item.sender_role} size={28} />
                    )}
                  </div>

                  {/* Bubble group */}
                  <div style={{ maxWidth: '74%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
                    {showName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingRight: 4 }}>
                        <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#475569' }}>{item.sender_name}</span>
                        <span style={{
                          fontSize: '.58rem', padding: '1px 6px', borderRadius: 10, fontWeight: 600,
                          background: ROLE_BG[item.sender_role] ?? '#f1f5f9',
                          color: ROLE_COLOR[item.sender_role] ?? '#475569',
                        }}>{ROLE_AR[item.sender_role] ?? item.sender_role}</span>
                      </div>
                    )}
                    <div style={{
                      background: isMe ? 'linear-gradient(135deg, #1a7c40, #0f5c2e)' : '#f1f5f9',
                      color: isMe ? '#fff' : '#1e293b',
                      padding: '8px 12px',
                      borderRadius: radius,
                      fontSize: '.85rem', lineHeight: 1.55,
                      wordBreak: 'break-word',
                      boxShadow: isMe ? '0 2px 8px rgba(26,124,64,.2)' : '0 1px 3px rgba(0,0,0,.05)',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {item.content}
                    </div>
                    {!sameAsNext && (
                      <span style={{ fontSize: '.6rem', color: '#94a3b8', padding: '0 3px' }}>{fmtTime(item.created_at)}</span>
                    )}
                  </div>

                  {/* My avatar */}
                  <div style={{ width: 30, flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}>
                    {showAvatar && isMe && (
                      <Avatar name={item.sender_name} url={item.sender_avatar} role={item.sender_role} size={28} />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} style={{ height: 4 }} />
          </div>

          {/* Input bar */}
          <div style={{
            padding: '8px 10px 10px',
            borderTop: '1px solid #f0f4f8',
            display: 'flex', gap: 7, alignItems: 'flex-end', flexShrink: 0,
            direction: 'rtl',
          }}>
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKey}
              placeholder="اكتب رسالة للفريق..."
              rows={1}
              style={{
                flex: 1, resize: 'none',
                border: '1.5px solid #e2e8f0', borderRadius: 20,
                padding: '8px 13px', fontSize: '.84rem',
                outline: 'none', fontFamily: 'inherit',
                maxHeight: 88, overflowY: 'auto',
                direction: 'rtl', lineHeight: 1.5,
                background: '#fafcff',
                transition: 'border-color .15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#1a7c40'}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={send}
              disabled={!text.trim() || sending}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none',
                background: text.trim() ? 'linear-gradient(135deg, #1a7c40, #0f5c2e)' : '#e2e8f0',
                color: text.trim() ? '#fff' : '#94a3b8',
                cursor: text.trim() && !sending ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all .15s',
              }}
            >
              {sending
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'tcSpin .7s linear infinite' }} />
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'scaleX(-1)' }}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              }
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tcUp {
          from { opacity: 0; transform: translateY(18px) scale(.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
        @keyframes tcSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
