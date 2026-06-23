import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';

const ALLOWED = ['admin', 'super_admin', 'teacher'];

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (!ALLOWED.includes(user.user_metadata?.role)) return null;
  return user;
}

const SEED = [
  // حيوانات
  { word:'أَسَد',      word_type:'اسم', sentence:'الأَسَدُ يَزْأَرُ في الغَابَة.',               topic:'حيوانات', grade_from:1, grade_to:6 },
  { word:'فِيل',      word_type:'اسم', sentence:'الفِيلُ يَرْفَعُ جِذْعَهُ بِخُرْطُومِه.',        topic:'حيوانات', grade_from:1, grade_to:6 },
  { word:'زَرَافَة',   word_type:'اسم', sentence:'الزَّرَافَةُ أَطْوَلُ الحَيَوَانَاتِ عُنُقًا.',   topic:'حيوانات', grade_from:1, grade_to:6 },
  { word:'قِرْد',     word_type:'اسم', sentence:'القِرْدُ يَتَسَلَّقُ الأَشْجَار.',               topic:'حيوانات', grade_from:1, grade_to:6 },
  { word:'نَمِر',     word_type:'اسم', sentence:'النَّمِرُ يَجْرِي بِسُرْعَةٍ كَبِيرَة.',         topic:'حيوانات', grade_from:1, grade_to:6 },
  { word:'دُبّ',      word_type:'اسم', sentence:'الدُّبُّ يَسْبَحُ فِي النَّهر.',                 topic:'حيوانات', grade_from:1, grade_to:6 },
  { word:'أَرْنَب',   word_type:'اسم', sentence:'الأَرْنَبُ يَأْكُلُ الجَزَر.',                  topic:'حيوانات', grade_from:1, grade_to:6 },
  { word:'بَطَّة',    word_type:'اسم', sentence:'البَطَّةُ تَسْبَحُ فِي البُرْكَة.',              topic:'حيوانات', grade_from:1, grade_to:6 },
  { word:'دَجَاجَة',  word_type:'اسم', sentence:'الدَّجَاجَةُ تَبِيضُ كُلَّ يَوم.',               topic:'حيوانات', grade_from:1, grade_to:6 },
  { word:'سَمَكَة',   word_type:'اسم', sentence:'السَّمَكَةُ تَعِيشُ فِي المَاء.',               topic:'حيوانات', grade_from:1, grade_to:6 },
  // فاكهة
  { word:'تُفَّاحَة', word_type:'اسم', sentence:'التُّفَّاحَةُ حَمْرَاءُ وَحُلْوَة.',             topic:'فاكهة',   grade_from:1, grade_to:6 },
  { word:'مَوْز',     word_type:'اسم', sentence:'المَوْزُ أَصْفَرُ اللَّوْن.',                   topic:'فاكهة',   grade_from:1, grade_to:6 },
  { word:'بُرْتُقَال',word_type:'اسم', sentence:'البُرْتُقَالُ غَنِيٌّ بِالفِيتَامِينَات.',       topic:'فاكهة',   grade_from:1, grade_to:6 },
  { word:'عِنَب',     word_type:'اسم', sentence:'العِنَبُ عَنَاقِيدُ صَغِيرَةٌ حُلْوَة.',        topic:'فاكهة',   grade_from:1, grade_to:6 },
  { word:'تَمْر',     word_type:'اسم', sentence:'التَّمْرُ فَاكِهَةُ الصَّحْرَاء.',               topic:'فاكهة',   grade_from:1, grade_to:6 },
  { word:'فَرَاوِلَة',word_type:'اسم', sentence:'الفَرَاوِلَةُ حَمْرَاءُ وَصَغِيرَة.',           topic:'فاكهة',   grade_from:1, grade_to:6 },
  { word:'بِطِّيخ',   word_type:'اسم', sentence:'البِطِّيخُ ثَمَرَةٌ كَبِيرَةٌ فِي الصَّيف.',     topic:'فاكهة',   grade_from:1, grade_to:6 },
  { word:'رُمَّان',   word_type:'اسم', sentence:'الرُّمَّانُ فَاكِهَةٌ بُذُورُهَا حَمْرَاء.',     topic:'فاكهة',   grade_from:2, grade_to:6 },
  { word:'خَوْخ',     word_type:'اسم', sentence:'الخَوْخُ فَاكِهَةٌ نَاعِمَةٌ وَلَذِيذَة.',      topic:'فاكهة',   grade_from:2, grade_to:6 },
  { word:'مِشْمِش',   word_type:'اسم', sentence:'المِشْمِشُ أَصْفَرُ اللَّوْنِ وَحُلْو.',         topic:'فاكهة',   grade_from:2, grade_to:6 },
  // خضروات
  { word:'طَمَاطِم',  word_type:'اسم', sentence:'الطَّمَاطِمُ تَدْخُلُ فِي الطَّبْخ.',            topic:'خضروات', grade_from:1, grade_to:6 },
  { word:'خِيَار',    word_type:'اسم', sentence:'الخِيَارُ خُضْرَةٌ مُنْعِشَة.',                  topic:'خضروات', grade_from:1, grade_to:6 },
  { word:'جَزَر',     word_type:'اسم', sentence:'الجَزَرُ بُرْتُقَالِيُّ اللَّوْن.',               topic:'خضروات', grade_from:1, grade_to:6 },
  { word:'بَطَاطِس',  word_type:'اسم', sentence:'البَطَاطِسُ تُقْلَى أَوْ تُطْبَخ.',              topic:'خضروات', grade_from:1, grade_to:6 },
  { word:'بَصَل',     word_type:'اسم', sentence:'البَصَلُ يُضَافُ لِلطَّعَام.',                   topic:'خضروات', grade_from:1, grade_to:6 },
  { word:'فُلْفُل',   word_type:'اسم', sentence:'الفُلْفُلُ مُلَوَّنٌ وَلَذِيذ.',                  topic:'خضروات', grade_from:2, grade_to:6 },
  { word:'بَاذِنْجَان',word_type:'اسم', sentence:'البَاذِنْجَانُ لَوْنُهُ أُرْجُوَانِيّ.',         topic:'خضروات', grade_from:2, grade_to:6 },
  { word:'كُوسَا',    word_type:'اسم', sentence:'الكُوسَا خُضْرَةٌ خَضْرَاءُ لَطِيفَة.',          topic:'خضروات', grade_from:2, grade_to:6 },
  { word:'ثُوم',      word_type:'اسم', sentence:'الثُّومُ يُضَافُ لِلطَّعَامِ لِلنَّكْهَة.',       topic:'خضروات', grade_from:2, grade_to:6 },
  { word:'سَبَانِخ',  word_type:'اسم', sentence:'السَّبَانِخُ تُقَوِّي الجِسْم.',                  topic:'خضروات', grade_from:2, grade_to:6 },
  // مدرسة
  { word:'كِتَاب',    word_type:'اسم', sentence:'أَقْرَأُ الكِتَابَ كُلَّ يَوم.',                  topic:'مدرسة',  grade_from:1, grade_to:6 },
  { word:'قَلَم',     word_type:'اسم', sentence:'أَكْتُبُ بِالقَلَمِ فِي الدَّفْتَر.',            topic:'مدرسة',  grade_from:1, grade_to:6 },
  { word:'مِسْطَرَة', word_type:'اسم', sentence:'أَرْسُمُ بِالمِسْطَرَةِ خَطًّا مُسْتَقِيمًا.',  topic:'مدرسة',  grade_from:1, grade_to:6 },
  { word:'مُدَرِّس',  word_type:'اسم', sentence:'المُدَرِّسُ يَشْرَحُ الدَّرْسَ لِلطُّلَّاب.',    topic:'مدرسة',  grade_from:1, grade_to:6 },
  { word:'طَالِب',    word_type:'اسم', sentence:'الطَّالِبُ يُذَاكِرُ دُرُوسَه.',                  topic:'مدرسة',  grade_from:1, grade_to:6 },
  { word:'لَوْحَة',   word_type:'اسم', sentence:'المُدَرِّسُ يَكْتُبُ عَلَى اللَّوْحَة.',          topic:'مدرسة',  grade_from:1, grade_to:6 },
  { word:'حَقِيبَة',  word_type:'اسم', sentence:'أَحْمِلُ الكُتُبَ فِي الحَقِيبَة.',               topic:'مدرسة',  grade_from:1, grade_to:6 },
  { word:'مَقَصّ',    word_type:'اسم', sentence:'قَصَصْتُ الوَرَقَةَ بِالمَقَصّ.',                topic:'مدرسة',  grade_from:1, grade_to:6 },
  { word:'دَفْتَر',   word_type:'اسم', sentence:'أَكْتُبُ الوَاجِبَ فِي الدَّفْتَر.',              topic:'مدرسة',  grade_from:1, grade_to:6 },
  { word:'مِمْحَاة',  word_type:'اسم', sentence:'أَمْحُو الخَطَأَ بِالمِمْحَاة.',                  topic:'مدرسة',  grade_from:1, grade_to:6 },
  // طبيعة
  { word:'شَمْس',     word_type:'اسم', sentence:'الشَّمْسُ تُشْرِقُ كُلَّ صَبَاح.',               topic:'طبيعة',  grade_from:1, grade_to:6 },
  { word:'قَمَر',     word_type:'اسم', sentence:'القَمَرُ يُضِيءُ اللَّيْل.',                      topic:'طبيعة',  grade_from:1, grade_to:6 },
  { word:'نَجْمَة',   word_type:'اسم', sentence:'النَّجْمَةُ تَلْمَعُ فِي السَّمَاء.',              topic:'طبيعة',  grade_from:1, grade_to:6 },
  { word:'سَحَابَة',  word_type:'اسم', sentence:'السَّحَابَةُ تَحْمِلُ المَطَر.',                   topic:'طبيعة',  grade_from:1, grade_to:6 },
  { word:'مَطَر',     word_type:'اسم', sentence:'المَطَرُ يَسْقِي الأَرْض.',                       topic:'طبيعة',  grade_from:1, grade_to:6 },
  { word:'بَحْر',     word_type:'اسم', sentence:'البَحْرُ وَاسِعٌ وَجَمِيل.',                      topic:'طبيعة',  grade_from:1, grade_to:6 },
  { word:'جَبَل',     word_type:'اسم', sentence:'الجَبَلُ عَالٍ وَشَامِخ.',                        topic:'طبيعة',  grade_from:1, grade_to:6 },
  { word:'نَهْر',     word_type:'اسم', sentence:'النَّهْرُ يَجْرِي بَيْنَ الأَشْجَار.',             topic:'طبيعة',  grade_from:1, grade_to:6 },
  { word:'شَجَرَة',   word_type:'اسم', sentence:'الشَّجَرَةُ تُعْطِينَا الهَوَاءَ النَّقِيّ.',      topic:'طبيعة',  grade_from:1, grade_to:6 },
  { word:'زَهْرَة',   word_type:'اسم', sentence:'الزَّهْرَةُ تُزَيِّنُ الحَدِيقَة.',               topic:'طبيعة',  grade_from:1, grade_to:6 },
];

