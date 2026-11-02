// Three published starter worlds: 30 learning words + 3 final-only words each.
// Extra candidates keep final words new if a teacher already used a reserved label.
// [stable key, vocalised label, grammatical gender, emoji, optional existing SVG]
export const QUEST_WORLD_CONTENT={
 animals:[
 ['cat','قِطٌّ','m','🐈'],['dog','كَلْبٌ','m','🐕'],['rabbit','أَرْنَبٌ','m','🐇'],['fish','سَمَكَةٌ','f','🐟'],['bird','عُصْفُورٌ','m','🐦'],
 ['horse','حِصَانٌ','m','🐎'],['cow','بَقَرَةٌ','f','🐄'],['lion','أَسَدٌ','m','🦁'],['elephant','فِيلٌ','m','🐘'],['giraffe','زَرَافَةٌ','f','🦒'],['monkey','قِرْدٌ','m','🐒'],['bear','دُبٌّ','m','🐻'],['sheep','خَرُوفٌ','m','🐑'],['goat','مَاعِزٌ','m','🐐'],['camel','جَمَلٌ','m','🐪'],
 ['donkey','حِمَارٌ','m','','/picture-quest/content-donkey.svg'],['hen','دَجَاجَةٌ','f','🐔'],['rooster','دِيكٌ','m','🐓'],['duck','بَطَّةٌ','f','🦆'],['goose','إِوَزَّةٌ','f','','/picture-quest/content-goose.svg'],['bee','نَحْلَةٌ','f','🐝'],['butterfly','فَرَاشَةٌ','f','🦋'],['ant','نَمْلَةٌ','f','🐜'],['fly','ذُبَابَةٌ','f','🪰'],['mosquito','بَعُوضَةٌ','f','🦟'],['crocodile','تِمْسَاحٌ','m','🐊'],['fox','ثَعْلَبٌ','m','🦊'],['wolf','ذِئْبٌ','m','🐺'],['tiger','نَمِرٌ','m','🐅'],['penguin','بِطْرِيقٌ','m','🐧'],
 ['deer','غَزَالٌ','m','🦌'],['turtle','سُلَحْفَاةٌ','f','🐢'],['hedgehog','قُنْفُذٌ','m','🦔'],
 ['dolphin','دُلْفِينٌ','m','🐬'],['whale','حُوتٌ','m','🐋'],['panda','بَانْدَا','m','🐼'],['koala','كُوَالَا','m','🐨']
 ],
 fruit:[
 ['apple','تُفَّاحَةٌ','f','🍎'],['banana','مَوْزَةٌ','f','🍌'],['orange','بُرْتُقَالَةٌ','f','🍊'],['grapes','عِنَبٌ','m','🍇'],['watermelon','بِطِّيخٌ','m','🍉'],
 ['strawberry','فَرَاوِلَةٌ','f','🍓'],['pear','كُمَّثْرَى','f','🍐'],['pomegranate','رُمَّانٌ','m','','/picture-quest/bank-pomegranate.svg'],['lemon','لَيْمُونٌ','m','🍋'],['peach','خَوْخٌ','m','🍑'],['pineapple','أَنَانَاسٌ','m','🍍'],['mango','مَانْجُو','f','🥭'],['kiwi','كِيوِيٌّ','m','🥝'],['coconut','جَوْزُ هِنْدٍ','m','🥥'],['dates','تَمْرٌ','m','','/picture-quest/content-dates.svg'],
 ['mandarin','يُوسُفِيٌّ','m','','/picture-quest/content-mandarin.svg'],['guava','جَوَافَةٌ','f','','/picture-quest/content-guava.svg'],['mulberry','تُوتٌ','m','','/picture-quest/content-mulberry.svg'],['melon','شَمَّامٌ','m','','/picture-quest/content-melon.svg'],['papaya','بَابَايَا','f','','/picture-quest/content-papaya.svg'],['avocado','أَفُوكَادُو','f','🥑'],['plum','بَرْقُوقٌ','m','','/picture-quest/content-plum.svg'],['raisins','زَبِيبٌ','m','','/picture-quest/content-raisins.svg'],['blackberry','تُوتٌ أَسْوَدُ','m','','/picture-quest/content-blackberry.svg'],['raspberry','تُوتٌ أَحْمَرُ','m','','/picture-quest/content-raspberry.svg'],['grapefruit','جْرَيْب فْرُوت','m','','/picture-quest/content-grapefruit.svg'],['persimmon','كَاكَا','f','','/picture-quest/content-persimmon.svg'],['lychee','لِيتْشِي','m','','/picture-quest/content-lychee.svg'],['dragonfruit','فَاكِهَةُ التِّنِّينِ','f','','/picture-quest/content-dragonfruit.svg'],['blueberry','تُوتٌ أَزْرَقُ','m','🫐'],
 ['fig','تِينٌ','m','','/picture-quest/content-fig.svg'],['apricot','مِشْمِشٌ','m','','/picture-quest/content-apricot.svg'],['cherry','كَرَزٌ','m','🍒'],
 ['starfruit','فَاكِهَةُ النَّجْمِ','f','','/picture-quest/content-starfruit.svg'],['lime','لَيْمُونٌ أَخْضَرُ','m','','/picture-quest/content-lime.svg'],['white-grapes','عِنَبٌ أَخْضَرُ','m','','/picture-quest/content-green-grapes.svg']
 ],
 school:[
 ['book','كِتَابٌ','m','📘'],['pen','قَلَمٌ','m','🖊'],['bag','حَقِيبَةٌ','f','🎒'],['notebook','دَفْتَرٌ','m','📓'],['eraser','مِمْحَاةٌ','f','','/picture-quest/bank-eraser.svg'],
 ['ruler','مِسْطَرَةٌ','f','📏'],['sharpener','مِبْرَاةٌ','f','','/picture-quest/bank-sharpener.svg'],['board','سَبُّورَةٌ','f','','/picture-quest/bank-board.svg'],['scissors','مِقَصٌّ','m','✂'],['glue','غِرَاءٌ','m','','/picture-quest/content-glue.svg'],['paper','وَرَقَةٌ','f','📄'],['paintbrush','فُرْشَاةٌ','f','🖌'],['paints','أَلْوَانٌ','f','🎨'],['pencilcase','مِقْلَمَةٌ','f','','/picture-quest/content-pencilcase.svg'],['chalk','طَبْشُورٌ','m','','/picture-quest/content-chalk.svg'],
 ['computer','حَاسُوبٌ','m','💻'],['printer','طَابِعَةٌ','f','🖨'],['globe','كُرَةٌ أَرْضِيَّةٌ','f','🌍'],['map','خَرِيطَةٌ','f','🗺'],['bell','جَرَسٌ','m','🔔'],['clock','سَاعَةٌ','f','🕒'],['schoolbus','حَافِلَةٌ مَدْرَسِيَّةٌ','f','','/picture-quest/content-schoolbus.svg'],['pencil','قَلَمُ رَصَاصٍ','m','✏'],['openbook','كِتَابٌ مَفْتُوحٌ','m','📖'],['magnifier','عَدَسَةٌ مُكَبِّرَةٌ','f','🔍'],['paperclip','مِشْبَكٌ','m','📎'],['calendar','تَقْوِيمٌ','m','📅'],['envelope','ظَرْفٌ','m','✉'],['calculator','آلَةٌ حَاسِبَةٌ','f','','/picture-quest/content-calculator.svg'],['keyboard','لَوْحَةُ مَفَاتِيحَ','f','⌨'],
 ['triangle','مُثَلَّثٌ','m','','/picture-quest/content-triangle.svg'],['stapler','دَبَّاسَةٌ','f','','/picture-quest/content-stapler.svg'],['pin','دَبُّوسٌ','m','📌'],
 ['compass','بَوْصَلَةٌ','f','🧭'],['magnet','مِغْنَاطِيسٌ','m','🧲'],['microscope','مِجْهَرٌ','m','🔬']
 ]
};
export function contentImage(row){if(row[4])return row[4];const code=[...row[3]].filter(c=>c.codePointAt(0)!==0xfe0f).map(c=>c.codePointAt(0).toString(16)).join('-');return '/picture-quest/content-'+code+'.svg';}
