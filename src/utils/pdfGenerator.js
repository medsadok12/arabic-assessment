import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { LEVELS, SKILLS, questionsBank } from '../data/questions.js';
import { getGradeInfo } from './scoring.js';

// Sanitize any user-supplied value before embedding in HTML
function sanitize(val) {
  if (val == null) return '—';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

// Build a flat questionId → question lookup from the nested questionsBank
function buildQMap() {
  const map = {};
  for (const lvKey of Object.keys(questionsBank)) {
    const lvData = questionsBank[lvKey];
    for (const skKey of Object.keys(lvData)) {
      for (const q of (lvData[skKey] || [])) {
        map[q.id] = { ...q, _skill: skKey };
      }
    }
  }
  return map;
}

// Decide what to show in the student-answer and correct-answer columns.
// Every question component captures answerText/correctText at answer time;
// the branches below are a fallback for sessions saved before those fields existed.
function getAnswerDisplay(answerObj, qData) {
  if (answerObj.answerText != null || answerObj.correctText != null) {
    return {
      student: sanitize(answerObj.answerText || '—'),
      correct: sanitize(answerObj.correctText || '—'),
    };
  }

  if (!qData) return { student: '—', correct: '—' };

  const type = qData.type;
  const raw  = answerObj.answer;

  if (type === 'fill') {
    return {
      student: sanitize(raw) || '—',
      correct: sanitize((qData.answers || [])[0] || '—'),
    };
  }

  if (type === 'correction') {
    return {
      student: sanitize(raw) || '—',
      correct: sanitize(qData.correctAnswer || '—'),
    };
  }

  if (type === 'word-order') {
    return {
      student: sanitize(Array.isArray(raw) ? raw.join(' ') : raw) || '—',
      correct: sanitize((qData.answer || []).join(' ')),
    };
  }

  // Regular MCQ stored as an index into shuffled options
  if (Array.isArray(qData.options)) {
    const correctOpt = qData.options.find(o => o.correct);
    return {
      student: '—',
      correct: sanitize(correctOpt?.text || '—'),
    };
  }

  // Complex types (matching, oral, letter-listen, image-matching, …)
  return { student: '—', correct: '—' };
}

// Build the full per-question detail section (grouped by skill)
function buildQuestionsSection(allAnswers, qMap) {
  if (!allAnswers?.length) return '';

  const SKILL_NAMES = {
    ...Object.fromEntries(SKILLS.map(s => [s.id, s.name])),
    speaking: 'التحدث والكلام',
    other:    'أخرى',
  };

  const skillOrder = [...SKILLS.map(s => s.id), 'speaking'];

  // Group answers by skill
  const bySkill = {};
  let totalQ = 0;
  let totalCorrect = 0;
  for (const ans of allAnswers) {
    const sk = ans.skill || 'other';
    if (!bySkill[sk]) bySkill[sk] = [];
    bySkill[sk].push(ans);
    totalQ++;
    if (ans.isCorrect) totalCorrect++;
  }

  // Preserve defined skill order, then any extras
  const orderedSkills = [
    ...skillOrder.filter(sk => bySkill[sk]?.length),
    ...Object.keys(bySkill).filter(sk => !skillOrder.includes(sk) && bySkill[sk]?.length),
  ];

  let tablesHTML = '';
  for (const sk of orderedSkills) {
    const answers    = bySkill[sk];
    const skillName  = SKILL_NAMES[sk] || sk;
    const skCorrect  = answers.filter(a => a.isCorrect).length;
    const skPct      = Math.round((skCorrect / answers.length) * 100);

    const rows = answers.map((ans, i) => {
      const qData  = qMap[ans.questionId];
      const qText  = sanitize(qData?.text || ans.questionId);
      const { student, correct } = getAnswerDisplay(ans, qData);
      const bg  = ans.isCorrect ? '#f0fdf4' : '#fff5f5';
      const ind = ans.isCorrect
        ? '<span style="color:#2ABB7A;font-size:14px;font-weight:900;">✅</span>'
        : '<span style="color:#e53e3e;font-size:14px;font-weight:900;">❌</span>';

      return `
        <tr style="background:${bg};">
          <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #e5e5e5;font-size:11px;color:#888;font-weight:700;">${i + 1}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e5e5;font-size:12px;line-height:1.65;">${qText}</td>
          <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #e5e5e5;">${ind}</td>
          <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #e5e5e5;font-size:12px;color:#444;">${student}</td>
          <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #e5e5e5;font-size:12px;color:#444;">${correct}</td>
        </tr>`;
    }).join('');

    tablesHTML += `
      <div style="margin-bottom:24px;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
        <div style="background:#1A2B4A;color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;font-size:13px;">${skillName}</span>
          <span style="color:#E8B84B;font-size:12px;font-weight:700;">${skCorrect}/${answers.length} — ${skPct}%</span>
        </div>
        <table style="width:100%;border-collapse:collapse;direction:rtl;font-family:'Tajawal',Arial,sans-serif;">
          <thead>
            <tr style="background:#f0f4f8;">
              <th style="padding:8px 10px;text-align:center;font-size:11px;border-bottom:2px solid #1A2B4A;color:#1A2B4A;width:34px;">#</th>
              <th style="padding:8px 10px;text-align:right;font-size:11px;border-bottom:2px solid #1A2B4A;color:#1A2B4A;">السؤال</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;border-bottom:2px solid #1A2B4A;color:#1A2B4A;width:50px;">نتيجة</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;border-bottom:2px solid #1A2B4A;color:#1A2B4A;width:128px;">إجابة الطالب</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;border-bottom:2px solid #1A2B4A;color:#1A2B4A;width:128px;">الإجابة الصحيحة</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const overallPct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

  return `
    <div style="background:#f0f4f8;padding:28px 44px 36px;">
      <div style="background:#1A2B4A;color:white;padding:18px 28px;border-radius:10px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:16px;font-weight:900;margin-bottom:4px;">تفاصيل الإجابات</div>
          <div style="font-size:12px;opacity:0.85;">عرض كامل لكل سؤال وإجاباته</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:26px;font-weight:900;color:#E8B84B;">${overallPct}%</div>
          <div style="font-size:11px;opacity:0.8;">${totalCorrect} صحيح من ${totalQ}</div>
        </div>
      </div>
      ${tablesHTML}
    </div>`;
}

export async function generateAssessmentPDF(studentInfo, scores, finalLevel, allAnswers = []) {
  const levelInfo = LEVELS.find(l => l.id === finalLevel);
  const grade     = getGradeInfo(scores.overall);
  const dateStr   = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const skillsHTML = SKILLS.map(skill => {
    const s = scores.bySkill[skill.id];
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
      </div>`;
  }).join('');

  const typeLabel =
    studentInfo.type === 'native'     ? 'ناطق باللغة العربية' :
    studentInfo.type === 'non-native' ? 'غير ناطق باللغة العربية' :
    'متعلم تراثي';

  const qMap = buildQMap();

  const el = document.createElement('div');
  Object.assign(el.style, {
    width: '794px', padding: '0',
    fontFamily: "'Tajawal', Arial, sans-serif",
    direction: 'rtl', background: 'white',
    position: 'fixed', top: '-9999px', left: '-9999px', zIndex: '-1',
  });

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#1a1052 0%,#2d1b69 100%);color:white;padding:36px 44px;text-align:center;">
      <div style="font-size:50px;margin-bottom:10px;color:#d4952a;font-family:serif;">ع</div>
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;">عارم أكاديمي — تقرير التقييم</h1>
      <p style="margin:0;opacity:0.9;font-size:15px;">AREM ACADEMY | تعليم اللغة العربية</p>
    </div>

    <div style="padding:32px 44px;background:white;">

      <div style="display:flex;gap:20px;margin-bottom:28px;">
        <div style="flex:1.5;background:#f5f7fa;padding:22px;border-radius:12px;">
          <h3 style="color:#1a1052;margin:0 0 14px;font-size:15px;padding-bottom:8px;border-bottom:2px solid #e0e0e0;">
            معلومات الطالب
          </h3>
          <p style="margin:0 0 9px;font-size:13px;"><strong>الاسم:</strong> ${sanitize(studentInfo.name)}</p>
          <p style="margin:0 0 9px;font-size:13px;"><strong>العمر:</strong> ${sanitize(String(studentInfo.age))} سنة</p>
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

      <div style="background:#e8f5e9;border-right:4px solid #2e7d32;padding:16px 20px;border-radius:10px;">
        <h3 style="color:#2e7d32;margin:0 0 8px;font-size:14px;">التوصيات</h3>
        <p style="margin:0;font-size:13px;line-height:1.8;color:#333;">${buildRecommendation(scores, levelInfo?.name)}</p>
      </div>

    </div>

    ${buildQuestionsSection(allAnswers, qMap)}

    <div style="background:#f5f7fa;padding:16px 44px;text-align:center;border-top:1px solid #e0e0e0;">
      <p style="margin:0;color:#9e9e9e;font-size:11px;">
        أكاديمية عارم — gandouzimohamed9@gmail.com — ${dateStr}
      </p>
    </div>
  `;

  document.body.appendChild(el);
  await new Promise(r => setTimeout(r, 400));

  const canvas  = await html2canvas(el, {
    scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff',
  });

  document.body.removeChild(el);

  const pdf     = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/jpeg', 0.7);
  const imgW    = 210;
  const imgH    = (canvas.height / canvas.width) * imgW;

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
