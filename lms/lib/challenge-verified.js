export const challengeOption = value => Array.isArray(value) ? value.join(' | ') : String(value ?? '').trim();
export const challengeMember = (room, id) => !!id && [room?.player1_id, room?.player2_id].includes(id);
export function challengeOutcome(room, id) {
  if (!challengeMember(room, id) || room.status !== 'finished') return null;
  const p1 = room.player1_score || 0, p2 = room.player2_score || 0;
  if (![p1,p2].every(n=>Number.isInteger(n)&&n>=0&&n<=5) || p1+p2 > (room.questions?.length||0)) return null;
  if (p1<5&&p2<5&&room.cur_q_index+1 < room.questions.length) return null;
  const mine=room.player1_id===id?p1:p2, other=room.player1_id===id?p2:p1;
  const tag=mine===other?'draw':mine>other?'win':'loss';
  return { tag, amount:tag==='win'?15:tag==='draw'?10:5, mine, other };
}
