'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '../lib/supabase';

const ICONS = {
  recruitment:     '📋',
  interview:       '🗓️',
  assessment:      '📝',
  teacher:         '👨‍🏫',
  session:         '📅',
  space_post:      '🏫',
  space_comment:   '💬',
  lesson_feedback: '📓',
  parent_message:  '📩',
};

function relTime(iso, lang) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (lang === 'ar') {
    if (diff < 60)    return 'الآن';
    if (diff < 3600)  return `منذ ${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
    return `منذ ${Math.floor(diff / 86400)} يوم`;
  }
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell({ userId, role, lang = 'ar' }) {
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const [open,          setOpen]          = useState(false);
  const ref     = useRef(null);
  const supabase = createClient();

  const isAdmin = role === 'admin' || role === 'super_admin';

  async function load() {
    try {
      const data = await fetch('/api/notifications').then(r => r.json());
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnread(data.unread ?? 0);
      }
    } catch (_) {}
  }

  async function markAllRead() {
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await fetch('/api/notifications', { method: 'PATCH' }).catch(() => {});
  }

  useEffect(() => {
    if (!userId) return;
    load();

    // Supabase Realtime — receive new notifications instantly
    const channel = supabase
      .channel(`notif-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        payload => {
          const n = payload.new;
          // RLS ensures we only receive authorized rows, but double-check client-side
          const forMe = n.recipient_id === userId ||
                        (n.recipient_id === null && isAdmin);
          if (!forMe) return;
          setNotifications(prev => [n, ...prev].slice(0, 50));
          setUnread(c => c + 1);
        })
      .subscribe();

    // Polling fallback every 60s
    const iv = setInterval(load, 60_000);

    return () => { supabase.removeChannel(channel); clearInterval(iv); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function toggleOpen() {
    const wasOpen = open;
    setOpen(o => !o);
    if (!wasOpen && unread > 0) markAllRead();
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={toggleOpen}
        title={lang === 'ar' ? 'الإشعارات' : 'Notifications'}
        style={{
          position: 'relative',
          background: open ? 'var(--primary)' : 'var(--bg)',
          border: '1.5px solid var(--border)',
          borderRadius: 10, width: 40, height: 40,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', transition: 'all .15s',
          color: open ? '#fff' : 'var(--text)',
        }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -6, left: -6,
            background: '#e53e3e', color: '#fff',
            fontSize: '.65rem', fontWeight: 800,
            minWidth: 18, height: 18, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1,
          }}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 46, left: 0,
          width: 320, maxHeight: 440, overflowY: 'auto',
          background: '#fff', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(24,95,165,.18)',
          border: '1px solid var(--border)', zIndex: 9999,
          direction: 'rtl',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px 10px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, background: '#fff', zIndex: 1,
          }}>
            <span style={{ fontWeight: 800, fontSize: '.95rem' }}>
              {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
              {unread > 0 && (
                <span style={{ marginRight: 6, background: '#e53e3e', color: '#fff',
                  fontSize: '.65rem', fontWeight: 800, borderRadius: 9,
                  padding: '1px 6px' }}>{unread}</span>
              )}
            </span>
            {notifications.some(n => !n.is_read) && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--primary)', fontSize: '.78rem', fontWeight: 700,
              }}>
                {lang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '.88rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔕</div>
              {lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
            </div>
          ) : notifications.map(n => (
            <div
              key={n.id}
              onClick={() => n.link && (window.location.href = n.link)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: n.is_read ? 'transparent' : 'rgba(24,95,165,.05)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
                cursor: n.link ? 'pointer' : 'default',
                transition: 'background .12s',
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1.4, flexShrink: 0 }}>
                {ICONS[n.type] ?? '🔔'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '.88rem', color: 'var(--text)', wordBreak: 'break-word' }}>
                  {n.title}
                </div>
                {n.body && (
                  <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 2, wordBreak: 'break-word', lineHeight: 1.5 }}>
                    {n.body}
                  </div>
                )}
                <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 4 }}>
                  {relTime(n.created_at, lang)}
                </div>
              </div>
              {!n.is_read && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 5 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
