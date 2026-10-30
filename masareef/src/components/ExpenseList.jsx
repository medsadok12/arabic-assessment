import Icon from './Icon.jsx';
import { STATUSES, categoryColor, categoryIcon } from '../config.js';
import { dueHint, itemsPhrase } from '../lib/format.js';

function ExpenseRow({ item, fmt, today, onEdit, onDelete, onMarkBought }) {
  const hint = dueHint(item, today);
  const status = STATUSES[item.status];

  return (
    <li className={`expense expense-${item.status}`} data-testid="expense">
      <span className="expense-icon" style={{ '--tint': categoryColor(item.category) }} aria-hidden="true">
        {categoryIcon(item.category)}
      </span>

      <div className="expense-main">
        <p className="expense-name">{item.name}</p>
        <p className="expense-meta">
          <span>{fmt.date(item.item_date, today)}</span>
          {hint && <span className={`due due-${hint.tone}`}>{hint.text}</span>}
          <span className="meta-sep" aria-hidden="true">·</span>
          <span>{item.category}</span>
          {item.added_by && (
            <>
              <span className="meta-sep" aria-hidden="true">·</span>
              <span>بواسطة {item.added_by}</span>
            </>
          )}
        </p>
      </div>

      <div className="expense-side">
        <p className="expense-price">{fmt.money(item.price)}</p>
        <span className={`pill pill-${item.status}`}>{status.icon} {status.label}</span>
      </div>

      <div className="expense-actions">
        {item.status !== 'bought' && (
          <button type="button" className="act act-buy" onClick={() => onMarkBought(item)}>
            <Icon name="check" size={16} /> تم الشراء
          </button>
        )}
        <button type="button" className="act" onClick={() => onEdit(item)} aria-label={`تعديل ${item.name}`}>
          <Icon name="edit" size={16} /> تعديل
        </button>
        <button type="button" className="act act-danger" onClick={() => onDelete(item)} aria-label={`حذف ${item.name}`}>
          <Icon name="trash" size={16} /> حذف
        </button>
      </div>
    </li>
  );
}

export default function ExpenseList({ allCount, items, subtotal, filtered, loading, fmt, today, onAdd, onClear, ...actions }) {
  return (
    <section className="card list-card" aria-labelledby="list-title">
      <div className="list-head">
        <h2 id="list-title" className="card-title">البنود</h2>
        {items.length > 0 && (
          <span className="list-summary" data-testid="list-summary">
            {itemsPhrase(items.length)} · {fmt.money(subtotal)}
          </span>
        )}
        {filtered && <button type="button" className="link-btn" onClick={onClear}>مسح التصفية</button>}
      </div>

      {loading ? (
        <ul className="expense-list" aria-busy="true">
          {[0, 1, 2].map(i => <li key={i} className="expense skeleton" />)}
        </ul>
      ) : allCount === 0 ? (
        <div className="empty">
          <p className="empty-mark" aria-hidden="true">💐</p>
          <p className="empty-title">دفتركما جاهز لأول بند!</p>
          <p className="muted">ابدآ بما تعرفانه الآن: حجز القاعة، الذهب، تجهيزات المنزل…</p>
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <Icon name="plus" size={18} /> إضافة أول بند
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <p className="empty-mark" aria-hidden="true">🔍</p>
          <p className="empty-title">لا توجد بنود تطابق هذه التصفية</p>
          <button type="button" className="btn btn-secondary" onClick={onClear}>عرض كل البنود</button>
        </div>
      ) : (
        <ul className="expense-list">
          {items.map(item => (
            <ExpenseRow key={item.id} item={item} fmt={fmt} today={today} {...actions} />
          ))}
        </ul>
      )}
    </section>
  );
}
