/**
 * مُنظِّم الحصص — إدارة الجدول الأسبوعي والمستحقات المالية للمدرس الخاص
 * ---------------------------------------------------------------
 * ملف واحد جاهز للتشغيل في Vite أو CodeSandbox (React + Tailwind CSS).
 * المتطلبات: react, react-dom, lucide-react, tailwindcss
 * كل البيانات تُحفظ تلقائياً في التخزين المحلي (localStorage) للمتصفح.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  GraduationCap,
  HandCoins,
  Hourglass,
  Plus,
  Repeat,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

/* =========================================================
   ثوابت ودوال مساعدة
   ========================================================= */
const STORAGE_KEY = "tutor-planner:v1";
const SLOT_MIN = 30; // دقة الشبكة الزمنية بالدقائق
const ROW_H = 30; // ارتفاع خانة نصف الساعة بالبكسل

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const DEFAULT_DATA = {
  settings: {
    workStart: "16:00",
    workEnd: "22:00",
    defaultRate: 50,
    currency: "د.ت",
    weekMode: "sun", // "sun": الأحد ← الخميس | "sat": السبت ← الجمعة
  },
  students: [], // { id, name, rate }
  sessions: [], // { id, studentId, date: "YYYY-MM-DD", start: "HH:MM", duration (ساعات), rate, paid }
};

// ألوان مميزة لكل طالب (أسماء كاملة حتى يلتقطها Tailwind)
const COLORS = [
  { card: "bg-indigo-50 border-indigo-200 text-indigo-900", dot: "bg-indigo-500" },
  { card: "bg-sky-50 border-sky-200 text-sky-900", dot: "bg-sky-500" },
  { card: "bg-emerald-50 border-emerald-200 text-emerald-900", dot: "bg-emerald-500" },
  { card: "bg-amber-50 border-amber-200 text-amber-900", dot: "bg-amber-500" },
  { card: "bg-rose-50 border-rose-200 text-rose-900", dot: "bg-rose-500" },
  { card: "bg-violet-50 border-violet-200 text-violet-900", dot: "bg-violet-500" },
  { card: "bg-teal-50 border-teal-200 text-teal-900", dot: "bg-teal-500" },
  { card: "bg-orange-50 border-orange-200 text-orange-900", dot: "bg-orange-500" },
];
const colorFor = (id = "") =>
  COLORS[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % COLORS.length];

// نمط موحّد لحقول الإدخال
const GLOBAL_CSS = `
  .input { width: 100%; height: 2.75rem; border-radius: 0.75rem; border: 1px solid rgb(226 232 240);
    background: #fff; padding: 0 0.875rem; font-size: 0.95rem; color: rgb(30 41 59); outline: none;
    transition: border-color .15s, box-shadow .15s; font-family: inherit; }
  .input:focus { border-color: rgb(129 140 248); box-shadow: 0 0 0 4px rgb(224 231 255); }
`;

const pad = (n) => String(n).padStart(2, "0");
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

// التواريخ تُعالج بالتوقيت المحلي لتجنب انزياح اليوم بسبب المنطقة الزمنية
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const money = (n, currency) => `${fmt(n)} ${currency}`;
const prettyDate = (iso) => {
  const d = fromISO(iso);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const sessionEnd = (s) => fromMin(toMin(s.start) + s.duration * 60);
const sessionEndDate = (s) => {
  const d = fromISO(s.date);
  d.setMinutes(toMin(s.start) + s.duration * 60);
  return d;
};

// بداية الأسبوع حسب النمط المختار
function getWeekStart(date, mode) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  if (mode === "sat") return addDays(d, -((dow + 1) % 7));
  // نمط الأحد–الخميس: الجمعة والسبت يعرضان الأسبوع القادم مباشرة
  return dow >= 5 ? addDays(d, 7 - dow) : addDays(d, -dow);
}

/* =========================================================
   خطاف الحفظ التلقائي في localStorage
   ========================================================= */
function usePersistentData(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      return {
        ...initial,
        ...parsed,
        settings: { ...initial.settings, ...(parsed.settings || {}) },
      };
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* التخزين غير متاح (مثلاً وضع التصفح الخاص) — نكمل بدون حفظ */
    }
  }, [key, value]);

  return [value, setValue];
}

/* =========================================================
   التطبيق الرئيسي
   ========================================================= */
