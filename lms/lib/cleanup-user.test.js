import { describe, it, expect } from 'vitest';
import { cleanupUserData } from './cleanup-user.js';

// جداول مرتبطة بـUUID المستخدم — من ضمنها 'students' تحديداً (§13.7): نسيان
// هذا الجدول تحديداً هو الحادثة الفعلية التي حدثت في هذا المشروع (طفل محذوف
// بقي ظاهراً في مبدّل العائلة لأن صف students لم يُحذف معه).
const UUID_TABLES = [
  ['flashcard_progress',            'user_id'],
  ['daily_logs',                    'user_id'],
  ['user_points',                   'user_id'],
  ['points_log',                    'user_id'],
  ['puzzle_progress',               'user_id'],
  ['game_results',                  'user_id'],
  ['story_reads',                   'user_id'],
  ['hero_config',                   'user_id'],
  ['avatar_items',                  'user_id'],
  ['assessments',                   'user_id'],
  ['student_group_assignments',     'user_id'],
  ['attendance_logs',               'student_id'],
  ['notifications',                 'recipient_id'],
  ['students',                      'id'],
];

const EMAIL_TABLES = [
  ['sessions',                    'student_email'],
  ['teacher_students',            'student_email'],
  ['session_support_students',    'student_email'],
];

/**
 * عميل Supabase وهمي يسجّل كل نداء .from(table).delete().eq(col, val)،
 * مع إمكانية جعل جدول معيّن يفشل عمداً لاختبار أن باقي الجداول لا تتأثر.
 */
function makeAdmin({ failingTables = [] } = {}) {
  const calls = [];
  return {
    _calls: calls,
    from: (table) => ({
      delete: () => ({
        eq: (col, val) => {
          calls.push([table, col, val]);
          if (failingTables.includes(table)) {
            return Promise.reject(new Error(`فشل محاكى في جدول ${table}`));
          }
          return Promise.resolve({ error: null });
        },
      }),
    }),
  };
}

describe('cleanupUserData', () => {
  const USER_ID = 'user-uuid-123';
  const USER_EMAIL = 'student@example.com';

  it('يحذف من كل الجداول المرتبطة بـUUID، بما في ذلك students (حارس انحدار §13.7)', async () => {
    const admin = makeAdmin();
    await cleanupUserData(USER_ID, USER_EMAIL, admin);

    for (const [table, col] of UUID_TABLES) {
      expect(admin._calls).toContainEqual([table, col, USER_ID]);
    }
  });

  it('حارس صريح: جدول students تحديداً يُستدعى بـ.eq("id", userId)', async () => {
    // اختبار منفصل ومباشر لهذا الجدول تحديداً — هو بالضبط الجدول الذي نُسي
    // فعلاً عند بناء ميزة "إضافة طفل" وسبب بقاء أطفال محذوفين ظاهرين للمستخدم.
    const admin = makeAdmin();
    await cleanupUserData(USER_ID, USER_EMAIL, admin);
    expect(admin._calls).toContainEqual(['students', 'id', USER_ID]);
  });

  it('يحذف من الجداول المرتبطة بالبريد الإلكتروني عند توفره', async () => {
    const admin = makeAdmin();
    await cleanupUserData(USER_ID, USER_EMAIL, admin);

    for (const [table, col] of EMAIL_TABLES) {
      expect(admin._calls).toContainEqual([table, col, USER_EMAIL]);
    }
  });

  it('لا يستدعي جداول البريد الإلكتروني إطلاقاً إن كان البريد فارغاً', async () => {
    const admin = makeAdmin();
    await cleanupUserData(USER_ID, null, admin);

    const emailTableNames = EMAIL_TABLES.map(([table]) => table);
    const calledTables = admin._calls.map(([table]) => table);
    for (const table of emailTableNames) {
      expect(calledTables).not.toContain(table);
    }
  });

  it('لا يترك أي بيانات يتيمة: عدد نداءات الحذف يطابق كل الجداول المعروفة بالضبط', async () => {
    // اختبار صارم بالتصميم: أي جدول جديد يُضاف مستقبلاً لتخزين بيانات مستخدم
    // (كما حدث فعلاً مع "students") يجب أن يُرفَق هنا بوعي — لا أن يُنسى
    // بصمت. فشل هذا الاختبار عند إضافة جدول جديد هو السلوك المطلوب تماماً،
    // لا عيباً في الاختبار نفسه؛ يُحدَّث العدد صراحة مع كل إضافة متعمَّدة.
    const admin = makeAdmin();
    await cleanupUserData(USER_ID, USER_EMAIL, admin);
    expect(admin._calls.length).toBe(UUID_TABLES.length + EMAIL_TABLES.length);
  });

  it('استمرار حذف بقية الجداول حتى لو فشل جدول واحد (كل حذف مستقل)', async () => {
    const admin = makeAdmin({ failingTables: ['user_points', 'sessions'] });

    await expect(cleanupUserData(USER_ID, USER_EMAIL, admin)).resolves.not.toThrow();

    // بقية الجداول (غير الفاشلة) استُدعيت رغم فشل user_points/sessions
    expect(admin._calls).toContainEqual(['students',   'id',       USER_ID]);
    expect(admin._calls).toContainEqual(['game_results','user_id', USER_ID]);
    expect(admin._calls).toContainEqual(['teacher_students', 'student_email', USER_EMAIL]);
  });
});
