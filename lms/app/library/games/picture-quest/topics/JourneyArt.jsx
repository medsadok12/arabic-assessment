import{Trophy}from'lucide-react';
import{journeyArt,journeySprite}from'../../../../../lib/picture-quest-journey';
export default function JourneyArt({topic,index,className=''}){
 if(topic?.mapImageEnabled===false)return null;
 if(topic?.map_image_url)return <img className={'pqj-custom '+className} src={topic.map_image_url} alt="" draggable={false} loading="lazy"/>;
 if(topic?.id==='final')return <span className={'pqj-final-art '+className} aria-hidden="true"><Trophy/></span>;
 const art=index??journeyArt(topic);
 // Shared by the map, entrance and teacher preview; the retired tile stays blocked.
 if(art===11)return <img className={'pqj-custom '+className} data-body-gate="" src="/picture-quest/body-gate-v2.webp" alt="" draggable={false} decoding="async" width={768} height={768}/>;
 return <span className={'pqj-sprite '+className} style={journeySprite(art)} aria-hidden="true"/>;
}
