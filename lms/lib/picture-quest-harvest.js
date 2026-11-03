// Decorative packing positions, relative to each fruit's own sprite size.
// Back fruit arrives first; nearer pieces overlap it and disappear behind the rim.
export const HARVEST_FRUITS=[
 {kind:'apple',x:-46,y:165,angle:-10,scale:1,depth:10},
 {kind:'orange',x:46,y:165,angle:12,scale:1,depth:11},
 {kind:'grapes',x:0,y:132,angle:-5,scale:.98,depth:12},
 {kind:'orange',x:-56,y:192,angle:8,scale:.98,depth:13},
 {kind:'apple',x:56,y:192,angle:-8,scale:1,depth:14},
 {kind:'apple',x:-24,y:137,angle:-12,scale:.96,depth:15},
 {kind:'grapes',x:24,y:162,angle:8,scale:1,depth:16},
 {kind:'orange',x:0,y:204,angle:-3,scale:1,depth:17}
];
export const HARVEST_START=1950,HARVEST_STAGGER=260,HARVEST_FLIGHT=850;
export const HARVEST_CHEER=HARVEST_START+(HARVEST_FRUITS.length-1)*HARVEST_STAGGER+HARVEST_FLIGHT+190;
export const HARVEST_DONE=HARVEST_CHEER+2150;
export function harvestFruitStyle(f){return{'--dx':f.x+'%','--dy':f.y+'%','--rest-angle':f.angle+'deg','--rest-scale':f.scale,zIndex:f.depth};}
