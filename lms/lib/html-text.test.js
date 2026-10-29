import { describe, it, expect } from 'vitest';
import { htmlToText } from './html-text';

describe('htmlToText — نص القصة قبل التنقية في المتصفح', () => {
  it('يحذف الوسوم ويحفظ الفقرات والأسطر', () => {
    expect(htmlToText('<p>كان يا <b>ما</b> كان</p><p>في قديم الزمان</p>')).toBe('كان يا ما كان\nفي قديم الزمان');
    expect(htmlToText('سطر<br>سطر<br/>سطر')).toBe('سطر\nسطر\nسطر');
  });
  it('يفك الرموز الشائعة والرقمية', () => {
    expect(htmlToText('أ&nbsp;ب &amp; ج &lt;د&gt; &quot;هـ&quot; &#39;و&#39; &#1601;')).toBe('أ ب & ج <د> "هـ" \'و\' ف');
  });
  it('لا يُبقي محتوى script ولا style، ويقبل الفارغ', () => {
    expect(htmlToText('<script>alert(1)</script><style>p{}</style>نص')).toBe('نص');
    expect(htmlToText(null)).toBe('');
    expect(htmlToText('')).toBe('');
  });
});
