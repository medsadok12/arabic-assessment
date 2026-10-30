import Icon from './Icon.jsx';
import { STATUSES, STATUS_ORDER, categoryIcon } from '../config.js';
import { SORTS } from '../lib/stats.js';

export default function Filters({ filters, onChange, counts, categories, months, fmt }) {
  const set = patch => onChange({ ...filters, ...patch });

  return (
    <section className="filters" aria-label="تصفية البنود">
      <label className="search">
        <Icon name="search" size={18} />
        <input
          type="search"
          value={filters.query}
          placeholder="ابحث عن بند أو تصنيف…"
          aria-label="بحث"
          onChange={e => set({ query: e.target.value })}
        />
      </label>

      <div className="chip-row" role="group" aria-label="حالة الشراء">
        {['all', ...STATUS_ORDER].map(status => (
          <button
            key={status}
            type="button"
            className={`chip chip-status-${status}`}
            aria-pressed={filters.status === status}
            onClick={() => set({ status })}
          >
            {status === 'all' ? 'الكل' : `${STATUSES[status].icon} ${STATUSES[status].label}`}
            <span className="chip-count">{counts[status]}</span>
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="chip-row chip-scroll" role="group" aria-label="التصنيف">
          <button type="button" className="chip" aria-pressed={filters.category === 'all'} onClick={() => set({ category: 'all' })}>
            كل التصنيفات
          </button>
          {categories.map(category => (
            <button
              key={category}
              type="button"
              className="chip"
              aria-pressed={filters.category === category}
              onClick={() => set({ category })}
            >
              <span aria-hidden="true">{categoryIcon(category)}</span> {category}
            </button>
          ))}
        </div>
      )}

      <div className="filter-selects">
        <label className="select-field">
          <Icon name="calendar" size={16} />
          <span className="visually-hidden">الشهر</span>
          <select value={filters.month} onChange={e => set({ month: e.target.value })}>
            <option value="all">كل الأشهر</option>
            {months.map(month => <option key={month} value={month}>{fmt.month(month)}</option>)}
          </select>
        </label>
        <label className="select-field">
          <Icon name="sort" size={16} />
          <select value={filters.sort} onChange={e => set({ sort: e.target.value })} aria-label="ترتيب البنود">
            {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}
