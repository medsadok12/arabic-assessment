'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter }                    from 'next/navigation';
import Link                             from 'next/link';
import { createClient }                 from '../../lib/supabase';
import Navbar                           from '../../components/Navbar';
import GroupsManager                    from '../../components/GroupsManager';
import TeacherSpace                    from '../../components/TeacherSpace';
import NotificationBell                from '../../components/NotificationBell';
import FinancialsTab                   from '../../components/FinancialsTab';
import LifeSceneSimulator              from '../../components/LifeSceneSimulator';
import PricingAdmin                    from '../../components/PricingAdmin';
import TeamAdmin                        from '../../components/TeamAdmin';
import { useLanguage }                  from '../../contexts/LanguageContext';
import { getRole } from '../../lib/auth-role';
import {
  TIME_SLOTS, CONTROLLABLE, TAB_NAMES, TAB_NAMES_EN,
  fmtDate, ToggleSwitch, EMPTY_ADMIN_FORM, SETUP_SQL,
} from '../../components/admin/shared';
import OverviewTab      from '../../components/admin/tabs/OverviewTab';
import CodesTab         from '../../components/admin/tabs/CodesTab';
import SessionsTab      from '../../components/admin/tabs/SessionsTab';
import LexiconTab       from '../../components/admin/tabs/LexiconTab';
import RecruitmentTab   from '../../components/admin/tabs/RecruitmentTab';
import LogbookTab       from '../../components/admin/tabs/LogbookTab';
import StoriesTab       from '../../components/admin/tabs/StoriesTab';
import MessagesTab      from '../../components/admin/tabs/MessagesTab';
import AdminsTab        from '../../components/admin/tabs/AdminsTab';
import ResultsTab       from '../../components/admin/tabs/ResultsTab';
import TeachersMgmtTab  from '../../components/admin/tabs/TeachersMgmtTab';
import StudentsMgmtTab  from '../../components/admin/tabs/StudentsMgmtTab';
import VisitorQATab     from '../../components/admin/tabs/VisitorQATab';
import PuzzlesTab       from '../../components/admin/tabs/PuzzlesTab';
import SetupTab         from '../../components/admin/tabs/SetupTab';

