// تختار اللوحة خلفيتها مرة واحدة؛ لا تدخل الكلمة الحالية في الاختيار.
export const SCRABBLE_THEMES=[['home','البيت'],['garden','الحديقة'],['animals','الحيوانات'],['school','المدرسة'],['fruit','الفواكه'],['kitchen','المطبخ'],['sea','البحر'],['weather','السماء والطقس'],['body','جسمي'],['transport','المواصلات'],['clothes','ملابسي'],['jobs','المهن']];
export function scrabbleTheme(board){
 const choice=board.backgroundTheme||'auto';
 if(choice==='none')return null;
 const theme=choice==='auto'?board.theme:choice;
 return SCRABBLE_THEMES.some(([id])=>id===theme)?theme:'home';
}
