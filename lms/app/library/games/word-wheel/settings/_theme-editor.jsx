'use client';
import { useEffect, useState } from 'react';
import WheelSVG from '../../../../../components/WordWheelSVG';
import {
  THEME_PRESETS, THEME_LABELS, DEFAULT_THEME_PRESET, isHexColor, resolveTheme,
} from '../../../../../lib/word-wheel';

/* ════════════════════════════════════════════════════════════════
   محرر ألوان العجلة: ثيمات جاهزة بنقرة، أو لون Hex مخصّص لكل عنصر
   (الخلفية، الحرف الإلزامي، الحروف الخارجية، الأزرار) مع معاينة حيّة.
   value = { preset, colors } — نفس صيغة sanitizeThemeSpec.
════════════════════════════════════════════════════════════════ */

const COLOR_GROUPS = [
  { title: '🌈 الخلفية',              keys: ['bg1', 'bg2'] },
  { title: '👑 الحرف الإلزامي (الأوسط)', keys: ['center_bg', 'center_text'] },
  { title: '⭕ الحروف الخارجية',       keys: ['outer_bg', 'outer_text'] },
  { title: '🔘 الأزرار',               keys: ['button_bg', 'button_text'] },
];
const SAMPLE = { center: 'م', letters: ['ك', 'ت', 'ب', 'ر', 'س', 'ن'] };

function HexInput({ value, onCommit }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  const ok = isHexColor(text);
  return (
    <input className={`wa-hex${ok ? '' : ' bad'}`} value={text} maxLength={7} spellCheck={false} aria-label="رمز اللون Hex"
      onChange={e => {
        const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
        setText(v);
        if (isHexColor(v)) onCommit(v.toUpperCase());
      }}
      onBlur={() => { if (!ok) setText(value); }} />
  );
}

export function ThemePreview({ spec, compact = false }) {
  const t = resolveTheme(spec);
  return (
    <div className="wa-preview-box" style={{ background: `linear-gradient(150deg,${t.bg1},${t.bg2})` }}>
      <div style={{ width: '100%', maxWidth: compact ? 200 : 260 }}>
        <WheelSVG letters={SAMPLE.letters} center={SAMPLE.center} selectedLetters={['ك']} theme={t} />
      </div>
      <button type="button" className="wa-sample-btn" tabIndex={-1}
        style={{ background: t.button_bg, color: t.button_text, boxShadow: `0 4px 0 ${t.button_dark}` }}>
        ✓ تأكيد
      </button>
    </div>
  );
}

export default function ThemeEditor({ value, onChange }) {
  const spec = value || { preset: DEFAULT_THEME_PRESET, colors: {} };
  const t = resolveTheme(spec);
  const base = THEME_PRESETS[spec.preset] || THEME_PRESETS[DEFAULT_THEME_PRESET];
  const custom = Object.keys(spec.colors || {}).length;

  const setColor = (k, v) => {
    const colors = { ...(spec.colors || {}) };
    if (v.toUpperCase() === base[k].toUpperCase()) delete colors[k];
    else colors[k] = v.toUpperCase();
    onChange({ preset: spec.preset, colors });
  };
  const resetColor = (k) => {
    const colors = { ...(spec.colors || {}) };
    delete colors[k];
    onChange({ preset: spec.preset, colors });
  };

  return (
    <div className="wa-editor">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <div className="wa-section">
          <h4>🎨 ثيمات جاهزة <small>نقرة واحدة تغيّر كل الألوان</small></h4>
          <div className="wa-presets">
            {Object.entries(THEME_PRESETS).map(([id, p]) => (
              <button key={id} type="button" className={`wa-preset${spec.preset === id ? ' on' : ''}`}
                style={{ background: `linear-gradient(150deg,${p.bg1},${p.bg2})` }}
                onClick={() => onChange({ preset: id, colors: {} })} aria-pressed={spec.preset === id}>
                <span className="wa-preset-dots">
                  <i style={{ background: p.center_bg, width: 30, height: 30 }} />
                  <i style={{ background: p.outer_bg }} />
                  <i style={{ background: p.button_bg }} />
                </span>
                {p.label}{spec.preset === id && custom ? ' ✎' : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="wa-section">
          <h4>🖌️ ألوان مخصّصة <small>اختر من اللوحة أو اكتب رمز Hex مثل #7C5CD9</small></h4>
          {COLOR_GROUPS.map(g => (
            <div key={g.title} className="wa-field">
              <span className="wa-label">{g.title}</span>
              <div className="wa-colors">
                {g.keys.map(k => (
                  <div key={k} className="wa-color">
                    <input type="color" value={t[k].length === 4 ? `#${[...t[k].slice(1)].map(c => c + c).join('')}` : t[k]}
                      onChange={e => setColor(k, e.target.value)} aria-label={THEME_LABELS[k]} />
                    <div className="wa-color-text">
                      <b>{THEME_LABELS[k]}</b>
                      <HexInput value={t[k]} onCommit={(v) => setColor(k, v)} />
                    </div>
                    {spec.colors?.[k] && (
                      <button type="button" className="wa-icon-btn" onClick={() => resetColor(k)} title="لون الثيم الأصلي">↺</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wa-preview">
        <span className="wa-label">👀 معاينة حيّة</span>
        <ThemePreview spec={spec} />
      </div>
    </div>
  );
}
