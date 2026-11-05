// The home world's stage screen: a hand-drawn, cut-away house whose staircase is the stage path.
// Art coordinates: the house is centred on x=0, 1760 units wide; the roof's heart tops out near y=90
// and the stone foundation ends at y=1440. Outside that box the drawing continues (sky, garden,
// side rooms) so any screen shape is filled without stretching or cropping the stations.
export const HOME_SCENE_TOP=90;
export const HOME_SCENE_BOTTOM=1440;
export const HOME_SCENE_MIN_WIDTH=1010; // the central rooms, always shown whole
// [x, y, diameter] in art units — measured on the drawing: living room, top of the stairs, attic.
export const HOME_SCENE_STATIONS={1:[345,1256,196],2:[-270,878,182],3:[40,494,168]};
export function homeSceneEnabled(data,topic){return topic?.id==='home'&&topic.mapImageEnabled!==false&&!topic.map_image_url&&(topic.mapArt==null||topic.mapArt===3)&&data?.journeyScenery!==false&&data?.journeyPath!==false;}
// Fits the house between the title (top), the start button (bottom) and, on short landscape phones,
// the side panel (left). Returns the SVG viewBox in art units and the pixel scale.
export function homeSceneLayout(width,height,reserve={}){
 const w=width>0?width:390,h=height>0?height:844,top=reserve.top??80,bottom=reserve.bottom??128,left=reserve.left??0;
 const tall=HOME_SCENE_BOTTOM-HOME_SCENE_TOP;
 const scale=Math.max(.05,Math.min((w-left)/HOME_SCENE_MIN_WIDTH,(h-top-bottom)/tall));
 const free=Math.max(0,h-top-bottom-tall*scale);
 return{width:w,height:h,x:-(left+(w-left)/2)/scale,y:HOME_SCENE_TOP-(top+free/2)/scale,w:w/scale,h:h/scale,scale};
}
export function homeStationBox(layout,[x,y,diameter]){
 return{left:(x-layout.x)/layout.w*100,top:(y-layout.y)/layout.h*100,size:Math.max(48,diameter*layout.scale)};
}
