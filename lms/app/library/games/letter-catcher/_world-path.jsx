'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SceneThumb } from '../../../../components/GameScene';
import LetterCatcherPlayerAvatar from '../../../../components/LetterCatcherPlayerAvatar';
import { isLcCategoryUnlocked, lcCategoryKey, lcCategoryScene } from '../../../../lib/letter-catcher-categories';
import { displayNumber } from '../../../../lib/display-number';
import { lcStagesForCategory, lcStageDone } from '../../../../lib/letter-catcher-stages';
import styles from './_world-path.module.css';

const pointsFormatter = new Intl.NumberFormat('en-US', { numberingSystem: 'latn', maximumFractionDigits: 0 });
export const LC_ANIMALS_SCENE = '/media/letter-catcher-worlds/animals-savanna-v1.webp';
const countValue = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const wordLabel = count => count >= 3 && count <= 10 ? 'كلمات' : 'كلمة';
const masteryValue = result => {
  const total = countValue(result?.total);
  if (!result || !total) return 0;
  const percent = Math.round(countValue(result.correct) / total * 100);
  return percent >= 80 ? 3 : percent >= 50 ? 2 : 1;
};

function Star({ filled = true, className }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? '.5' : '1.7'} aria-hidden="true"><path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" /></svg>;
}

function Mastery({ result }) {
  const stars = masteryValue(result);
  return <span className={styles.mastery} role="img" aria-label={stars ? `${displayNumber(stars)} من 3 نجوم` : 'لم تبدأ هذا العالم بعد'}>
    {[0, 1, 2].map(index => <Star key={index} filled={index < stars} className={index < stars ? styles.earnedStar : styles.emptyStar} />)}
  </span>;
}

function ResultCounts({ result }) {
  if (!result) return null;
  return <>
    <span className={styles.correctCount} aria-label={`${displayNumber(countValue(result.correct))} إجابات صحيحة`}><span aria-hidden="true">✓</span><bdi>{displayNumber(countValue(result.correct))}</bdi></span>
    <span className={styles.retryCount} aria-label={`${displayNumber(countValue(result.wrong))} إجابات تحتاج إلى تدريب`}><span aria-hidden="true">×</span><bdi>{displayNumber(countValue(result.wrong))}</bdi></span>
  </>;
}

function FriendlyLock() {
  return <span className={styles.lock} aria-hidden="true"><svg width="58" height="65" viewBox="0 0 58 65" fill="none"><path d="M15 28V18a14 14 0 0 1 28 0v10" stroke="#FFFDF7" strokeWidth="10" strokeLinecap="round" /><path d="M15 28V18a14 14 0 0 1 28 0v10" stroke="#7B8B94" strokeWidth="5" strokeLinecap="round" /><rect x="5" y="25" width="48" height="36" rx="10" fill="#E8B84B" stroke="#FFFDF7" strokeWidth="3" /><circle cx="29" cy="40" r="4" fill="#1A2B4A" /><path d="M29 42v8" stroke="#1A2B4A" strokeWidth="5" strokeLinecap="round" /></svg></span>;
}

function Friends({ currentPlayer }) {
  return <span className={styles.friends} aria-hidden="true">
    <span className={styles.selfPortrait} data-lc-entry-self=""><LetterCatcherPlayerAvatar player={currentPlayer} size={48} /></span>
    <span className={styles.friendPortrait}><LetterCatcherPlayerAvatar size={48} /><span className={styles.inviteBadge}>+</span></span>
  </span>;
}

const WorldIsland = memo(function WorldIsland({ category, count, result, imageUrl, emoji, unlocked, previousCategory, first, onSelect, stages = [] , progress = {} }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUrl]);
  const showImage = Boolean(imageUrl) && !imageFailed;
  const wholeScene = lcCategoryKey(category) === 'animals' && imageUrl === LC_ANIMALS_SCENE;
  return <button type="button" className={`${styles.island} ${unlocked ? styles.openIsland : styles.lockedIsland}`} data-lc-world-island={category} data-unlocked={unlocked} aria-disabled={!unlocked}
    aria-label={unlocked ? `${displayNumber(category)}، ${displayNumber(count)} ${wordLabel(count)}${result ? `، ${displayNumber(countValue(result.correct))} إجابات صحيحة، ${displayNumber(countValue(result.wrong))} تحتاج إلى تدريب${masteryValue(result) ? `، ${displayNumber(masteryValue(result))} من 3 نجوم` : ''}` : ''}` : `${displayNumber(category)}، أكمل ${displayNumber(previousCategory || 'المجموعة السابقة')} أولًا`}
    onClick={() => { if (unlocked) onSelect?.(category); }}>
    {first && <span className={styles.startBadge}>ابدأ هنا</span>}
    <span className={styles.land} aria-hidden="true">
      <span className={styles.worldWindow}>
        <SceneThumb category={category} scene={lcCategoryScene(category)} />
        {showImage ? <img className={`${styles.worldImage} ${wholeScene ? styles.worldSceneImage : ''}`} data-lc-world-scene={wholeScene ? 'animals' : undefined} src={imageUrl} alt="" width="340" height="200" loading={first ? 'eager' : 'lazy'} decoding="async" onError={() => setImageFailed(true)} /> : <span className={styles.worldEmoji}>{emoji || '🌟'}</span>}
        {!unlocked && <FriendlyLock />}
      </span>
      <span className={styles.soil} />
      <span className={`${styles.shrub} ${styles.shrubLeft}`} /><span className={`${styles.shrub} ${styles.shrubRight}`} />
    </span>
    <span className={styles.namePlate}>
      <span className={styles.categoryName}>{displayNumber(category)}</span>
      <span className={styles.stageNote}><bdi dir="ltr">{displayNumber(stages.filter(stage => lcStageDone(stage, progress)).length)} / {displayNumber(stages.length)}</bdi> مراحل</span>
      {unlocked ? <Mastery result={result} /> : <span className={styles.lockNote}>أكمل المجموعة السابقة</span>}
      <span className={styles.worldStats}><span className={styles.wordCount}><bdi>{displayNumber(count)}</bdi> {wordLabel(count)}</span><ResultCounts result={result} /></span>
    </span>
  </button>;
});

