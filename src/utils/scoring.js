import { SKILLS, JUMP_THRESHOLD, REGRESSION_THRESHOLD } from '../data/questions.js';

export function calculateLevelScore(answers) {
  const skillCounts  = {};
  const skillCorrect = {};

  for (const skill of SKILLS) {
    skillCounts[skill.id]  = 0;
    skillCorrect[skill.id] = 0;
  }

  for (const answer of answers) {
    if (skillCounts[answer.skill] !== undefined) {
      skillCounts[answer.skill]++;
      if (answer.isCorrect) skillCorrect[answer.skill]++;
    }
  }

  let overall = 0;
  const bySkill = {};

  for (const skill of SKILLS) {
    const total   = skillCounts[skill.id];
    const correct = skillCorrect[skill.id];
    const pct     = total > 0 ? (correct / total) * 100 : 0;

    bySkill[skill.id] = {
      name:    skill.name,
      score:   pct,
      correct,
      total,
    };
    overall += pct * skill.weight;
  }

  return { overall, bySkill };
}

export function applyJumpLogic(score, currentLevel) {
  if (score >= JUMP_THRESHOLD && currentLevel < 3) return currentLevel + 1;
  if (score < REGRESSION_THRESHOLD && currentLevel > 1) return currentLevel - 1;
  return currentLevel;
}

export function getGradeInfo(score) {
  if (score >= 90) return { label: 'ممتاز جداً',     stars: 5, color: '#1b5e20' };
  if (score >= 80) return { label: 'ممتاز',          stars: 4, color: '#2e7d32' };
  if (score >= 70) return { label: 'جيد جداً',      stars: 3, color: '#0097a7' };
  if (score >= 60) return { label: 'جيد',            stars: 2, color: '#e65100' };
  return             { label: 'يحتاج تحسين',         stars: 1, color: '#c62828' };
}

export function saveToLocalStorage(data) {
  try {
    const history = JSON.parse(localStorage.getItem('areem_assessments') || '[]');
    history.unshift({ ...data, id: Date.now(), date: new Date().toISOString() });
    localStorage.setItem('areem_assessments', JSON.stringify(history.slice(0, 50)));
  } catch (_) {}
}

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('areem_assessments') || '[]');
  } catch (_) {
    return [];
  }
}
