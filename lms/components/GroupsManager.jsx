'use client';

import { useState, useEffect, useCallback } from 'react';

export default function GroupsManager() {
  const [groups,        setGroups]        = useState([]);
  const [students,      setStudents]      = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null); // null = كل الطلاب
  const [newName,       setNewName]       = useState('');
  const [creating,      setCreating]      = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [err,           setErr]           = useState('');

  const [dbReady, setDbReady] = useState(true);

  const loadAll = useCallback(async () => {
    const [gRes, sRes] = await Promise.all([
      fetch('/api/admin/groups/list',     { method: 'POST', cache: 'no-store' }),
      fetch('/api/admin/groups/students', { method: 'POST', cache: 'no-store' }),
    ]);
    const [gData, sData] = await Promise.all([gRes.json(), sRes.json()]);
    // إذا أعاد الـ API خطأ يشير لعدم وجود الجدول
    if (gData.error?.includes('exist') || gData.error?.includes('relation') || gData.error?.includes('42P01')) {
      setDbReady(false);
      setLoading(false);
      return;
    }
    setGroups(gData.groups   ?? []);
    setStudents(sData.students ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setErr('');
    const res  = await fetch('/api/admin/groups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (data.error) setErr(data.error);
    else { setNewName(''); await loadAll(); }
    setCreating(false);
  }

  async function handleAssign(userId, groupId) {
    // Optimistic update
    setStudents(prev =>
      prev.map(s => s.user_id === userId ? { ...s, group_id: groupId || null } : s)
    );
    await fetch('/api/admin/groups/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, groupId: groupId || null }),
    });
  }

  const groupName  = id => groups.find(g => g.id === id)?.name ?? '—';
  const memberCount = id => students.filter(s => s.group_id === id).length;
  const visible     = selectedGroup
    ? students.filter(s => s.group_id === selectedGroup)
    : students;

  if (!dbReady) return (
    <div className="dash-section">
      <div className="dash-section-title">📁 إدارة المجموعات</div>
      <div className="card" style={{ padding: 24 }}>
        <p style={{ marginBottom: 16, fontWeight: 600, color: 'var(--danger, #e74c3c)' }}>
          ⚠️ جداول المجموعات غير موجودة في قاعدة البيانات.
        </p>
        <p style={{ marginBottom: 16, color: 'var(--muted)' }}>
          شغّل الكود التالي مرة واحدة في Supabase SQL Editor:
        </p>
        <pre style={{
          background: '#1e1e2e', color: '#cdd6f4', padding: '16px 20px',
          borderRadius: 8, fontSize: '.82rem', overflowX: 'auto', lineHeight: 1.7,
          marginBottom: 20, direction: 'ltr', textAlign: 'left',
        }}>{`CREATE TABLE IF NOT EXISTS student_groups (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE student_groups DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS student_group_assignments (
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  group_id   uuid        REFERENCES student_groups(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE student_group_assignments DISABLE ROW LEVEL SECURITY;`}</pre>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href="https://supabase.com/dashboard/project/uqspozzkzyytwwidojxv/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            🔗 افتح Supabase SQL Editor
          </a>
          <button className="btn" onClick={() => { setDbReady(true); setLoading(true); loadAll(); }}>
            🔄 تحقق مجدداً
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dash-section">
      <div className="dash-section-title">📁 إدارة المجموعات</div>

      {/* ── إنشاء مجموعة ── */}
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="اسم المجموعة الجديدة..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          required
        />
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? <span className="spinner" /> : '➕'} إنشاء مجموعة
        </button>
      </form>

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      {/* ── فلتر المجموعات ── */}
      {groups.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <span style={{ fontSize: '.8rem', color: 'var(--muted)', marginLeft: 4 }}>عرض:</span>
          <button
            onClick={() => setSelectedGroup(null)}
            style={{
              padding: '4px 14px', borderRadius: 20, fontSize: '.82rem', fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: !selectedGroup ? 'var(--primary)' : '#eee',
              color: !selectedGroup ? '#fff' : '#555',
            }}
          >
            كل الطلاب ({students.length})
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
              style={{
                padding: '4px 14px', borderRadius: 20, fontSize: '.82rem', fontWeight: 600,
                cursor: 'pointer', border: 'none',
                background: selectedGroup === g.id ? '#27ae60' : '#eee',
                color:      selectedGroup === g.id ? '#fff'    : '#555',
              }}
            >
              📁 {g.name} ({memberCount(g.id)})
            </button>
          ))}
        </div>
      )}

      {/* ── جدول الطلاب ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
          <span className="spinner" style={{ display: 'inline-block' }} />
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-icon">👥</span>
          <p>{selectedGroup ? 'لا يوجد طلاب في هذه المجموعة' : 'لا يوجد طلاب مسجلون أجروا تقييماً بعد'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>اسم الطالب</th>
                <th>المجموعة الحالية</th>
                <th>تعيين / تغيير المجموعة</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(s => (
                <tr key={s.user_id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    {s.group_id
                      ? <span className="badge badge-green">📁 {groupName(s.group_id)}</span>
                      : <span className="badge" style={{ background: '#f0f0f0', color: '#999' }}>غير مُعيَّن</span>
                    }
                  </td>
                  <td>
                    <select
                      className="form-input"
                      style={{ fontSize: '.85rem', padding: '5px 10px', minWidth: 150 }}
                      value={s.group_id ?? ''}
                      onChange={e => handleAssign(s.user_id, e.target.value)}
                    >
                      <option value="">— بدون مجموعة —</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
