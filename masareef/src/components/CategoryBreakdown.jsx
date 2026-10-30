import { categoryColor, categoryIcon } from '../config.js';

export default function CategoryBreakdown({ rows, total, fmt, active, onPick }) {
  return (
    <section className="card breakdown" aria-labelledby="breakdown-title">
      <h2 id="breakdown-title" className="card-title">توزيع المصاريف حسب التصنيف</h2>
      {rows.length === 0 ? (
        <p className="muted">سيظهر هنا توزيع مصاريفكما بعد إضافة البنود.</p>
      ) : (
        <ul className="breakdown-list">
          {rows.map(row => {
            const percent = total ? Math.round((row.total / total) * 100) : 0;
            const selected = active === row.category;
            return (
              <li key={row.category}>
                <button
                  type="button"
                  className={`breakdown-row ${selected ? 'is-active' : ''}`}
                  aria-pressed={selected}
                  onClick={() => onPick(selected ? 'all' : row.category)}
                >
                  <span className="breakdown-head">
                    <span className="breakdown-name">
                      <span aria-hidden="true">{categoryIcon(row.category)}</span> {row.category}
                    </span>
                    <span className="breakdown-amount">{fmt.money(row.total)} <small>{percent}%</small></span>
                  </span>
                  <span className="bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(percent, 2)}%`, background: categoryColor(row.category) }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
