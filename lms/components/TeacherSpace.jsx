'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Role metadata ────────────────────────────────────────────────────────────
const ROLE = {
  teacher:     { color: '#185FA5', bg: '#eff6ff', label: 'معلم' },
  supervisor:  { color: '#7c3aed', bg: '#f5f3ff', label: 'مرشد' },
  admin:       { color: '#d97706', bg: '#fffbeb', label: 'مدير مساعد' },
  super_admin: { color: '#dc2626', bg: '#fef2f2', label: 'المدير العام' },
};
function roleInfo(r) { return ROLE[r] ?? { color: '#64748b', bg: '#f8fafc', label: r }; }

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1)  return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  if (h < 24) return `منذ ${h} س`;
  if (d < 7)  return `منذ ${d} يوم`;
  const dt = new Date(iso);
  return `${dt.getDate()} ${MONTHS_AR[dt.getMonth()]}`;
}

function Avatar({ name, role, size = 38 }) {
  const ri = roleInfo(role);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: ri.color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * .38, flexShrink: 0,
    }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }) {
  const ri = roleInfo(role);
  return (
    <span style={{
      background: ri.bg, color: ri.color,
      border: `1px solid ${ri.color}30`,
      borderRadius: 20, padding: '1px 9px',
      fontSize: '.73rem', fontWeight: 700,
    }}>
      {ri.label}
    </span>
  );
}

