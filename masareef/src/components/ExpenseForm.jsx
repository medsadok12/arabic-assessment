import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { DEFAULT_CATEGORIES, STATUSES, STATUS_ORDER, categoryIcon } from '../config.js';
import { isISODate, parseAmount, todayISO } from '../lib/format.js';

const MAX_PRICE = 100_000_000_000;

function initialValues(item) {
  if (item) {
    return { name: item.name, price: String(item.price), item_date: item.item_date, category: item.category, status: item.status };
  }
  return { name: '', price: '', item_date: todayISO(), category: DEFAULT_CATEGORIES[0].name, status: 'soon' };
}

export default function ExpenseForm({ item, categories, symbol, onSubmit, onCancel }) {
  const isEdit = Boolean(item);
  const [values, setValues] = useState(() => initialValues(item));
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [errors, setErrors] = useState({});
  const nameRef = useRef(null);

  const set = patch => setValues(current => ({ ...current, ...patch }));

  function submit(addAnother) {
    const name = values.name.trim();
    const price = parseAmount(values.price);
    const category = (customOpen ? customName : values.category).trim();
    const found = {};

    if (!name) found.name = 'اكتب اسم الغرض أو البيان 🌸';
    if (!Number.isFinite(price)) found.price = 'أدخل المبلغ بالأرقام، مثل 1500';
    else if (price >= MAX_PRICE) found.price = 'المبلغ كبير جداً، تأكد منه من فضلك';
    if (!isISODate(values.item_date)) found.item_date = 'اختر التاريخ من فضلك';
    if (!category) found.category = 'اختر تصنيفاً أو اكتب تصنيفاً جديداً';

    setErrors(found);
    if (Object.keys(found).length) return;

    onSubmit(
      { ...item, name, price: Math.round(price * 1000) / 1000, item_date: values.item_date, category, status: values.status },
      { addAnother },
    );

    if (addAnother) {
      setValues(current => ({ ...current, name: '', price: '', category }));
      setCustomOpen(false);
      setCustomName('');
      nameRef.current?.focus();
    }
  }

  return (
    <form
      className="expense-form"
      noValidate
      onSubmit={event => { event.preventDefault(); submit(false); }}
    >
      <label className="field">
        <span className="field-label">البيان / الغرض</span>
        <input
          ref={nameRef}
          data-autofocus
          type="text"
          value={values.name}
          maxLength={120}
          placeholder="مثال: حجز القاعة، طقم الذهب، غرفة النوم…"
          aria-invalid={Boolean(errors.name)}
          onChange={e => set({ name: e.target.value })}
        />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">السعر <small>(المتوقع أو الفعلي)</small></span>
          <span className="money-input">
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={values.price}
              placeholder="0"
              aria-invalid={Boolean(errors.price)}
              onChange={e => set({ price: e.target.value })}
            />
            <span className="money-symbol">{symbol}</span>
          </span>
          {errors.price && <span className="field-error">{errors.price}</span>}
        </label>

        <label className="field">
          <span className="field-label">التاريخ <small>(الاستحقاق أو الشراء)</small></span>
          <input
            type="date"
            value={values.item_date}
            aria-invalid={Boolean(errors.item_date)}
            onChange={e => set({ item_date: e.target.value })}
          />
          {errors.item_date && <span className="field-error">{errors.item_date}</span>}
        </label>
      </div>

      <fieldset className="field">
        <legend className="field-label">التصنيف</legend>
        <div className="chip-row chip-wrap">
          {categories.map(category => (
            <button
              key={category}
              type="button"
              className="chip"
              aria-pressed={!customOpen && values.category === category}
              onClick={() => { setCustomOpen(false); set({ category }); }}
            >
              <span aria-hidden="true">{categoryIcon(category)}</span> {category}
            </button>
          ))}
          <button type="button" className="chip chip-dashed" aria-pressed={customOpen} onClick={() => setCustomOpen(true)}>
            <Icon name="plus" size={14} /> تصنيف آخر
          </button>
        </div>
        {customOpen && (
          <input
            type="text"
            className="custom-category"
            value={customName}
            maxLength={40}
            placeholder="اسم التصنيف الجديد، مثال: شهر العسل"
            aria-label="اسم التصنيف الجديد"
            autoFocus
            onChange={e => setCustomName(e.target.value)}
          />
        )}
        {errors.category && <span className="field-error">{errors.category}</span>}
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">الحالة</legend>
        <div className="status-picker">
          {STATUS_ORDER.map(status => (
            <button
              key={status}
              type="button"
              className={`status-option status-option-${status}`}
              aria-pressed={values.status === status}
              onClick={() => set({ status })}
            >
              <span aria-hidden="true">{STATUSES[status].icon}</span>
              {STATUSES[status].label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          <Icon name="check" size={18} /> {isEdit ? 'حفظ التعديلات' : 'حفظ'}
        </button>
        {!isEdit && (
          <button type="button" className="btn btn-secondary" onClick={() => submit(true)}>
            حفظ وإضافة آخر
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
      </div>
    </form>
  );
}
