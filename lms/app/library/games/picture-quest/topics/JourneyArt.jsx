import{Trophy}from'lucide-react';
import{journeyArt,journeySprite}from'../../../../../lib/picture-quest-journey';
export default function JourneyArt({topic,index,className=''}){
 if(topic?.mapImageEnabled===false)return null;
 if(topic?.map_image_url)return <img className={'pqj-custom '+className} src={topic.map_image_url} alt="" draggable={false} loading="lazy"/>;
 if(topic?.id==='final')return <span className={'pqj-final-art '+className} aria-hidden="true"><Trophy/></span>;
 const art=index??journeyArt(topic);
 // The retired body-world cell must never be rendered by any shared view.
 // Reuse the neutral clay learning house with an educational hand badge.
 if(art===11)return <span className={'pqj-custom '+className} data-body-learning-house="" style={{position:'relative'}} aria-hidden="true"><span className="pqj-sprite" style={{...journeySprite(3),width:'100%',height:'100%',transform:'none'}}/><img src="/picture-quest/curriculum-v1/body-02.svg" alt="" draggable={false} style={{position:'absolute',left:'33%',top:'35%',width:'34%',height:'34%',objectFit:'contain',padding:'4%',boxSizing:'border-box',border:'2px solid #E8B84B',borderRadius:'16%',background:'#FFF5DC'}}/></span>;
 return <span className={'pqj-sprite '+className} style={journeySprite(art)} aria-hidden="true"/>;
}
