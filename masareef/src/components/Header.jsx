import Icon from './Icon.jsx';

const SYNC_LABELS = {
  loading: 'جارٍ التحميل…',
  saving:  'جارٍ الحفظ…',
  synced:  'محفوظ',
  offline: 'بلا اتصال',
  error:   'تعذّرت المزامنة',
};

function SyncBadge({ status, pending }) {
  const label = status === 'offline' && pending > 0 ? 'بلا اتصال · سيُحفظ تلقائياً' : SYNC_LABELS[status];
  if (!label) return null;
  return (
    <span className={`sync sync-${status}`} role="status" title={label}>
      <span className="sync-dot" aria-hidden="true" />
      <span className="sync-label">{label}</span>
    </span>
  );
}

export default function Header({ title, countdown, status, pending, onAdd, onSettings }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-name">مصاريف</span>
        <span className="brand-sub">{title}</span>
      </div>
      <div className="header-actions">
        <SyncBadge status={status} pending={pending} />
        <button type="button" className="btn btn-primary only-wide" onClick={onAdd}>
          <Icon name="plus" size={18} />
          إضافة بند
        </button>
        <button type="button" className="icon-btn icon-btn-soft" onClick={onSettings} aria-label="الإعدادات ومشاركة الدفتر">
          <Icon name="settings" />
        </button>
      </div>
      {countdown && (
        <p className="countdown"><span aria-hidden="true">💍</span> {countdown}</p>
      )}
    </header>
  );
}
