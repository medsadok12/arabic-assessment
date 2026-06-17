import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase-server';
import Navbar from '../../components/Navbar';

const RESOURCES = [
  {
    icon: '🔤', title: 'الحروف الهجائية',
    desc: 'تعلّم الحروف بأشكالها مع أصوات وأمثلة مشوّقة!',
    tag: 'مستوى 1', link: '/library/huroof', ready: true,
    accent: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', iconBg: '#DBEAFE',
    btnBg: 'linear-gradient(135deg,#3B82F6,#2563EB)',
  },
  {
    icon: '🔊', title: 'الحركات والتشكيل',
    desc: 'اكتشف الفتحة والكسرة والضمة مع أمثلة صوتية!',
    tag: 'مستوى 1', link: '#', ready: false,
    accent: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', iconBg: '#EDE9FE',
  },
  {
    icon: '📖', title: 'القراءة المقطعية',
    desc: 'قطّع الكلمات وتعلّم القراءة خطوة بخطوة!',
    tag: 'مستوى 1', link: '#', ready: false,
    accent: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', iconBg: '#D1FAE5',
  },
  {
    icon: '✍️', title: 'الكتابة الصحيحة',
    desc: 'تدرّب على الكتابة الصحيحة وصحّح أخطاءك!',
    tag: 'مستوى 2', link: '#', ready: false,
    accent: '#F97316', bg: '#FFF7ED', border: '#FED7AA', iconBg: '#FFEDD5',
  },
  {
    icon: '👂', title: 'الاستماع والفهم',
    desc: 'استمع وافهم — نصوص صوتية تنمّي مهاراتك!',
    tag: 'مستوى 2', link: '#', ready: false,
    accent: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', iconBg: '#FEF3C7',
  },
  {
    icon: '💬', title: 'التعبير الشفهي',
    desc: 'تحدّث بثقة — حوارات تنمّي لغتك العربية!',
    tag: 'مستوى 3', link: '#', ready: false,
    accent: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8', iconBg: '#FCE7F3',
  },
  {
    icon: '📝', title: 'النصوص الأدبية',
    desc: 'قصص رائعة تناسب عمرك وتشعل خيالك!',
    tag: 'مستوى 3', link: '#', ready: false,
    accent: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4', iconBg: '#CCFBF1',
  },
  {
    icon: '🎮', title: 'صيّاد الحروف',
    desc: 'أوجد الحرف الناقص — هل أنت صيّاد ماهر؟',
    tag: 'تعزيزي', link: '/library/games/letter-catcher', ready: true,
    accent: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', iconBg: '#E0E7FF',
    btnBg: 'linear-gradient(135deg,#6366F1,#4F46E5)',
  },
  {
    icon: '🔀', title: 'رتّب الكلمة',
    desc: 'رتّب الحروف المبعثرة لتكوّن كلمة صحيحة!',
    tag: 'تعزيزي', link: '/library/games/word-scramble', ready: true,
    accent: '#EF4444', bg: '#FEF2F2', border: '#FECACA', iconBg: '#FEE2E2',
    btnBg: 'linear-gradient(135deg,#EF4444,#DC2626)',
  },
  {
    icon: '🖼️', title: 'صِل الكلمة بصورتها',
    desc: 'وصّل كل كلمة بصورتها — لعبة بصرية رائعة!',
    tag: 'تعزيزي', link: '/library/games/word-image-match', ready: true,
    accent: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC', iconBg: '#CFFAFE',
    btnBg: 'linear-gradient(135deg,#06B6D4,#0891B2)',
  },
];

const TAG_COLORS = {
  'مستوى 1': { bg: '#EFF6FF', color: '#1D4ED8' },
  'مستوى 2': { bg: '#FFF7ED', color: '#C2410C' },
  'مستوى 3': { bg: '#FDF2F8', color: '#BE185D' },
  'تعزيزي':  { bg: '#ECFDF5', color: '#065F46' },
};

