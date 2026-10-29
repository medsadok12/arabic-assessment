import { Armchair,LampFloor,Frame,Flower2,Sprout,CloudSun,PawPrint,Rabbit,Bird,Fish,Shell,Sailboat,BookOpen,Pencil,Ruler,Apple,Cherry,Grape,CookingPot,CupSoda,Utensils,Sun,CloudMoon,Snowflake,Hand,Heart,Footprints,Bus,Car,Bike,Shirt,Scissors,Briefcase,Wrench,Stethoscope } from 'lucide-react';
import { scrabbleTheme } from '../../../../lib/scrabble-themes';
const motifs={home:[LampFloor,Armchair,Frame],garden:[Flower2,Sprout,CloudSun],animals:[PawPrint,Rabbit,Bird],school:[BookOpen,Pencil,Ruler],fruit:[Apple,Cherry,Grape],kitchen:[CookingPot,CupSoda,Utensils],sea:[Fish,Shell,Sailboat],weather:[Sun,CloudMoon,Snowflake],body:[Hand,Heart,Footprints],transport:[Bus,Car,Bike],clothes:[Shirt,Scissors,Shirt],jobs:[Briefcase,Wrench,Stethoscope]};
export default function Backdrop({board,opacity=14}){
 const theme=scrabbleTheme(board);if(!theme||opacity===0)return null;
 return <div className={`ss-backdrop ss-scene-${theme}`} style={{opacity:opacity/100}} aria-hidden="true" data-theme={theme}>
  {theme==='home'&&<><div className="ss-scene-window"/><div className="ss-scene-floor"/></>}
  {['garden','animals'].includes(theme)&&<><div className="ss-scene-hill"/><div className="ss-scene-hill ss-scene-other"/><div className="ss-scene-tree"/></>}
  {theme==='sea'&&<><div className="ss-scene-wave"/><div className="ss-scene-wave ss-scene-other"/></>}
  {motifs[theme].map((Icon,i)=><Icon key={i} className={`ss-scene-icon ss-scene-icon-${i}`} strokeWidth={1.15} focusable="false"/>)}
 </div>;
}
