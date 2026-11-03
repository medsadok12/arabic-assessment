import{Trophy}from'lucide-react';
import{journeyArt,journeySprite}from'../../../../../lib/picture-quest-journey';
export default function JourneyArt({topic,index,className=''}){
 if(topic?.mapImageEnabled===false)return null;
 if(topic?.map_image_url)return <img className={'pqj-custom '+className} src={topic.map_image_url} alt="" draggable={false} loading="lazy"/>;
 if(topic?.id==='final')return <span className={'pqj-final-art '+className} aria-hidden="true"><Trophy/></span>;
 return <span className={'pqj-sprite '+className} style={journeySprite(index??journeyArt(topic))} aria-hidden="true"/>;
}