export default async function LibraryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  return (
    <>
      <Navbar user={user} />
      <style>{`
        .lib-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
        }
        @media (max-width: 600px) {
          .lib-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
        }
        @media (max-width: 380px) {
          .lib-grid { grid-template-columns: 1fr; }
        }

        .lib-new-card {
          border-radius: 18px;
          padding: 22px 18px 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
          border: 2px solid;
          transition: transform .2s, box-shadow .2s;
          text-decoration: none;
          position: relative;
          overflow: hidden;
        }
        .lib-new-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,.13);
        }
        .lib-new-card.ready:hover .lib-start-btn {
          transform: scale(1.06);
        }

        .lib-icon-wrap {
          width: 72px; height: 72px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 2.6rem;
          flex-shrink: 0;
          margin-bottom: 2px;
        }
        @media (max-width: 600px) {
          .lib-icon-wrap { width: 58px; height: 58px; font-size: 2rem; }
          .lib-new-card { padding: 16px 12px 14px; }
        }

        .lib-card-title-new {
          font-size: 1.05rem;
          font-weight: 800;
          color: #1e293b;
          line-height: 1.3;
          margin: 0;
        }
        @media (max-width: 600px) {
          .lib-card-title-new { font-size: .92rem; }
        }

        .lib-card-desc-new {
          font-size: .82rem;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
          flex: 1;
        }

        .lib-start-btn {
          display: inline-block;
          border: none;
          border-radius: 50px;
          padding: 8px 22px;
          color: #fff;
          font-size: .88rem;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Cairo', 'Tajawal', sans-serif;
          transition: transform .18s, box-shadow .18s;
          box-shadow: 0 3px 10px rgba(0,0,0,.18);
          text-decoration: none;
        }
        .lib-start-btn:hover { transform: scale(1.07); box-shadow: 0 6px 18px rgba(0,0,0,.22); }

        .lib-coming-badge {
          display: inline-block;
          background: #f1f5f9;
          color: #94a3b8;
          border-radius: 50px;
          padding: 6px 18px;
          font-size: .82rem;
          font-weight: 700;
          border: 1.5px dashed #cbd5e1;
        }

        .lib-tag-new {
          display: inline-block;
          border-radius: 20px;
          padding: 3px 11px;
          font-size: .72rem;
          font-weight: 700;
          position: absolute;
          top: 12px;
          right: 12px;
        }

        .lib-hero {
          text-align: center;
          padding: 8px 0 28px;
        }
        .lib-hero h1 {
          font-size: 1.9rem;
          font-weight: 900;
          color: #1e3a5f;
          margin: 0 0 6px;
        }
        .lib-hero p {
          color: #64748b;
          font-size: .95rem;
        }
      `}</style>

      <main className="page-wrap">
        <div className="container">

          {/* Hero */}
          <div className="lib-hero">
            <h1>المكتبة التعليمية 📚</h1>
            <p>اختر نشاطاً وابدأ رحلة تعلّم اللغة العربية!</p>
          </div>

          <div className="lib-grid">
            {RESOURCES.map(r => {
              const tagStyle = TAG_COLORS[r.tag] ?? { bg: '#f1f5f9', color: '#475569' };
              const cardContent = (
                <>
                  {/* Tag */}
                  <span className="lib-tag-new" style={{ background: tagStyle.bg, color: tagStyle.color }}>
                    {r.tag}
                  </span>

                  {/* Icon */}
                  <div className="lib-icon-wrap" style={{ background: r.iconBg }}>
                    {r.icon}
                  </div>

                  {/* Title */}
                  <p className="lib-card-title-new">{r.title}</p>

                  {/* Desc */}
                  <p className="lib-card-desc-new">{r.desc}</p>

                  {/* CTA */}
                  {r.ready ? (
                    <span className="lib-start-btn" style={{ background: r.btnBg }}>
                      ابدأ الآن ←
                    </span>
                  ) : (
                    <span className="lib-coming-badge">قريباً…</span>
                  )}
                </>
              );

              return r.ready ? (
                <Link
                  key={r.title}
                  href={r.link}
                  className="lib-new-card ready"
                  style={{ background: r.bg, borderColor: r.border }}
                >
                  {cardContent}
                </Link>
              ) : (
                <div
                  key={r.title}
                  className="lib-new-card"
                  style={{ background: r.bg, borderColor: r.border, opacity: .82, cursor: 'default' }}
                >
                  {cardContent}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
