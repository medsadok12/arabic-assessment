import { itemsPhrase } from '../lib/format.js';

export default function StatCards({ stats, fmt }) {
  const percent = Math.round(stats.paidRatio * 100);
  const { counts } = stats;

  return (
    <section className="stats" aria-label="ملخص المصاريف">
      <article className="stat stat-total">
        <h2 className="stat-label"><span aria-hidden="true">🧾</span> إجمالي المصاريف</h2>
        <p className="stat-value" data-testid="stat-total">{fmt.money(stats.total)}</p>
        <div
          className="progress"
          role="progressbar"
          aria-label="نسبة ما تم دفعه"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="stat-note">
          {counts.all ? `${itemsPhrase(counts.all)} · دُفع منها ${percent}%` : 'أضيفا أول بند لتبدأ الحسبة'}
        </p>
      </article>

      <article className="stat stat-paid">
        <h2 className="stat-label"><span aria-hidden="true">✅</span> تم دفعه</h2>
        <p className="stat-value" data-testid="stat-paid">{fmt.money(stats.paid)}</p>
        <p className="stat-note">{counts.bought ? `${itemsPhrase(counts.bought)} تم شراؤها` : 'لا مشتريات بعد'}</p>
      </article>

      <article className="stat stat-remaining">
        <h2 className="stat-label"><span aria-hidden="true">⏳</span> المتبقي للمستحقات</h2>
        <p className="stat-value" data-testid="stat-remaining">{fmt.money(stats.remaining)}</p>
        <p className="stat-note">مطلوبة قريباً: {fmt.money(stats.soon)}</p>
        <p className="stat-note">معلقة: {fmt.money(stats.pending)}</p>
      </article>
    </section>
  );
}
