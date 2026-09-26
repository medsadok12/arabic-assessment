import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient }      from '../../../../lib/supabase-server';
import { getRole } from '../../../../lib/auth-role';

export const dynamic = 'force-dynamic';

export const DEFAULT_CATALOG = [
  { level:1, wheel_index:0, center:'م', letters:['ك','ت','ب','ر','س','ن','ل','د'], time:120, valid_words:['تمر','سمك','نمر','رمل','سلم','مدرس','مكتب','مسكن'] },
  { level:1, wheel_index:1, center:'ل', letters:['ع','ب','م','ك','ت','ر','ف','ن'], time:120, valid_words:['لعب','ملك','علم','نمل','رمل','لبن','ملعب','تعلم'] },
  { level:1, wheel_index:2, center:'ر', letters:['د','م','س','ب','ن','ك','ت','ل'], time:120, valid_words:['نسر','برد','كرم','درس','رمل','سكر','ركب','مدرس','منبر'] },
  { level:1, wheel_index:3, center:'ن', letters:['م','ل','ر','س','ب','ع','ت','ف'], time:120, valid_words:['نمر','نسر','نبت','لبن','سمن','فرن','نبل','منبر','تمرن'] },
  { level:1, wheel_index:4, center:'س', letters:['م','ر','ل','ن','ت','ب','ع','ك'], time:120, valid_words:['سمك','نسر','سلم','مسكن','ملبس','سبع','سكن','كنس','تسمع'] },
  { level:2, wheel_index:0, center:'ع', letters:['ل','م','ب','ر','ق','ش','ف','ت'], time:90,  valid_words:['لعب','علم','عمل','فعل','شعر','عقل','ملعب','مربع','تعلم'] },
  { level:2, wheel_index:1, center:'ق', letters:['ر','ل','م','ب','س','ن','ت','ع'], time:90,  valid_words:['قمر','قلب','عقل','نقل','بقل','سبق','قرن'] },
  { level:2, wheel_index:2, center:'ف', letters:['ر','م','ع','ل','ت','ن','ك','ب'], time:90,  valid_words:['فرن','فكر','فلك','ملف','كتف','فعل','فرع','تفكر','تفرع'] },
  { level:2, wheel_index:3, center:'ح', letters:['م','ب','ر','ل','س','ن','ت','ك'], time:90,  valid_words:['بحر','محل','ملح','لحم','سبح','حبل','حمل','مسبح','حلب'] },
  { level:2, wheel_index:4, center:'ش', letters:['ر','م','س','ع','ق','ل','ب','ن'], time:90,  valid_words:['شمس','شبل','شعر','نشر','بشر','شمع','شعب','شرق','قشر','مشرق','منشر'] },
  { level:3, wheel_index:0, center:'خ', letters:['ر','م','ب','ل','ع','ش','ق','ت'], time:75,  valid_words:['خبر','بخل','خلق','خشب','خلع','بخر','مخبر','تخلق'] },
  { level:3, wheel_index:1, center:'ذ', letters:['ر','م','ك','ب','ل','ع','ت','ن'], time:75,  valid_words:['ذكر','بذل','نبذ','مذكر','تذكر','منذر'] },
  { level:3, wheel_index:2, center:'غ', letters:['ر','م','ب','ل','ع','ش','ف','ن'], time:75,  valid_words:['غنم','نغم','بلغ','فرغ','شغل','غمر','مغرب','شغف','مشغل'] },
  { level:3, wheel_index:3, center:'ض', letters:['ر','م','ب','ل','ع','ك','ن','ت'], time:75,  valid_words:['ضرب','عرض','ضمن','بعض','تضمن','ضلع','مضرب'] },
  { level:3, wheel_index:4, center:'ط', letters:['ر','م','ب','ل','ع','ك','ن','ي'], time:75,  valid_words:['طبل','طيب','طير','بطل','طلب','طلع','مطلع','طمر'] },
  { level:4, wheel_index:0, center:'ظ', letters:['ر','م','ب','ل','ع','ك','ن','ف'], time:60,  valid_words:['ظفر','ظلم','عظم','نظر','ظرف','لفظ','منظر'] },
  { level:4, wheel_index:1, center:'ث', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['ثعلب','ثمر','ثمن','لبث','بعث'] },
  { level:4, wheel_index:2, center:'ج', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['جمل','جبل','نجم','فجر','برج','عجل','رجل','منجل'] },
  { level:4, wheel_index:3, center:'ص', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['صبر','نصر','صفر','صلب','صنف','نصل','فصل','عصر','مصنع','منصب'] },
  { level:4, wheel_index:4, center:'ز', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['رمز','كنز','زمن','نزل','فرز','برز','ركز','منزل','مركز'] },
];

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('word_wheel_catalog').select('*');
    if (error && error.code !== '42P01') throw error;

    const overrides = {};
    (data || []).forEach(row => { overrides[`${row.level}_${row.wheel_index}`] = row; });

    const merged = DEFAULT_CATALOG.map(wheel => {
      const ov = overrides[`${wheel.level}_${wheel.wheel_index}`];
      if (!ov) return wheel;
      return {
        ...wheel,
        valid_words:  ov.valid_words   ?? wheel.valid_words,
        time:         ov.time_seconds  ?? wheel.time,
        letters:      ov.outer_letters?.length ? ov.outer_letters : wheel.letters,
        center:       ov.center_letter || wheel.center,
      };
    });
    return NextResponse.json({ catalog: merged });
  } catch {
    return NextResponse.json({ catalog: DEFAULT_CATALOG });
  }
}

export async function PUT(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !['teacher','admin','super_admin'].includes(getRole(user)))
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const { level, wheel_index, valid_words, center_letter, outer_letters, time_seconds } = await req.json();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('word_wheel_catalog')
      .upsert({ level, wheel_index, valid_words, center_letter, outer_letters, time_seconds, updated_at: new Date().toISOString() },
              { onConflict: 'level,wheel_index' })
      .select().single();

    if (error) {
      if (error.code === '42P01')
        return NextResponse.json({ error: 'جدول word_wheel_catalog غير موجود — شغّل SQL الإعداد أولاً', need_sql: true }, { status: 500 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ wheel: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