// ── Image compression ────────────────────────────────────────────────────────
function compressImage(file, maxW = 1200, quality = 0.8) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, maxW / img.width, maxW / img.height);
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ data: canvas.toDataURL('image/jpeg', quality), mime: 'image/jpeg' });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TeacherSpace({ currentUser }) {
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [posting,     setPosting]     = useState(false);
  const [text,        setText]        = useState('');
  const [media,       setMedia]       = useState(null);  // { type, data, mime, name }
  const [expandComments, setExpandComments] = useState({});
  const [commenting,  setCommenting]  = useState({});    // postId -> text
  const [sendingCmt,  setSendingCmt]  = useState(null);
  const [deletingId,  setDeletingId]  = useState(null);
  const [likingId,    setLikingId]    = useState(null);

  // Recording
  const [recording,   setRecording]   = useState(false);
  const [recSeconds,  setRecSeconds]  = useState(0);
  const recorderRef   = useRef(null);
  const chunksRef     = useRef([]);
  const timerRef      = useRef(null);

  const imgInputRef  = useRef(null);
  const audioInputRef = useRef(null);

  const uid = currentUser?.id;

  // ── Load posts ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/teacher-space')
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []))
      .finally(() => setLoading(false));
  }, []);

  // ── Audio recording ──────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => setMedia({ type: 'audio', data: reader.result, mime: 'audio/webm', name: 'تسجيل صوتي' });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);
      };
      mr.start(200);
      recorderRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      alert('تعذّر الوصول للميكروفون. تأكد من منح الإذن.');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function fmtSec(s) {
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }

  // ── Image upload ──────────────────────────────────────────────────────────────
  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data, mime } = await compressImage(file);
    setMedia({ type: 'image', data, mime, name: file.name });
    e.target.value = '';
  }

  // ── Audio file upload ──────────────────────────────────────────────────────────
  function handleAudioFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3_500_000) { alert('حجم الملف أكبر من 3MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setMedia({ type: 'audio', data: reader.result, mime: file.type, name: file.name });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // ── Submit post ──────────────────────────────────────────────────────────────
  async function handlePost() {
    if (!text.trim() && !media) return;
    setPosting(true);
    try {
      const body = {
        content:    text.trim() || null,
        media_type: media?.type ?? null,
        media_data: media?.data ?? null,
        media_mime: media?.mime ?? null,
      };
      const res  = await fetch('/api/teacher-space', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPosts(p => [data.post, ...p]);
      setText('');
      setMedia(null);
    } catch (e) { alert(e.message); }
    finally    { setPosting(false); }
  }

  // ── Like ─────────────────────────────────────────────────────────────────────
  async function handleLike(postId) {
    setLikingId(postId);
    try {
      const res  = await fetch(`/api/teacher-space/${postId}/like`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setPosts(p => p.map(post =>
        post.id === postId
          ? { ...post, likes: data.liked
              ? [...(post.likes ?? []), uid]
              : (post.likes ?? []).filter(id => id !== uid) }
          : post
      ));
    } finally { setLikingId(null); }
  }

  // ── Comment ──────────────────────────────────────────────────────────────────
  async function handleComment(postId) {
    const txt = (commenting[postId] ?? '').trim();
    if (!txt) return;
    setSendingCmt(postId);
    try {
      const res  = await fetch(`/api/teacher-space/${postId}/comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: txt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPosts(p => p.map(post =>
        post.id === postId
          ? { ...post, teacher_space_comments: [...(post.teacher_space_comments ?? []), data.comment] }
          : post
      ));
      setCommenting(c => ({ ...c, [postId]: '' }));
    } finally { setSendingCmt(null); }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleDelete(postId) {
    if (!confirm('هل تريد حذف هذا المنشور؟')) return;
    setDeletingId(postId);
    try {
      const res = await fetch(`/api/teacher-space/${postId}`, { method: 'DELETE' });
      if (res.ok) setPosts(p => p.filter(post => post.id !== postId));
    } finally { setDeletingId(null); }
  }

  const canDelete = useCallback((post) => {
    const role = currentUser?.user_metadata?.role;
    return post.author_id === uid || role === 'admin' || role === 'super_admin';
  }, [uid, currentUser]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* ── Compose card ── */}
      <div style={{
        background: '#fff', borderRadius: 20,
        border: '1.5px solid var(--border)',
        padding: '18px 20px', marginBottom: 24,
        boxShadow: '0 2px 16px rgba(24,95,165,.07)',
      }}>
        {/* Author row */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <Avatar name={currentUser?.user_metadata?.full_name} role={currentUser?.user_metadata?.role} />
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="شارك فكرة، نشاط، تجربة تعليمية، أو أي شيء مفيد للمجموعة…"
            rows={text.length > 80 ? 4 : 2}
            style={{
              flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 14,
              padding: '10px 14px', fontSize: '.92rem', fontFamily: 'inherit',
              resize: 'none', color: '#1e293b', outline: 'none',
              transition: 'border-color .2s',
              lineHeight: 1.6,
            }}
            onFocus={e => e.target.style.borderColor = '#185FA5'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* Media preview */}
        {media && (
          <div style={{
            margin: '0 0 14px 50px', position: 'relative',
            background: '#f8fafc', borderRadius: 14, overflow: 'hidden',
            border: '1.5px solid #e2e8f0',
          }}>
            {media.type === 'image' && (
              <img src={media.data} alt="preview" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />
            )}
            {media.type === 'audio' && (
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.4rem' }}>🎵</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '.85rem', color: '#334155' }}>
                    {media.name}
                  </p>
                  <audio controls src={media.data} style={{ width: '100%', height: 36 }} />
                </div>
              </div>
            )}
            <button
              onClick={() => setMedia(null)}
              style={{
                position: 'absolute', top: 8, left: 8,
                background: 'rgba(0,0,0,.55)', color: '#fff',
                border: 'none', borderRadius: '50%', width: 28, height: 28,
                cursor: 'pointer', fontSize: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>
        )}

        {/* Recording indicator */}
        {recording && (
          <div style={{
            margin: '0 0 14px 50px', background: '#fef2f2',
            border: '1.5px solid #fecaca', borderRadius: 12,
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', animation: 'pulse 1s infinite' }} />
            <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '.9rem' }}>
              جارٍ التسجيل… {fmtSec(recSeconds)}
            </span>
            <button
              onClick={stopRecording}
              style={{
                marginRight: 'auto', background: '#dc2626', color: '#fff',
                border: 'none', borderRadius: 8, padding: '5px 14px',
                fontWeight: 700, cursor: 'pointer', fontSize: '.82rem',
              }}
            >
              ⏹ إيقاف
            </button>
          </div>
        )}

        {/* Action bar */}
        <div style={{
          display: 'flex', gap: 8, paddingTop: 10,
          borderTop: '1px solid #f1f5f9', alignItems: 'center',
        }}>
          {/* Image upload */}
          <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
          <ToolBtn
            onClick={() => imgInputRef.current?.click()}
            disabled={!!media || recording}
            title="إضافة صورة"
          >
            📷
          </ToolBtn>

          {/* Record */}
          <ToolBtn
            onClick={recording ? stopRecording : startRecording}
            disabled={!!media && !recording}
            active={recording}
            title={recording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
            color={recording ? '#dc2626' : undefined}
          >
            {recording ? '⏹' : '🎙️'}
          </ToolBtn>

          {/* Audio file */}
          <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioFile} />
          <ToolBtn
            onClick={() => audioInputRef.current?.click()}
            disabled={!!media || recording}
            title="رفع ملف صوتي"
          >
            🎵
          </ToolBtn>

          <div style={{ flex: 1 }} />

          <button
            onClick={handlePost}
            disabled={posting || (!text.trim() && !media)}
            style={{
              background: posting || (!text.trim() && !media) ? '#e2e8f0' : '#185FA5',
              color: posting || (!text.trim() && !media) ? '#94a3b8' : '#fff',
              border: 'none', borderRadius: 10, padding: '8px 20px',
              fontWeight: 800, cursor: 'pointer', fontSize: '.9rem',
              transition: 'all .2s',
            }}
          >
            {posting ? '⏳ جارٍ النشر…' : '📤 نشر'}
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>⏳</div>
          <p>جارٍ تحميل المنشورات…</p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>🌱</div>
          <p style={{ fontWeight: 600, fontSize: '1rem' }}>الفضاء فارغ بعد!</p>
          <p style={{ fontSize: '.88rem' }}>كن الأول وشارك شيئاً مفيداً للمجموعة</p>
        </div>
      )}

      {/* ── Posts feed ── */}
      {posts.map(post => {
        const ri         = roleInfo(post.author_role);
        const likedByMe  = (post.likes ?? []).includes(uid);
        const likeCount  = (post.likes ?? []).length;
        const comments   = post.teacher_space_comments ?? [];
        const showCmts   = expandComments[post.id];
        const myComment  = commenting[post.id] ?? '';

        return (
          <div key={post.id} style={{
            background: '#fff', borderRadius: 20,
            border: '1.5px solid var(--border)',
            borderTop: `3px solid ${ri.color}`,
            marginBottom: 18,
            boxShadow: '0 2px 12px rgba(0,0,0,.04)',
            overflow: 'hidden',
          }}>
            {/* Post header */}
            <div style={{ padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Avatar name={post.author_name} role={post.author_role} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '.95rem' }}>
                    {post.author_name}
                  </span>
                  <RoleBadge role={post.author_role} />
                  <span style={{ color: '#94a3b8', fontSize: '.77rem', marginRight: 'auto' }}>
                    {timeAgo(post.created_at)}
                  </span>
                  {canDelete(post) && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', fontSize: '.8rem', padding: '2px 4px',
                        borderRadius: 4,
                      }}
                      title="حذف"
                    >🗑️</button>
                  )}
                </div>
              </div>
            </div>

            {/* Post text */}
            {post.content && (
              <div style={{ padding: '0 18px 14px', fontSize: '.95rem', color: '#1e293b', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {post.content}
              </div>
            )}

            {/* Post media */}
            {post.media_type === 'image' && post.media_data && (
              <div style={{ borderTop: '1px solid #f1f5f9' }}>
                <img
                  src={post.media_data}
                  alt="منشور"
                  style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}
            {post.media_type === 'audio' && post.media_data && (
              <div style={{
                borderTop: '1px solid #f1f5f9',
                padding: '12px 18px',
                background: '#f8fafc',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: '1.3rem' }}>🎵</span>
                <audio controls src={post.media_data} style={{ flex: 1, height: 36 }} />
              </div>
            )}

            {/* Actions bar */}
            <div style={{
              display: 'flex', gap: 6, padding: '10px 18px',
              borderTop: '1px solid #f1f5f9', alignItems: 'center',
            }}>
              {/* Like */}
              <button
                onClick={() => handleLike(post.id)}
                disabled={likingId === post.id}
                style={{
                  background: likedByMe ? '#fef2f2' : 'transparent',
                  border: likedByMe ? '1px solid #fecaca' : '1px solid transparent',
                  borderRadius: 20, padding: '5px 14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  color: likedByMe ? '#dc2626' : '#64748b',
                  fontWeight: 600, fontSize: '.83rem', transition: 'all .15s',
                }}
              >
                {likedByMe ? '❤️' : '🤍'} {likeCount > 0 && likeCount}
              </button>

              {/* Comments toggle */}
              <button
                onClick={() => setExpandComments(c => ({ ...c, [post.id]: !c[post.id] }))}
                style={{
                  background: showCmts ? '#eff6ff' : 'transparent',
                  border: showCmts ? '1px solid #bfdbfe' : '1px solid transparent',
                  borderRadius: 20, padding: '5px 14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  color: showCmts ? '#185FA5' : '#64748b',
                  fontWeight: 600, fontSize: '.83rem', transition: 'all .15s',
                }}
              >
                💬 {comments.length > 0 ? comments.length : ''}{comments.length === 0 ? 'تعليق' : ''}
              </button>

              <div style={{ flex: 1 }} />
              <span style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {/* Comments section */}
            {showCmts && (
              <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                {/* Existing comments */}
                {comments.length > 0 && (
                  <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {comments
                      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                      .map(c => {
                        const cri = roleInfo(c.author_role);
                        return (
                          <div key={c.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                            <Avatar name={c.author_name} role={c.author_role} size={30} />
                            <div style={{
                              background: '#fff', borderRadius: 12,
                              border: '1px solid var(--border)',
                              padding: '8px 12px', flex: 1,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                <span style={{ fontWeight: 700, fontSize: '.82rem', color: '#1e293b' }}>
                                  {c.author_name}
                                </span>
                                <span style={{
                                  background: cri.bg, color: cri.color,
                                  borderRadius: 20, padding: '0 7px',
                                  fontSize: '.7rem', fontWeight: 600,
                                }}>
                                  {cri.label}
                                </span>
                                <span style={{ color: '#94a3b8', fontSize: '.72rem', marginRight: 'auto' }}>
                                  {timeAgo(c.created_at)}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '.88rem', color: '#374151', lineHeight: 1.6 }}>
                                {c.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Add comment */}
                <div style={{ padding: '10px 18px', display: 'flex', gap: 9, alignItems: 'flex-end', borderTop: comments.length > 0 ? '1px solid #e2e8f0' : 'none' }}>
                  <Avatar name={currentUser?.user_metadata?.full_name} role={currentUser?.user_metadata?.role} size={30} />
                  <div style={{ flex: 1, display: 'flex', gap: 7 }}>
                    <input
                      value={myComment}
                      onChange={e => setCommenting(c => ({ ...c, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id); }}}
                      placeholder="اكتب تعليقاً…"
                      style={{
                        flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 20,
                        padding: '7px 14px', fontSize: '.85rem', fontFamily: 'inherit',
                        color: '#1e293b', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleComment(post.id)}
                      disabled={!myComment.trim() || sendingCmt === post.id}
                      style={{
                        background: myComment.trim() ? '#185FA5' : '#e2e8f0',
                        color: myComment.trim() ? '#fff' : '#94a3b8',
                        border: 'none', borderRadius: 20, padding: '7px 16px',
                        fontWeight: 700, cursor: 'pointer', fontSize: '.83rem',
                        transition: 'all .15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {sendingCmt === post.id ? '…' : 'إرسال'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: .4; }
        }
      `}</style>
    </div>
  );
}

function ToolBtn({ children, onClick, disabled, active, color, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: active ? '#fef2f2' : '#f8fafc',
        border: `1.5px solid ${active ? '#fecaca' : '#e2e8f0'}`,
        borderRadius: 10, width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '1.1rem', opacity: disabled ? .4 : 1,
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  );
}