// ════════════════════════════════════════════════════════════════════════════
export default function BoggarAdminPage() {
  const supabase      = createClient();
  const router        = useRouter();
  const { t: tr, lang } = useLanguage();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [tab,  setTab]  = useState('overview');

  // My permissions (non-super_admin only; null = loading, {} = no perms)
  const [myPermissions, setMyPermissions] = useState(null);

  // Stats
  const [stats, setStats] = useState({ assessments: 0, pass: 0, avg: 0, applications: 0 });

  // Recruitment
  const [apps,          setApps]          = useState([]);
  const [appsLoading,   setAppsLoading]   = useState(false);
  const [deletingApp,   setDeletingApp]   = useState(null);
  const [downloadingCV, setDownloadingCV] = useState({});

  // Interviews
  const [interviewsMap,       setInterviewsMap]       = useState({});
  const [schedModal,          setSchedModal]           = useState(null);
  const [schedDate,           setSchedDate]            = useState('');
  const [schedInterviewer,      setSchedInterviewer]       = useState('');
  const [schedInterviewerEmail, setSchedInterviewerEmail]  = useState('');
  const [schedTime,             setSchedTime]              = useState('');
  const [bookedSlots,         setBookedSlots]          = useState([]);
  const [slotsLoading,        setSlotsLoading]         = useState(false);
  const [schedulingBusy,      setSchedulingBusy]       = useState(false);
  const [schedMsg,            setSchedMsg]             = useState(null);
  const [cancellingInterview, setCancellingInterview]  = useState(null);

  // Admins
  const [admins,        setAdmins]        = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [adminForm,     setAdminForm]     = useState(EMPTY_ADMIN_FORM);
  const [addingAdmin,   setAddingAdmin]   = useState(false);
  const [adminMsg,      setAdminMsg]      = useState(null);
  const [deletingId,    setDeletingId]    = useState(null);
  const [suspendingId,  setSuspendingId]  = useState(null);
  const [suspended,     setSuspended]     = useState(false);

  // Supervisors
  const [supervisors,          setSupervisors]          = useState([]);
  const [supervisorsLoading,   setSupervisorsLoading]   = useState(false);
  const [showAddSupervisor,    setShowAddSupervisor]    = useState(false);
  const [supervisorForm,       setSupervisorForm]       = useState(EMPTY_ADMIN_FORM);
  const [addingSupervisor,     setAddingSupervisor]     = useState(false);
  const [supervisorMsg,        setSupervisorMsg]        = useState(null);
  const [deletingSupervisorId, setDeletingSupervisorId] = useState(null);
  const [suspendingSupervisorId, setSuspendingSupervisorId] = useState(null);

  // Users directory
  const [usersList,        setUsersList]        = useState([]);
  const [usersLoading,     setUsersLoading]     = useState(false);
  const [usersSearch,      setUsersSearch]      = useState('');
  const [usersRoleFilter,  setUsersRoleFilter]  = useState('all');
  const [resettingPwdId,   setResettingPwdId]   = useState(null);
  const [resetPwdResult,   setResetPwdResult]   = useState(null); // { id, password }
  const [revealedPwds,    setRevealedPwds]    = useState(new Set());
  const [deletingUserId,    setDeletingUserId]    = useState(null);
  const [editingUser,      setEditingUser]      = useState(null); // { id, name }
  const [savingUserId,     setSavingUserId]     = useState(null);
  const [bulkResetting,    setBulkResetting]    = useState(false);

  // Parent messages
  const [parentMessages,    setParentMessages]    = useState([]);
  const [msgsLoaded,        setMsgsLoaded]        = useState(false);

  // Online status & activity
  const [onlineStatus,    setOnlineStatus]    = useState({});
  const [activityModal,   setActivityModal]   = useState(null);
  const [activityData,    setActivityData]    = useState({ sessions: [], online: null });
  const [activityLoading, setActivityLoading] = useState(false);

  // ── Granular ACL ─────────────────────────────────────────────────────────
  // allPerms[adminId][tabKey] = bool — for super_admin popover UI
  const [allPerms,     setAllPerms]     = useState({});
  const [permsLoading, setPermsLoading] = useState(false);
  // permPopover: { tabKey, top, left } or null
  const [permPopover,  setPermPopover]  = useState(null);
  const [permSaving,   setPermSaving]   = useState({});
  const [permError,    setPermError]    = useState(null);
  const permPopoverRef = useRef(null);
  // inline perms panel per admin row
  const [openPermsFor, setOpenPermsFor] = useState(null);

  // Promotion
  const [promoting, setPromoting] = useState(false);
  const [promoMsg,  setPromoMsg]  = useState(null);

  // Puzzles
  const [puzzles,       setPuzzles]       = useState([]);
  const [puzzlesLoading,setPuzzlesLoading]= useState(false);
  const [puzzleForm,    setPuzzleForm]    = useState({ title: '', cols: 3, rows: 3, badge_name: 'بطل الأحجية', badge_icon: '🏆', is_active: true });
  const [puzzleImgFile, setPuzzleImgFile] = useState(null);
  const [puzzleImgPrev, setPuzzleImgPrev] = useState(null);
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [puzzleSaving,  setPuzzleSaving]  = useState(false);
  const [puzzleMsg,     setPuzzleMsg]     = useState(null);
  const [showPuzzleForm,setShowPuzzleForm]= useState(false);
  const puzzleFileRef = useRef(null);

  // Codes sub-tab
  const [codesTab, setCodesTab] = useState('assessment');

  // Setup
  const [copied, setCopied] = useState(false);
  const [sheetsUrl,      setSheetsUrl]      = useState(() => typeof window !== 'undefined' ? localStorage.getItem('admin_sheets_url') ?? '' : '');
  const [sheetsUrlInput, setSheetsUrlInput] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('admin_sheets_url') ?? '' : '');
  const [sheetsSaved,    setSheetsSaved]    = useState(false);

  // Visitor Q&A — فهيم الزوار
  const [visitorQA,    setVisitorQA]    = useState([]);
  const [qaLoading,    setQaLoading]    = useState(false);
  const [qaForm,       setQaForm]       = useState({ question: '', answer: '', sort_order: 0 });
  const [qaEditing,    setQaEditing]    = useState(null);
  const [qaShowModal,  setQaShowModal]  = useState(false);
  const [qaSaving,     setQaSaving]     = useState(false);
  const [qaDeletingId, setQaDeletingId] = useState(null);
  const [qaMsg,        setQaMsg]        = useState(null);

  // Results tab
  const [results,        setResults]        = useState([]);
  const [resultsTotal,   setResultsTotal]   = useState(0);
  const [resultsPage,    setResultsPage]    = useState(1);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsStats,   setResultsStats]   = useState({ total: 0, passed: 0, avg: 0, levelCounts: {}, scoreDist: {} });
  const [resultsSearch,  setResultsSearch]  = useState('');
  const [resultsLevel,   setResultsLevel]   = useState('');
  const [resultsMin,     setResultsMin]     = useState('');
  const [resultsMax,     setResultsMax]     = useState('');
  const [resultsExporting, setResultsExporting] = useState(false);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [editingNoteId,    setEditingNoteId]    = useState(null);
  const [editNoteText,     setEditNoteText]     = useState('');
  const [noteSaving,       setNoteSaving]       = useState(false);

  // Admin Sessions
  const [adminSessions,     setAdminSessions]     = useState([]);
  const [adminSessLoading,  setAdminSessLoading]  = useState(false);
  const [adminSessTab,      setAdminSessTab]       = useState('upcoming');
  const [adminCompleteFor,  setAdminCompleteFor]  = useState(null);
  const [adminRecordingUrl, setAdminRecordingUrl] = useState('');
  const [adminCompleteSav,  setAdminCompleteSav]  = useState(false);
  const [adminCancellingId, setAdminCancellingId] = useState(null);
  const [adminWeekOffset,   setAdminWeekOffset]   = useState(0);
  const [adminTeacherFilter,setAdminTeacherFilter]= useState('');
  // Admin session scheduling modal
  const EMPTY_SCHED = { teacherName:'', teacherId:'', teacherEmail:'', studentName:'', studentEmail:'', sessionDate:'', startTime:'', durationMinutes:'60', subject:'' };
  const [adminSchedModal,   setAdminSchedModal]   = useState(false);
  const [adminSchedForm,    setAdminSchedForm]    = useState(EMPTY_SCHED);
  const [adminSchedSaving,  setAdminSchedSaving]  = useState(false);
  const [adminSchedMsg,     setAdminSchedMsg]     = useState(null);
  const [adminTeacherList,  setAdminTeacherList]  = useState([]);

  // Notifications

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return; }
      const r = getRole(u) ?? '';
      if (r !== 'admin' && r !== 'super_admin') {
        router.push(r === 'supervisor' ? '/supervisor' : r === 'teacher' ? '/teacher' : '/dashboard');
        return;
      }
      if (r === 'admin' && u.user_metadata?.status === 'suspended') { setSuspended(true); setUser(u); setRole(r); return; }
      setUser(u); setRole(r);
    });
  }, []);

  // ── Load own permissions (non-super_admin) ────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (role === 'super_admin') { setMyPermissions({}); return; }
    fetch('/api/bogga/permissions/my')
      .then(r => r.json())
      .then(d => {
        if (d.suspended) { setSuspended(true); return; }
        setMyPermissions(d.permissions ?? {});
      })
      .catch(() => setMyPermissions({}));
  }, [user, role]);

  // ── Heartbeat ping every 2 minutes ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const ping = () => fetch('/api/bogga/activity', { method: 'POST' }).catch(() => {});
    ping();
    const iv = setInterval(ping, 2 * 60 * 1000);
    return () => clearInterval(iv);
  }, [user]);

  // ── Redirect to first allowed tab after permissions load ─────────────────
  useEffect(() => {
    if (!myPermissions || role === 'super_admin') return;
    const allowed = CONTROLLABLE.filter(t => myPermissions[t] === true);
    if (!allowed.includes(tab) && allowed.length > 0) setTab(allowed[0]);
  }, [myPermissions]);

  // ── Data loaders ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || myPermissions === null) return;
    const isSA = role === 'super_admin';
    loadStats();
    if (tab === 'recruitment') { loadApps(); if (isSA) loadInterviews(); }
    if (tab === 'admins'      && isSA) { loadAdmins(); loadSupervisors(); }
    if ((tab === 'teachers_mgmt' || tab === 'students_mgmt') && isSA) loadUsers();
    if (tab === 'overview' || !tab)
      fetch('/api/bogga/results?page=1').then(r => r.json()).then(d => setRecentAssessments(d.results?.slice(0, 5) ?? [])).catch(() => {});
    if (tab === 'results')   loadResults(1, resultsSearch, resultsLevel, resultsMin, resultsMax);
    if (tab === 'sessions')    loadAdminSessions();
    if (tab === 'visitor_qa' && isSA) loadVisitorQA();
    if (tab === 'puzzles'    && isSA) loadPuzzles();
    // logbook + space tabs need no pre-loading — their components load on demand
    if (tab === 'messages' && !msgsLoaded) {
      fetch('/api/contact/supervisor').then(r => r.json()).then(d => {
        setParentMessages(d.messages ?? []); setMsgsLoaded(true);
      });
    }
  }, [user, tab, myPermissions, msgsLoaded]);

  function markMsgRead(id) {
    fetch('/api/contact/supervisor', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setParentMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
  }

  async function loadResults(page = 1, search = '', level = '', min = '', max = '') {
    setResultsLoading(true);
    const params = new URLSearchParams({ page });
    if (search) params.set('search', search);
    if (level)  params.set('level',  level);
    if (min)    params.set('minScore', min);
    if (max)    params.set('maxScore', max);
    const data = await fetch(`/api/bogga/results?${params}`).then(r => r.json()).catch(() => ({}));
    setResults(data.results ?? []);
    setResultsTotal(data.total ?? 0);
    setResultsPage(page);
    if (data.stats) setResultsStats(data.stats);
    setResultsLoading(false);
  }

  async function exportCsv() {
    setResultsExporting(true);
    const params = new URLSearchParams({ all: 'true' });
    if (resultsSearch) params.set('search',   resultsSearch);
    if (resultsLevel)  params.set('level',    resultsLevel);
    if (resultsMin)    params.set('minScore', resultsMin);
    if (resultsMax)    params.set('maxScore', resultsMax);
    const data = await fetch(`/api/bogga/results?${params}`).then(r => r.json()).catch(() => ({}));
    const rows = data.results ?? [];
    const headers = [lang === 'ar' ? 'اسم الطالب' : 'Student', lang === 'ar' ? 'المستوى' : 'Level', lang === 'ar' ? 'الدرجة' : 'Score', lang === 'ar' ? 'الحالة' : 'Status', lang === 'ar' ? 'التاريخ' : 'Date', lang === 'ar' ? 'ملاحظات' : 'Notes'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [
        `"${(r.student_name ?? '').replace(/"/g, '""')}"`,
        r.level ?? '',
        r.score ?? '',
        (r.score ?? 0) >= 70 ? (lang === 'ar' ? 'ناجح' : 'Passed') : (lang === 'ar' ? 'دون المعدل' : 'Below average'),
        r.completed_at ? new Date(r.completed_at).toLocaleDateString('en-GB') : '',
        `"${(r.notes ?? '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\
');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `نتائج_التقييم_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setResultsExporting(false);
  }

  async function saveNote(id, notes) {
    setNoteSaving(true);
    await fetch(`/api/bogga/results/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    }).catch(() => {});
    setResults(prev => prev.map(r => r.id === id ? { ...r, notes } : r));
    setEditingNoteId(null);
    setNoteSaving(false);
  }

  // Booked slots (modal) — reload on date/interviewer change
  useEffect(() => {
    if (!schedModal || !schedDate || !schedInterviewer) { setBookedSlots([]); return; }
    setSlotsLoading(true);
    fetch(`/api/bogga/interviews?date=${schedDate}&interviewer=${encodeURIComponent(schedInterviewer)}`)
      .then(r => r.json())
      .then(d => setBookedSlots((d.interviews ?? []).map(iv => iv.start_time?.slice(0, 5))))
      .catch(() => setBookedSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [schedDate, schedInterviewer, schedModal]);

  // Close permission popover on outside click
  useEffect(() => {
    if (!permPopover) return;
    function handler(e) {
      if (permPopoverRef.current && !permPopoverRef.current.contains(e.target)) {
        setPermPopover(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [permPopover]);

  async function loadStats() {
    const [statsRes, appsRes] = await Promise.all([
      fetch('/api/bogga/results?page=1').then(r => r.json()).catch(() => ({ stats: {} })),
      fetch('/api/bogga/recruitment').then(r => r.json()).catch(() => ({ applications: [] })),
    ]);
    const s = statsRes.stats ?? {};
    setStats({ assessments: s.total ?? 0, pass: s.passed ?? 0, avg: s.avg ?? 0, applications: appsRes.applications?.length ?? 0 });
  }

  async function loadApps() {
    setAppsLoading(true);
    const res = await fetch('/api/bogga/recruitment');
    setApps((await res.json()).applications ?? []);
    setAppsLoading(false);
  }

  async function loadInterviews() {
    const res = await fetch('/api/bogga/interviews');
    const map = {};
    ((await res.json()).interviews ?? []).forEach(iv => {
      if (!map[iv.application_id]) map[iv.application_id] = [];
      map[iv.application_id].push(iv);
    });
    setInterviewsMap(map);
  }

  async function loadAdmins() {
    setAdminsLoading(true);
    const [adminsRes, onlineRes] = await Promise.all([
      fetch('/api/bogga/admins').then(r => r.json()),
      fetch('/api/bogga/activity').then(r => r.json()).catch(() => ({ online_status: [] })),
    ]);
    setAdmins(adminsRes.admins ?? []);
    const map = {};
    (onlineRes.online_status ?? []).forEach(s => { map[s.admin_id] = s; });
    setOnlineStatus(map);
    setAdminsLoading(false);
  }

  async function loadSupervisors() {
    setSupervisorsLoading(true);
    const res = await fetch('/api/bogga/supervisors').then(r => r.json());
    setSupervisors(res.supervisors ?? []);
    setSupervisorsLoading(false);
  }

  async function loadUsers() {
    setUsersLoading(true);
    const res = await fetch('/api/bogga/users').then(r => r.json());
    setUsersList(res.users ?? []);
    setUsersLoading(false);
  }

  async function handleBulkReset() {
    const hidden = usersList.filter(u => !u.password);
    if (hidden.length === 0) return;
    const msg = lang === 'ar'
      ? `سيتم إعادة ضبط كلمات سر ${hidden.length} حساب (الحسابات التي كلمة سرها غير مرئية). هل تريد المتابعة؟`
      : `This will reset passwords for ${hidden.length} accounts without visible passwords. Continue?`;
    if (!confirm(msg)) return;
    setBulkResetting(true);
    try {
      const res  = await fetch('/api/bogga/users/bulk-reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Merge new passwords into usersList
      setUsersList(prev => prev.map(u => {
        const updated = data.updated.find(r => r.id === u.id);
        return updated ? { ...u, password: updated.password } : u;
      }));
    } catch (e) {
      alert(e.message);
    } finally {
      setBulkResetting(false);
    }
  }

  // ── Recruitment ───────────────────────────────────────────────────────────
  async function updateAppStatus(id, status) {
    await fetch('/api/bogga/recruitment', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  async function deleteApp(id, name) {
    if (!confirm(lang === 'ar' ? `هل تريد حذف طلب "${name}" نهائياً؟` : `Delete "${name}"'s application permanently?`)) return;
    setDeletingApp(id);
    const res = await fetch('/api/bogga/recruitment', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setApps(prev => prev.filter(a => a.id !== id));
      setInterviewsMap(prev => { const m = { ...prev }; delete m[id]; return m; });
    } else {
      alert((await res.json()).error || (lang === 'ar' ? 'تعذر حذف الطلب' : 'Failed to delete application'));
    }
    setDeletingApp(null);
  }

  async function downloadCV(id) {
    setDownloadingCV(p => ({ ...p, [id]: true }));
    try {
      const res  = await fetch(`/api/bogga/recruitment/${id}`);
      const data = await res.json();
      if (!res.ok || !data.cv_base64) { alert(data.error || (lang === 'ar' ? 'لا توجد سيرة ذاتية' : 'No CV found')); return; }
      const a = document.createElement('a');
      a.href = `data:application/pdf;base64,${data.cv_base64}`;
      a.download = data.cv_filename || 'cv.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } finally { setDownloadingCV(p => ({ ...p, [id]: false })); }
  }

  // ── Interviews ────────────────────────────────────────────────────────────
  function openScheduleModal(app) {
    const existing = (interviewsMap[app.id] ?? []).slice(-1)[0];
    setSchedModal(app);
    setSchedDate(existing?.interview_date ?? '');
    setSchedInterviewer(user?.user_metadata?.full_name || user?.email || 'المدير المطلق');
    setSchedInterviewerEmail('');
    setSchedTime(''); setBookedSlots([]); setSchedMsg(null);
  }

  async function handleSchedule() {
    if (!schedDate || !schedInterviewer.trim() || !schedTime || !schedModal) return;
    setSchedulingBusy(true); setSchedMsg(null);
    const res  = await fetch('/api/bogga/interviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: schedModal.id, interviewer_name: schedInterviewer.trim(),
        interviewer_email: schedInterviewerEmail.trim() || null,
        interview_date: schedDate, start_time: schedTime,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSchedMsg({ type: 'error', text: data.error || 'حدث خطأ' });
    } else {
      setSchedMsg({ type: 'success', text: data.emailSent ? '✅ تمّ حجز الموعد وإرسال الدعوة بنجاح!' : '✅ تمّ الحجز (تحقق من إعداد البريد)' });
      setInterviewsMap(prev => ({
        ...prev,
        [schedModal.id]: [...(prev[schedModal.id] ?? []), data.interview],
      }));
      setTimeout(() => { setSchedModal(null); setSchedMsg(null); }, 2200);
    }
    setSchedulingBusy(false);
  }

  async function cancelInterview(ivId, appId) {
    if (!confirm(lang === 'ar' ? 'هل تريد إلغاء هذه المقابلة؟' : 'Cancel this interview?')) return;
    setCancellingInterview(ivId);
    const res = await fetch('/api/bogga/interviews', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ivId }),
    });
    if (res.ok) setInterviewsMap(prev => ({ ...prev, [appId]: (prev[appId] ?? []).filter(iv => iv.id !== ivId) }));
    setCancellingInterview(null);
  }

  // ── Granular ACL ──────────────────────────────────────────────────────────
  async function toggleAdminPermsPanel(adminId) {
    if (openPermsFor === adminId) { setOpenPermsFor(null); return; }
    setOpenPermsFor(adminId);
    if (Object.keys(allPerms).length > 0) return; // already loaded
    setPermsLoading(true);
    try {
      const res = await fetch('/api/bogga/permissions');
      const data = await res.json();
      const map = {};
      (data.permissions ?? []).forEach(p => {
        if (!map[p.admin_id]) map[p.admin_id] = {};
        map[p.admin_id][p.tab_key] = p.is_allowed;
      });
      setAllPerms(map);
    } catch { /* silent */ }
    setPermsLoading(false);
  }

  async function openPermPopover(tabKey, e) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPermPopover({ tabKey, top: rect.bottom + 8, left: Math.max(8, rect.left - 180) });
    setPermError(null);
    setPermsLoading(true);
    try {
      const [adminsRes, permsRes] = await Promise.all([
        admins.length === 0 ? fetch('/api/bogga/admins').then(r => r.json()) : null,
        fetch('/api/bogga/permissions').then(r => r.json()),
      ]);
      if (adminsRes) setAdmins(adminsRes.admins ?? []);
      const map = {};
      (permsRes.permissions ?? []).forEach(p => {
        if (!map[p.admin_id]) map[p.admin_id] = {};
        map[p.admin_id][p.tab_key] = p.is_allowed;
      });
      setAllPerms(map);
    } catch { /* silent */ }
    setPermsLoading(false);
  }

  async function togglePerm(adminId, tabKey) {
    const key     = `${adminId}_${tabKey}`;
    const current = allPerms[adminId]?.[tabKey] ?? false;
    const newVal  = !current;
    setPermError(null);
    setAllPerms(prev => ({ ...prev, [adminId]: { ...(prev[adminId] ?? {}), [tabKey]: newVal } }));
    setPermSaving(p => ({ ...p, [key]: true }));
    try {
      const res = await fetch('/api/bogga/permissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, tab_key: tabKey, is_allowed: newVal }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setAllPerms(prev => ({ ...prev, [adminId]: { ...(prev[adminId] ?? {}), [tabKey]: current } }));
        setPermError(d.error || 'تعذّر حفظ الصلاحية — حاول مجدداً');
      }
    } catch {
      setAllPerms(prev => ({ ...prev, [adminId]: { ...(prev[adminId] ?? {}), [tabKey]: current } }));
      setPermError('تعذّر الاتصال بالخادم — تحقّق من الإنترنت وحاول مجدداً');
    }
    setPermSaving(p => { const n = { ...p }; delete n[key]; return n; });
  }

  // ── Admins ────────────────────────────────────────────────────────────────
  async function handleAddAdmin(e) {
    e.preventDefault();
    setAddingAdmin(true); setAdminMsg(null);
    const res  = await fetch('/api/bogga/admins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: adminForm.name, email: adminForm.email }),
    });
    const data = await res.json();
    if (!res.ok) { setAdminMsg({ type: 'error', text: data.error }); }
    else {
      setAdmins(prev => [...prev, data.admin]);
      setShowAddModal(false); setAdminForm(EMPTY_ADMIN_FORM);
      const emailNote = data.emailSent
        ? `📧 تم إرسال بيانات الدخول إلى ${data.admin.email}`
        : `⚠️ فشل إرسال الإيميل — احفظ كلمة المرور الآن: ${data.tempPassword}`;
      setAdminMsg({
        type: data.emailSent ? 'success' : 'error',
        text: `✅ تم إنشاء حساب "${data.admin.name}" — ${emailNote}`,
        tempPassword: data.emailSent ? null : data.tempPassword,
      });
    }
    setAddingAdmin(false);
  }

  async function handleSuspendAdmin(id, currentStatus) {
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    const label  = action === 'suspend' ? (lang === 'ar' ? 'إيقاف' : 'suspend') : (lang === 'ar' ? 'تفعيل' : 'activate');
    if (!confirm(lang === 'ar' ? `هل تريد ${label} حساب هذا المشرف؟` : `Do you want to ${label} this admin's account?`)) return;
    setSuspendingId(id);
    const res  = await fetch(`/api/bogga/admins/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) setAdmins(prev => prev.map(a => a.id === id ? { ...a, status: data.status } : a));
    else setAdminMsg({ type: 'error', text: data.error ?? 'فشل تعديل حالة المشرف' });
    setSuspendingId(null);
  }

  async function toggleVisibility(id, current) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, is_visible_to_assistants: !current } : a));
    const res = await fetch('/api/bogga/recruitment', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_visible_to_assistants: !current }),
    });
    if (!res.ok) setApps(prev => prev.map(a => a.id === id ? { ...a, is_visible_to_assistants: current } : a));
  }

  async function handleDeleteAdmin(id, name) {
    if (!confirm(lang === 'ar' ? `هل تريد حذف حساب "${name}" نهائياً؟` : `Delete "${name}"'s account permanently?`)) return;
    setDeletingId(id);
    const res  = await fetch(`/api/bogga/admins/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) setAdmins(prev => prev.filter(a => a.id !== id));
    else setAdminMsg({ type: 'error', text: data.error });
    setDeletingId(null);
  }

  // ── Supervisors ───────────────────────────────────────────────────────────
  async function handleAddSupervisor(e) {
    e.preventDefault();
    setAddingSupervisor(true); setSupervisorMsg(null);
    const res  = await fetch('/api/bogga/supervisors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: supervisorForm.name, email: supervisorForm.email }),
    });
    const data = await res.json();
    if (!res.ok) { setSupervisorMsg({ type: 'error', text: data.error }); }
    else {
      setSupervisors(prev => [...prev, data.supervisor]);
      setShowAddSupervisor(false); setSupervisorForm(EMPTY_ADMIN_FORM);
      const emailNote = data.emailSent
        ? `📧 ${lang === 'ar' ? 'تم إرسال بيانات الدخول إلى' : 'Login details sent to'} ${data.supervisor.email}`
        : `⚠️ ${lang === 'ar' ? 'فشل إرسال الإيميل — احفظ كلمة المرور الآن:' : 'Email failed — save password now:'} ${data.tempPassword}`;
      setSupervisorMsg({
        type: data.emailSent ? 'success' : 'error',
        text: `✅ ${lang === 'ar' ? `تم إنشاء حساب "${data.supervisor.name}" — ${emailNote}` : `Account "${data.supervisor.name}" created — ${emailNote}`}`,
        tempPassword: data.emailSent ? null : data.tempPassword,
      });
    }
    setAddingSupervisor(false);
  }

  async function handleSuspendSupervisor(id, currentStatus) {
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    const label  = action === 'suspend' ? (lang === 'ar' ? 'إيقاف' : 'suspend') : (lang === 'ar' ? 'تفعيل' : 'activate');
    if (!confirm(lang === 'ar' ? `هل تريد ${label} حساب هذا المرشد؟` : `Do you want to ${label} this supervisor's account?`)) return;
    setSuspendingSupervisorId(id);
    const res  = await fetch(`/api/bogga/supervisors/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) setSupervisors(prev => prev.map(s => s.id === id ? { ...s, status: data.status } : s));
    else setSupervisorMsg({ type: 'error', text: data.error ?? (lang === 'ar' ? 'فشل تعديل حالة المرشد' : 'Failed to update supervisor status') });
    setSuspendingSupervisorId(null);
  }

  async function handleDeleteSupervisor(id, name) {
    if (!confirm(lang === 'ar' ? `هل تريد حذف حساب "${name}" نهائياً؟` : `Delete "${name}"'s account permanently?`)) return;
    setDeletingSupervisorId(id);
    const res  = await fetch(`/api/bogga/supervisors/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) setSupervisors(prev => prev.filter(s => s.id !== id));
    else setSupervisorMsg({ type: 'error', text: data.error });
    setDeletingSupervisorId(null);
  }

  // ── Users directory ───────────────────────────────────────────────────────
  function togglePwd(key) {
    setRevealedPwds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleResetPassword(id) {
    setResettingPwdId(id);
    const res  = await fetch(`/api/bogga/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-password' }),
    });
    const data = await res.json();
    if (res.ok) setUsersList(prev => prev.map(u => u.id === id ? { ...u, password: data.password } : u));
    else alert(data.error ?? (lang === 'ar' ? 'فشل إعادة كلمة السر' : 'Failed to reset password'));
    setResettingPwdId(null);
  }

  async function handleUpdateName(id) {
    if (!editingUser?.name?.trim()) return;
    setSavingUserId(id);
    const res  = await fetch(`/api/bogga/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-name', name: editingUser.name }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, name: data.name } : u));
      setEditingUser(null);
    } else { alert(data.error ?? (lang === 'ar' ? 'فشل حفظ الاسم' : 'Failed to save name')); }
    setSavingUserId(null);
  }

  async function handleDeleteUser(id, name) {
    if (!confirm(lang === 'ar' ? `هل تريد حذف حساب "${name}" نهائياً؟` : `Delete "${name}"'s account permanently?`)) return;
    setDeletingUserId(id);
    const res  = await fetch(`/api/bogga/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) { setUsersList(prev => prev.filter(u => u.id !== id)); setResetPwdResult(null); }
    else alert(data.error ?? (lang === 'ar' ? 'فشل حذف الحساب' : 'Failed to delete account'));
    setDeletingUserId(null);
  }

  async function handlePromote() {
    if (!confirm(lang === 'ar' ? 'سيتم ترقية حسابك إلى مدير مطلق. هذا الإجراء لا يمكن التراجع عنه.' : 'Your account will be promoted to Super Admin. This action cannot be undone.')) return;
    setPromoting(true); setPromoMsg(null);
    const res  = await fetch('/api/bogga/make-super-admin', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setPromoMsg({ type: 'success', text: '✅ تمت الترقية! سيتم تحديث الصفحة...' });
      await supabase.auth.refreshSession();
      setTimeout(() => window.location.reload(), 1500);
    } else { setPromoMsg({ type: 'error', text: data.error }); }
    setPromoting(false);
  }

  function copySetupSql() {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  // ── Visitor Q&A ──────────────────────────────────────────────────────────
  async function loadVisitorQA() {
    setQaLoading(true);
    const data = await fetch('/api/bogga/visitor-qa').then(r => r.json()).catch(() => ({}));
    setVisitorQA(data.items ?? []);
    setQaLoading(false);
  }

  async function loadPuzzles() {
    setPuzzlesLoading(true);
    const data = await fetch('/api/bogga/puzzles').then(r => r.json()).catch(() => ({}));
    setPuzzles(data.puzzles ?? []);
    setPuzzlesLoading(false);
  }

  function openAddPuzzle() {
    setEditingPuzzle(null);
    setPuzzleForm({ title: '', cols: 3, rows: 3, badge_name: 'بطل الأحجية', badge_icon: '🏆', is_active: true });
    setPuzzleImgFile(null); setPuzzleImgPrev(null);
    setPuzzleMsg(null); setShowPuzzleForm(true);
  }

  function openEditPuzzle(pz) {
    setEditingPuzzle(pz);
    setPuzzleForm({ title: pz.title || '', cols: pz.cols || 3, rows: pz.rows || 3, badge_name: pz.badge_name || '', badge_icon: pz.badge_icon || '🏆', is_active: pz.is_active ?? true });
    setPuzzleImgFile(null); setPuzzleImgPrev(pz.image_url || null);
    setPuzzleMsg(null); setShowPuzzleForm(true);
  }

  async function handleSavePuzzle(e) {
    e.preventDefault();
    setPuzzleSaving(true); setPuzzleMsg(null);
    try {
      let image_url = editingPuzzle?.image_url || null;
      if (puzzleImgFile) {
        const fd = new FormData(); fd.append('file', puzzleImgFile);
        const up = await fetch('/api/bogga/puzzles/upload', { method: 'POST', body: fd });
        const uj = await up.json();
        if (!up.ok) throw new Error(uj.error || 'فشل رفع الصورة');
        image_url = uj.url;
      }
      const body = { ...puzzleForm, image_url, cols: Number(puzzleForm.cols), rows: Number(puzzleForm.rows) };
      const url  = editingPuzzle ? `/api/bogga/puzzles?id=${editingPuzzle.id}` : '/api/bogga/puzzles';
      const res  = await fetch(url, { method: editingPuzzle ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل الحفظ');
      setPuzzleMsg({ ok: true, text: '✅ تم الحفظ' });
      await loadPuzzles();
      setTimeout(() => setShowPuzzleForm(false), 800);
    } catch (err) {
      setPuzzleMsg({ ok: false, text: '❌ ' + err.message });
    }
    setPuzzleSaving(false);
  }

  async function handleDeletePuzzle(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الأحجية؟')) return;
    const res = await fetch(`/api/bogga/puzzles?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('فشل الحذف — يرجى المحاولة مجدداً'); return; }
    await loadPuzzles();
  }

  async function handleTogglePuzzle(pz) {
    await fetch(`/api/bogga/puzzles?id=${pz.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pz, is_active: !pz.is_active, cols: pz.cols, rows: pz.rows }),
    });
    await loadPuzzles();
  }

  async function handleSaveQA(e) {
    e.preventDefault();
    setQaSaving(true); setQaMsg(null);
    const isEdit = !!qaEditing;
    const res = await fetch('/api/bogga/visitor-qa', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit
        ? { id: qaEditing.id, ...qaForm }
        : qaForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setQaMsg({ type: 'error', text: data.error || 'حدث خطأ' });
    } else {
      if (isEdit) {
        setVisitorQA(prev => prev.map(q => q.id === qaEditing.id ? data.item : q));
      } else {
        setVisitorQA(prev => [...prev, data.item]);
      }
      setQaShowModal(false); setQaEditing(null);
      setQaForm({ question: '', answer: '', sort_order: 0 });
    }
    setQaSaving(false);
  }

  async function handleDeleteQA(id) {
    if (!confirm(lang === 'ar' ? 'هل تريد حذف هذا السؤال نهائياً؟' : 'Delete this question permanently?')) return;
    setQaDeletingId(id);
    const res = await fetch('/api/bogga/visitor-qa', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setVisitorQA(prev => prev.filter(q => q.id !== id));
    setQaDeletingId(null);
  }

  async function toggleQAActive(item) {
    setVisitorQA(prev => prev.map(q => q.id === item.id ? { ...q, is_active: !q.is_active } : q));
    await fetch('/api/bogga/visitor-qa', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    });
  }

  // ── Admin Sessions ────────────────────────────────────────────────────────
  async function loadAdminSessions() {
    setAdminSessLoading(true);
    const data = await fetch('/api/bogga/sessions').then(r => r.json()).catch(() => ({}));
    setAdminSessions(data.sessions ?? []);
    setAdminSessLoading(false);
  }

  async function handleAdminCancel(id) {
    if (!confirm(lang === 'ar' ? 'هل تريد إلغاء هذه الحصة؟' : 'Cancel this session?')) return;
    setAdminCancellingId(id);
    const res = await fetch('/api/bogga/sessions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setAdminSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
    setAdminCancellingId(null);
  }

  async function handleAdminComplete() {
    setAdminCompleteSav(true);
    const res = await fetch('/api/bogga/sessions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adminCompleteFor.id, status: 'completed', recording_url: adminRecordingUrl || null }),
    });
    if (res.ok) {
      setAdminSessions(prev => prev.map(s => s.id === adminCompleteFor.id
        ? { ...s, status: 'completed', recording_url: adminRecordingUrl || null } : s));
      setAdminCompleteFor(null);
    }
    setAdminCompleteSav(false);
  }

  // ── Admin session scheduling ──────────────────────────────────────────────
  async function openAdminSchedModal() {
    setAdminSchedModal(true);
    setAdminSchedForm(EMPTY_SCHED);
    setAdminSchedMsg(null);
    if (adminTeacherList.length === 0) {
      const res = await fetch('/api/bogga/users').then(r => r.json()).catch(() => ({}));
      setAdminTeacherList((res.users ?? []).filter(u => u.role === 'teacher'));
    }
  }

  async function handleAdminSchedSubmit(e) {
    e.preventDefault();
    if (!adminSchedForm.teacherName || !adminSchedForm.studentName || !adminSchedForm.sessionDate || !adminSchedForm.startTime) {
      setAdminSchedMsg({ type: 'error', text: 'المعلم واسم الطالب والتاريخ والوقت مطلوبة' }); return;
    }
    setAdminSchedSaving(true); setAdminSchedMsg(null);
    const res = await fetch('/api/bogga/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...adminSchedForm, durationMinutes: parseInt(adminSchedForm.durationMinutes) || 60 }),
    });
    const data = await res.json();
    if (!res.ok) { setAdminSchedMsg({ type: 'error', text: data.error }); setAdminSchedSaving(false); return; }
    setAdminSessions(prev => [data.session, ...prev]);
    setAdminSchedMsg({ type: 'success', text: '✅ تمّت جدولة الحصة بنجاح' });
    setAdminSchedSaving(false);
    setTimeout(() => setAdminSchedModal(false), 1400);
  }

  function getOnlineInfo(adminId) {
    const s = onlineStatus[adminId];
    if (!s) return { online: false, label: lang === 'ar' ? 'لم يُسجَّل دخول بعد' : 'Never logged in', color: '#94a3b8' };
    const diffMin = Math.floor((Date.now() - new Date(s.last_seen)) / 60000);
    if (diffMin < 5)    return { online: true,  label: lang === 'ar' ? 'متصل الآن'                              : 'Online now',               color: '#16a34a' };
    if (diffMin < 60)   return { online: false, label: lang === 'ar' ? `منذ ${diffMin} دقيقة`                   : `${diffMin}m ago`,          color: '#f59e0b' };
    if (diffMin < 1440) return { online: false, label: lang === 'ar' ? `منذ ${Math.floor(diffMin/60)} ساعة`     : `${Math.floor(diffMin/60)}h ago`, color: '#94a3b8' };
    return               { online: false, label: lang === 'ar' ? `منذ ${Math.floor(diffMin/1440)} يوم`           : `${Math.floor(diffMin/1440)}d ago`, color: '#94a3b8' };
  }

  async function openActivityModal(a) {
    setActivityModal(a);
    setActivityLoading(true);
    setActivityData({ sessions: [], online: null });
    const res  = await fetch(`/api/bogga/activity?admin_id=${a.id}`);
    const data = await res.json();
    setActivityData(data);
    setActivityLoading(false);
  }

  // ── Render guard ──────────────────────────────────────────────────────────
  if (!user || (myPermissions === null && !suspended)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span className="spinner" style={{ width: 30, height: 30, borderWidth: 3, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
      </div>
    );
  }

  if (suspended) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div style={{ textAlign: 'center', padding: '48px 36px', background: '#fff', borderRadius: 24, boxShadow: '0 8px 40px rgba(0,0,0,.12)', maxWidth: 420 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: '#b91c1c', fontWeight: 800, marginBottom: 12, fontSize: '1.3rem' }}>{tr('admin.suspended')}</h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, marginBottom: 28 }}>{tr('admin.suspendedMsg')}</p>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            className="btn btn-ghost"
            style={{ fontSize: '.9rem' }}
          >
            {tr('nav.signOut')}
          </button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = role === 'super_admin';

  // Build TABS with permission filtering
  const canSee = id => isSuperAdmin || (CONTROLLABLE.includes(id) && myPermissions[id] === true);
  const TABS = [
    { id: 'overview',    label: tr('admin.tabs.overview'),    show: canSee('overview') },
    { id: 'codes',       label: tr('admin.tabs.codes'),       show: canSee('codes') },
    { id: 'groups',      label: tr('admin.tabs.groups'),      show: canSee('groups') },
    { id: 'sessions',    label: tr('admin.tabs.sessions'),    show: canSee('sessions') },
    { id: 'results',     label: tr('admin.tabs.results'),     show: canSee('results') },
    { id: 'lexicon',     label: tr('admin.tabs.lexicon'),     show: canSee('lexicon') },
    { id: 'recruitment', label: tr('admin.tabs.recruitment'), show: canSee('recruitment') },
    { id: 'simulator',   label: tr('admin.tabs.simulator'),   show: canSee('simulator') },
    { id: 'logbook',     label: tr('admin.tabs.logbook'),     show: isSuperAdmin },
    { id: 'space',       label: tr('admin.tabs.space'),       show: true },
    { id: 'messages',    label: tr('admin.tabs.messages'),    show: true },
    { id: 'financials',  label: tr('admin.tabs.financials'),  show: isSuperAdmin },
    { id: 'admins',        label: tr('admin.tabs.admins'),        show: isSuperAdmin },
    { id: 'teachers_mgmt', label: tr('admin.tabs.teachers_mgmt'), show: isSuperAdmin },
    { id: 'students_mgmt', label: tr('admin.tabs.students_mgmt'), show: isSuperAdmin },
    { id: 'visitor_qa',   label: tr('admin.tabs.visitor_qa'),   show: isSuperAdmin },
    { id: 'stories',     label: 'القصص 📚',                  show: true },
    { id: 'puzzles',     label: 'الأحاجي 🧩',                show: isSuperAdmin },
    { id: 'pricing',     label: lang === 'ar' ? '💰 الباقات والأسعار' : '💰 Pricing Plans', show: isSuperAdmin },
    { id: 'team',        label: '👨‍🏫 فريقنا',                show: isSuperAdmin },
    { id: 'setup',       label: tr('admin.tabs.setup'),       show: canSee('setup') },
  ].filter(tab => tab.show);

  const activeTab = TABS.some(t => t.id === tab) ? tab : TABS[0]?.id ?? 'overview';

  return (
    <>
      <style>{`
        .time-btn:not(:disabled):hover { background: var(--primary-lt) !important; border-color: var(--primary) !important; }
        .perm-icon { opacity:.55; transition:opacity .15s; }
        .perm-icon:hover { opacity:1; }
        .quick-link { text-decoration:none; transition:opacity .15s; }
        .quick-link:hover { opacity:.75; }
        .admin-tab-btn:hover { background: #eef5ff !important; color: var(--primary) !important; }
        @media (max-width: 800px) {
          /* Stack sidebar above content */
          .admin-layout { flex-direction: column !important; }

          /* Sidebar: full width, column layout, properly contained */
          .admin-sidebar {
            width: 100% !important;
            position: static !important;
            flex-direction: column !important;
            border-radius: 14px !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          /* Nav: 2-column grid — stays inside white box, no overflow */
          .admin-sidebar-nav {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            padding: 10px !important;
            overflow: visible !important;
          }

          /* Each tab button: centred text, readable size, can wrap */
          .admin-sidebar-nav > div {
            width: 100% !important;
            min-width: 0 !important;
          }
          .admin-sidebar-nav > div > button:first-child {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
            font-size: .78rem !important;
            padding: 9px 6px !important;
            white-space: normal !important;
            line-height: 1.35 !important;
            word-break: keep-all !important;
          }

          /* Hide permission lock icons on mobile — not actionable on small screens */
          .admin-sidebar .perm-icon { display: none !important; }

          /* Ensure content area doesn't overflow screen */
          .admin-layout > div:last-child {
            min-width: 0 !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <Navbar user={user} />
      <main className="page-wrap" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="container">

          {/* ── Header ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>{tr('admin.title')}</h1>
              <p style={{ color: isSuperAdmin ? '#1a7c40' : 'var(--muted)', fontSize: '.88rem', fontWeight: isSuperAdmin ? 700 : 400 }}>
                {isSuperAdmin ? tr('admin.superRole') : tr('admin.assistantRole')}
              </p>
            </div>
            <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* ── Notification Bell ── */}
              <NotificationBell userId={user?.id} role={role} lang={lang} />
              <Link href="/bogga/lexicon" className="btn btn-outline btn-sm">📖 {lang === 'ar' ? 'بنك الكلمات' : 'Word Bank'}</Link>
            </div>
          </div>

          {/* ── No permissions state ────────────────────────────── */}
          {!isSuperAdmin && TABS.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: 14 }}>🔒</div>
              <h2 style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{lang === 'ar' ? 'لا توجد لك صلاحيات بعد' : 'No permissions yet'}</h2>
              <p style={{ color: 'var(--muted)' }}>{lang === 'ar' ? 'تواصل مع المدير العام لمنحك صلاحيات الوصول إلى التبويبات المناسبة.' : 'Contact the super admin to grant you access to the appropriate tabs.'}</p>
            </div>
          ) : (
            <>

          {/* ── Admin layout: sidebar + content ───────────────── */}
          <div className="admin-layout" style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>

          {/* ── Vertical Sidebar ── */}
          <div className="admin-sidebar" style={{
            width: 218, flexShrink: 0,
            position: 'sticky', top: 80,
            background: '#fff', borderRadius: 20,
            border: '1.5px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(24,95,165,.08)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Sidebar brand strip */}
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,#f8faff,#eef3fb)' }}>
              <div style={{ fontSize: '.68rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '.07em', textTransform: 'uppercase' }}>
                {lang === 'ar' ? 'القائمة' : 'Navigation'}
              </div>
            </div>

            {/* Tab buttons */}
            <div className="admin-sidebar-nav" style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              {TABS.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    className={activeTab === t.id ? '' : 'admin-tab-btn'}
                    onClick={() => setTab(t.id)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 13px', borderRadius: 11, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '.875rem', fontWeight: 700,
                      background: activeTab === t.id ? 'var(--primary)' : 'transparent',
                      color: activeTab === t.id ? '#fff' : '#334155',
                      transition: 'all .15s', textAlign: 'inherit',
                      boxShadow: activeTab === t.id ? '0 2px 10px rgba(24,95,165,.28)' : 'none',
                    }}>
                    {t.label}
                  </button>
                  {isSuperAdmin && CONTROLLABLE.includes(t.id) && (
                    <button
                      onClick={e => openPermPopover(t.id, e)}
                      className="perm-icon"
                      title={`${lang === 'ar' ? 'إدارة صلاحيات' : 'Permissions'}: "${(lang === 'ar' ? TAB_NAMES : TAB_NAMES_EN)[t.id]}"`}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                        fontSize: '.68rem', lineHeight: 1,
                        color: activeTab === t.id ? 'rgba(255,255,255,.5)' : '#c4cdd8',
                        flexShrink: 0,
                      }}>
                      🔒
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Content area ─────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0 }}>

          {/* ══ Overview ══════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <OverviewTab
              lang={lang} tr={tr} stats={stats} isSuperAdmin={isSuperAdmin}
              myPermissions={myPermissions} setTab={setTab} recentAssessments={recentAssessments}
            />
          )}

          {/* ══ Codes ═════════════════════════════════════════════ */}
          {activeTab === 'codes' && (
            <CodesTab lang={lang} codesTab={codesTab} setCodesTab={setCodesTab} />
          )}

          {/* ══ Groups ════════════════════════════════════════════ */}
          {activeTab === 'groups' && <GroupsManager />}

          {/* ══ Sessions (Admin) ══════════════════════════════════ */}
          {activeTab === 'sessions' && (
            <SessionsTab
              lang={lang}
              adminSessions={adminSessions} setAdminSessions={setAdminSessions}
              adminSessLoading={adminSessLoading}
              adminSessTab={adminSessTab} setAdminSessTab={setAdminSessTab}
              adminWeekOffset={adminWeekOffset} setAdminWeekOffset={setAdminWeekOffset}
              adminTeacherFilter={adminTeacherFilter} setAdminTeacherFilter={setAdminTeacherFilter}
              loadAdminSessions={loadAdminSessions} openAdminSchedModal={openAdminSchedModal}
              setAdminCompleteFor={setAdminCompleteFor} setAdminRecordingUrl={setAdminRecordingUrl}
              handleAdminCancel={handleAdminCancel} adminCancellingId={adminCancellingId}
            />
          )}

          {/* ══ Lexicon ═══════════════════════════════════════════ */}
          {activeTab === 'lexicon' && <LexiconTab lang={lang} />}

          {/* ══ Expression Theater ════════════════════════════════ */}
          {activeTab === 'simulator' && (
            <LifeSceneSimulator role="teacher" currentUser={user} />
          )}

          {/* ══ Recruitment ═══════════════════════════════════════ */}
          {activeTab === 'recruitment' && (
            <RecruitmentTab
              lang={lang} isSuperAdmin={isSuperAdmin}
              apps={apps} appsLoading={appsLoading} loadApps={loadApps} loadInterviews={loadInterviews}
              interviewsMap={interviewsMap} toggleVisibility={toggleVisibility}
              downloadCV={downloadCV} downloadingCV={downloadingCV}
              updateAppStatus={updateAppStatus} openScheduleModal={openScheduleModal}
              deleteApp={deleteApp} deletingApp={deletingApp}
              cancelInterview={cancelInterview} cancellingInterview={cancellingInterview}
            />
          )}

          {/* ══ Logbook ════════════════════════════════════════════ */}
          {activeTab === 'logbook' && isSuperAdmin && <LogbookTab lang={lang} />}

          {/* ══ Stories ════════════════════════════════════════════ */}
          {activeTab === 'stories' && (
            <StoriesTab lang={lang} />
          )}

          {/* ══ Teacher Space ══════════════════════════════════════ */}
          {activeTab === 'space' && (
            <TeacherSpace currentUser={user} />
          )}

          {/* ══ Parent Messages ════════════════════════════════════ */}
          {activeTab === 'messages' && (
            <MessagesTab
              lang={lang} parentMessages={parentMessages} msgsLoaded={msgsLoaded}
              markMsgRead={markMsgRead} setParentMessages={setParentMessages}
            />
          )}

          {/* ══ Financials ════════════════════════════════════════ */}
          {activeTab === 'financials' && isSuperAdmin && (
            <FinancialsTab lang={lang} />
          )}

          {/* ══ Admins ════════════════════════════════════════════ */}
          {activeTab === 'admins' && isSuperAdmin && (
            <AdminsTab
              lang={lang} tr={tr}
              admins={admins} adminsLoading={adminsLoading}
              adminMsg={adminMsg} setAdminMsg={setAdminMsg} setShowAddModal={setShowAddModal}
              revealedPwds={revealedPwds} togglePwd={togglePwd}
              getOnlineInfo={getOnlineInfo} openActivityModal={openActivityModal}
              toggleAdminPermsPanel={toggleAdminPermsPanel} openPermsFor={openPermsFor}
              permsLoading={permsLoading} allPerms={allPerms} togglePerm={togglePerm}
              handleSuspendAdmin={handleSuspendAdmin} suspendingId={suspendingId}
              handleDeleteAdmin={handleDeleteAdmin} deletingId={deletingId}
              supervisors={supervisors} supervisorsLoading={supervisorsLoading}
              supervisorMsg={supervisorMsg} setSupervisorMsg={setSupervisorMsg}
              setShowAddSupervisor={setShowAddSupervisor}
              handleSuspendSupervisor={handleSuspendSupervisor} suspendingSupervisorId={suspendingSupervisorId}
              handleDeleteSupervisor={handleDeleteSupervisor} deletingSupervisorId={deletingSupervisorId}
            />
          )}

          {/* ══ Results ═══════════════════════════════════════════ */}
          {activeTab === 'results' && (
            <ResultsTab
              lang={lang} tr={tr}
              results={results} resultsTotal={resultsTotal} resultsPage={resultsPage}
              resultsLoading={resultsLoading} resultsStats={resultsStats}
              resultsSearch={resultsSearch} setResultsSearch={setResultsSearch}
              resultsLevel={resultsLevel} setResultsLevel={setResultsLevel}
              resultsMin={resultsMin} setResultsMin={setResultsMin}
              resultsMax={resultsMax} setResultsMax={setResultsMax}
              loadResults={loadResults} exportCsv={exportCsv} resultsExporting={resultsExporting}
              sheetsUrl={sheetsUrl}
              editingNoteId={editingNoteId} setEditingNoteId={setEditingNoteId}
              editNoteText={editNoteText} setEditNoteText={setEditNoteText}
              saveNote={saveNote} noteSaving={noteSaving}
            />
          )}

          {/* ══ Users Directory ══════════════════════════════════ */}
          {/* ══ Teachers & Staff Management ══════════════════════════════════ */}
          {activeTab === 'teachers_mgmt' && isSuperAdmin && (
            <TeachersMgmtTab
              lang={lang} tr={tr}
              usersList={usersList} usersLoading={usersLoading}
              usersSearch={usersSearch} setUsersSearch={setUsersSearch}
              usersRoleFilter={usersRoleFilter} setUsersRoleFilter={setUsersRoleFilter}
              loadUsers={loadUsers} handleBulkReset={handleBulkReset} bulkResetting={bulkResetting}
              editingUser={editingUser} setEditingUser={setEditingUser}
              handleUpdateName={handleUpdateName} savingUserId={savingUserId}
              handleResetPassword={handleResetPassword} resettingPwdId={resettingPwdId}
              handleDeleteUser={handleDeleteUser} deletingUserId={deletingUserId}
            />
          )}

          {/* ══ Students Management ══════════════════════════════════════════════ */}
          {activeTab === 'students_mgmt' && isSuperAdmin && (
            <StudentsMgmtTab
              lang={lang} tr={tr}
              usersList={usersList} usersLoading={usersLoading}
              usersSearch={usersSearch} setUsersSearch={setUsersSearch}
              loadUsers={loadUsers} handleBulkReset={handleBulkReset} bulkResetting={bulkResetting}
              editingUser={editingUser} setEditingUser={setEditingUser}
              handleUpdateName={handleUpdateName} savingUserId={savingUserId}
              handleResetPassword={handleResetPassword} resettingPwdId={resettingPwdId}
              handleDeleteUser={handleDeleteUser} deletingUserId={deletingUserId}
            />
          )}

          {/* ══ Visitor Q&A — فهيم الزوار ══════════════════════ */}
          {activeTab === 'visitor_qa' && isSuperAdmin && (
            <VisitorQATab
              lang={lang} tr={tr}
              visitorQA={visitorQA} qaLoading={qaLoading}
              setQaEditing={setQaEditing} setQaForm={setQaForm} setQaMsg={setQaMsg} setQaShowModal={setQaShowModal}
              toggleQAActive={toggleQAActive} handleDeleteQA={handleDeleteQA} qaDeletingId={qaDeletingId}
            />
          )}

          {/* ══ Puzzles ═══════════════════════════════════════════ */}
          {activeTab === 'puzzles' && isSuperAdmin && (
            <PuzzlesTab
              puzzles={puzzles} puzzlesLoading={puzzlesLoading}
              openAddPuzzle={openAddPuzzle} openEditPuzzle={openEditPuzzle}
              handleTogglePuzzle={handleTogglePuzzle} handleDeletePuzzle={handleDeletePuzzle}
              showPuzzleForm={showPuzzleForm} setShowPuzzleForm={setShowPuzzleForm}
              editingPuzzle={editingPuzzle} puzzleForm={puzzleForm} setPuzzleForm={setPuzzleForm}
              puzzleFileRef={puzzleFileRef} puzzleImgPrev={puzzleImgPrev}
              setPuzzleImgFile={setPuzzleImgFile} setPuzzleImgPrev={setPuzzleImgPrev}
              handleSavePuzzle={handleSavePuzzle} puzzleSaving={puzzleSaving} puzzleMsg={puzzleMsg}
            />
          )}

          {/* ══ Setup ═════════════════════════════════════════════ */}
          {activeTab === 'pricing' && isSuperAdmin && (
            <PricingAdmin lang={lang} />
          )}

          {activeTab === 'team' && isSuperAdmin && (
            <TeamAdmin />
          )}

          {activeTab === 'setup' && (
            <SetupTab
              lang={lang} tr={tr} isSuperAdmin={isSuperAdmin}
              promoting={promoting} promoMsg={promoMsg} handlePromote={handlePromote}
              sheetsUrl={sheetsUrl} setSheetsUrl={setSheetsUrl}
              sheetsUrlInput={sheetsUrlInput} setSheetsUrlInput={setSheetsUrlInput}
              sheetsSaved={sheetsSaved} setSheetsSaved={setSheetsSaved}
              copied={copied} copySetupSql={copySetupSql}
            />
          )}

          </div> {/* end content area */}
          </div> {/* end admin-layout */}

            </> /* end of tabs content */
          )}

        </div>
      </main>

      {/* ══ Admin Complete Session Modal ═══════════════════════════════════ */}
      {adminCompleteFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 650, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setAdminCompleteFor(null)}>
          <div style={{ background: '#fff', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 480, direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 6, color: '#1a7c40' }}>{tr('admin.sessions.completeSession')}</h2>
            <p style={{ fontSize: '.88rem', color: 'var(--muted)', marginBottom: 20 }}>
              {adminCompleteFor.subject || tr('admin.sessions.subject')} — {adminCompleteFor.student_name} {lang === 'ar' ? 'مع' : 'with'} {adminCompleteFor.teacher_name}
            </p>
            <div className="form-group">
              <label className="form-label">{tr('admin.sessions.recordingUrl')}</label>
              <input className="form-input" type="url" dir="ltr"
                placeholder={tr('admin.sessions.recordingPlaceholder')}
                value={adminRecordingUrl} onChange={e => setAdminRecordingUrl(e.target.value)} />
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>{tr('admin.sessions.recordingHint')}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={handleAdminComplete} disabled={adminCompleteSav}
                className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#1a7c40', borderColor: '#1a7c40' }}>
                {adminCompleteSav ? tr('admin.sessions.saving') : tr('admin.sessions.confirmComplete')}
              </button>
              <button onClick={() => setAdminCompleteFor(null)} className="btn btn-outline">{tr('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Activity Modal ═════════════════════════════════════════════════ */}
      {activityModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setActivityModal(null); }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: '28px', width: '100%', maxWidth: 580, direction: 'rtl', boxShadow: '0 24px 72px rgba(0,0,0,.28)', maxHeight: '85vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', margin: '0 0 2px' }}>📊 {lang === 'ar' ? 'سجل نشاط المشرف' : 'Admin Activity Log'}</h2>
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: 0 }}>{activityModal.name} — {activityModal.email}</p>
              </div>
              <button onClick={() => setActivityModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--muted)', cursor: 'pointer', lineHeight: 1, padding: 2 }}>✕</button>
            </div>

            {activityLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
              </div>
            ) : (
              <>
                {/* Current connection status */}
                {(() => {
                  const s     = getOnlineInfo(activityModal.id);
                  const now   = activityData.online;
                  const curDur = now && s.online
                    ? Math.floor((Date.now() - new Date(now.session_start)) / 60000)
                    : null;
                  return (
                    <div style={{ background: s.online ? '#dcfce7' : '#f8faff', border: `1.5px solid ${s.online ? '#86efac' : '#e2e8f0'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{s.online ? '🟢' : '🔴'}</span>
                      <div>
                        <div style={{ fontWeight: 800, color: s.online ? '#15803d' : '#64748b', fontSize: '.95rem' }}>{s.label}</div>
                        {now && (
                          <div style={{ color: 'var(--muted)', fontSize: '.78rem', marginTop: 3 }}>
                            {s.online
                              ? (lang === 'ar' ? `بدأت الجلسة: ${new Date(now.session_start).toLocaleString('en-GB')} — مدة الجلسة الحالية: ${curDur} دقيقة` : `Session started: ${new Date(now.session_start).toLocaleString('en-GB')} — Current duration: ${curDur} min`)
                              : (lang === 'ar' ? `آخر ظهور: ${new Date(now.last_seen).toLocaleString('en-GB')}` : `Last seen: ${new Date(now.last_seen).toLocaleString('en-GB')}`)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Sessions list */}
                <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--muted)', marginBottom: 12 }}>{lang === 'ar' ? 'سجل الجلسات السابقة' : 'Previous Sessions Log'}</div>
                {activityData.sessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)', fontSize: '.9rem' }}>{lang === 'ar' ? 'لا توجد جلسات مسجّلة بعد' : 'No sessions recorded yet'}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activityData.sessions.map(s => {
                      const dur = s.duration_minutes ?? 0;
                      const durLabel = lang === 'ar'
                        ? (dur >= 60 ? `${Math.floor(dur/60)}س ${dur%60}د` : `${dur} دقيقة`)
                        : (dur >= 60 ? `${Math.floor(dur/60)}h ${dur%60}m` : `${dur} min`);
                      return (
                        <div key={s.id} style={{ background: '#f8faff', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>
                              📅 {new Date(s.session_start).toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            <div style={{ color: 'var(--muted)', fontSize: '.78rem', marginTop: 3, display: 'flex', gap: 16 }}>
                              <span>🕐 {lang === 'ar' ? 'من:' : 'From:'} {new Date(s.session_start).toLocaleTimeString(lang === 'ar' ? 'en-GB' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>🕓 {lang === 'ar' ? 'إلى:' : 'To:'} {new Date(s.session_end).toLocaleTimeString(lang === 'ar' ? 'en-GB' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <div style={{ background: '#185FA5', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: '.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            ⏱ {durLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ Permission Popover ══════════════════════════════════════════════ */}
      {permPopover && (
        <div
          ref={permPopoverRef}
          style={{
            position: 'fixed', top: permPopover.top, left: permPopover.left,
            zIndex: 800, background: '#fff', borderRadius: 14,
            boxShadow: '0 8px 36px rgba(0,0,0,.18)', border: '1px solid var(--border)',
            padding: '18px 20px', minWidth: 270, maxWidth: 330, direction: 'rtl',
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '.95rem' }}>
                🔒 {(lang === 'ar' ? TAB_NAMES : TAB_NAMES_EN)[permPopover.tabKey]}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '.75rem', marginTop: 2 }}>{lang === 'ar' ? 'صلاحيات المشرفين المساعدين' : 'Assistant admin permissions'}</div>
            </div>
            <button onClick={() => setPermPopover(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.1rem', padding: 2, lineHeight: 1 }}>✕</button>
          </div>

          {permsLoading ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
            </div>
          ) : admins.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: 0 }}>
              {lang === 'ar' ? <>لا يوجد مشرفون مساعدون — أضف مشرفاً من تبويب <strong>إدارة المشرفين</strong> أولاً.</> : <>No assistant admins — add one from the <strong>Admin Management</strong> tab first.</>}
            </p>
          ) : (
            admins.map(admin => {
              const isAllowed = allPerms[admin.id]?.[permPopover.tabKey] ?? false;
              const saving    = !!permSaving[`${admin.id}_${permPopover.tabKey}`];
              return (
                <div key={admin.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{admin.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '.74rem' }}>{admin.email}</div>
                  </div>
                  {saving
                    ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#1a7c40', borderColor: 'var(--border)', flexShrink: 0 }} />
                    : <ToggleSwitch checked={isAllowed} onChange={() => togglePerm(admin.id, permPopover.tabKey)} />
                  }
                </div>
              );
            })
          )}

          {permError && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '.78rem', color: '#b91c1c', lineHeight: 1.5 }}>
              ⚠️ {permError}
            </div>
          )}

          <div style={{ marginTop: 12, padding: '8px 10px', background: '#f8faff', borderRadius: 8, fontSize: '.76rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            {lang === 'ar' ? <>الوضع الافتراضي لأي تبويب: <strong style={{ color: '#b91c1c' }}>مخفي</strong> — لا يظهر لأي مساعد إلا بعد تفعيله يدوياً</> : <>Default for any tab: <strong style={{ color: '#b91c1c' }}>Hidden</strong> — won't appear for any assistant until manually enabled</>}
          </div>
        </div>
      )}

      {/* ══ Admin Session Scheduling Modal ══════════════════════════════════ */}
      {adminSchedModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.48)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:600, padding:16 }}
          onClick={e => e.target === e.currentTarget && !adminSchedSaving && setAdminSchedModal(false)}>
          <div style={{ background:'#fff', borderRadius:22, padding:'28px 28px 24px', width:'100%', maxWidth:480, direction:'rtl', boxShadow:'0 24px 72px rgba(0,0,0,.28)', maxHeight:'92vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontWeight:800, color:'var(--primary)', fontSize:'1.15rem', margin:0 }}>📅 جدولة حصة جديدة</h2>
              <button onClick={() => !adminSchedSaving && setAdminSchedModal(false)} style={{ background:'none', border:'none', fontSize:'1.3rem', color:'var(--muted)', cursor:'pointer', lineHeight:1 }}>✕</button>
            </div>

            <form onSubmit={handleAdminSchedSubmit}>
              {/* Teacher */}
              <div className="form-group">
                <label className="form-label">👨‍🏫 المعلم *</label>
                {adminTeacherList.length > 0 ? (
                  <select className="form-input" value={adminSchedForm.teacherId}
                    onChange={e => {
                      const t = adminTeacherList.find(x => x.id === e.target.value);
                      setAdminSchedForm(p => ({ ...p, teacherId: t?.id ?? '', teacherName: t?.name ?? '', teacherEmail: t?.email ?? '' }));
                    }}>
                    <option value="">— اختر من القائمة —</option>
                    {adminTeacherList.map(t => <option key={t.id} value={t.id}>👤 {t.name}</option>)}
                  </select>
                ) : null}
                <input className="form-input" type="text" placeholder="أو اكتب اسم المعلم يدوياً"
                  style={{ marginTop: adminTeacherList.length > 0 ? 8 : 0 }}
                  value={adminSchedForm.teacherName}
                  onChange={e => setAdminSchedForm(p => ({ ...p, teacherName: e.target.value }))} required />
              </div>

              {/* Student */}
              <div className="form-group">
                <label className="form-label">👤 اسم الطالب *</label>
                <input className="form-input" type="text" placeholder="اسم الطالب"
                  value={adminSchedForm.studentName}
                  onChange={e => setAdminSchedForm(p => ({ ...p, studentName: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">✉️ بريد الطالب الإلكتروني</label>
                <input className="form-input" type="email" dir="ltr" placeholder="student@example.com"
                  value={adminSchedForm.studentEmail}
                  onChange={e => setAdminSchedForm(p => ({ ...p, studentEmail: e.target.value }))} />
                <div style={{ fontSize:'.75rem', color:'var(--muted)', marginTop:3 }}>مطلوب لكي تظهر الحصة في داشبورد الطالب وإرسال الإشعار</div>
              </div>

              {/* Subject */}
              <div className="form-group">
                <label className="form-label">📚 موضوع الحصة (اختياري)</label>
                <input className="form-input" type="text" placeholder="قواعد النحو، القراءة..."
                  value={adminSchedForm.subject}
                  onChange={e => setAdminSchedForm(p => ({ ...p, subject: e.target.value }))} />
              </div>

              {/* Date + Time */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">📅 التاريخ *</label>
                  <input className="form-input" type="date" min={new Date().toISOString().slice(0,10)}
                    value={adminSchedForm.sessionDate}
                    onChange={e => setAdminSchedForm(p => ({ ...p, sessionDate: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">⏰ الوقت *</label>
                  <select className="form-input" value={adminSchedForm.startTime}
                    onChange={e => setAdminSchedForm(p => ({ ...p, startTime: e.target.value }))} required>
                    <option value="">اختر...</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div className="form-group">
                <label className="form-label">⏱️ مدة الحصة</label>
                <select className="form-input" value={adminSchedForm.durationMinutes}
                  onChange={e => setAdminSchedForm(p => ({ ...p, durationMinutes: e.target.value }))}>
                  <option value="30">30 دقيقة</option>
                  <option value="45">45 دقيقة</option>
                  <option value="60">ساعة كاملة</option>
                  <option value="90">ساعة ونصف</option>
                </select>
              </div>

              {adminSchedMsg && (
                <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:14, fontSize:'.88rem', fontWeight:600,
                  background: adminSchedMsg.type === 'error' ? '#fff5f5' : '#f0fdf4',
                  color:      adminSchedMsg.type === 'error' ? '#b91c1c' : '#1a7c40',
                  border:     `1.5px solid ${adminSchedMsg.type === 'error' ? '#fca5a5' : '#6ee7b7'}` }}>
                  {adminSchedMsg.text}
                </div>
              )}

              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="submit" disabled={adminSchedSaving} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
                  {adminSchedSaving ? 'جارٍ الجدولة...' : '📅 جدولة الحصة'}
                </button>
                <button type="button" onClick={() => setAdminSchedModal(false)} className="btn btn-outline">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Interview Schedule Modal ════════════════════════════════════════ */}
      {schedModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget && !schedulingBusy) setSchedModal(null); }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: '28px 28px 24px', width: '100%', maxWidth: 520, direction: 'rtl', boxShadow: '0 24px 72px rgba(0,0,0,.28)', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.15rem', margin: '0 0 4px' }}>📅 {lang === 'ar' ? 'جدولة مقابلة' : 'Schedule Interview'}</h2>
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: 0 }}>{schedModal.name}</p>
              </div>
              <button onClick={() => { if (!schedulingBusy) setSchedModal(null); }} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--muted)', cursor: 'pointer', lineHeight: 1, padding: 2 }}>✕</button>
            </div>

            {schedMsg && <div className={`alert alert-${schedMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16 }}>{schedMsg.text}</div>}

            <div className="form-group">
              <label className="form-label">👤 {lang === 'ar' ? 'المقابِل' : 'Interviewer'}</label>
              <input className="form-input" value={schedInterviewer} onChange={e => setSchedInterviewer(e.target.value)} placeholder={lang === 'ar' ? 'اسم من سيجري المقابلة' : 'Name of the interviewer'} disabled={schedulingBusy} />
              <p className="form-help">{lang === 'ar' ? 'سيظهر هذا الاسم في بريد الدعوة المرسل للمترشح' : 'This name will appear in the invitation email sent to the candidate'}</p>
            </div>

            <div className="form-group">
              <label className="form-label">📧 {lang === 'ar' ? 'بريد المقابِل' : 'Interviewer Email'} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '.8rem' }}>({lang === 'ar' ? 'اختياري' : 'optional'})</span></label>
              <input className="form-input" type="email" value={schedInterviewerEmail} onChange={e => setSchedInterviewerEmail(e.target.value)} placeholder={lang === 'ar' ? 'interviewer@example.com — لإرسال ملف المترشح له' : 'interviewer@example.com — to send candidate brief'} disabled={schedulingBusy} dir="ltr" />
              <p className="form-help">{lang === 'ar' ? 'إذا أُدخل، سيصله بريد بتفاصيل المترشح (الاختصاص، الخبرة، رقم التواصل)' : 'If provided, the interviewer will receive a candidate brief email'}</p>
            </div>

            <div className="form-group">
              <label className="form-label">📆 {lang === 'ar' ? 'تاريخ المقابلة' : 'Interview Date'}</label>
              <input className="form-input" type="date" value={schedDate} min={new Date().toISOString().split('T')[0]} onChange={e => { setSchedDate(e.target.value); setSchedTime(''); }} disabled={schedulingBusy} dir="ltr" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                ⏰ {lang === 'ar' ? 'ساعة الانطلاق' : 'Start Time'}
                {slotsLoading && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />}
              </label>
              {!schedDate || !schedInterviewer.trim() ? (
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, margin: 0 }}>
                  {lang === 'ar' ? 'حدّد المقابِل والتاريخ أولاً لعرض الأوقات المتاحة' : 'Set the interviewer and date first to see available slots'}
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7, marginTop: 4 }}>
                  {TIME_SLOTS.map(slot => {
                    const booked   = bookedSlots.includes(slot);
                    const selected = schedTime === slot;
                    return (
                      <button key={slot} disabled={booked || schedulingBusy} onClick={() => setSchedTime(slot)} className="time-btn"
                        style={{
                          padding: '8px 2px', borderRadius: 9, fontFamily: 'inherit',
                          fontSize: '.8rem', fontWeight: selected ? 800 : 400,
                          cursor: booked ? 'not-allowed' : 'pointer',
                          border: selected ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                          background: booked ? '#f8fafc' : selected ? 'var(--primary-lt)' : '#fff',
                          color: booked ? '#c4c8d0' : selected ? 'var(--primary)' : 'var(--text)',
                          textDecoration: booked ? 'line-through' : 'none',
                        }}>
                        {slot}
                        {booked && <span style={{ fontSize: '.6rem', display: 'block', color: '#e53e3e', textDecoration: 'none' }}>{lang === 'ar' ? 'محجوز' : 'Booked'}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
              <button onClick={handleSchedule} disabled={!schedDate || !schedInterviewer.trim() || !schedTime || schedulingBusy} className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', gap: 8, opacity: (!schedDate || !schedInterviewer.trim() || !schedTime) ? .55 : 1 }}>
                {schedulingBusy
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{lang === 'ar' ? 'جارٍ الحجز وإرسال الدعوة...' : 'Booking and sending invitation...'}</>
                  : (lang === 'ar' ? '✅ تأكيد الموعد وإرسال الدعوة' : '✅ Confirm & Send Invitation')}
              </button>
              <button onClick={() => { if (!schedulingBusy) setSchedModal(null); }} className="btn btn-ghost" disabled={schedulingBusy}>{tr('cancel')}</button>
            </div>

            {schedTime && (
              <div style={{ marginTop: 12, background: '#eef5ff', borderRadius: 9, padding: '10px 14px', fontSize: '.83rem', color: '#1a2d4a' }}>
                {lang === 'ar'
                  ? <>📋 سيُرسَل بريد إلى <strong>{schedModal.email}</strong> بموعد {fmtDate(schedDate, lang)} الساعة {schedTime} مع المقابِل <strong>{schedInterviewer}</strong>{schedInterviewerEmail.trim() && <> · ونسخة لملف المترشح إلى <strong>{schedInterviewerEmail.trim()}</strong></>}</>
                  : <>📋 An email will be sent to <strong>{schedModal.email}</strong> for {fmtDate(schedDate, lang)} at {schedTime} with <strong>{schedInterviewer}</strong>{schedInterviewerEmail.trim() && <> · candidate brief copied to <strong>{schedInterviewerEmail.trim()}</strong></>}</>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Visitor Q&A Modal ══════════════════════════════════════════════ */}
      {qaShowModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setQaShowModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 540, direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', margin: 0 }}>
                {qaEditing ? (lang === 'ar' ? '✏️ تعديل سؤال وإجابة' : '✏️ Edit Q&A') : (lang === 'ar' ? '+ إضافة سؤال وإجابة جديد' : '+ Add New Q&A')}
              </h2>
              <button onClick={() => setQaShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--muted)', cursor: 'pointer', padding: 2, lineHeight: 1 }}>✕</button>
            </div>

            {qaMsg && (
              <div className={`alert alert-${qaMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>
                {qaMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveQA}>
              <div className="form-group">
                <label className="form-label">❓ {lang === 'ar' ? 'السؤال *' : 'Question *'}</label>
                <input
                  className="form-input"
                  value={qaForm.question}
                  required
                  onChange={e => setQaForm(p => ({ ...p, question: e.target.value }))}
                  placeholder={lang === 'ar' ? 'مثال: ما هي أسعار الاشتراك في الأكاديمية؟' : 'e.g. What are the subscription prices?'}
                  disabled={qaSaving}
                />
                <p className="form-help">{lang === 'ar' ? 'اكتب السؤال كما قد يسأله ولي الأمر' : 'Write the question as a parent might ask it'}</p>
              </div>

              <div className="form-group">
                <label className="form-label">💬 {lang === 'ar' ? 'الإجابة *' : 'Answer *'}</label>
                <textarea
                  className="form-input"
                  value={qaForm.answer}
                  required
                  rows={4}
                  onChange={e => setQaForm(p => ({ ...p, answer: e.target.value }))}
                  placeholder={lang === 'ar' ? 'اكتب الإجابة الرسمية للأكاديمية...' : 'Write the official academy answer...'}
                  disabled={qaSaving}
                  style={{ resize: 'vertical', minHeight: 100 }}
                />
                <p className="form-help">{lang === 'ar' ? 'فهيم سيستخدم هذه الإجابة كمرجع — كن دقيقاً ومقنعاً' : 'Faheem will use this as a reference — be accurate and convincing'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">🔢 {lang === 'ar' ? 'الترتيب' : 'Sort Order'}</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  value={qaForm.sort_order}
                  onChange={e => setQaForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                  style={{ maxWidth: 120 }}
                  disabled={qaSaving}
                />
                <p className="form-help">{lang === 'ar' ? 'الأسئلة ذات الرقم الأصغر تُعطى أولوية في السياق' : 'Lower numbers are given priority in the context'}</p>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" disabled={qaSaving} style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
                  {qaSaving
                    ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</>
                    : qaEditing ? (lang === 'ar' ? '✅ حفظ التعديلات' : '✅ Save Changes') : (lang === 'ar' ? '✅ إضافة السؤال' : '✅ Add Question')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setQaShowModal(false)} disabled={qaSaving}>{tr('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Add Admin Modal ═════════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440, direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.15rem' }}>+ {lang === 'ar' ? 'إضافة مشرف مساعد جديد' : 'Add New Assistant Admin'}</h2>
            {adminMsg && <div className={`alert alert-${adminMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>{adminMsg.text}</div>}
            <form onSubmit={handleAddAdmin}>
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}</label>
                <input className="form-input" value={adminForm.name} required onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} placeholder={lang === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}</label>
                <input className="form-input" type="email" value={adminForm.email} required onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" dir="ltr" />
              </div>
              <div className="alert alert-info" style={{ fontSize: '.85rem', marginBottom: 4 }}>
                🔑 {lang === 'ar' ? 'ستُنشأ كلمة مرور مؤقتة تلقائياً وتُرسل للمشرف عبر بريده الإلكتروني.' : 'A temporary password will be auto-generated and sent to the admin via email.'}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={addingAdmin} style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
                  {addingAdmin ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{lang === 'ar' ? 'جارٍ الإنشاء...' : 'Creating...'}</> : (lang === 'ar' ? '✅ إنشاء الحساب' : '✅ Create Account')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowAddModal(false); setAdminMsg(null); }}>{tr('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Add Supervisor Modal ═════════════════════════════════════════════ */}
      {showAddSupervisor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddSupervisor(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440, direction: lang === 'ar' ? 'rtl' : 'ltr', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontWeight: 800, color: '#7c3aed', marginBottom: 20, fontSize: '1.15rem' }}>🧑‍💼 {lang === 'ar' ? 'إضافة مرشد تربوي جديد' : 'Add New Educational Supervisor'}</h2>
            {supervisorMsg && <div className={`alert alert-${supervisorMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>{supervisorMsg.text}</div>}
            <form onSubmit={handleAddSupervisor}>
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}</label>
                <input className="form-input" value={supervisorForm.name} required onChange={e => setSupervisorForm(p => ({ ...p, name: e.target.value }))} placeholder={lang === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}</label>
                <input className="form-input" type="email" value={supervisorForm.email} required onChange={e => setSupervisorForm(p => ({ ...p, email: e.target.value }))} placeholder="supervisor@example.com" dir="ltr" />
              </div>
              <div className="alert alert-info" style={{ fontSize: '.85rem', marginBottom: 4 }}>
                🔑 {lang === 'ar' ? 'ستُنشأ كلمة مرور مؤقتة تلقائياً وتُرسل للمرشد عبر بريده الإلكتروني.' : 'A temporary password will be auto-generated and sent to the supervisor via email.'}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={addingSupervisor} style={{ flex: 1, justifyContent: 'center', gap: 8, background: '#7c3aed' }}>
                  {addingSupervisor ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{lang === 'ar' ? 'جارٍ الإنشاء...' : 'Creating...'}</> : (lang === 'ar' ? '✅ إنشاء الحساب' : '✅ Create Account')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowAddSupervisor(false); setSupervisorMsg(null); }}>{tr('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}