import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/* حارس دائم (2026-10-27): React يُهرّب ' و " و & و < و > في نص <style>{`…`}</style> على الخادم
   ('Cairo' ← &#x27;Cairo&#x27;) — فيفسد الـCSS قبل التحميل، ولا يطابق المتصفح فيُعاد رسم الجزء كله
   (hydration mismatch). كُشف في المكتبة والتقدّم ولوحة الطالب ولوحة الإدارة.
   الحل: <style dangerouslySetInnerHTML={{ __html: `…` }} /> لأي CSS ثابت فيه هذه الرموز. */

const ROOT = path.resolve(__dirname, '..');
const jsxFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === 'node_modules' || e.name.startsWith('.') ? [] : jsxFiles(p);
  return /\.(jsx|js)$/.test(e.name) && !e.name.endsWith('.test.js') ? [p] : [];
});

describe('كتل <style> النصية لا تحتوي رموزاً يُهرّبها React', () => {
  it("لا ' ولا \" ولا & ولا < ولا > داخل <style>{`…`}</style> في app/ و components/", () => {
    const bad = [];
    for (const f of [...jsxFiles(path.join(ROOT, 'app')), ...jsxFiles(path.join(ROOT, 'components'))]) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/<style>\{`([\s\S]*?)`\}<\/style>/g)) {
        const text = m[1].replace(/\$\{[^}]*\}/g, '');
        if (/["'&<>]/.test(text)) bad.push(`${path.relative(ROOT, f)}:${src.slice(0, m.index).split('\n').length}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
