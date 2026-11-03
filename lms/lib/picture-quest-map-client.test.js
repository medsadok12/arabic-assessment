// @vitest-environment jsdom
import{beforeEach,afterEach,it,expect,vi}from'vitest';
import{createQuestMapPan}from'./picture-quest-map-client';
let viewport,terrain,controller,frames,seq;
const flush=()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(performance.now()+1000));};
const event=(type,y)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{pointerId:{value:1},clientY:{value:y},button:{value:0}});viewport.dispatchEvent(e);return e;};
beforeEach(()=>{frames=new Map();seq=0;vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{frames.set(++seq,fn);return seq});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));vi.stubGlobal('matchMedia',()=>({matches:false}));document.body.innerHTML='<div id="viewport"><div id="terrain"><button data-journey-index="0">عالم</button></div></div>';viewport=document.getElementById('viewport');terrain=document.getElementById('terrain')});
afterEach(()=>{controller?.dispose();vi.restoreAllMocks();vi.unstubAllGlobals()});
const geometry={height:2400,viewHeight:600,points:[{x:200,y:2200},{x:100,y:1800}]};
it('coalesces 40 drag events into one transform frame and cancels the accidental click',()=>{
 const clicks=vi.fn(),position=vi.fn();controller=createQuestMapPan(viewport,terrain,{geometry,onPosition:position});controller.pan(1200);terrain.querySelector('button').addEventListener('click',clicks);
 event('pointerdown',100);for(let i=0;i<40;i++)event('pointermove',101+i*3);expect(frames.size).toBe(1);expect(terrain.style.transform).toContain('-1200px');flush();expect(terrain.style.transform).toContain('-1082px');event('pointerup',218);terrain.querySelector('button').click();expect(clicks).not.toHaveBeenCalled();expect(position).toHaveBeenLastCalledWith(1082/1800);
});
it('treats a small movement as a tap, clamps bounds, handles wheel and retains a saved position',()=>{
 const clicks=vi.fn();controller=createQuestMapPan(viewport,terrain,{geometry,animate:false});terrain.querySelector('button').addEventListener('click',clicks);event('pointerdown',100);event('pointermove',103);event('pointerup',103);terrain.querySelector('button').click();expect(clicks).toHaveBeenCalledOnce();controller.pan(9000);expect(controller.getOffset()).toBe(1800);controller.pan(-10);expect(controller.getOffset()).toBe(0);viewport.dispatchEvent(new WheelEvent('wheel',{deltaY:120,bubbles:true,cancelable:true}));flush();expect(controller.getOffset()).toBe(120);controller.setGeometry({...geometry,height:3000},.5);expect(controller.getOffset()).toBe(1200);
});
it('honours reduced motion and removes all gesture listeners and frames on unmount',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));controller=createQuestMapPan(viewport,terrain,{geometry});controller.locate(0,true);expect(frames.size).toBe(0);expect(controller.getOffset()).toBe(1800);event('pointerdown',100);event('pointermove',300);expect(frames.size).toBe(1);controller.dispose();expect(frames.size).toBe(0);const value=terrain.style.transform;event('pointerdown',10);event('pointermove',300);flush();expect(terrain.style.transform).toBe(value);controller=null;
});
