'use client';
import { DISCOVER_BACKGROUNDS, DISCOVER_SUCCESSES, normalizeDiscoverSound } from '../../../lib/discover-objects-sounds';

export default function SoundPanel({ value, onChange, onPreview, onStop, MediaField, onPlay }) {
  const sounds = normalizeDiscoverSound(value) || normalizeDiscoverSound();
  const patch = fields => onChange({ ...sounds, ...fields });
  return <details className="de-panel" open>
    <summary>الأصوات والموسيقى — تحكم كامل</summary>
    <p>٨ ألحان خلفية و٨ ألحان نجاح، أو ارفع ملفاتك الخاصة. تتوقف الخلفية أثناء نطق الكلمة والدليل والنجاح حتى تُسمع بوضوح. تبدأ الموسيقى بعد أول تفاعل للطالب.</p>
    <div className="de-grid">
      <div>
        <label htmlFor="de-sound-background">موسيقى خلفية التدريب</label><select id="de-sound-background" value={sounds.background} onChange={e => patch({ background: e.target.value })}>
          <option value="off">دون موسيقى خلفية</option>
          {DISCOVER_BACKGROUNDS.map(t => <option key={t.id} value={t.id}>{t.name} — {t.mood}</option>)}
          <option value="custom">ملفي الموسيقي الخاص</option>
        </select>
        <div className="de-actions"><button type="button" disabled={sounds.background === 'off' || (sounds.background === 'custom' && !sounds.backgroundUrl)} onClick={() => onPreview('background', sounds)}>استمع إلى موسيقى الخلفية</button><button type="button" onClick={onStop}>إيقاف المعاينة</button></div>
        {sounds.background === 'custom' && <MediaField label="ملف موسيقى الخلفية (يتكرر أثناء اللعب)" value={sounds.backgroundUrl} onChange={url => patch({ backgroundUrl: url })} kind="audio" onPlay={onPlay} onStopAudio={onStop} />}
        <label>مستوى موسيقى الخلفية: {Math.round(sounds.backgroundVolume * 100)}%<input type="range" dir="ltr" min="0" max="100" value={Math.round(sounds.backgroundVolume * 100)} onChange={e => patch({ backgroundVolume: Number(e.target.value) / 100 })} /></label>
      </div>
      <div>
        <label htmlFor="de-sound-success">موسيقى النجاح عند اكتشاف الكلمة</label><select id="de-sound-success" value={sounds.success} onChange={e => patch({ success: e.target.value })}>
          <option value="off">دون موسيقى نجاح</option>
          {DISCOVER_SUCCESSES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          <option value="custom">ملف نجاح خاص بي</option>
        </select>
        <div className="de-actions"><button type="button" disabled={sounds.success === 'off' || (sounds.success === 'custom' && !sounds.successUrl)} onClick={() => onPreview('success', sounds)}>استمع إلى لحن النجاح</button><button type="button" onClick={onStop}>إيقاف المعاينة</button></div>
        {sounds.success === 'custom' && <MediaField label="ملف موسيقى النجاح" value={sounds.successUrl} onChange={url => patch({ successUrl: url })} kind="audio" onPlay={onPlay} onStopAudio={onStop} />}
        <label>مستوى موسيقى النجاح: {Math.round(sounds.successVolume * 100)}%<input type="range" dir="ltr" min="0" max="100" value={Math.round(sounds.successVolume * 100)} onChange={e => patch({ successVolume: Number(e.target.value) / 100 })} /></label>
      </div>
      <label>مستوى نطق الكلمة: {Math.round(sounds.wordVolume * 100)}%<input type="range" dir="ltr" min="0" max="100" value={Math.round(sounds.wordVolume * 100)} onChange={e => patch({ wordVolume: Number(e.target.value) / 100 })} /></label>
      <label>مستوى صوت الدليل: {Math.round(sounds.clueVolume * 100)}%<input type="range" dir="ltr" min="0" max="100" value={Math.round(sounds.clueVolume * 100)} onChange={e => patch({ clueVolume: Number(e.target.value) / 100 })} /></label>
    </div>
    <label className="de-inline"><input type="checkbox" checked={sounds.autoWord} onChange={e => patch({ autoWord: e.target.checked })} /> نطق الكلمة تلقائيًا فور اكتشاف الشيء (من تسجيل المعلم فقط)</label>
    <p>أضف تسجيل كل كلمة من قسم ألغاز المشهد أدناه. دون تسجيل تبقى الكلمة صامتة، ويمكن للطالب إعادة سماع التسجيل أو كتم أصوات التدريب.</p>
  </details>;
}
