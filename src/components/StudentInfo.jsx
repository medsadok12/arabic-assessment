import { useState } from 'react';

export default function StudentInfo({ onStart }) {
  const [form, setForm] = useState({ name: '', age: '', email: '', type: '' });
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function handleStart() {
    const { name, age, email, type } = form;
    if (!name.trim() || !age || !email.trim() || !type) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (+age < 5 || +age > 60) {
      setError('العمر يجب أن يكون بين 5 و 60 سنة');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    setError('');
    onStart({ name: name.trim(), age: +age, email: email.trim(), type });
  }

  return (
    <div className="page-content">
      <h2 className="page-title">معلومات الطالب</h2>
      <p className="page-subtitle">أدخل بياناتك للبدء في التقييم</p>

      <div className="form-group">
        <label>اسم الطالب كاملاً *</label>
        <input
          type="text"
          placeholder="أدخل الاسم الكامل"
          value={form.name}
          onChange={set('name')}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>العمر *</label>
          <input
            type="number"
            placeholder="مثال: 12"
            min="5"
            max="60"
            value={form.age}
            onChange={set('age')}
          />
        </div>
        <div className="form-group">
          <label>البريد الإلكتروني *</label>
          <input
            type="email"
            placeholder="example@gmail.com"
            value={form.email}
            onChange={set('email')}
          />
        </div>
      </div>

      <div className="form-group">
        <label>نوع المتعلم *</label>
        <select value={form.type} onChange={set('type')}>
          <option value="">اختر نوع المتعلم</option>
          <option value="native">ناطق باللغة العربية</option>
          <option value="non-native">غير ناطق باللغة العربية</option>
        </select>
      </div>

      {error && <div className="error-msg">⚠️ {error}</div>}

      <button className="btn-primary" onClick={handleStart}>
        ابدأ رحلة التميز ←
      </button>

    </div>
  );
}