export async function GET(request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic');

  let q = admin.from('lexicon_words').select('*').order('topic').order('word');
  if (topic) q = q.eq('topic', topic);

  const { data, error } = await q.limit(500);
  if (error?.code === '42P01') return NextResponse.json({ words: [], need_sql: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ words: data || [] });
}

export async function POST(request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const body  = await request.json();
  const admin = createAdminClient();

  if (body.seed) {
    const { error } = await admin
      .from('lexicon_words')
      .upsert(SEED, { onConflict: 'word', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: SEED.length });
  }

  const { word, word_type, sentence, topic, grade_from, grade_to } = body;
  if (!word?.trim()) return NextResponse.json({ error: 'الكلمة مطلوبة' }, { status: 400 });

  const { data, error } = await admin
    .from('lexicon_words')
    .insert({ word: word.trim(), word_type: word_type || null, sentence: sentence || null, topic: topic || 'عام', grade_from: grade_from || 1, grade_to: grade_to || 6 })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ word: data });
}

export async function PUT(request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { id, word, word_type, sentence, topic, grade_from, grade_to } = await request.json();
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('lexicon_words')
    .update({ word, word_type: word_type || null, sentence: sentence || null, topic: topic || 'عام', grade_from: grade_from || 1, grade_to: grade_to || 6 })
    .eq('id', id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ word: data });
}

export async function DELETE(request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('lexicon_words').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
