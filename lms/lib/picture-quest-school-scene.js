export const SCHOOL_SCENE_WIDE_ART='/picture-quest/school-scene-wide-v1.webp';
export const SCHOOL_SCENE_WIDE_STATIONS={1:[944/1672*100,715/941*100,164/1672*100],2:[681/1672*100,597/941*100,128/1672*100],3:[886/1672*100,502/941*100,102/1672*100]};
export const SCHOOL_SCENE_ART='/picture-quest/school-scene-v1.webp';
export const SCHOOL_SCENE_STATIONS={1:[636/944*100,1113/1666*100,232/944*100],2:[229/944*100,933/1666*100,190/944*100],3:[548/944*100,782/1666*100,151/944*100]};
export function schoolSceneEnabled(data,topic){return topic?.id==='school'&&topic.mapImageEnabled!==false&&!topic.map_image_url&&(topic.mapArt==null||topic.mapArt===2)&&data.journeyScenery!==false&&data.journeyPath!==false;}
export function schoolSceneLayout(width,height){
 width=width||390;height=height||844;const wide=width>height*1.1,ratio=wide?1672/941:944/1666,w=wide?Math.max(width,height*ratio):Math.min(width,height*ratio),h=w/ratio;
 return{width:w,height:h,wide,left:(width-w)/2,top:(height-h)/2,viewportWidth:width,viewportHeight:height};
}
export function schoolSceneControls(layout){
 if(!layout?.wide)return{};const {width,height,viewportWidth:w,viewportHeight:h,left,top}=layout,side=h<520;
 const buttonWidth=side?Math.min(220,w*.28):Math.min(360,w*.34),actionLeft=side?w-buttonWidth-20-left:width/2-70;
 return{heading:{top:16-top,left:24-left,right:'auto'},action:{left:actionLeft,right:'auto',width:buttonWidth,bottom:20+(height-h)/2},trial:{left:side?actionLeft:actionLeft-210,right:'auto',bottom:(side?92:26)+(height-h)/2,transform:'none',width:side?buttonWidth:190}};
}
