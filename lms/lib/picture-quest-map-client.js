// Dragging updates only one transform, coalesced to the next animation frame.
// It never writes progress, fetches data, or causes a React render per pointer move.
export function createQuestMapPan(viewport,terrain,options={}){
 const win=viewport.ownerDocument.defaultView,raf=fn=>win.requestAnimationFrame(fn),cancel=id=>win.cancelAnimationFrame(id);
 let geometry=options.geometry,offset=0,pending=0,frame=0,tween=0,drag=null,ignoreUntil=0,disposed=false,region='';
 const now=()=>win.performance.now();
 const clamp=n=>Math.max(0,Math.min(Math.max(0,geometry.height-geometry.viewHeight),n));
 const save=()=>options.onPosition?.(geometry.height>geometry.viewHeight?offset/(geometry.height-geometry.viewHeight):0);
 function paint(n){offset=clamp(n);terrain.style.transform=`translate3d(0,${-offset}px,0)`;const r=(offset+geometry.viewHeight*.5)/geometry.height,next=r>.62?'الغابة':r>.20?'القرية':'الساحل';if(next!==region){region=next;options.onRegion?.(region)}}
 function stop(){if(frame)cancel(frame);if(tween)cancel(tween);frame=tween=0;}
 function schedule(n){pending=clamp(n);if(!frame)frame=raf(()=>{frame=0;paint(pending);});}
 function pan(n,smooth=false){stop();const target=clamp(n);if(!smooth||options.animate===false||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches){paint(target);save();return}const start=offset,t0=now();function tick(t){if(disposed)return;const k=Math.min(1,(t-t0)/420);paint(start+(target-start)*(1-Math.pow(1-k,3)));if(k<1)tween=raf(tick);else{tween=0;save()}}tween=raf(tick);}
 function down(e){if(e.button>0||e.isPrimary===false||e.target.closest('[data-map-control]'))return;stop();drag={id:e.pointerId,y:e.clientY,start:offset,moved:false};}
 function move(e){if(!drag||e.pointerId!==drag.id)return;const dy=e.clientY-drag.y;if(!drag.moved&&Math.abs(dy)<8)return;if(!drag.moved){drag.moved=true;viewport.setPointerCapture?.(e.pointerId);viewport.classList.add('dragging');options.onDrag?.()}e.preventDefault();schedule(drag.start-dy);}
 function end(e){if(!drag||e.pointerId!==drag.id)return;if(drag.moved){ignoreUntil=now()+300;if(frame){cancel(frame);frame=0;paint(pending);}save();}if(viewport.hasPointerCapture?.(e.pointerId))viewport.releasePointerCapture(e.pointerId);drag=null;viewport.classList.remove('dragging');}
 function click(e){if(now()<ignoreUntil){e.preventDefault();e.stopImmediatePropagation();}}
 function wheel(e){const value=clamp((frame?pending:offset)+e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?geometry.viewHeight:1));if(value===(frame?pending:offset))return;e.preventDefault();if(tween){cancel(tween);tween=0;}schedule(value);options.onDrag?.();}
 function focus(e){const node=e.target.closest('[data-journey-index]');if(node&&viewport.matches(':focus-within')&&options.keyboard?.())locate(Number(node.dataset.journeyIndex),false);}
 function key(e){if(e.target.closest('[data-map-control]')||!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key))return;e.preventDefault();pan(e.key==='Home'?0:e.key==='End'?geometry.height:offset+(['ArrowUp','PageUp'].includes(e.key)?-1:1)*(e.key.startsWith('Page')?geometry.viewHeight*.8:120));}
 function blur(){if(drag)end({pointerId:drag.id});stop();save();}
 function locate(index,smooth=true){const p=geometry.points[index];if(p)pan(p.y-geometry.viewHeight*.60,smooth);}
 viewport.addEventListener('pointerdown',down);viewport.addEventListener('pointermove',move);viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);viewport.addEventListener('click',click,true);viewport.addEventListener('wheel',wheel,{passive:false});viewport.addEventListener('keydown',key);viewport.addEventListener('focusin',focus);win.addEventListener('blur',blur);
 return{pan,locate,setGeometry(next,ratio){stop();const r=ratio??(geometry.height>geometry.viewHeight?offset/(geometry.height-geometry.viewHeight):0);geometry=next;paint(r*(geometry.height-geometry.viewHeight));},getOffset:()=>offset,dispose(){disposed=true;blur();viewport.removeEventListener('pointerdown',down);viewport.removeEventListener('pointermove',move);viewport.removeEventListener('pointerup',end);viewport.removeEventListener('pointercancel',end);viewport.removeEventListener('click',click,true);viewport.removeEventListener('wheel',wheel);viewport.removeEventListener('keydown',key);viewport.removeEventListener('focusin',focus);win.removeEventListener('blur',blur);}};
}
