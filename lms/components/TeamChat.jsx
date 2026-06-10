'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '../lib/supabase';

const ALLOWED  = ['teacher', 'admin', 'super_admin'];
const ROLE_AR  = { teacher: 'معلم', admin: 'مشرف', super_admin: 'مرشد' };
const ROLE_BG  = { teacher: '#dcfce7', admin: '#fef3c7', super_admin: '#dbeafe' };
const ROLE_CLR = { teacher: '#166534', admin: '#92400e', super_admin: '#1d4ed8' };

function dmKey(a, b) { return [a, b].sort().join('_'); }

function mergeDedup(a = [], b = []) {
  const map = new Map();
  for (const m of [...a, ...b]) map.set(m.id, m);
  return [...map.values()].sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
}

function Avatar({ name, url, role, size = 34 }) {
  const init = (name ?? '?').split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #e2e8f0' }} />;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: ROLE_BG[role] ?? '#f1f5f9', color: ROLE_CLR[role] ?? '#475569', fontWeight: 700, fontSize: size * 0.33, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{init}</div>;
}

function fmtTime(iso) { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }
function fmtDay(iso) {
  const d = new Date(iso), now = new Date(), y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'اليوم';
  if (d.toDateString() === y.toDateString())   return 'أمس';
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
}

/* Singleton AudioContext — created once, unlocked on first user tap */
let _audioCtx = null;
function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playNotifSound(isTask = false) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const play = () => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'sine';
      if (isTask) {
        o.frequency.setValueAtTime(660, ctx.currentTime);
        o.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      } else {
        o.frequency.setValueAtTime(880, ctx.currentTime);
      }
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.45);
    };
    if (ctx.state === 'suspended') ctx.resume().then(play).catch(() => {});
    else play();
  } catch (_) {}
}

function buildItems(msgs) {
  const out = []; let last = '';
  for (const m of msgs) {
    const day = fmtDay(m.created_at);
    if (day !== last) { out.push({ _sep: true, label: day, _key: `sep_${day}_${m.id}` }); last = day; }
    out.push(m);
  }
  return out;
}