function Trail({ count }) {
  const path = useMemo(() => {
    if (!count) return '';
    let value = 'M 650 180';
    for (let index = 1; index < count; index += 1) {
      const previousY = 180 + (index - 1) * 290;
      const nextY = 180 + index * 290;
      const x = index % 2 ? 350 : 650;
      const bend = index % 2 ? 90 : 910;
      value += ` C ${bend} ${previousY + 20}, ${bend} ${nextY - 20}, ${x} ${nextY}`;
    }
    return value;
  }, [count]);
  return <svg className={styles.trail} viewBox={`0 0 1000 ${Math.max(1, count) * 290}`} preserveAspectRatio="none" aria-hidden="true">
    <path d={path} fill="none" stroke="#9DAD6E" strokeOpacity=".16" strokeWidth="36" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    <path d={path} fill="none" stroke="#F9EDC6" strokeWidth="28" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg>;
}

export default function LetterCatcherWorldPath({ categories = [], gameWords = [], catMeta = {}, categoryIcons = {}, catResults = {}, isTeacher = false, totalPoints = 0, duelSettings = {}, currentPlayer = null, onCategorySelect, onDuel, onSettings, stageSize = 5, progress = {}, unlockedCategories = null }) {
  const hasWords = gameWords.length > 0;
  const counts = useMemo(() => {
    const result = new Map();
    for (const row of gameWords) result.set(row.category, (result.get(row.category) || 0) + 1);
    return result;
  }, [gameWords]);
  const points = displayNumber(pointsFormatter.format(countValue(totalPoints)));

  return <div className={`${styles.root} game-font`} data-lc-world-path="" dir="rtl">
    <header className={styles.header}>
      <Link className={styles.back} href="/library" aria-label="العودة إلى المكتبة"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
      <h1 className={styles.title}>صيّاد الحروف</h1>
      <span className={styles.balance} aria-label={`رصيدك ${points} نجمة`}><Star /><bdi>{points}</bdi></span>
    </header>

    {isTeacher && <div className={styles.teacherTools}><button type="button" className={styles.settings} onClick={() => onSettings?.()}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 3-1 3-3 1-2 4 2 3 1 3 4 2 3-2 3-1 2-4-2-3-1-3-4-2Z" /><circle cx="11" cy="11" r="3" /></svg>الإعدادات</button></div>}

    {duelSettings.enabled && <button type="button" className={styles.duel} onClick={() => onDuel?.()} data-lc-duel-entry="" aria-label={displayNumber([duelSettings.title || 'تحدي صديق', duelSettings.subtitle].filter(Boolean).join('، '))}>
      <Friends currentPlayer={currentPlayer} /><span className={styles.duelCopy}><strong>{displayNumber(duelSettings.title || 'تحدي صديق')}</strong></span><svg className={styles.duelArrow} width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7" /></svg>
    </button>}

    {hasWords && categories.length ? <>
      <div className={styles.intro}><h2>اختر عالمك</h2></div>
      <ol className={styles.journey} aria-label="مسار العوالم">
        <Trail count={categories.length} />
        {categories.map((category, index) => {
          const metadata = catMeta[category] || {};
          const unlocked = isTeacher || (Array.isArray(unlockedCategories) ? unlockedCategories.includes(category) : isLcCategoryUnlocked(category, catResults, categories));
          return <li key={category} className={`${styles.worldRow} ${index % 2 ? styles.leftWorld : styles.rightWorld}`}>
            {index === 0 && <img className={styles.fahim} src="/faheem-sm.webp" alt="فهيم يرحّب بك في مسار العوالم" width="240" height="306" decoding="async" />}
            <WorldIsland category={category} count={counts.get(category) || 0} result={catResults[category]} imageUrl={metadata.image_url} emoji={metadata.emoji || categoryIcons[category]?.emoji} unlocked={unlocked} previousCategory={categories[index - 1]} first={index === 0} onSelect={onCategorySelect} stages={lcStagesForCategory(gameWords, category, stageSize)} progress={progress} />
          </li>;
        })}
      </ol>
    </> : <section className={styles.empty} aria-label="عوالم الكلمات"><img src="/faheem-sm.webp" alt="فهيم" width="240" height="306" decoding="async" /><h2>{isTeacher ? 'لنجهّز عوالم الكلمات!' : 'عوالمك تستعدّ لك!'}</h2><p>{isTeacher ? 'أضف الكلمات من الإعدادات، ثم نبدأ المغامرة.' : 'سيجهّز معلمك الكلمات لنبدأ اللعب معًا.'}</p>{isTeacher && <button type="button" className={styles.addWords} onClick={() => onSettings?.()}>إضافة كلمات</button>}</section>}

  </div>;
}
