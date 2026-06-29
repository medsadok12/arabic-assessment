'use client';
import { useState, useEffect } from 'react';

export default function TeamShowcase() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/team', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setMembers(d.members || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || members.length === 0) return null;

  return (
    <section style={{ background: '#fff', padding: '72px 0 60px', borderTop: '1px solid #e2e8f0' }}>
      <style>{`
        .team-card {
          display: flex; flex-direction: column; align-items: center;
          background: #fff; border-radius: 20px; padding: 28px 22px 24px;
          border: 2px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0,0,0,.07), 4px 4px 0 rgba(0,0,0,.04);
          width: 210px; min-width: 180px; text-align: center;
          transition: transform .22s, box-shadow .22s; cursor: default;
        }
        .team-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 32px rgba(24,95,165,.15), 4px 4px 0 rgba(24,95,165,.1);
          border-color: #185FA5;
        }
        .team-photo {
          width: 110px; height: 110px; border-radius: 50%; overflow: hidden;
          border: 3px solid #185FA5; margin-bottom: 16px;
          background: #e8f0fb; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
          transition: border-color .22s, transform .22s;
        }
        .team-card:hover .team-photo {
          border-color: #c9952a; transform: scale(1.04);
        }
        .team-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .team-name { font-weight: 800; font-size: 1rem; color: #1a1a2e; margin-bottom: 6px; }
        .team-title {
          display: inline-block; background: #e8f0fb; color: #185FA5;
          font-size: .75rem; font-weight: 700; padding: 3px 12px;
          border-radius: 99px; margin-bottom: 10px; border: 1px solid #c5d9f2;
        }
        .team-bio { font-size: .84rem; color: #64748b; line-height: 1.65; }
        @media (max-width: 600px) {
          .team-card { width: calc(50% - 10px); min-width: 140px; padding: 20px 14px; }
          .team-photo { width: 80px; height: 80px; }
        }
      `}</style>

      <div className="container">
        <h2 style={{
          textAlign: 'center', fontSize: '1.8rem', fontWeight: 900,
          color: '#1a3a6b', marginBottom: 8,
        }}>فريقنا التعليمي</h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 48, fontSize: '.97rem' }}>
          نخبة من المعلمين المتخصصين في تعليم اللغة العربية
        </p>

        <div style={{
          display: 'flex', gap: 20, flexWrap: 'wrap',
          justifyContent: 'center', alignItems: 'flex-start',
        }}>
          {members.map(m => (
            <div key={m.id} className="team-card">
              <div className="team-photo">
                {m.image_url
                  ? <img src={m.image_url} alt={m.name} />
                  : <span style={{ fontSize: '2.6rem' }}>👤</span>
                }
              </div>
              <div className="team-name">{m.name}</div>
              <span className="team-title">{m.title}</span>
              {m.bio && <p className="team-bio">{m.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