export default function App() {
  const [data, setData] = usePersistentData(STORAGE_KEY, DEFAULT_DATA);
  const { settings, students, sessions } = data;

  const [tab, setTab] = useState("schedule");
  const [weekStart, setWeekStart] = useState(() =>
    toISO(getWeekStart(new Date(), settings.weekMode))
  );
  const [modal, setModal] = useState(null); // { editingId?, date, start }
  const [toast, setToast] = useState(null);

  // تحميل خط عربي مريح للقراءة
  useEffect(() => {
    if (document.getElementById("tajawal-font")) return;
    const link = document.createElement("link");
    link.id = "tajawal-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  // إخفاء الإشعار تلقائياً
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((msg, type = "success") => setToast({ msg, type, key: Date.now() }), []);

  const studentsById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s])),
    [students]
  );

  const weekDays = useMemo(() => {
    const start = fromISO(weekStart);
    const count = settings.weekMode === "sat" ? 7 : 5;
    return Array.from({ length: count }, (_, i) => toISO(addDays(start, i)));
  }, [weekStart, settings.weekMode]);

  /* ---------- عمليات البيانات ---------- */

  const updateSettings = (patch) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    if (patch.weekMode && patch.weekMode !== settings.weekMode) {
      setWeekStart(toISO(getWeekStart(new Date(), patch.weekMode)));
    }
  };

  // حفظ حصة (جديدة أو معدّلة). تُرجع رسالة خطأ أو null عند النجاح
  const saveSession = (form, editingId) => {
    const name = form.name.trim();
    const duration = Number(form.duration);
    const rate = Number(form.rate);
    if (!name) return "يرجى كتابة اسم الطالب.";
    if (!form.date) return "يرجى اختيار تاريخ الحصة.";
    if (!(duration > 0)) return "عدد الساعات يجب أن يكون أكبر من صفر.";
    if (!(rate >= 0)) return "يرجى إدخال سعر ساعة صحيح.";

    const startM = toMin(form.start);
    const endM = startM + duration * 60;
    if (startM < toMin(settings.workStart) || endM > toMin(settings.workEnd)) {
      return `الحصة يجب أن تقع ضمن أوقات العمل (${settings.workStart} – ${settings.workEnd}).`;
    }

    // التكرار الأسبوعي متاح عند الإنشاء فقط
    const repeat = editingId ? 1 : Math.max(1, Number(form.repeat) || 1);
    const dates = Array.from({ length: repeat }, (_, i) =>
      toISO(addDays(fromISO(form.date), 7 * i))
    );

    // كشف التعارض مع الحصص الأخرى
    const clashes = dates.filter((dt) =>
      sessions.some((s) => {
        if (s.id === editingId || s.date !== dt) return false;
        const sStart = toMin(s.start);
        return sStart < endM && startM < sStart + s.duration * 60;
      })
    );
    if (clashes.length) {
      return `يوجد تعارض مع حصة أخرى يوم: ${clashes.map(prettyDate).join("، ")}.`;
    }

    // إنشاء الطالب تلقائياً إن لم يكن موجوداً
    let student = students.find((s) => s.name === name);
    let nextStudents = students;
    if (!student) {
      student = { id: uid(), name, rate };
      nextStudents = [...students, student];
    }

    const nextSessions = editingId
      ? sessions.map((s) =>
          s.id === editingId
            ? { ...s, studentId: student.id, date: form.date, start: form.start, duration, rate, paid: form.paid }
            : s
        )
      : [
          ...sessions,
          ...dates.map((date) => ({
            id: uid(), studentId: student.id, date, start: form.start, duration, rate, paid: false,
          })),
        ];

    setData((d) => ({ ...d, students: nextStudents, sessions: nextSessions }));
    notify(
      editingId
        ? "تم تحديث الحصة بنجاح"
        : repeat > 1
        ? `تمت إضافة ${repeat} حصص أسبوعية لـ ${name}`
        : `تمت إضافة حصة ${name}`
    );
    return null;
  };

  const deleteSession = (id) => {
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
    notify("تم حذف الحصة", "info");
  };

  const setPaid = (ids, paid) => {
    const set = new Set(ids);
    setData((d) => ({
      ...d,
      sessions: d.sessions.map((s) => (set.has(s.id) ? { ...s, paid } : s)),
    }));
  };

  const updateStudent = (id, patch) =>
    setData((d) => ({
      ...d,
      students: d.students.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const deleteStudent = (id) => {
    setData((d) => ({
      ...d,
      students: d.students.filter((s) => s.id !== id),
      sessions: d.sessions.filter((s) => s.studentId !== id),
    }));
    notify("تم حذف الطالب وحصصه", "info");
  };

  const resetAll = () => {
    setData(DEFAULT_DATA);
    setWeekStart(toISO(getWeekStart(new Date(), DEFAULT_DATA.settings.weekMode)));
    notify("تم مسح جميع البيانات", "info");
  };

  const editingSession = modal?.editingId ? sessions.find((s) => s.id === modal.editingId) : null;

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-slate-50 text-slate-800"
      style={{ fontFamily: "'Tajawal', system-ui, sans-serif" }}
    >
      <style>{GLOBAL_CSS}</style>
      <Header tab={tab} onTab={setTab} />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        {tab === "schedule" && (
          <ScheduleView
            settings={settings}
            weekDays={weekDays}
            sessions={sessions}
            studentsById={studentsById}
            onPrev={() => setWeekStart(toISO(addDays(fromISO(weekStart), -7)))}
            onNext={() => setWeekStart(toISO(addDays(fromISO(weekStart), 7)))}
            onToday={() => setWeekStart(toISO(getWeekStart(new Date(), settings.weekMode)))}
            onSlotClick={(date, start) => setModal({ date, start })}
            onSessionClick={(s) => setModal({ editingId: s.id, date: s.date, start: s.start })}
            onAdd={() => setModal({ date: weekDays[0], start: settings.workStart })}
          />
        )}

        {tab === "finance" && (
          <FinanceView
            settings={settings}
            sessions={sessions}
            studentsById={studentsById}
            onSetPaid={(ids, paid) => {
              setPaid(ids, paid);
              notify(paid ? "تم تسجيل الدفع ✅" : "تم إلغاء تسجيل الدفع", paid ? "success" : "info");
            }}
          />
        )}

        {tab === "settings" && (
          <SettingsView
            settings={settings}
            students={students}
            sessions={sessions}
            onSaveSettings={(patch) => {
              updateSettings(patch);
              notify("تم حفظ الإعدادات");
            }}
            onUpdateStudent={updateStudent}
            onDeleteStudent={deleteStudent}
            onReset={resetAll}
          />
        )}
      </main>

      {modal && (
        <SessionModal
          key={modal.editingId || `${modal.date}-${modal.start}`}
          settings={settings}
          students={students}
          session={editingSession}
          initialDate={modal.date}
          initialStart={modal.start}
          onClose={() => setModal(null)}
          onSave={(form) => {
            const err = saveSession(form, modal.editingId);
            if (!err) setModal(null);
            return err;
          }}
          onDelete={() => {
            deleteSession(modal.editingId);
            setModal(null);
          }}
        />
      )}

      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} />}
    </div>
  );
}