function MsgList({ items, myId, isGroup, currentChat, onCompleteTask }) {
  if (items.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 8, padding: 24 }}>
      <span style={{ fontSize: '2rem' }}>{isGroup ? '👥' : '🔒'}</span>
      <span style={{ fontSize: '.84rem', textAlign: 'center' }}>
        {isGroup ? 'ابدأ محادثة مع فريق العمل!' : `ابدأ محادثة خاصة مع ${currentChat?.userName}`}
      </span>
    </div>
  );
  return items.map((item, idx) => {
    if (item._sep) return (
      <div key={item._key} style={{ textAlign: 'center', margin: '10px 0 5px' }}>
        <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '.64rem', padding: '3px 11px', borderRadius: 20 }}>{item.label}</span>
      </div>
    );
    const isMe = item.sender_id === myId;
    const prev = items[idx - 1], next = items[idx + 1];
    const samePrev = prev && !prev._sep && prev.sender_id === item.sender_id;
    const sameNext = next && !next._sep && next.sender_id === item.sender_id;
    const showName = !samePrev && !isMe && isGroup;
    const radius = isMe
      ? `${samePrev ? 6 : 16}px 4px ${sameNext ? 6 : 16}px 16px`
      : `4px ${samePrev ? 6 : 16}px 16px ${sameNext ? 6 : 16}px`;

    const isTask = item.is_task;
    const taskDone = item.task_status === 'completed';

    /* task message colours */
    let bubbleBg, bubbleColor, taskBorder;
    if (isTask) {
      bubbleBg    = taskDone ? 'rgba(34,197,94,.1)' : (isMe ? 'rgba(245,158,11,.15)' : 'rgba(245,158,11,.1)');
      bubbleColor = '#1e293b';
      taskBorder  = taskDone ? '2px solid #22c55e' : '2px solid #f59e0b';
    } else {
      bubbleBg    = isMe ? 'linear-gradient(135deg,#1a7c40,#0f5c2e)' : '#f1f5f9';
      bubbleColor = isMe ? '#fff' : '#1e293b';
      taskBorder  = 'none';
    }

    return (
      <div key={item.id} style={{ display: 'flex', flexDirection: isMe ? 'row' : 'row-reverse', gap: 6, alignItems: 'flex-end', marginTop: samePrev ? 2 : 8 }}>
        <div style={{ width: 26, flexShrink: 0 }}>
          {!sameNext && !isMe && <Avatar name={item.sender_name} url={item.sender_avatar} role={item.sender_role} size={24} />}
        </div>
        <div style={{ maxWidth: '74%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
          {showName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4 }}>
              <span style={{ fontSize: '.65rem', fontWeight: 700, color: '#475569' }}>{item.sender_name}</span>
              <span style={{ fontSize: '.57rem', padding: '1px 5px', borderRadius: 10, fontWeight: 600, background: ROLE_BG[item.sender_role] ?? '#f1f5f9', color: ROLE_CLR[item.sender_role] ?? '#475569' }}>{ROLE_AR[item.sender_role] ?? item.sender_role}</span>
            </div>
          )}
          <div style={{ background: bubbleBg, color: bubbleColor, padding: isTask ? '9px 12px 7px' : '8px 12px', borderRadius: radius, border: taskBorder, fontSize: '.85rem', lineHeight: 1.55, wordBreak: 'break-word', boxShadow: isTask ? (taskDone ? '0 2px 8px rgba(34,197,94,.15)' : '0 2px 8px rgba(245,158,11,.18)') : (isMe ? '0 2px 8px rgba(26,124,64,.2)' : '0 1px 3px rgba(0,0,0,.05)'), whiteSpace: 'pre-wrap', opacity: item._opt ? 0.72 : 1, transition: 'all .2s' }}>
            {isTask && (
              <div style={{ fontSize: '.6rem', fontWeight: 800, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4, color: taskDone ? '#16a34a' : '#b45309' }}>
                <span>{taskDone ? '✅ تم الإنجاز' : '🛠️ مهمة'}</span>
              </div>
            )}
            {item.content}
            {isTask && !isMe && !taskDone && !item._opt && (
              <button
                onClick={() => onCompleteTask?.(item.id)}
                style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 11px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#d97706'}
                onMouseLeave={e => e.currentTarget.style.background = '#f59e0b'}
              >
                <span>✅</span> إتمام المهمة
              </button>
            )}
            {isTask && taskDone && (
              <div style={{ marginTop: 6, fontSize: '.68rem', color: taskDone ? '#16a34a' : '#b45309', fontWeight: 600 }}>تم الإنجاز ✔</div>
            )}
          </div>
          {!sameNext && (
            <span style={{ fontSize: '.59rem', color: '#94a3b8', padding: '0 3px' }}>
              {item._opt ? '⏳' : fmtTime(item.created_at)}
            </span>
          )}
        </div>
        <div style={{ width: 26, flexShrink: 0 }}>
          {!sameNext && isMe && <Avatar name={item.sender_name} url={item.sender_avatar} role={item.sender_role} size={24} />}
        </div>
      </div>
    );
  });
}

