'use client';
import { useState, useEffect, useRef } from 'react';

/* ─── تعريف التخطيطات ─────────────────────────────────────────── */
const LAYOUTS = [
  { key: 'text-only',  label: 'نص فقط',   hasImg: false },
  { key: 'img-only',   label: 'صورة فقط', hasImg: true  },
  { key: 'img-top',    label: 'صورة↑نص',  hasImg: true  },
  { key: 'img-bottom', label: 'نص↑صورة',  hasImg: true  },
  { key: 'img-right',  label: 'صورة|نص',  hasImg: true  },
  { key: 'img-left',   label: 'نص|صورة',  hasImg: true  },
  { key: 'img-bg',     label: 'خلفية+نص', hasImg: true  },
];

const BLANK = { layout: 'text-only', imageUrl: '', fit: 'cover', text: '' };

/* ─── تحويل بيانات الصفحة → HTML للحفظ ────────────────────────── */
function pageToHtml({ layout, imageUrl, fit = 'cover', text = '' }) {
  const safeUrl = (imageUrl || '').replace(/'/g, '%27');
  const imgTag  = `<img src="${imageUrl}" style="width:100%;display:block;border-radius:10px;object-fit:${fit}" alt="">`;

  switch (layout) {
    case 'img-only':
      return `<div data-sp-layout="img-only" data-sp-img="${imageUrl}" style="display:flex;align-items:center;justify-content:center;min-height:120px"><img src="${imageUrl}" style="max-width:100%;max-height:380px;object-fit:${fit};border-radius:12px;display:block;margin:auto" alt=""></div>`;
    case 'img-top':
      return `<div data-sp-layout="img-top" data-sp-img="${imageUrl}"><img src="${imageUrl}" style="width:100%;max-height:46%;object-fit:${fit};border-radius:10px;margin-bottom:12px;display:block" alt=""><div class="sp-text">${text}</div></div>`;
    case 'img-bottom':
      return `<div data-sp-layout="img-bottom" data-sp-img="${imageUrl}"><div class="sp-text" style="margin-bottom:12px">${text}</div><img src="${imageUrl}" style="width:100%;max-height:46%;object-fit:${fit};border-radius:10px;display:block" alt=""></div>`;
    case 'img-right':
      return `<div data-sp-layout="img-right" data-sp-img="${imageUrl}" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;direction:rtl">${imgTag}<div class="sp-text">${text}</div></div>`;
    case 'img-left':
      return `<div data-sp-layout="img-left" data-sp-img="${imageUrl}" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;direction:rtl"><div class="sp-text">${text}</div>${imgTag}</div>`;
    case 'img-bg':
      return `<div data-sp-layout="img-bg" data-sp-img="${imageUrl}" style="position:relative;border-radius:12px;overflow:hidden;padding:20px 16px;min-height:160px"><div style="position:absolute;inset:0;background-image:url('${safeUrl}');background-size:cover;background-position:center;opacity:0.4;z-index:0"></div><div class="sp-text" style="position:relative;z-index:1">${text}</div></div>`;
    default: // text-only
      return `<div data-sp-layout="text-only">${text}</div>`;
  }
}

/* ─── تحليل HTML المحفوظ → بيانات الصفحة ──────────────────────── */
function htmlToPage(html) {
  if (typeof window === 'undefined' || !html?.trim()) {
    return { ...BLANK, text: html || '' };
  }
  const doc     = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const wrapper = doc.querySelector('[data-sp-layout]');
  if (!wrapper) return { ...BLANK, text: html };

  const layout   = wrapper.getAttribute('data-sp-layout') || 'text-only';
  const imageUrl = wrapper.getAttribute('data-sp-img') || '';
  const textDiv  = wrapper.querySelector('.sp-text');
  const text     = textDiv ? textDiv.innerHTML : '';
  const img      = wrapper.querySelector('img');
  const fit      = img?.style?.objectFit || 'cover';
  return { layout, imageUrl, fit, text };
}

/* ─── أيقونة مصغّرة للتخطيط (SVG) ─────────────────────────────── */
function LayoutSvg({ type }) {
  const s = { width: 34, height: 26 };
  const P = '#818cf8', T = '#6366f1', B = '#fffdf5';
  switch (type) {
    case 'text-only':
      return <svg {...s} viewBox="0 0 34 26"><rect x="3" y="5"  width="28" height="3" rx="1.5" fill={T}/><rect x="3" y="11" width="28" height="3" rx="1.5" fill={T}/><rect x="3" y="17" width="18" height="3" rx="1.5" fill={T}/></svg>;
    case 'img-only':
      return <svg {...s} viewBox="0 0 34 26"><rect x="2" y="2" width="30" height="22" rx="3" fill={P}/><circle cx="11" cy="11" r="3" fill="#fff"/><path d="M2 19l8-6 6 4 4-3 12 8H2Z" fill="#fff" opacity=".5"/></svg>;
    case 'img-top':
      return <svg {...s} viewBox="0 0 34 26"><rect x="2" y="2"  width="30" height="12" rx="2" fill={P}/><rect x="2" y="16" width="30" height="2.5" rx="1.2" fill={T}/><rect x="2" y="20.5" width="20" height="2.5" rx="1.2" fill={T}/></svg>;
    case 'img-bottom':
      return <svg {...s} viewBox="0 0 34 26"><rect x="2" y="2"  width="30" height="2.5" rx="1.2" fill={T}/><rect x="2" y="6.5" width="20" height="2.5" rx="1.2" fill={T}/><rect x="2" y="12" width="30" height="12" rx="2" fill={P}/></svg>;
    case 'img-right':
      return <svg {...s} viewBox="0 0 34 26"><rect x="18" y="2" width="14" height="22" rx="2" fill={P}/><rect x="2" y="6"  width="13" height="2" rx="1" fill={T}/><rect x="2" y="11" width="13" height="2" rx="1" fill={T}/><rect x="2" y="16" width="9"  height="2" rx="1" fill={T}/></svg>;
    case 'img-left':
      return <svg {...s} viewBox="0 0 34 26"><rect x="2"  y="2" width="14" height="22" rx="2" fill={P}/><rect x="18" y="6"  width="13" height="2" rx="1" fill={T}/><rect x="18" y="11" width="13" height="2" rx="1" fill={T}/><rect x="18" y="16" width="9"  height="2" rx="1" fill={T}/></svg>;
    case 'img-bg':
      return <svg {...s} viewBox="0 0 34 26"><rect x="2" y="2" width="30" height="22" rx="3" fill={P} opacity=".4"/><circle cx="10" cy="10" r="4" fill={P}/><rect x="8" y="15" width="18" height="2" rx="1" fill={T}/><rect x="10" y="19" width="14" height="2" rx="1" fill={T}/></svg>;
    default:
      return null;
  }
}

/* ══════════════════════════════════════════════════════════════════
   المكوّن الرئيسي
══════════════════════════════════════════════════════════════════ */
export default function StoryPageEditor({ value = '', onChange }) {
  const [pages,     setPages]     = useState([{ ...BLANK }]);
  const [sel,       setSel]       = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const textRef    = useRef(null);
  const fileRef    = useRef(null);

  /* ── تهيئة الصفحات من القيمة الأولية ── */
  useEffect(() => {
    const parts  = (value || '').split('<!-- PAGE -->').map(s => s.trim()).filter(Boolean);
    const parsed = parts.length ? parts.map(htmlToPage) : [{ ...BLANK }];
    setPages(parsed);
    setSel(0);
  }, []); // eslint-disable-line

  /* ── مزامنة محرر النص عند تغيير الصفحة ── */
  useEffect(() => {
    if (textRef.current) textRef.current.innerHTML = pages[sel]?.text || '';
  }, [sel]); // eslint-disable-line

  /* ── إرسال المحتوى المحدَّث للأب ── */
  function emit(newPages) {
    const content = newPages.map(pageToHtml).join('\n<!-- PAGE -->\n');
    onChange?.(content);
  }

  function patchPage(idx, patch) {
    setPages(prev => {
      const next = prev.map((p, i) => i === idx ? { ...p, ...patch } : p);
      emit(next);
      return next;
    });
  }

  function onTextInput() {
    if (!textRef.current) return;
    patchPage(sel, { text: textRef.current.innerHTML });
  }

  function applyFormat(cmd, val) {
    textRef.current?.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false, val ?? undefined);
    setTimeout(onTextInput, 10);
  }

  function changeLayout(newLayout) {
    patchPage(sel, { layout: newLayout });
    // إعادة النص للمحرر إذا كان التخطيط الجديد يدعم النص
    if (newLayout !== 'img-only' && textRef.current) {
      textRef.current.innerHTML = pages[sel]?.text || '';
    }
  }

  function addPage() {
    const blank = { ...BLANK };
    setPages(prev => {
      const next = [...prev, blank];
      emit(next);
      return next;
    });
    setSel(pages.length); // pages.length = الطول قبل الإضافة = index الصفحة الجديدة
  }

  function removePage(idx) {
    if (pages.length <= 1) return;
    setPages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      emit(next);
      return next;
    });
    setSel(s => Math.max(0, s > 0 ? s - 1 : 0));
  }

  function movePage(idx, dir) {
    const to = idx + dir;
    if (to < 0 || to >= pages.length) return;
    setPages(prev => {
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      emit(next);
      return next;
    });
    setSel(to);
  }

  async function uploadImage(file) {
    if (!file?.type?.startsWith('image/')) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/stories/upload-image', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.url) patchPage(sel, { imageUrl: json.url });
    } catch {}
    setUploading(false);
  }

  const cur     = pages[sel] || { ...BLANK };
  const curDef  = LAYOUTS.find(l => l.key === cur.layout) || LAYOUTS[0];
  const showImg = curDef.hasImg;
  const showTxt = cur.layout !== 'img-only';

  return (
    <>
      <style>{`
        .spe { direction:rtl; font-family:'Cairo','Tajawal',sans-serif; }

        /* ── شريط الصفحات ── */
        .spe-bar { display:flex; gap:8px; align-items:center; margin-bottom:16px; overflow-x:auto; padding-bottom:4px; }
        .spe-thumb {
          flex-shrink:0; width:54px; height:70px; border-radius:8px;
          border:2.5px solid #e2e8f0; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          flex-direction:column; gap:3px; background:#f8fafc;
          transition:.15s; position:relative; overflow:hidden;
        }
        .spe-thumb.on  { border-color:#6366f1; background:#eef2ff; }
        .spe-thumb:hover:not(.on) { border-color:#a5b4fc; }
        .spe-thumb-num {
          position:absolute; bottom:4px; left:50%; transform:translateX(-50%);
          font-size:.58rem; font-weight:900; background:#6366f1; color:#fff;
          border-radius:20px; padding:1px 5px; z-index:1; white-space:nowrap;
        }
        .spe-thumb.on .spe-thumb-num { background:#4f46e5; }
        .spe-add-btn {
          flex-shrink:0; width:50px; height:50px; border-radius:10px;
          border:2px dashed #cbd5e1; cursor:pointer; display:flex;
          align-items:center; justify-content:center; font-size:1.4rem;
          color:#94a3b8; background:transparent; font-family:inherit;
          transition:.15s;
        }
        .spe-add-btn:hover { border-color:#6366f1; color:#6366f1; background:#eef2ff; }

        /* ── اختيار التخطيط ── */
        .spe-layouts { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px; }
        .spe-lbtn {
          display:flex; flex-direction:column; align-items:center; gap:5px;
          padding:8px 10px; border-radius:12px; border:2px solid #e2e8f0;
          cursor:pointer; background:#fff; font-family:'Cairo','Tajawal',sans-serif;
          transition:.14s; min-width:64px;
        }
        .spe-lbtn.on { border-color:#6366f1; background:#eef2ff; }
        .spe-lbtn:hover:not(.on) { border-color:#a5b4fc; background:#f8faff; }
        .spe-lbtn span { font-size:.65rem; color:#475569; font-weight:700; white-space:nowrap; }
        .spe-lbtn.on span { color:#4f46e5; }

        /* ── شبكة المحرر ── */
        .spe-grid { display:grid; gap:16px; margin-bottom:16px; }
        .spe-grid.two { grid-template-columns:1fr 1fr; }
        .spe-grid.one { grid-template-columns:1fr; }
        @media (max-width:680px) { .spe-grid.two { grid-template-columns:1fr; } }

        /* ── منطقة الصورة ── */
        .spe-drop {
          border:2.5px dashed #cbd5e1; border-radius:14px; overflow:hidden;
          display:flex; align-items:center; justify-content:center;
          flex-direction:column; gap:8px; cursor:pointer; transition:.2s;
          position:relative; min-height:150px; background:#f8fafc;
        }
        .spe-drop.drag { border-color:#6366f1; background:#eef2ff; }
        .spe-drop:hover { border-color:#818cf8; }
        .spe-drop-img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; border-radius:11px; }
        .spe-drop-overlay {
          position:absolute; inset:0; background:rgba(0,0,0,.45); border-radius:11px;
          display:flex; align-items:center; justify-content:center; flex-direction:column; gap:5px;
          opacity:0; transition:.2s;
        }
        .spe-drop:hover .spe-drop-overlay { opacity:1; }
        .spe-drop-overlay span { color:#fff; font-size:.8rem; font-weight:700; font-family:'Cairo','Tajawal',sans-serif; }

        /* ── محرر النص ── */
        .spe-fmtbar { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; }
        .spe-fbtn {
          border:1.5px solid #e2e8f0; border-radius:7px; padding:5px 10px;
          font-size:.75rem; font-weight:700; cursor:pointer;
          background:#fff; color:#374151; font-family:'Cairo','Tajawal',sans-serif;
          transition:.12s; line-height:1;
        }
        .spe-fbtn:hover { border-color:#818cf8; color:#4f46e5; background:#eef2ff; }
        .spe-txt {
          border:1.5px solid #e2e8f0; border-radius:12px; min-height:130px;
          max-height:260px; overflow-y:auto; padding:12px 14px; outline:none;
          font-family:'Cairo','Tajawal',sans-serif; font-size:1rem;
          line-height:1.9; color:#1e293b; direction:rtl; text-align:right;
        }
        .spe-txt:focus { border-color:#818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.14); }
        .spe-txt:empty::before { content:attr(data-ph); color:#94a3b8; pointer-events:none; }

        /* ── معاينة ── */
        .spe-preview {
          border:1.5px solid #e2e8f0; border-radius:14px; padding:18px;
          background:#fffdf5; min-height:60px;
          font-family:'Cairo','Tajawal',sans-serif; font-size:.92rem;
          line-height:1.85; color:#2d1f0e; direction:rtl;
        }
        .spe-preview img { max-width:100%; border-radius:8px; }
        .spe-preview .sp-text { margin:0; }

        /* ── label صغير ── */
        .spe-lbl { font-size:.8rem; font-weight:800; color:#374151; margin-bottom:8px; display:block; }

        /* ── أزرار أسفل ── */
        .spe-controls { display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; align-items:center; }
        .spe-cbtn {
          border:1.5px solid #e2e8f0; border-radius:8px; padding:6px 13px;
          font-size:.78rem; font-weight:700; cursor:pointer; background:#fff;
          color:#475569; font-family:inherit; transition:.12s;
        }
        .spe-cbtn:hover { border-color:#a5b4fc; color:#4f46e5; }
        .spe-cbtn:disabled { opacity:.38; cursor:not-allowed; }
        .spe-cbtn.del { color:#dc2626; border-color:#fecaca; background:#fff5f5; }
        .spe-cbtn.del:hover { background:#fee2e2; }

        /* ── select ── */
        .spe-sel {
          border:1.5px solid #e2e8f0; border-radius:8px; padding:5px 10px;
          font-family:'Cairo','Tajawal',sans-serif; font-size:.8rem;
          color:#374151; outline:none; cursor:pointer; background:#fff;
        }
      `}</style>

      <div className="spe">

        {/* ══ شريط الصفحات ══ */}
        <div className="spe-bar">
          <span style={{ fontSize:'.75rem', fontWeight:800, color:'#64748b', flexShrink:0 }}>الصفحات:</span>
          {pages.map((p, i) => (
            <div key={i} className={`spe-thumb${sel === i ? ' on' : ''}`} onClick={() => setSel(i)} title={`صفحة ${i + 1}`}>
              {p.imageUrl
                ? <img src={p.imageUrl} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', borderRadius:6, opacity:.75 }} alt="" />
                : <LayoutSvg type={p.layout} />
              }
              <span className="spe-thumb-num">{i + 1}</span>
            </div>
          ))}
          <button className="spe-add-btn" onClick={addPage} title="إضافة صفحة جديدة">＋</button>
        </div>

        {/* ══ اختيار تخطيط الصفحة ══ */}
        <span className="spe-lbl">تخطيط الصفحة {sel + 1}:</span>
        <div className="spe-layouts">
          {LAYOUTS.map(l => (
            <button key={l.key} className={`spe-lbtn${cur.layout === l.key ? ' on' : ''}`}
              onClick={() => changeLayout(l.key)} title={l.label}>
              <LayoutSvg type={l.key} />
              <span>{l.label}</span>
            </button>
          ))}
        </div>

        {/* ══ المحرر: صورة + نص ══ */}
        <div className={`spe-grid ${showImg && showTxt ? 'two' : 'one'}`}>

          {/* ── منطقة الصورة ── */}
          {showImg && (
            <div>
              <span className="spe-lbl">الصورة</span>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />

              <div
                className={`spe-drop${dragOver ? ' drag' : ''}`}
                style={{ minHeight: cur.imageUrl ? 180 : 150 }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadImage(f); }}
              >
                {cur.imageUrl ? (
                  <>
                    <img src={cur.imageUrl} className="spe-drop-img" alt="صورة الصفحة" />
                    <div className="spe-drop-overlay">
                      <span>📷 انقر أو اسحب لاستبدال الصورة</span>
                    </div>
                  </>
                ) : uploading ? (
                  <><span style={{ fontSize:'1.6rem' }}>⏳</span><span style={{ fontSize:'.8rem', color:'#64748b', fontWeight:700 }}>جارٍ الرفع...</span></>
                ) : (
                  <>
                    <span style={{ fontSize:'2rem' }}>📷</span>
                    <span style={{ fontSize:'.82rem', color:'#64748b', fontWeight:700 }}>اسحب صورة هنا أو انقر للاختيار</span>
                    <span style={{ fontSize:'.68rem', color:'#94a3b8' }}>JPG · PNG · WEBP</span>
                  </>
                )}
              </div>

              {cur.imageUrl && (
                <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <label className="spe-lbl" style={{ margin:0 }}>ملاءمة:</label>
                  <select className="spe-sel" value={cur.fit}
                    onChange={e => patchPage(sel, { fit: e.target.value })}>
                    <option value="cover">تغطية كاملة</option>
                    <option value="contain">احتواء</option>
                    <option value="fill">تمديد</option>
                  </select>
                  <button className="spe-cbtn del" style={{ padding:'4px 10px' }}
                    onClick={() => patchPage(sel, { imageUrl: '' })}>
                    🗑 إزالة الصورة
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── محرر النص ── */}
          {showTxt && (
            <div>
              <span className="spe-lbl">النص</span>

              {/* شريط التنسيق */}
              <div className="spe-fmtbar">
                <button className="spe-fbtn" onClick={() => applyFormat('bold')}><strong>ع</strong></button>
                <button className="spe-fbtn" onClick={() => applyFormat('italic')}><em style={{ fontStyle:'italic' }}>ع</em></button>
                <button className="spe-fbtn" onClick={() => applyFormat('underline')}><span style={{ textDecoration:'underline' }}>ع</span></button>
                <button className="spe-fbtn" style={{ fontSize:'.65rem' }} onClick={() => applyFormat('fontSize', '6')}>ك+</button>
                <button className="spe-fbtn" style={{ fontSize:'.65rem' }} onClick={() => applyFormat('fontSize', '4')}>ك</button>
                <button className="spe-fbtn" style={{ fontSize:'.65rem' }} onClick={() => applyFormat('fontSize', '2')}>ص</button>
                <button className="spe-fbtn" onClick={() => applyFormat('foreColor', '#b45309')} title="لون بني">🟤</button>
                <button className="spe-fbtn" onClick={() => applyFormat('foreColor', '#1d4ed8')} title="لون أزرق">🔵</button>
                <button className="spe-fbtn" onClick={() => applyFormat('foreColor', '#065f46')} title="لون أخضر">🟢</button>
                <button className="spe-fbtn" onClick={() => applyFormat('foreColor', '#dc2626')} title="لون أحمر">🔴</button>
                <button className="spe-fbtn" onClick={() => applyFormat('foreColor', '#1e293b')} title="لون أسود">⚫</button>
                <button className="spe-fbtn" title="مسح التنسيق" onClick={() => applyFormat('removeFormat')}>✕تنسيق</button>
              </div>

              <div
                ref={textRef}
                className="spe-txt"
                contentEditable
                suppressContentEditableWarning
                data-ph="اكتب نص الصفحة هنا..."
                dir="rtl"
                onInput={onTextInput}
              />
            </div>
          )}
        </div>

        {/* ══ معاينة مباشرة ══ */}
        <div style={{ marginTop: 4 }}>
          <span className="spe-lbl">معاينة الصفحة {sel + 1}:</span>
          <div className="spe-preview" dangerouslySetInnerHTML={{ __html: pageToHtml(cur) }} />
        </div>

        {/* ══ تحكم في الصفحة ══ */}
        <div className="spe-controls">
          <button className="spe-cbtn" onClick={() => movePage(sel, -1)} disabled={sel === 0}>↑ تقديم</button>
          <button className="spe-cbtn" onClick={() => movePage(sel, 1)}  disabled={sel === pages.length - 1}>↓ تأخير</button>
          <span style={{ flex:1 }} />
          <span style={{ fontSize:'.75rem', color:'#94a3b8', fontWeight:600 }}>
            {pages.length} {pages.length === 1 ? 'صفحة' : 'صفحات'}
          </span>
          <button
            className="spe-cbtn del"
            disabled={pages.length <= 1}
            onClick={() => { if (confirm(`هل تريد حذف الصفحة ${sel + 1}؟`)) removePage(sel); }}
          >
            🗑 حذف الصفحة
          </button>
        </div>

      </div>
    </>
  );
}