/* =========================================================
   الترويسة والتبويبات
   ========================================================= */
function Header({ tab, onTab }) {
  const tabs = [
    { id: "schedule", label: "الجدول", icon: CalendarDays },
    { id: "finance", label: "المالية", icon: Wallet },
    { id: "settings", label: "الإعدادات", icon: SettingsIcon },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight text-slate-900">مُنظِّم الحصص</h1>
            <p className="text-xs text-slate-500">جدولك الأسبوعي ومستحقاتك في مكان واحد</p>
          </div>
        </div>
        <nav className="flex gap-1 rounded-2xl bg-slate-100 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === id
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* =========================================================
   بطاقة إحصائية قابلة لإعادة الاستخدام
   ========================================================= */
function StatCard({ icon: Icon, label, value, hint, tone = "indigo" }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="truncate text-xl font-extrabold text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

/* =========================================================
   عرض الجدول الأسبوعي + مؤشر التفرغ
   ========================================================= */
function ScheduleView({
  settings, weekDays, sessions, studentsById,
  onPrev, onNext, onToday, onSlotClick, onSessionClick, onAdd,
}) {
  const ws = toMin(settings.workStart);
  const we = toMin(settings.workEnd);
  const slots = [];
  for (let m = ws; m < we; m += SLOT_MIN) slots.push(m);
  const gridHeight = slots.length * ROW_H;
  const todayISO = toISO(new Date());

  const weekSessions = sessions.filter((s) => weekDays.includes(s.date));

  // مؤشر التفرغ
  const dailyHours = (we - ws) / 60;
  const totalHours = dailyHours * weekDays.length;
  const bookedHours = weekSessions.reduce((sum, s) => sum + s.duration, 0);
  const freeHours = Math.max(0, totalHours - bookedHours);
  const usage = totalHours ? Math.min(100, Math.round((bookedHours / totalHours) * 100)) : 0;

  const first = fromISO(weekDays[0]);
  const last = fromISO(weekDays[weekDays.length - 1]);
  const weekLabel =
    first.getMonth() === last.getMonth()
      ? `${first.getDate()} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`
      : `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;

  // حصص تقع بالكامل خارج أوقات العمل الحالية (بعد تعديل الإعدادات مثلاً)
  const isHidden = (s) => toMin(s.start) >= we || toMin(s.start) + s.duration * 60 <= ws;
  const hiddenCount = weekSessions.filter(isHidden).length;

  return (
    <div className="space-y-6">
      {/* ---- مؤشر التفرغ ---- */}
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
        <StatCard icon={CalendarClock} label="إجمالي الساعات المتاحة للتدريس" value={`${fmt(totalHours)} ساعة`} hint={`${weekDays.length} أيام × ${fmt(dailyHours)} ساعات`} tone="sky" />
        <StatCard icon={CalendarCheck} label="الساعات المحجوزة" value={`${fmt(bookedHours)} ساعة`} hint={`${weekSessions.length} حصة هذا الأسبوع`} tone="indigo" />
        <StatCard icon={Hourglass} label="الساعات الشاغرة" value={`${fmt(freeHours)} ساعة`} hint="متاحة لطلاب جدد" tone="emerald" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold text-slate-700">نسبة الإشغال</span>
            <span className="font-extrabold text-indigo-600">{usage}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usage >= 90 ? "bg-rose-500" : usage >= 70 ? "bg-amber-500" : "bg-gradient-to-l from-indigo-500 to-emerald-400"
              }`}
              style={{ width: `${usage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {usage >= 90
              ? "جدولك شبه ممتلئ — فكّر جيداً قبل قبول طلاب جدد."
              : usage >= 70
              ? "الإشغال مرتفع، ما زال هناك بعض المساحة."
              : "لديك مساحة جيدة لاستقبال طلاب جدد 👍"}
          </p>
        </div>
      </section>

      {/* ---- شريط التنقل بين الأسابيع ---- */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100" title="الأسبوع السابق">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={onToday} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100">
            هذا الأسبوع
          </button>
          <button onClick={onNext} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100" title="الأسبوع التالي">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="ms-2 text-base font-extrabold text-slate-800 sm:text-lg">{weekLabel}</h2>
        </div>
        <button onClick={onAdd} className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> حصة جديدة
        </button>
      </section>

      {/* ---- الشبكة الزمنية ---- */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[760px]"
            style={{ gridTemplateColumns: `64px repeat(${weekDays.length}, minmax(0, 1fr))` }}
          >
            {/* رؤوس الأيام */}
            <div className="sticky top-0 border-b border-slate-200 bg-slate-50" />
            {weekDays.map((iso) => {
              const d = fromISO(iso);
              const isToday = iso === todayISO;
              const booked = weekSessions.filter((s) => s.date === iso).reduce((a, s) => a + s.duration, 0);
              return (
                <div key={iso} className={`border-b border-s border-slate-200 px-2 py-3 text-center ${isToday ? "bg-indigo-50" : "bg-slate-50"}`}>
                  <p className={`text-sm font-bold ${isToday ? "text-indigo-700" : "text-slate-700"}`}>{DAY_NAMES[d.getDay()]}</p>
                  <p className={`mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold ${isToday ? "bg-indigo-600 text-white" : "text-slate-500"}`}>
                    {d.getDate()}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    متاح {fmt(Math.max(0, dailyHours - booked))} س
                  </p>
                </div>
              );
            })}

            {/* عمود الأوقات */}
            <div className="relative" style={{ height: gridHeight }}>
              {slots.map((m, i) =>
                m % 60 === 0 ? (
                  <span key={m} className="absolute inset-x-0 -translate-y-1/2 text-center text-[11px] font-medium text-slate-400" style={{ top: i * ROW_H }}>
                    {i === 0 ? "" : fromMin(m)}
                  </span>
                ) : null
              )}
              <span className="absolute inset-x-0 top-1 text-center text-[11px] font-medium text-slate-400">{settings.workStart}</span>
            </div>

            {/* أعمدة الأيام */}
            {weekDays.map((iso) => {
              const daySessions = weekSessions.filter((s) => s.date === iso);
              const isToday = iso === todayISO;
              return (
                <div key={iso} className={`relative border-s border-slate-200 ${isToday ? "bg-indigo-50/30" : ""}`} style={{ height: gridHeight }}>
                  {/* الخانات الفارغة القابلة للنقر */}
                  {slots.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => onSlotClick(iso, fromMin(m))}
                      title={`إضافة حصة ${prettyDate(iso)} — ${fromMin(m)}`}
                      className={`group absolute inset-x-0 flex items-center justify-center transition hover:bg-indigo-50 ${
                        i === 0 ? "" : m % 60 === 0 ? "border-t border-slate-200" : "border-t border-dashed border-slate-100"
                      }`}
                      style={{ top: i * ROW_H, height: ROW_H }}
                    >
                      <Plus className="h-4 w-4 text-indigo-400 opacity-0 transition group-hover:opacity-100" />
                    </button>
                  ))}

                  {/* بطاقات الحصص */}
                  {daySessions.map((s) => {
                    const startM = toMin(s.start);
                    const top = Math.max(0, ((startM - ws) / SLOT_MIN) * ROW_H);
                    const bottom = Math.min(gridHeight, ((startM + s.duration * 60 - ws) / SLOT_MIN) * ROW_H);
                    if (isHidden(s)) return null;
                    const student = studentsById[s.studentId];
                    const color = colorFor(s.studentId);
                    const compact = bottom - top < 50;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onSessionClick(s)}
                        className={`absolute inset-x-1 z-10 overflow-hidden rounded-xl border px-2 py-1 text-start shadow-sm transition hover:-translate-y-px hover:shadow-md ${color.card}`}
                        style={{ top: top + 2, height: bottom - top - 4 }}
                      >
                        <div className="flex items-center gap-1">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
                          <span className="truncate text-xs font-extrabold">{student?.name || "طالب محذوف"}</span>
                          {s.paid && <CheckCircle2 className="ms-auto h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                        </div>
                        {!compact && (
                          <p className="mt-0.5 text-[11px] opacity-75">
                            {s.start} – {sessionEnd(s)}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {hiddenCount > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          يوجد {hiddenCount} حصة خارج أوقات العمل الحالية — وسّع أوقات العمل من الإعدادات لعرضها.
        </p>
      )}

      <p className="text-center text-xs text-slate-400">
        💡 اضغط على أي خانة فارغة لإضافة حصة، أو على حصة موجودة لتعديلها.
      </p>
    </div>
  );
}

/* =========================================================
   نافذة إضافة / تعديل حصة
   ========================================================= */
function SessionModal({ settings, students, session, initialDate, initialStart, onClose, onSave, onDelete }) {
  const isEdit = Boolean(session);
  const studentOfSession = isEdit ? students.find((s) => s.id === session.studentId) : null;

  const [form, setForm] = useState(() => ({
    name: studentOfSession?.name || "",
    date: initialDate,
    start: initialStart,
    duration: session?.duration ?? 1,
    rate: session?.rate ?? settings.defaultRate,
    paid: session?.paid ?? false,
    repeat: 1,
  }));
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // إغلاق النافذة بزر Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setError("");
  };

  // عند اختيار طالب موجود نعتمد سعره الخاص تلقائياً
  const onNameChange = (name) => {
    const match = students.find((s) => s.name === name.trim());
    set(match ? { name, rate: match.rate } : { name });
  };

  const ws = toMin(settings.workStart);
  const we = toMin(settings.workEnd);
  const startOptions = [];
  for (let m = ws; m < we; m += SLOT_MIN) startOptions.push(fromMin(m));

  const maxDuration = Math.max(0.5, (we - toMin(form.start)) / 60);
  const durationOptions = [];
  for (let h = 0.5; h <= Math.max(maxDuration, Number(form.duration)); h += 0.5) durationOptions.push(h);

  const total = Number(form.duration) * Number(form.rate || 0);

  const submit = (e) => {
    e.preventDefault();
    const err = onSave(form);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            {isEdit ? <CalendarCheck className="h-5 w-5 text-indigo-600" /> : <Plus className="h-5 w-5 text-indigo-600" />}
            {isEdit ? "تعديل الحصة" : "حصة جديدة"}
          </h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <Field label="اسم الطالب" icon={Users}>
            <input
              autoFocus={!isEdit}
              list="students-list"
              value={form.name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="اكتب الاسم أو اختر من القائمة"
              className="input"
            />
            <datalist id="students-list">
              {students.map((s) => <option key={s.id} value={s.name} />)}
            </datalist>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="يوم الحصة" icon={CalendarDays}>
              <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} className="input" />
            </Field>
            <Field label="وقت البداية" icon={Clock}>
              <select value={form.start} onChange={(e) => set({ start: e.target.value })} className="input">
                {!startOptions.includes(form.start) && <option value={form.start}>{form.start}</option>}
                {startOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          {form.date && <p className="-mt-2 text-xs text-slate-500">{prettyDate(form.date)}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="عدد الساعات" icon={Hourglass}>
              <select value={form.duration} onChange={(e) => set({ duration: Number(e.target.value) })} className="input">
                {durationOptions.map((h) => (
                  <option key={h} value={h}>{h === 0.5 ? "نصف ساعة" : `${fmt(h)} ساعة`}</option>
                ))}
              </select>
            </Field>
            <Field label={`سعر الساعة (${settings.currency})`} icon={HandCoins}>
              <input type="number" min="0" step="any" value={form.rate} onChange={(e) => set({ rate: e.target.value })} className="input" />
            </Field>
          </div>

          {!isEdit && (
            <Field label="تكرار أسبوعي" icon={Repeat}>
              <select value={form.repeat} onChange={(e) => set({ repeat: Number(e.target.value) })} className="input">
                <option value={1}>بدون تكرار (حصة واحدة)</option>
                {[2, 3, 4, 6, 8, 12].map((n) => <option key={n} value={n}>لمدة {n} أسابيع</option>)}
              </select>
            </Field>
          )}

          {isEdit && (
            <button
              type="button"
              onClick={() => set({ paid: !form.paid })}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                form.paid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <span className="flex items-center gap-2">
                {form.paid ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                {form.paid ? "تم الدفع ✅" : "لم تُدفع بعد"}
              </span>
              <span className="text-xs font-medium opacity-70">اضغط للتبديل</span>
            </button>
          )}

          <div className="flex items-center justify-between rounded-2xl bg-indigo-50 px-4 py-3">
            <span className="text-sm font-bold text-indigo-900">قيمة الحصة</span>
            <span className="text-lg font-extrabold text-indigo-700">
              {money(total, settings.currency)}
              {!isEdit && form.repeat > 1 && (
                <span className="ms-1 text-xs font-medium text-indigo-500">× {form.repeat}</span>
              )}
            </span>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 px-6 py-4">
          <button type="submit" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700">
            <Save className="h-4 w-4" /> {isEdit ? "حفظ التعديلات" : "إضافة الحصة"}
          </button>
          {isEdit &&
            (confirmDelete ? (
              <button type="button" onClick={onDelete} className="h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700">
                تأكيد الحذف
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50" title="حذف الحصة">
                <Trash2 className="h-4 w-4" />
              </button>
            ))}
        </div>
      </form>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-600">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        {label}
      </span>
      {children}
    </label>
  );
}

/* =========================================================
   لوحة التحكم المالية (ملخص شهري + تسوية الحسابات)
   ========================================================= */
function FinanceView({ settings, sessions, studentsById, onSetPaid }) {
  const [month, setMonth] = useState(() => toISO(new Date()).slice(0, 7)); // "YYYY-MM"
  const [open, setOpen] = useState({}); // الطلاب المفتوحة تفاصيلهم
  const { currency } = settings;

  const shiftMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const [yy, mm] = month.split("-").map(Number);

  const monthSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.date.startsWith(month))
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    [sessions, month]
  );

  const now = new Date();
  const totals = monthSessions.reduce(
    (acc, s) => {
      const value = s.duration * s.rate;
      acc.scheduledHours += s.duration;
      if (sessionEndDate(s) <= now) acc.taughtHours += s.duration;
      acc.expected += value;
      if (s.paid) acc.paid += value;
      else acc.pending += value;
      return acc;
    },
    { scheduledHours: 0, taughtHours: 0, expected: 0, paid: 0, pending: 0 }
  );
  const collectedPct = totals.expected ? Math.round((totals.paid / totals.expected) * 100) : 0;

  // تجميع الحصص حسب الطالب
  const byStudent = useMemo(() => {
    const map = new Map();
    for (const s of monthSessions) {
      if (!map.has(s.studentId)) map.set(s.studentId, []);
      map.get(s.studentId).push(s);
    }
    return [...map.entries()]
      .map(([studentId, list]) => {
        const total = list.reduce((a, s) => a + s.duration * s.rate, 0);
        const paid = list.filter((s) => s.paid).reduce((a, s) => a + s.duration * s.rate, 0);
        return {
          studentId,
          name: studentsById[studentId]?.name || "طالب محذوف",
          list,
          hours: list.reduce((a, s) => a + s.duration, 0),
          total,
          paid,
          pending: total - paid,
        };
      })
      .sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name, "ar"));
  }, [monthSessions, studentsById]);

  return (
    <div className="space-y-6">
      {/* ---- اختيار الشهر ---- */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100" title="الشهر السابق">
            <ChevronRight className="h-5 w-5" />
          </button>
          <h2 className="min-w-[9rem] text-center text-lg font-extrabold text-slate-800">
            {MONTHS[mm - 1]} {yy}
          </h2>
          <button onClick={() => shiftMonth(1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100" title="الشهر التالي">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <button onClick={() => setMonth(toISO(new Date()).slice(0, 7))} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100">
          الشهر الحالي
        </button>
      </section>

      {/* ---- الملخص الشهري ---- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} label="الساعات المُدرَّسة" value={`${fmt(totals.taughtHours)} ساعة`} hint={`من أصل ${fmt(totals.scheduledHours)} ساعة مجدولة`} tone="sky" />
        <StatCard icon={TrendingUp} label="الدخل المتوقع (الإجمالي)" value={money(totals.expected, currency)} hint={`${monthSessions.length} حصة هذا الشهر`} tone="indigo" />
        <StatCard icon={BadgeCheck} label="المبالغ المحصّلة" value={money(totals.paid, currency)} hint={`${collectedPct}% من الإجمالي`} tone="emerald" />
        <StatCard icon={Hourglass} label="المبالغ المعلّقة" value={money(totals.pending, currency)} hint="لم تُدفع بعد" tone="amber" />
      </section>

      <div className="h-2.5 overflow-hidden rounded-full bg-amber-100">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${collectedPct}%` }} />
      </div>

      {/* ---- قائمة الطلاب ---- */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Users className="h-5 w-5 text-indigo-600" />
          <h3 className="font-extrabold text-slate-800">حسابات الطلاب</h3>
        </div>

        {byStudent.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Wallet className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-600">لا توجد حصص في هذا الشهر</p>
            <p className="text-sm text-slate-400">أضف حصصاً من تبويب الجدول لتظهر هنا تلقائياً.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {byStudent.map((st) => {
              const color = colorFor(st.studentId);
              const settled = st.pending === 0;
              const isOpen = open[st.studentId];
              return (
                <li key={st.studentId}>
                  <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <button
                      onClick={() => setOpen((o) => ({ ...o, [st.studentId]: !o[st.studentId] }))}
                      className="flex min-w-0 flex-1 items-center gap-3 text-start"
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white ${color.dot}`}>
                        {st.name.trim().charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-extrabold text-slate-800">{st.name}</span>
                        <span className="block text-xs text-slate-500">
                          {st.list.length} حصة · {fmt(st.hours)} ساعة · الإجمالي {money(st.total, currency)}
                        </span>
                      </span>
                      <ChevronDown className={`ms-auto h-5 w-5 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    <div className="flex items-center gap-2">
                      {settled ? (
                        <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" /> تمت التسوية
                        </span>
                      ) : (
                        <>
                          <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
                            معلّق: {money(st.pending, currency)}
                          </span>
                          <button
                            onClick={() => onSetPaid(st.list.filter((s) => !s.paid).map((s) => s.id), true)}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                          >
                            <BadgeCheck className="h-4 w-4" /> تم الدفع ✅
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* تفاصيل حصص الطالب */}
                  {isOpen && (
                    <ul className="space-y-2 bg-slate-50/70 px-5 py-3">
                      {st.list.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                          <span className="text-sm font-bold text-slate-700">{prettyDate(s.date)}</span>
                          <span className="text-xs text-slate-500">
                            {s.start} – {sessionEnd(s)} · {fmt(s.duration)} س × {fmt(s.rate)}
                          </span>
                          <span className="ms-auto text-sm font-extrabold text-slate-800">{money(s.duration * s.rate, currency)}</span>
                          <button
                            onClick={() => onSetPaid([s.id], !s.paid)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                              s.paid ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {s.paid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                            {s.paid ? "تم الدفع ✅" : "غير مدفوعة"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* =========================================================
   الإعدادات + إدارة أسعار الطلاب
   ========================================================= */
function SettingsView({ settings, students, sessions, onSaveSettings, onUpdateStudent, onDeleteStudent, onReset }) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmStudent, setConfirmStudent] = useState(null);

  const timeOptions = [];
  for (let m = 0; m <= 24 * 60 - SLOT_MIN; m += SLOT_MIN) timeOptions.push(fromMin(m));

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const save = () => {
    if (toMin(draft.workEnd) <= toMin(draft.workStart)) {
      return setError("وقت النهاية يجب أن يكون بعد وقت البداية.");
    }
    if (!(Number(draft.defaultRate) >= 0)) return setError("يرجى إدخال سعر ساعة صحيح.");
    setError("");
    onSaveSettings({ ...draft, defaultRate: Number(draft.defaultRate), currency: draft.currency.trim() || "د.ت" });
  };

  const sessionCount = (id) => sessions.filter((s) => s.studentId === id).length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---- إعدادات العمل ---- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-slate-800">
          <SettingsIcon className="h-5 w-5 text-indigo-600" /> إعدادات العمل
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="بداية العمل اليومي" icon={Clock}>
              <select className="input" value={draft.workStart} onChange={(e) => setDraft({ ...draft, workStart: e.target.value })}>
                {timeOptions.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="نهاية العمل اليومي" icon={Clock}>
              <select className="input" value={draft.workEnd} onChange={(e) => setDraft({ ...draft, workEnd: e.target.value })}>
                {[...timeOptions.slice(1), "24:00"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="السعر الافتراضي للساعة" icon={HandCoins}>
              <input type="number" min="0" step="any" className="input" value={draft.defaultRate} onChange={(e) => setDraft({ ...draft, defaultRate: e.target.value })} />
            </Field>
            <Field label="العملة" icon={Wallet}>
              <input className="input" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} placeholder="د.ت / ر.س / $" />
            </Field>
          </div>

          <Field label="أيام العمل في الأسبوع" icon={CalendarDays}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "sun", label: "الأحد ← الخميس" },
                { id: "sat", label: "السبت ← الجمعة" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, weekMode: opt.id })}
                  className={`h-11 rounded-xl border text-sm font-bold transition ${
                    draft.weekMode === opt.id ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <AlertTriangle className="h-4 w-4" /> {error}
            </p>
          )}

          <button
            onClick={save}
            disabled={!dirty}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            <Save className="h-4 w-4" /> {dirty ? "حفظ الإعدادات" : "الإعدادات محفوظة"}
          </button>
        </div>
      </section>

      {/* ---- أسعار الطلاب ---- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-lg font-extrabold text-slate-800">
          <Users className="h-5 w-5 text-indigo-600" /> الطلاب وأسعارهم
        </h3>
        <p className="mb-5 text-xs text-slate-500">
          السعر الخاص بكل طالب يُستخدم تلقائياً عند إضافة حصص جديدة له (الحصص السابقة تحتفظ بسعرها).
        </p>

        {students.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            سيظهر الطلاب هنا تلقائياً عند إضافة أول حصة لهم.
          </p>
        ) : (
          <ul className="space-y-2">
            {students.map((st) => (
              <li key={st.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorFor(st.id).dot}`} />
                <input
                  className="min-w-0 flex-1 bg-transparent font-bold text-slate-800 outline-none focus:text-indigo-700"
                  value={st.name}
                  onChange={(e) => onUpdateStudent(st.id, { name: e.target.value })}
                  title="تعديل الاسم"
                />
                <span className="hidden text-xs text-slate-400 sm:inline">{sessionCount(st.id)} حصة</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-center text-sm font-bold outline-none focus:border-indigo-300"
                    value={st.rate}
                    onChange={(e) => onUpdateStudent(st.id, { rate: e.target.value === "" ? "" : Number(e.target.value) })}
                  />
                  <span className="text-xs text-slate-500">{settings.currency}/س</span>
                </div>
                {confirmStudent === st.id ? (
                  <button
                    onClick={() => { onDeleteStudent(st.id); setConfirmStudent(null); }}
                    className="h-9 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    تأكيد
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmStudent(st.id)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="حذف الطالب وجميع حصصه"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- منطقة الخطر ---- */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-rose-800">مسح جميع البيانات</h3>
            <p className="text-sm text-rose-700/80">يحذف كل الحصص والطلاب والإعدادات من هذا المتصفح نهائياً.</p>
          </div>
          {confirmReset ? (
            <div className="flex gap-2">
              <button onClick={() => { onReset(); setConfirmReset(false); setDraft(DEFAULT_DATA.settings); }} className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700">
                نعم، امسح كل شيء
              </button>
              <button onClick={() => setConfirmReset(false)} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
                تراجع
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="flex h-10 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-sm font-bold text-rose-700 hover:bg-rose-100">
              <RotateCcw className="h-4 w-4" /> مسح البيانات
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   إشعار منبثق صغير
   ========================================================= */
function Toast({ msg, type }) {
  const styles = type === "success" ? "bg-emerald-600" : "bg-slate-800";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${styles}`}>
        {type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <CalendarCheck className="h-5 w-5" />}
        {msg}
      </div>
    </div>
  );
}
