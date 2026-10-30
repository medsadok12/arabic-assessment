import { createHash } from 'node:crypto';
import { playableBoards, cleanWord } from './scrabble';
const fail = () => new Error('تعذّر حفظ مسارك. أعد المحاولة.');
const key = (userId,epoch) => `scrabble:journey:${userId}:${epoch}`;
// تغيير الصورة أو التسجيل لا يمحو التقدم. تغيير الهندسة أو الكلمات يعيد تلك اللوحة فقط.
export function scrabbleBoardStamp(board) {
  return createHash('sha256').update(JSON.stringify([board.id,board.size,board.seed.map(w=>[cleanWord(w.word),w.row,w.col,w.direction]),board.rounds.map(w=>[w.id,cleanWord(w.word),w.row,w.col,w.direction])])).digest('hex').slice(0,24);
}
export async function readScrabbleJourney(admin,userId,config) {
  const {data,error}=await admin.from('game_settings').select('game_id,settings,updated_at').eq('game_id',key(userId,config.epoch)).maybeSingle();
  if(error)throw fail();
  const boards=playableBoards(config),saved=data?.settings||{},valid=new Map(boards.map(b=>[b.id,scrabbleBoardStamp(b)]));
  const completed=(saved.completed||[]).filter(e=>e&&valid.get(e.boardId)===e.stamp);
  const done=new Set(completed.map(e=>e.boardId));
  return {row:data,boards,completed,active:saved.active||null,nextIndex:boards.findIndex(b=>!done.has(b.id))};
}
export async function changeScrabbleJourney(admin,owner,userId,config,mutate) {
  for(let i=0;i<6;i++){
    const current=await readScrabbleJourney(admin,userId,config),next=mutate({completed:current.completed,active:current.active});
    const updated_at=new Date(Math.max(Date.now(),(Date.parse(current.row?.updated_at)||0)+1)).toISOString();
    const value={game_id:key(userId,config.epoch),settings:next,updated_by:owner,updated_at};
    const result=current.row?await admin.from('game_settings').update(value).eq('game_id',value.game_id).eq('updated_at',current.row.updated_at).select('game_id').maybeSingle():await admin.from('game_settings').insert(value).select('game_id').single();
    if(result.error?.code==='23505'||!result.error&&!result.data)continue;
    if(result.error)throw fail();return next;
  }throw fail();
}
export function scrabbleJourneyPublic(journey) {
  return {completed:journey.completed.map(e=>e.boardId),nextIndex:journey.nextIndex,total:journey.boards.length,allComplete:journey.nextIndex===-1&&journey.boards.length>0};
}
export async function markScrabbleBoard(admin,owner,userId,config,board) {
  const stamp=scrabbleBoardStamp(board);
  const active=playableBoards(config).find(b=>b.id===board.id);
  if(!active||scrabbleBoardStamp(active)!==stamp)return;
  await changeScrabbleJourney(admin,owner,userId,config,state=>({...state,completed:[...state.completed.filter(e=>e.boardId!==board.id),{boardId:board.id,stamp,at:new Date().toISOString()}]}));
}
