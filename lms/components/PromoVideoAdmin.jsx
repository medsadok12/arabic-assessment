'use client';

import { useState, useRef } from 'react';
import { Upload, Video } from 'lucide-react';

export default function PromoVideoAdmin() {
  const [uploading, setUploading] = useState(false);
  const [done,      setDone]      = useState(false);
  const [err,       setErr]       = useState('');
  const [progress,  setProgress]  = useState(0);
  const inputRef  = useRef(null);
  const videoRef  = useRef(null);

  const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/promo.mp4`;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setDone(false);
    setErr('');
    setProgress(0);

    try {
      // 1. Get a signed upload URL from the server
      const res  = await fetch('/api/admin/promo-upload-url', { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // 2. Upload directly to Supabase Storage (bypasses Vercel size limits)
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = ev => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`));
        xhr.onerror = () => reject(new Error('فشل الاتصال'));
        xhr.open('PUT', data.signedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.send(file);
      });

      setDone(true);
      setProgress(100);
      // Refresh the preview
      if (videoRef.current) {
        videoRef.current.src = videoUrl + '?t=' + Date.now();
        videoRef.current.style.display = 'block';
        videoRef.current.load();
      }
    } catch (ex) {
      setErr(ex.message);
    }

    setUploading(false);
  }

  return (
    <div className="dash-section">
      <div className="dash-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Video size={18} /> الفيديو الإعلاني
      </div>

      <div className="card" style={{ padding: 24 }}>
        {/* Preview */}
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 280, background: '#000' }}
          onError={e => { e.target.style.display = 'none'; }}
        />

        {/* Upload button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {uploading
              ? <span className="spinner" />
              : <Upload size={16} />}
            {uploading ? `جارٍ الرفع… ${progress}%` : 'رفع فيديو إعلاني'}
          </button>

          <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
            MP4 / MOV / WebM — أي حجم مقبول
          </span>

          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFile}
            disabled={uploading}
          />
        </div>

        {/* Progress bar */}
        {uploading && (
          <div style={{ marginTop: 12, background: '#eee', borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, background: 'var(--primary)', height: '100%', transition: 'width .3s' }} />
          </div>
        )}

        {done && (
          <div className="alert alert-success" style={{ marginTop: 12 }}>
            ✅ تم رفع الفيديو بنجاح — يظهر الآن في الصفحة الرئيسية.
          </div>
        )}
        {err && (
          <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div>
        )}
      </div>
    </div>
  );
}
