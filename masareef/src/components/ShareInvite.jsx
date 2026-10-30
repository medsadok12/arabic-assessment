import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { formatKey, inviteLink } from '../lib/spaceKey.js';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export default function ShareInvite({ spaceKey }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const link = inviteLink(spaceKey);
  const message = `دعوة للانضمام إلى دفتر مصاريف تحضيرات زواجنا 💍\nافتح الرابط وسنسجّل المصاريف معاً:\n${link}`;
  const canShare = typeof navigator.share === 'function';

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    if (await copyText(link)) {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2200);
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'مصاريف', text: message });
    } catch { /* أغلق المستخدم نافذة المشاركة */ }
  }

  return (
    <div className="share">
      <div className="share-code">
        <span className="share-code-label">رمز الدفتر</span>
        <code dir="ltr">{formatKey(spaceKey)}</code>
      </div>
      <div className="share-actions">
        <button type="button" className="btn btn-secondary" onClick={copy}>
          <Icon name={copied ? 'check' : 'copy'} size={18} />
          {copied ? 'تم نسخ الرابط' : 'نسخ رابط الدعوة'}
        </button>
        <a
          className="btn btn-whatsapp"
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="message" size={18} />
          إرسال عبر واتساب
        </a>
        {canShare && (
          <button type="button" className="btn btn-ghost" onClick={share}>
            <Icon name="share" size={18} />
            مشاركة
          </button>
        )}
      </div>
    </div>
  );
}
