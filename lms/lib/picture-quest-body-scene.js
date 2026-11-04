export const BODY_SCENE_PORTRAIT='/picture-quest/body-scene-v3.webp';
export const BODY_SCENE_LANDSCAPE='/picture-quest/body-scene-wide-v3.webp';
// Coordinates are measured on the approved artwork, in source-image percentages.
export const BODY_SCENE_STATIONS={portrait:{1:[74.8,70.2,22.5],2:[22.1,57.8,19.3],3:[59.8,47,16.5]},landscape:{1:[60.6,70,9.2],2:[37.5,58.6,8],3:[54.1,46.7,6.5]}};
export function bodySceneEnabled(data,topic){return topic?.id==='body'&&topic.mapImageEnabled!==false&&!topic.map_image_url&&(topic.mapArt==null||topic.mapArt===11)&&data.journeyScenery!==false&&data.journeyPath!==false;}
export function bodySceneLayout(width,height){const wide=width>height*1.1,ratio=wide?1.5:870/1808,w=Math.min(width,height*ratio);return{wide,width:w,height:w/ratio};}
