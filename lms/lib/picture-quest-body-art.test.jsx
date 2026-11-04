import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect,vi,afterEach} from 'vitest';
import JourneyArt from '../app/library/games/picture-quest/topics/JourneyArt';
const draw=props=>{vi.stubGlobal('React',React);return renderToStaticMarkup(<JourneyArt {...props}/>)};
afterEach(()=>vi.unstubAllGlobals());
it('uses the approved closed playground gate instead of the retired body illustration',()=>{const html=draw({topic:{id:'body'}});expect(html).toContain('data-body-gate');expect(html).toContain('/picture-quest/body-gate-v2.webp');expect(html).not.toContain('background-position');});
it('blocks the retired cell for explicit indices and custom topic selections',()=>{for(const props of[{index:11},{topic:{id:'custom',mapArt:11}}])expect(draw(props)).toContain('data-body-gate')});
it('keeps hiding and teacher uploads intact',()=>{expect(draw({topic:{id:'body',mapImageEnabled:false}})).toBe('');const html=draw({topic:{id:'body',map_image_url:'/picture-quest/custom.svg'}});expect(html).toContain('/picture-quest/custom.svg');expect(html).not.toContain('data-body-gate')});
it('leaves all other worlds and scenery unchanged',()=>{for(const index of[0,1,2,3,4,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20,21,22,23]){const html=draw({index});expect(html).not.toContain('data-body-gate');expect(html).toContain('pqj-sprite')}});

import {freshQuestBank,migrateQuestBank} from './picture-quest-bank';
it('renames only the former body title while preserving curriculum, words, flags and progress epoch',()=>{
 const bank=freshQuestBank();bank.curriculumVersion=1;bank.epoch=17;
 const topic=bank.topics.find(t=>t.id==='body');topic.title='الجسم';topic.mapImageEnabled=false;
 const before=structuredClone(bank),next=migrateQuestBank(bank);
 expect(bank).toEqual(before);expect(next.topics.find(t=>t.id==='body')).toEqual({...topic,title:'أعضاء الجسم'});
 expect(next.words).toEqual(before.words);expect(next.epoch).toBe(17);expect(next.curriculumVersion).toBe(1);
 topic.title='جسمي الجميل';expect(migrateQuestBank(bank).topics.find(t=>t.id==='body').title).toBe('جسمي الجميل');
});
