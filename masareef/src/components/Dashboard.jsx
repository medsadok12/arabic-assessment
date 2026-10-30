import { useEffect, useMemo, useState } from 'react';
import Header from './Header.jsx';
import StatCards from './StatCards.jsx';
import CategoryBreakdown from './CategoryBreakdown.jsx';
import Filters from './Filters.jsx';
import ExpenseList from './ExpenseList.jsx';
import ExpenseForm from './ExpenseForm.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import ShareInvite from './ShareInvite.jsx';
import Modal from './Modal.jsx';
import Toast from './Toast.jsx';
import Icon from './Icon.jsx';
import { useMasareef } from '../hooks/useMasareef.js';
import { useToast } from '../hooks/useToast.js';
import { DEFAULT_TITLE } from '../config.js';
import { createFormatters, todayISO, weddingCountdown } from '../lib/format.js';
import { newId } from '../lib/spaceKey.js';
import { browserStorage, STORE } from '../lib/storage.js';
import {
  DEFAULT_FILTERS, categoryBreakdown, categoryOptions, computeStats,
  filterItems, hasActiveFilters, monthOptions, sortItems,
} from '../lib/stats.js';

export default function Dashboard({ spaceKey, onLeave }) {
  const [state, store] = useMasareef(spaceKey);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState(() => browserStorage.read(STORE.name, ''));
  const [showInvite, setShowInvite] = useState(() => browserStorage.read(STORE.invitePrompt, false));
  const { toast, show, hide } = useToast();

  const { space, items, status, pending, error } = state;
  const today = todayISO();
  const fmt = useMemo(() => createFormatters(space?.currency ?? 'USD'), [space?.currency]);
  const stats = useMemo(() => computeStats(items), [items]);
  const breakdown = useMemo(() => categoryBreakdown(items), [items]);
  const months = useMemo(() => monthOptions(items), [items]);
  const formCategories = useMemo(() => categoryOptions(items), [items]);
  const visible = useMemo(() => sortItems(filterItems(items, filters), filters.sort), [items, filters]);
  const subtotal = useMemo(() => computeStats(visible).total, [visible]);

  useEffect(() => {
    if (!error) return;
    show({ message: error, tone: 'error' });
    store.clearError();
  }, [error, show, store]);

  function dismissInvite() {
    browserStorage.remove(STORE.invitePrompt);
    setShowInvite(false);
  }

  function handleSubmit(values, { addAnother }) {
    const isNew = !values.id;
    store.saveItem({ ...values, id: values.id ?? newId(), added_by: values.added_by ?? (name || null) });
    show({ message: isNew ? `أُضيف «${values.name}» إلى الدفتر 🤍` : 'تم حفظ التعديلات ✓' });
    if (!addAnother) setEditing(null);
  }

  function handleDelete(item) {
    const removed = store.removeItem(item.id);
    if (!removed) return;
    show({
      message: `حُذف «${item.name}»`,
      action: { label: 'تراجع', run: () => store.saveItem(removed) },
    });
  }

  function handleMarkBought(item) {
    store.saveItem({ ...item, status: 'bought' });
    show({ message: `رائع! تم شراء «${item.name}» ✨` });
  }

  function handleSettings(patch, newName) {
    store.saveSpace(patch);
    browserStorage.write(STORE.name, newName);
    setName(newName);
    setSettingsOpen(false);
    show({ message: 'تم حفظ الإعدادات 🤍' });
  }

  if (status === 'missing') {
    return (
      <main className="welcome">
        <div className="welcome-card">
          <p className="welcome-mark" aria-hidden="true">🍂</p>
          <h1 className="empty-title">لم نعد نجد هذا الدفتر</h1>
          <p className="muted">ربما حُذف أو تغيّر رمزه. يمكنك إنشاء دفتر جديد أو الانضمام برمز آخر.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={onLeave}>العودة إلى البداية</button>
        </div>
      </main>
    );
  }

  const loading = status === 'loading' && !space;

  return (
    <div className="app">
      <Header
        title={space?.title ?? DEFAULT_TITLE}
        countdown={weddingCountdown(space?.wedding_date, today)}
        status={status}
        pending={pending}
        onAdd={() => setEditing('new')}
        onSettings={() => setSettingsOpen(true)}
      />

      <main className="content">
        {showInvite && (
          <section className="card invite-banner" aria-label="دعوة شريك الحياة">
            <button type="button" className="icon-btn invite-close" onClick={dismissInvite} aria-label="إخفاء الدعوة">
              <Icon name="close" size={18} />
            </button>
            <h2 className="card-title">دفتركما جاهز! 🎉</h2>
            <p className="muted">أرسل رابط الدعوة لشريك حياتك ليضيف المصاريف معك لحظة بلحظة.</p>
            <ShareInvite spaceKey={spaceKey} />
          </section>
        )}

        <StatCards stats={stats} fmt={fmt} />

        <div className="layout">
          <div className="layout-main">
            <Filters
              filters={filters}
              onChange={setFilters}
              counts={stats.counts}
              categories={breakdown.map(row => row.category)}
              months={months}
              fmt={fmt}
            />
            <ExpenseList
              allCount={items.length}
              items={visible}
              subtotal={subtotal}
              filtered={hasActiveFilters(filters)}
              loading={loading}
              fmt={fmt}
              today={today}
              onAdd={() => setEditing('new')}
              onClear={() => setFilters(current => ({ ...DEFAULT_FILTERS, sort: current.sort }))}
              onEdit={item => setEditing(item)}
              onDelete={handleDelete}
              onMarkBought={handleMarkBought}
            />
          </div>
          <aside className="layout-side">
            <CategoryBreakdown
              rows={breakdown}
              total={stats.total}
              fmt={fmt}
              active={filters.category}
              onPick={category => setFilters(current => ({ ...current, category }))}
            />
          </aside>
        </div>
      </main>

      <button type="button" className="fab" onClick={() => setEditing('new')} aria-label="إضافة بند جديد">
        <Icon name="plus" size={28} />
      </button>

      {editing && (
        <Modal title={editing === 'new' ? 'بند جديد' : 'تعديل البند'} onClose={() => setEditing(null)}>
          <ExpenseForm
            item={editing === 'new' ? null : editing}
            categories={formCategories}
            symbol={fmt.symbol}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {settingsOpen && (
        <Modal title="الإعدادات والمشاركة" onClose={() => setSettingsOpen(false)}>
          <SettingsPanel
            space={space}
            spaceKey={spaceKey}
            name={name}
            pending={pending}
            onSave={handleSettings}
            onLeave={onLeave}
          />
        </Modal>
      )}

      <Toast toast={toast} onHide={hide} />
    </div>
  );
}