/* ══════════════════════════════════════════════════════════
   IMPORTANT: ALL hooks must be declared BEFORE any early
   return — this is a React Rules of Hooks requirement.
   The `if (!allowed) return null` goes AFTER all hooks.
═══════════════════════════════════════════════════════════ */
export default function TeamChat({ user }) {
  /* ── all state & refs (hooks section — no early returns above here) ── */
  const [open,        setOpen]        = useState(false);
  const [view,        setView]        = useState('list');
  const [chat,        setChat]        = useState(null);
  const [members,     setMembers]     = useState([]);
  const [groupMsgs,   setGroupMsgs]   = useState([]);
  const [dmMsgs,      setDmMsgs]      = useState({});
  const [groupUnread, setGroupUnread] = useState(0);
  const [dmUnread,    setDmUnread]    = useState({});
  const [onlineIds,   setOnlineIds]   = useState(new Set());
  const [loading,     setLoading]     = useState(true);
  const [text,        setText]        = useState('');
  const [sending,     setSending]     = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [confirmClear,  setConfirmClear]  = useState(false);
  const [taskMode,      setTaskMode]      = useState(false);
  const [toast,         setToast]         = useState(null);

  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const openRef        = useRef(false);
  const chatRef        = useRef(null);
  const clearChRef     = useRef(null);
  const seenGroupIds   = useRef(new Set());
  const seenDmIds      = useRef({});   // { conv_key: Set<id> }
  const mountedAtRef   = useRef(null); // ISO timestamp when user authenticated
  openRef.current = open;
  chatRef.current = chat;

  /* derived values — safe with null user via optional chaining */
  const role     = user?.user_metadata?.role;
  const myId     = user?.id;
  const myName   = user?.user_metadata?.full_name ?? user?.email ?? '';
  const myAvatar = user?.user_metadata?.avatar_url ?? null;
  const allowed  = ALLOWED.includes(role);

  /* ── mobile detection + mount flag + audio unlock ── */
  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    /* iOS/Android require AudioContext to be resumed inside a user gesture */
    const unlock = () => {
      const ctx = getAudioCtx();
      if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
    };
    document.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.addEventListener('click',      unlock, { once: true });
    return () => {
      window.removeEventListener('resize', check);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click',      unlock);
    };
  }, []);

  /* ── initial data load — guard with myId ── */
  useEffect(() => {
    if (!myId) return;
    mountedAtRef.current = new Date().toISOString();
    Promise.all([
      fetch('/api/team-chat').then(r => r.json()),
      fetch('/api/team-chat/members').then(r => r.json()),
    ]).then(([gd, md]) => {
      const msgs = gd.messages ?? [];
      msgs.forEach(m => seenGroupIds.current.add(m.id));
      setGroupMsgs(msgs);
      setMembers(md.members ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [myId]);

  /* ── online presence ── */
  useEffect(() => {
    if (!myId) return;
    const sb = createClient();
    const ch = sb.channel('team-presence-v2');
    ch
      .on('presence', { event: 'sync' }, () => {
        const ids = new Set();
        Object.values(ch.presenceState()).forEach(metas =>
          metas.forEach(m => m.user_id && ids.add(m.user_id))
        );
        setOnlineIds(ids);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          try { await ch.track({ user_id: myId }); } catch (_) {}
        }
      });
    return () => { try { sb.removeChannel(ch); } catch (_) {} };
  }, [myId]);

  /* ── realtime: group + DMs ── */
  useEffect(() => {
    if (!myId) return;
    const sb = createClient();

    /* ── postgres_changes: message delivery + unread badge ── */
    const grpCh = sb.channel('tc-group-v4')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, ({ new: m }) => {
        console.log('[TeamChat] grpCh INSERT received:', m?.id, 'sender:', m?.sender_id, 'me:', myId);
        if (m.sender_id === myId) {
          /* replace optimistic bubble */
          setGroupMsgs(prev => [...prev.filter(e => !(e._opt && e.content === m.content)), m]);
          return;
        }
        /* deduplicate with broadcast / polling */
        if (seenGroupIds.current.has(m.id)) return;
        seenGroupIds.current.add(m.id);
        setGroupMsgs(prev => prev.some(e => e.id === m.id) ? prev : [...prev, m]);
        if (!openRef.current || chatRef.current?.type !== 'group') {
          console.log('[TeamChat] 🔴 incrementing groupUnread');
          setGroupUnread(n => n + 1);
          playNotifSound(m.is_task);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_messages' }, ({ new: m }) => {
        setGroupMsgs(prev => prev.map(e => e.id === m.id ? { ...e, task_status: m.task_status } : e));
      })
      .subscribe((status, err) => {
        if (err) console.error('[TeamChat] grpCh error:', status, err);
        else     console.log('[TeamChat] grpCh status:', status);
      });

    const dmCh = sb.channel('tc-dm-v4')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, ({ new: m }) => {
        if (!m.conv_key?.includes(myId)) return;
        if (m.sender_id === myId) {
          setDmMsgs(prev => {
            const ex = prev[m.conv_key] ?? [];
            return { ...prev, [m.conv_key]: [...ex.filter(e => !(e._opt && e.content === m.content)), m] };
          });
          return;
        }
        if (!seenDmIds.current[m.conv_key]) seenDmIds.current[m.conv_key] = new Set();
        if (seenDmIds.current[m.conv_key].has(m.id)) return;
        seenDmIds.current[m.conv_key].add(m.id);
        setDmMsgs(prev => {
          const ex = prev[m.conv_key] ?? [];
          return ex.some(e => e.id === m.id) ? prev : { ...prev, [m.conv_key]: [...ex, m] };
        });
        if (!openRef.current || chatRef.current?.type !== 'dm' || chatRef.current?.key !== m.conv_key) {
          setDmUnread(prev => ({ ...prev, [m.conv_key]: (prev[m.conv_key] ?? 0) + 1 }));
          playNotifSound(m.is_task);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm_messages' }, ({ new: m }) => {
        if (!m.conv_key?.includes(myId)) return;
        setDmMsgs(prev => ({
          ...prev,
          [m.conv_key]: (prev[m.conv_key] ?? []).map(e => e.id === m.id ? { ...e, task_status: m.task_status } : e),
        }));
      })
      .subscribe((status, err) => {
        if (err) console.error('[TeamChat] dmCh error:', status, err);
        else     console.log('[TeamChat] dmCh status:', status);
      });

    /* broadcast: fast-path delivery (deduplication prevents double badge) */
    const bcastCh = sb.channel('tc-broadcast-v3', { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'grp_msg' }, ({ payload: m }) => {
        if (!m?.id) return;
        if (seenGroupIds.current.has(m.id)) return; /* postgres_changes already handled */
        seenGroupIds.current.add(m.id);
        setGroupMsgs(prev => prev.some(e => e.id === m.id) ? prev : [...prev, m]);
        if (!openRef.current || chatRef.current?.type !== 'group') {
          setGroupUnread(n => n + 1);
          playNotifSound(m.is_task);
        }
      })
      .on('broadcast', { event: 'dm_msg' }, ({ payload: m }) => {
        if (!m?.conv_key?.includes(myId)) return;
        if (!seenDmIds.current[m.conv_key]) seenDmIds.current[m.conv_key] = new Set();
        if (seenDmIds.current[m.conv_key].has(m.id)) return;
        seenDmIds.current[m.conv_key].add(m.id);
        setDmMsgs(prev => {
          const ex = prev[m.conv_key] ?? [];
          return ex.some(e => e.id === m.id) ? prev : { ...prev, [m.conv_key]: [...ex, m] };
        });
        if (!openRef.current || chatRef.current?.type !== 'dm' || chatRef.current?.key !== m.conv_key) {
          setDmUnread(prev => ({ ...prev, [m.conv_key]: (prev[m.conv_key] ?? 0) + 1 }));
          playNotifSound(m.is_task);
        }
      })
      .on('broadcast', { event: 'task_completed' }, ({ payload }) => {
        const { messageId, convKey, completedByName } = payload ?? {};
        if (!messageId) return;
        setGroupMsgs(prev => prev.map(m => m.id === messageId ? { ...m, task_status: 'completed' } : m));
        if (convKey) setDmMsgs(prev => ({
          ...prev,
          [convKey]: (prev[convKey] ?? []).map(m => m.id === messageId ? { ...m, task_status: 'completed' } : m),
        }));
        setToast(`✅ أنجز ${completedByName ?? 'أحد الأعضاء'} المهمة`);
        setTimeout(() => setToast(null), 4000);
      })
      .on('broadcast', { event: 'group_cleared' }, () => {
        setGroupMsgs([]);
        setGroupUnread(0);
      })
      .on('broadcast', { event: 'dm_cleared' }, ({ payload }) => {
        const ck = payload?.conv_key;
        if (ck?.includes(myId)) {
          setDmMsgs(prev => ({ ...prev, [ck]: [] }));
          setDmUnread(prev => ({ ...prev, [ck]: 0 }));
        }
      })
      .subscribe();
    clearChRef.current = bcastCh;

    return () => {
      try { sb.removeChannel(grpCh); } catch (_) {}
      try { sb.removeChannel(dmCh); }  catch (_) {}
      try { sb.removeChannel(bcastCh); } catch (_) {}
    };
  }, [myId]);

  /* ── scroll to bottom ── */
  useEffect(() => {
    if (open && view === 'chat') setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
  }, [open, view, chat, groupMsgs, dmMsgs]);

  /* ── focus input on chat open ── */
  useEffect(() => {
    if (open && view === 'chat') setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, view, chat]);

  /* ── unified polling: group + DM notifications every 8s ── */
  useEffect(() => {
    if (!myId) return;
    const interval = setInterval(async () => {
      /* use mountedAt (or 3 minutes ago as safety floor) */
      const floor = mountedAtRef.current
        ?? new Date(Date.now() - 3 * 60 * 1000).toISOString();
      try {
        const r = await fetch(`/api/team-chat/notify?since=${encodeURIComponent(floor)}`);
        if (!r.ok) return;
        const { groupMsgs: gm = [], dmMsgs: dm = [] } = await r.json();

        /* group */
        const unseenGrp = gm.filter(m => !seenGroupIds.current.has(m.id));
        if (unseenGrp.length > 0) {
          unseenGrp.forEach(m => seenGroupIds.current.add(m.id));
          setGroupMsgs(prev => mergeDedup(prev, unseenGrp));
          if (!openRef.current || chatRef.current?.type !== 'group') {
            setGroupUnread(n => n + unseenGrp.length);
            playNotifSound(unseenGrp.some(m => m.is_task));
          }
        }

        /* DMs — group by conv_key */
        const byConv = {};
        for (const m of dm) {
          if (!byConv[m.conv_key]) byConv[m.conv_key] = [];
          byConv[m.conv_key].push(m);
        }
        for (const [ck, msgs] of Object.entries(byConv)) {
          if (!seenDmIds.current[ck]) seenDmIds.current[ck] = new Set();
          const unseen = msgs.filter(m => !seenDmIds.current[ck].has(m.id));
          if (unseen.length > 0) {
            unseen.forEach(m => seenDmIds.current[ck].add(m.id));
            setDmMsgs(prev => ({ ...prev, [ck]: mergeDedup(prev[ck] ?? [], unseen) }));
            if (!openRef.current || chatRef.current?.type !== 'dm' || chatRef.current?.key !== ck) {
              setDmUnread(prev => ({ ...prev, [ck]: (prev[ck] ?? 0) + unseen.length }));
              playNotifSound(unseen.some(m => m.is_task));
            }
          }
        }
      } catch (_) {}
    }, 8000);
    return () => clearInterval(interval);
  }, [myId]);

  /* ── early return AFTER all hooks ─────────────────────────────────────── */
  if (!allowed) return null;

  /* ── derived render values ── */
  const totalUnread  = groupUnread + Object.values(dmUnread).reduce((s, n) => s + n, 0);
  const currentMsgs  = chat?.type === 'group' ? groupMsgs : (dmMsgs[chat?.key] ?? []);
  const lastGroupMsg = groupMsgs[groupMsgs.length - 1];

  /* ── navigation helpers ── */
  function openGroup() {
    groupMsgs.forEach(m => seenGroupIds.current.add(m.id));
    setChat({ type: 'group' }); setView('chat'); setGroupUnread(0);
  }

  async function openDm(member) {
    const ck = dmKey(myId, member.id);
    setChat({ type: 'dm', userId: member.id, userName: member.name, userRole: member.role, userAvatar: member.avatar_url, key: ck });
    setView('chat');
    setDmUnread(prev => ({ ...prev, [ck]: 0 }));
    if (!seenDmIds.current[ck]) seenDmIds.current[ck] = new Set();
    if (!dmMsgs[ck]) {
      setLoading(true);
      const r = await fetch(`/api/team-chat/dm?with=${member.id}`);
      const d = await r.json();
      const msgs = d.messages ?? [];
      msgs.forEach(m => seenDmIds.current[ck].add(m.id));
      setDmMsgs(prev => ({ ...prev, [ck]: mergeDedup(msgs, prev[ck] ?? []) }));
      setLoading(false);
    } else {
      (dmMsgs[ck] ?? []).forEach(m => seenDmIds.current[ck].add(m.id));
    }
  }

  function goBack() { setView('list'); setChat(null); setText(''); setConfirmClear(false); }

  async function clearChat() {
    if (!chat) return;
    if (chat.type === 'group') {
      await fetch('/api/team-chat', { method: 'DELETE' });
      setGroupMsgs([]);
      setGroupUnread(0);
      try { clearChRef.current?.send({ type: 'broadcast', event: 'group_cleared', payload: {} }); } catch (_) {}
    } else {
      await fetch(`/api/team-chat/dm?with=${chat.userId}`, { method: 'DELETE' });
      setDmMsgs(prev => ({ ...prev, [chat.key]: [] }));
      setDmUnread(prev => ({ ...prev, [chat.key]: 0 }));
      try { clearChRef.current?.send({ type: 'broadcast', event: 'dm_cleared', payload: { conv_key: chat.key } }); } catch (_) {}
    }
    setConfirmClear(false);
  }

  /* ── complete task ── */
  async function completeTask(msgId) {
    if (!chat) return;
    const type = chat.type === 'group' ? 'group' : 'dm';
    const updater = prev => prev.map(m => m.id === msgId ? { ...m, task_status: 'completed' } : m);
    if (type === 'group') setGroupMsgs(updater);
    else setDmMsgs(prev => ({ ...prev, [chat.key]: updater(prev[chat.key] ?? []) }));
    try {
      await fetch('/api/team-chat/task', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msgId, type }),
      });
      clearChRef.current?.send({
        type: 'broadcast', event: 'task_completed',
        payload: { messageId: msgId, convKey: chat.key, completedByName: myName },
      });
    } catch (_) {}
  }

  /* ── send with optimistic update ── */
  async function send() {
    const content = text.trim();
    if (!content || sending || !chat) return;
    setSending(true);
    setText('');
    const isTaskMsg = taskMode;
    setTaskMode(false);

    const opt = {
      id: `opt_${Date.now()}`, sender_id: myId,
      sender_name: myName, sender_role: role, sender_avatar: myAvatar,
      content, created_at: new Date().toISOString(), _opt: true,
      is_task: isTaskMsg, task_status: 'pending',
    };

    if (chat.type === 'group') {
      setGroupMsgs(prev => [...prev, opt]);
      const res  = await fetch('/api/team-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, is_task: isTaskMsg }) });
      const { message } = await res.json();
      if (message) {
        setGroupMsgs(prev => mergeDedup(prev, [message]));
        try { clearChRef.current?.send({ type: 'broadcast', event: 'grp_msg', payload: message }); } catch (_) {}
      }
    } else {
      setDmMsgs(prev => ({ ...prev, [chat.key]: [...(prev[chat.key] ?? []), opt] }));
      const res  = await fetch('/api/team-chat/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, to: chat.userId, is_task: isTaskMsg }) });
      const { message } = await res.json();
      if (message) {
        setDmMsgs(prev => ({ ...prev, [chat.key]: mergeDedup(prev[chat.key] ?? [], [message]) }));
        try { clearChRef.current?.send({ type: 'broadcast', event: 'dm_msg', payload: message }); } catch (_) {}
      }
    }
    setSending(false);
    inputRef.current?.focus();
  }

  function onKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }

  /* ── JSX ── */
  if (!mounted) return null;
  return createPortal(
    <>
      {/* floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="محادثات الفريق"
        style={{ position: 'fixed', bottom: isMobile ? 100 : 88, left: 20, zIndex: 9999, width: isMobile ? 48 : 52, height: isMobile ? 48 : 52, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#1a7c40 0%,#0f5c2e 100%)', boxShadow: '0 4px 16px rgba(26,124,64,.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .18s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
        }
        {!open && totalUnread > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, background: '#e53e3e', color: '#fff', borderRadius: '50%', minWidth: 20, height: 20, padding: '0 3px', fontSize: '.62rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', lineHeight: 1 }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* mobile backdrop */}
      {open && isMobile && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9080, background: 'rgba(0,0,0,.35)', animation: 'tcFade .2s ease' }} />
      )}

      {/* chat panel */}
      {open && (
        <div style={isMobile
          ? { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9090, width: '100%', height: '88dvh', maxHeight: '88dvh', background: '#fff', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'tcUpMob .25s cubic-bezier(.34,1.3,.64,1)' }
          : { position: 'fixed', bottom: 150, left: 20, zIndex: 9090, width: 355, maxWidth: 'calc(100vw - 28px)', height: 500, maxHeight: 'calc(100vh - 170px)', background: '#fff', borderRadius: 20, boxShadow: '0 12px 50px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'tcUp .22s cubic-bezier(.34,1.56,.64,1)' }}>

          {/* header */}
          <div style={{ background: 'linear-gradient(135deg,#1a7c40 0%,#0f5c2e 100%)', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            {view === 'chat' && (
              <button onClick={goBack} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.4rem', padding: '2px 0', lineHeight: 1, opacity: .85, flexShrink: 0 }}>‹</button>
            )}

            {view === 'list' && <>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>💬</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '.93rem' }}>المحادثات</div>
                <div style={{ color: 'rgba(255,255,255,.55)', fontSize: '.67rem' }}>فريق العمل · خاص</div>
              </div>
            </>}

            {view === 'chat' && chat?.type === 'group' && <>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', flexShrink: 0 }}>👥</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '.9rem' }}>فريق العمل</div>
                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '.65rem' }}>معلمون · إدارة · مشرفون</div>
              </div>
            </>}

            {view === 'chat' && chat?.type === 'dm' && <>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar name={chat.userName} url={chat.userAvatar} role={chat.userRole} size={34} />
                <div style={{ position: 'absolute', bottom: 1, left: 1, width: 10, height: 10, borderRadius: '50%', background: onlineIds.has(chat.userId) ? '#22c55e' : '#9ca3af', border: '2px solid white' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.userName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: onlineIds.has(chat.userId) ? '#86efac' : 'rgba(255,255,255,.4)', fontSize: '.64rem' }}>
                    {onlineIds.has(chat.userId) ? '● متصل الآن' : '○ غير متصل'}
                  </span>
                  <span style={{ background: 'rgba(0,0,0,.2)', color: 'rgba(255,255,255,.8)', fontSize: '.58rem', padding: '1px 7px', borderRadius: 10 }}>خاص 🔒</span>
                </div>
              </div>
            </>}

            {view === 'chat' && !confirmClear && (
              <button onClick={() => setConfirmClear(true)} title="محو الرسائل" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            )}
            {view === 'chat' && confirmClear && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{ color: 'rgba(255,255,255,.85)', fontSize: '.72rem', whiteSpace: 'nowrap' }}>محو الرسائل؟</span>
                <button onClick={clearChat} style={{ background: '#e53e3e', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, lineHeight: 1.4 }}>نعم</button>
                <button onClick={() => setConfirmClear(false)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '.7rem', padding: '3px 8px', borderRadius: 6, lineHeight: 1.4 }}>لا</button>
              </div>
            )}
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: '.95rem', padding: '4px 6px', borderRadius: 8, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>

          {/* CONVERSATIONS LIST */}
          {view === 'list' && (
            <div style={{ flex: 1, overflowY: 'auto', direction: 'rtl' }}>
              <div onClick={openGroup}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f4f8', transition: 'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>👥</div>
                  {groupUnread > 0 && <span style={{ position: 'absolute', top: -3, left: -3, background: '#e53e3e', color: '#fff', borderRadius: '50%', minWidth: 18, height: 18, padding: '0 2px', fontSize: '.59rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', lineHeight: 1 }}>{groupUnread}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#1e293b' }}>فريق العمل</div>
                  <div style={{ fontSize: '.73rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastGroupMsg
                      ? `${lastGroupMsg.is_task ? (lastGroupMsg.task_status === 'completed' ? '✅ ' : '🛠️ ') : ''}${lastGroupMsg.sender_name.split(' ')[0]}: ${lastGroupMsg.content.slice(0, 28)}${lastGroupMsg.content.length > 28 ? '…' : ''}`
                      : 'لا توجد رسائل بعد'}
                  </div>
                </div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#cbd5e1" style={{ transform: 'scaleX(-1)', flexShrink: 0 }}><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </div>

              <div style={{ padding: '9px 14px 3px', fontSize: '.67rem', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#94a3b8"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                محادثات خاصة
              </div>

              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '.82rem' }}>⏳ تحميل...</div>
              ) : members.length === 0 ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '.82rem' }}>لا يوجد أعضاء آخرون في الفريق</div>
              ) : members.map(m => {
                const ck     = dmKey(myId, m.id);
                const unread = dmUnread[ck] ?? 0;
                const lastMsg = dmMsgs[ck]?.[dmMsgs[ck].length - 1];
                const online  = onlineIds.has(m.id);
                return (
                  <div key={m.id} onClick={() => openDm(m)}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #fafafa', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar name={m.name} url={m.avatar_url} role={m.role} size={42} />
                      <div style={{ position: 'absolute', bottom: 1, left: 1, width: 11, height: 11, borderRadius: '50%', background: online ? '#22c55e' : '#d1d5db', border: '2px solid #fff' }} />
                      {unread > 0 && <span style={{ position: 'absolute', top: -3, right: -3, background: '#e53e3e', color: '#fff', borderRadius: '50%', minWidth: 18, height: 18, padding: '0 2px', fontSize: '.59rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', lineHeight: 1 }}>{unread}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: '.87rem', color: '#1e293b' }}>{m.name}</span>
                        <span style={{ fontSize: '.6rem', padding: '1px 6px', borderRadius: 10, fontWeight: 600, background: ROLE_BG[m.role] ?? '#f1f5f9', color: ROLE_CLR[m.role] ?? '#475569', flexShrink: 0 }}>{ROLE_AR[m.role] ?? m.role}</span>
                      </div>
                      <div style={{ fontSize: '.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: unread > 0 ? '#1e293b' : '#64748b', fontWeight: unread > 0 ? 600 : 400 }}>
                        {lastMsg
                          ? `${lastMsg.is_task ? (lastMsg.task_status === 'completed' ? '✅ ' : '🛠️ ') : ''}${lastMsg.sender_id === myId ? 'أنت: ' : ''}${lastMsg.content.slice(0, 25)}${lastMsg.content.length > 25 ? '…' : ''}`
                          : <span style={{ color: online ? '#22c55e' : '#94a3b8' }}>{online ? '● متصل الآن' : '○ غير متصل'}</span>
                        }
                      </div>
                    </div>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#cbd5e1" style={{ transform: 'scaleX(-1)', flexShrink: 0 }}><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                  </div>
                );
              })}
            </div>
          )}

          {/* CHAT VIEW */}
          {view === 'chat' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
                {loading
                  ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '.88rem' }}>⏳ تحميل...</div>
                  : <MsgList items={buildItems(currentMsgs)} myId={myId} isGroup={chat?.type === 'group'} currentChat={chat} onCompleteTask={completeTask} />
                }
                <div ref={bottomRef} style={{ height: 4 }} />
              </div>

              <div style={{ padding: '8px 10px 10px', borderTop: '1px solid #f0f4f8', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                {taskMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', fontSize: '.72rem', fontWeight: 700, color: '#b45309' }}>
                    🛠️ وضع المهمة — ستُرسل هذه الرسالة كمهمة قابلة للإنجاز
                    <button onClick={() => setTaskMode(false)} style={{ marginRight: 'auto', background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontSize: '.8rem', padding: 0 }}>✕</button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end', direction: 'rtl' }}>
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={onKey}
                  placeholder={chat?.type === 'group' ? 'اكتب رسالة للفريق...' : `راسل ${chat?.userName?.split(' ')[0]}...`}
                  rows={1}
                  className="tc-textarea"
                  style={{ flex: 1, resize: 'none', border: `1.5px solid ${taskMode ? '#f59e0b' : '#e2e8f0'}`, borderRadius: 20, padding: '8px 13px', fontSize: '.84rem', outline: 'none', fontFamily: 'inherit', maxHeight: 88, overflowY: 'auto', direction: 'rtl', lineHeight: 1.5, background: taskMode ? '#fffbeb' : '#fafcff', transition: 'all .15s' }}
                  onFocus={e => e.currentTarget.style.borderColor = taskMode ? '#f59e0b' : '#1a7c40'}
                  onBlur={e => e.currentTarget.style.borderColor = taskMode ? '#f59e0b' : '#e2e8f0'}
                />
                <button
                  onClick={() => setTaskMode(t => !t)}
                  title={taskMode ? 'إلغاء وضع المهمة' : 'إرسال كمهمة'}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: taskMode ? '#fef3c7' : '#f1f5f9', color: taskMode ? '#d97706' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem', transition: 'all .15s', boxShadow: taskMode ? '0 0 0 2px #f59e0b' : 'none' }}
                >🛠️</button>
                <button
                  onClick={send}
                  disabled={!text.trim() || sending}
                  style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: text.trim() ? (taskMode ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#1a7c40,#0f5c2e)') : '#e2e8f0', color: text.trim() ? '#fff' : '#94a3b8', cursor: text.trim() && !sending ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}
                >
                  {sending
                    ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'tcSpin .7s linear infinite' }} />
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'scaleX(-1)' }}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  }
                </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: isMobile ? 175 : 155, left: 20, zIndex: 10000, background: 'linear-gradient(135deg,#1a7c40,#0f5c2e)', color: '#fff', padding: '10px 16px', borderRadius: 14, fontSize: '.84rem', fontWeight: 700, boxShadow: '0 4px 20px rgba(26,124,64,.45)', animation: 'tcUp .3s cubic-bezier(.34,1.56,.64,1)', maxWidth: 260, direction: 'rtl' }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes tcUp    { from{opacity:0;transform:translateY(18px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes tcUpMob { from{opacity:0;transform:translateY(60px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tcSpin  { to{transform:rotate(360deg)} }
        @keyframes tcFade  { from{opacity:0} to{opacity:1} }
        @media (max-width:639px) {
          .tc-textarea { font-size: 16px !important; }
        }
      `}</style>
    </>,
    document.body
  );
}
