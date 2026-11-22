'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { letterCatcherWordFrame } from '../lib/letter-catcher-word-frame';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const MARKER_WIDTH = 16;
const MARKER_HEIGHT = 26;
const SEGMENT_GAP = 6;

// The two contours of Noto Naskh Arabic's U+061F: one hook and one dot.
// Coloring the dot itself avoids adding a second dot below a complete glyph.
export function MissingLetterMark() {
  return (
    <svg
      role="img" aria-label="حرف ناقص" data-lc-missing-mark=""
      width={MARKER_WIDTH} height={MARKER_HEIGHT} viewBox="45 -8 340 650"
      style={{ display: 'inline-block', width: MARKER_WIDTH, height: MARKER_HEIGHT, flex: `0 0 ${MARKER_WIDTH}px`, overflow: 'visible' }}
    >
      <g transform="translate(0 562) scale(1 -1)">
        <path fill="#E8B84B" d="M239 98 201 122Q205 142 206.5 155.5Q208 169 208 176Q208 196 192 211Q185 219 170 229Q155 239 132 252Q55 293 55 363Q55 410 81.5 457.5Q108 505 151 533Q195 562 243 562Q316 562 359 516Q373 500 373 483Q373 454 343 428Q313 456 290 466Q267 476 232 476Q186 476 147 446Q108 416 91 366Q113 353 141 340Q169 327 196.5 312.5Q224 298 243 278Q273 247 273 208Q273 165 239 98Z" />
        <path fill="#EF4444" d="M217 -71Q192 -53 175 -41.5Q158 -30 138 -19Q144 -8 149.5 1.5Q155 11 159 21Q169 39 182 59Q202 47 217 38Q232 29 241 21Q258 6 258 0Q258 -11 217 -71Z" />
      </g>
    </svg>
  );
}

export default function LetterCatcherWordFrame({ word, compact = false, revealed = false, retryKey = 0 }) {
  const { before, after, text, hasMissing } = letterCatcherWordFrame(word);
  const rowRef = useRef(null);
  const [fontSize, setFontSize] = useState(null);
  const showMissing = hasMissing && !revealed;

  useIsoLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const context = document.createElement('canvas').getContext('2d');
    let active = true;
    const measure = () => {
      if (!active || !context || !row.clientWidth) return;
      const style = window.getComputedStyle(row);
      const base = parseFloat(style.fontSize);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.direction = 'rtl';
      const width = part => {
        const metrics = context.measureText(part);
        return Math.max(metrics.width, (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || 0));
      };
      const textWidth = showMissing ? width(before) + width(after) : width(text);
      const markerWidth = showMissing ? MARKER_WIDTH + SEGMENT_GAP * (Number(Boolean(before)) + Number(Boolean(after))) : 0;
      // The word may fit the row; the marker always retains its exact pixel size.
      const available = Math.max(1, row.clientWidth - 44 - markerWidth);
      const next = base * Math.min(1, available / Math.max(1, textWidth));
      setFontSize(previous => previous !== null && Math.abs(previous - next) < 0.1 ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(row);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    document.fonts?.addEventListener?.('loadingdone', measure);
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      document.fonts?.removeEventListener?.('loadingdone', measure);
    };
  }, [before, after, text, showMissing, compact]);

  return (
    <div ref={rowRef} data-lc-word-layout="whole" style={{
      width: '100%', minWidth: 0, minHeight: compact ? 76 : 92,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit', fontWeight: 700, fontSize: compact ? '2.1rem' : '2.7rem',
    }}>
      <span key={retryKey} data-lc-word-frame="" style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 'max-content', minWidth: 'min(210px, 100%)', maxWidth: '100%',
        minHeight: compact ? 64 : 80, boxSizing: 'border-box', padding: '0 20px',
        border: '2px solid #EDE5D8', borderRadius: 20, background: '#fff',
        boxShadow: '0 4px 12px rgba(26,43,74,0.06)', color: '#1A2B4A',
        overflow: 'visible', animation: retryKey ? 'lcWrongShake .45s cubic-bezier(.36,.07,.19,.97) both' : 'none',
      }}>
        <span dir="rtl" style={{
          display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center', gap: SEGMENT_GAP,
          direction: 'rtl', unicodeBidi: 'isolate', whiteSpace: 'pre', lineHeight: 1.8,
          letterSpacing: 'normal', wordSpacing: 'normal', fontFamily: 'inherit', fontWeight: 'inherit',
          fontSize: fontSize === null ? 'inherit' : fontSize,
        }}>
          {showMissing ? <>
            {before && <span dir="rtl" style={{ unicodeBidi: 'isolate' }}>{before}</span>}
            <MissingLetterMark />
            {after && <span dir="rtl" style={{ unicodeBidi: 'isolate' }}>{after}</span>}
          </> : <span dir="rtl">{text}</span>}
        </span>
      </span>
    </div>
  );
}
