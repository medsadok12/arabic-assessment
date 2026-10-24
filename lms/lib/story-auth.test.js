import { describe, it, expect } from 'vitest';
import { storyAuthFailure, canEditStories, SESSION_EXPIRED_CODE } from './story-auth.js';

const withRole = (role) => ({ id: 'u1', app_metadata: { role } });

describe('storyAuthFailure', () => {
  it('بلا جلسة → 401 برمز انتهاء الجلسة (لا «غير مخول»)', () => {
    const fail = storyAuthFailure(null);
    expect(fail.status).toBe(401);
    expect(fail.body.code).toBe(SESSION_EXPIRED_CODE);
    expect(fail.body.error).toContain('انتهت جلسة الدخول');
  });

  it('المدير والمشرف والمعلم يحررون القصص', () => {
    for (const role of ['super_admin', 'admin', 'teacher']) {
      expect(storyAuthFailure(withRole(role))).toBeNull();
      expect(canEditStories(withRole(role))).toBe(true);
    }
  });

  it('جلسة صالحة بدور لا يحرر → 403 «غير مخول»', () => {
    for (const role of ['student', 'supervisor', undefined]) {
      const fail = storyAuthFailure(withRole(role));
      expect(fail.status).toBe(403);
      expect(fail.body.error).toBe('غير مخول');
    }
  });

  it('الدور يُقرأ من app_metadata فقط', () => {
    const forged = { id: 'u2', app_metadata: {}, user_metadata: { role: 'super_admin' } };
    expect(storyAuthFailure(forged).status).toBe(403);
  });
});
