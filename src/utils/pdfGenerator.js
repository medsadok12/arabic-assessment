import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { LEVELS, SKILLS } from '../data/questions.js';
import { getGradeInfo } from './scoring.js';

export async function generateAssessmentPDF(studentInfo, scores, finalLevel) {
  const levelInfo = LEVELS.find(l => l.id === finalLevel);
  const grade     = getGradeInfo(scores.overall);
  const dateStr   = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const skillsHTML = SKILLS.map(skill => {
    const s     = scores.bySkill[skill.id];
    if (!s) return '';
    const pct   = Math.round(s.score);
    const color = pct >= 80 ? '#2e7d32' : pct >= 60 ? '#e65100' : '#c62828';
    return `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
          <span style="font-weight:700;font-size:13px;">${skill.name}</span>
          <span style="font-weight:800;color:${color};font-size:13px;">${pct}% &nbsp;(${s.correct}/${s.total})</span>
        </div>
        <div style="background:#e0e0e0;height:8px;border-radius:8px;overflow:hidden;">
          <div style="background:${color};height:100%;width:${pct}%;border-radius:8px;"></div>
        </div>
      </div>
    `;
  }).join('');

  const typeLabel =
    studentInfo.type === 'native'     ? 'ناطق باللغة العربية' :
    studentInfo.type === 'non-native' ? 'غير ناطق باللغة العربية' :
    'متعلم تراثي';

  const el = document.createElement('div');
  Object.assign(el.style, {
    width: '794px', padding: '0', fontFamily: "'Tajawal', Arial, sans-serif",
    direction: 'rtl', background: 'white',
    position: 'fixed', top: '-9999px', left: '-9999px', zIndex: '-1',
  });

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#1a1052 0%,#2d1b69 100%);color:white;padding:36px 44px;text-align:center;">
      <div style="font-size:50px;margin-bottom:10px;color:#d4952a;font-family:serif;">ع</div>
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;">عارم أكاديمي — تقرير التقييم</h1>
      <p style="margin:0;opacity:0.9;font-size:15px;">AREM ACADEMY | تعليم اللغة العربية</p>
    </div>

    <div style="padding:32px 44px;">

      <div style="display:flex;gap:20px;margin-bottom:28px;">
        <div style="flex:1.5;background:#f5f7fa;padding:22px;border-radius:12px;">
          <h3 style="color:#1a1052;margin:0 0 14px;font-size:15px;padding-bottom:8px;border-bottom:2px solid #e0e0e0;">
            معلومات الطالب
          </h3>
          <p style="margin:0 0 9px;font-size:13px;"><strong>الاسم:</strong> ${studentInfo.name}</p>
          <p style="margin:0 0 9px;font-size:13px;"><strong>العمر:</strong> ${studentInfo.age} سنة</p>
          <p style="margin:0 0 9px;font-size:13px;"><strong>نوع المتعلم:</strong> ${typeLabel}</p>
          <p style="margin:0;font-size:13px;"><strong>التاريخ:</strong> ${dateStr}</p>
        </div>
        <div style="flex:1;background:#1a1052;color:white;padding:22px;border-radius:12px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-size:50px;font-weight:900;line-height:1;">${Math.round(scores.overall)}%</div>
          <div style="font-size:17px;margin-top:10px;font-weight:700;">${grade.label}</div>
          <div style="font-size:16px;margin-top:6px;">${'⭐'.repeat(grade.stars)}</div>
          <div style="font-size:13px;margin-top:10px;opacity:0.9;background:rgba(255,255,255,0.15);padding:5px 14px;border-radius:20px;">
            المستوى: ${levelInfo?.name} ${levelInfo?.icon}
          </div>
        </div>
      </div>

      <div style="margin-bottom:26px;">
        <h3 style="color:#1a1052;margin:0 0 16px;font-size:15px;padding-bottom:8px;border-bottom:2px solid #e0e0e0;">
          تفاصيل المهارات
        </h3>
        ${skillsHTML}
      </div>

      <div style="background:#e8f5e9;border-right:4px solid #2e7d32;padding:16px 20px;border-radius:10px;margin-bottom:10px;">
        <h3 style="color:#2e7d32;margin:0 0 8px;font-size:14px;">التوصيات</h3>
        <p style="margin:0;font-size:13px;line-height:1.8;color:#333;">${buildRecommendation(scores, levelInfo?.name)}</p>
      </div>

    </div>

    <div style="background:#f5f7fa;padding:16px 44px;text-align:center;border-top:1px solid #e0e0e0;">
      <p style="margin:0;color:#9e9e9e;font-size:11px;">
        أكاديمية عارم — gandouzimohamed9@gmail.com — ${dateStr}
      </p>
    </div>
  `;

  document.body.appendChild(el);
  await new Promise(r => setTimeout(r, 400));

  const canvas = await html2canvas(el, {
    scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff',
  });

  document.body.removeChild(el);

  const pdf      = new jsPDF('p', 'mm', 'a4');
  const imgData  = canvas.toDataURL('image/jpeg', 0.7);
  const imgW     = 210;
  const imgH     = (canvas.height / canvas.width) * imgW;

  pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);

  let remaining = imgH - 297;
  while (remaining > 0) {
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, -(imgH - remaining), imgW, imgH);
    remaining -= 297;
  }

  return pdf.output('datauristring');
}

function buildRecommendation(scores, levelName) {
  const pct  = scores.overall;
  const weak = Object.values(scores.bySkill)
    .filter(s => s.score < 70)
    .map(s => s.name);

  if (pct >= 90)
    return `أداء استثنائي في المستوى ${levelName}! يُنصح بالاستمرار في تعزيز المهارات المتقدمة.`;
  if (pct >= 80)
    return `أداء ممتاز في المستوى ${levelName}. يُنصح بالتركيز على تعزيز المهارات الأقل درجةً.`;
  if (pct >= 70) {
    const w = weak.length ? ` مع التركيز على: ${weak.join('، ')}.` : '.';
    return `أداء جيد في المستوى ${levelName}. يُنصح بمراجعة بعض المهارات${w}`;
  }
  const w = weak.length ? ` وخاصةً: ${weak.join('، ')}.` : '.';
  return `يحتاج الطالب إلى مزيد من التدريب في المستوى ${levelName}${w} يُنصح بمراجعة المواد الأساسية.`;
}
