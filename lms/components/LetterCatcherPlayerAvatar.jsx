'use client';

import React, { useState } from 'react';
import { displayNumber } from '../lib/display-number';
import styles from './LetterCatcherPlayerAvatar.module.css';

function AvatarImage({ url }) {
  const [failed, setFailed] = useState(false);
  return url && !failed
    ? <img className={styles.photo} src={url} width="128" height="128" alt="" decoding="async" draggable="false" onError={() => setFailed(true)} />
    : <svg className={styles.fallback} data-lc-avatar-fallback="" width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="24" r="10" fill="#A7B5C2" /><path d="M13 56c0-12 8-20 19-20s19 8 19 20" fill="#A7B5C2" /></svg>;
}

/** A photo belongs only to this account; a failed URL never supplies another account's image. */
export default function LetterCatcherPlayerAvatar({ player, size, className = '', decorative = true, label }) {
  const id = player?.id == null ? '' : String(player.id);
  const url = typeof player?.avatar_url === 'string' ? player.avatar_url.trim() : '';
  const pixels = Number(size);
  const imageKey = `${id}\u0000${url}`;
  return <span className={`${styles.avatar} ${className}`} style={Number.isFinite(pixels) && pixels > 0 ? { '--lc-player-avatar-size': `${pixels}px` } : undefined}
    data-lc-player-avatar="" data-player-id={id || undefined} aria-hidden={decorative || undefined} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : label || `صورة ${displayNumber(player?.name || 'اللاعب')}`}>
    <AvatarImage key={imageKey} url={url} />
  </span>;
}
