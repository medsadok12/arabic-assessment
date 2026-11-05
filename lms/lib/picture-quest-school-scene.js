export const SCHOOL_SCENE_ART='/picture-quest/school-scene-v1.webp';
export const SCHOOL_SCENE_STATIONS={1:[636/944*100,1113/1666*100,232/944*100],2:[229/944*100,933/1666*100,190/944*100],3:[548/944*100,782/1666*100,151/944*100]};
export function schoolSceneEnabled(data,topic){return topic?.id==='school'&&topic.mapImageEnabled!==false&&!topic.map_image_url&&(topic.mapArt==null||topic.mapArt===2)&&data.journeyScenery!==false&&data.journeyPath!==false;}
export function schoolSceneLayout(width,height){const ratio=944/1666,w=Math.min(width,height*ratio);return{width:w,height:w/ratio};}
