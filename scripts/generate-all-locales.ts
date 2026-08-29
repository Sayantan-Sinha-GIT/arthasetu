import * as fs from 'fs';
import { resolve } from 'path';
import { SUPPORTED_LANGUAGES } from '../src/i18n/languages';
import en from '../src/i18n/en';
import hi from '../src/i18n/hi';
import bn from '../src/i18n/bn';

const localesDir = resolve(process.cwd(), 'src/i18n/locales');
if (!fs.existsSync(localesDir)) {
  fs.mkdirSync(localesDir, { recursive: true });
}

// Write human-verified ones first
fs.writeFileSync(resolve(localesDir, 'en.json'), JSON.stringify(en, null, 2));
fs.writeFileSync(resolve(localesDir, 'hi.json'), JSON.stringify(hi, null, 2));
fs.writeFileSync(resolve(localesDir, 'bn.json'), JSON.stringify(bn, null, 2));

// Language specific translations mapping key UI terms
const languageTerms: Record<string, { appName: string; advisor: string; planner: string; schemes: string; dashboard: string; welcome: string }> = {
  as: { appName: 'অর্থসেতু (ArthaSetu)', advisor: 'অর্থসেতু সোধক', planner: 'বিত্তীয় পৰিকল্পনা', schemes: 'চৰকাৰী আঁচনিসমূহ', dashboard: 'ডেচবৰ্ড', welcome: 'স্বাগতম' },
  mr: { appName: 'अर्थसेतू (ArthaSetu)', advisor: 'अर्थसेतू विचारा', planner: 'आर्थिक नियोजन', schemes: 'शासकीय योजना', dashboard: 'डॅशबोर्ड', welcome: 'स्वागत आहे' },
  gu: { appName: 'અર્થસેતુ (ArthaSetu)', advisor: 'અર્થસેતુને પૂછો', planner: 'નાણાકીય યોજના', schemes: 'સરકારી યોજનાઓ', dashboard: 'ડેશબોર્ડ', welcome: 'સ્વાગત છે' },
  ta: { appName: 'அர்த்தசேது (ArthaSetu)', advisor: 'அர்த்தசேதுவிடம் கேளுங்கள்', planner: 'நிதித் திட்டம்', schemes: 'அரசு திட்டங்கள்', dashboard: 'டாஷ்போர்டு', welcome: 'வணக்கம்' },
  te: { appName: 'అర్థసేతు (ArthaSetu)', advisor: 'అర్థసేతును అడగండి', planner: 'ఆర్థిక ప్రణాళిక', schemes: 'ప్రభుత్వ పథకాలు', dashboard: 'డ్యాష్‌బోర్డ్', welcome: 'స్వాగతం' },
  kn: { appName: 'ಅರ್ಥಸೇತು (ArthaSetu)', advisor: 'ಅರ್ಥಸೇತುವನ್ನು ಕೇಳಿ', planner: 'ಹಣಕಾಸು ಯೋಜನೆ', schemes: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು', dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', welcome: 'ಸ್ವಾಗತ' },
  ml: { appName: 'അർത്ഥസേതു (ArthaSetu)', advisor: 'അർത്ഥസേതുവിനോട് ചോദിക്കുക', planner: 'സാമ്പത്തിക പദ്ധതി', schemes: 'സർക്കാർ പദ്ധതികൾ', dashboard: 'ഡാഷ്‌ബോർഡ്', welcome: 'സ്വാഗതം' },
  or: { appName: 'ଅର୍ଥସେତୁ (ArthaSetu)', advisor: 'ଅର୍ଥସେତୁକୁ ପଚାରନ୍ତୁ', planner: 'ଆର୍ଥିକ ଯୋଜନା', schemes: 'ସରକାରୀ ଯୋଜନା', dashboard: 'ଡ୍ୟାସବୋର୍ଡ', welcome: 'ସ୍ୱାଗତ' },
  pa: { appName: 'ਅਰਥਸੇਤੂ (ArthaSetu)', advisor: 'ਅਰਥਸੇਤੂ ਨੂੰ ਪੁੱਛੋ', planner: 'ਵਿੱਤੀ ਯੋਜਨਾ', schemes: 'ਸਰਕਾਰੀ ਸਕੀਮਾਂ', dashboard: 'ਡੈਸ਼ਬੋਰਡ', welcome: 'ਜੀ ਆਇਆਂ ਨੂੰ' },
  ur: { appName: 'ارتھ سیتو (ArthaSetu)', advisor: 'ارتھ سیتو سے پوچھیں', planner: 'مالی منصوبہ', schemes: 'سرکاری اسکیمیں', dashboard: 'ڈیش بورڈ', welcome: 'خوش آمدید' },
  sa: { appName: 'अर्थसेतुः (ArthaSetu)', advisor: 'अर्थसेतुं पृच्छतु', planner: 'वित्तीययोजना', schemes: 'शासकीययोजनाः', dashboard: 'नियन्त्रणपट्टिका', welcome: 'स्वागतम्' },
  ne: { appName: 'अर्थसेतु (ArthaSetu)', advisor: 'अर्थसेतुलाई सोध्नुहोस्', planner: 'वित्तीय योजना', schemes: 'सरकारी योजनाहरू', dashboard: 'ड्यासबोर्ड', welcome: 'स्वागत छ' },
  mai: { appName: 'अर्थसेतु (ArthaSetu)', advisor: 'अर्थसेतु सँ पुछू', planner: 'वित्तीय योजना', schemes: 'सरकारी योजना सभ', dashboard: 'डैशबोर्ड', welcome: 'स्वागत अछि' },
  kok: { appName: 'अर्थसेतू (ArthaSetu)', advisor: 'अर्थसेतू विचारात', planner: 'आर्थिक येवजण', schemes: 'सरकारी येवजण्यो', dashboard: 'डॅशबोर्ड', welcome: 'येवकार' },
  ks: { appName: 'ارتھ سیتو (ArthaSetu)', advisor: 'ارتھ سیتو پُژھیو', planner: 'مالیاتی منصوبہ', schemes: 'سرکٲرؠ سکیٖمہٕ', dashboard: 'ڈیش بورڈ', welcome: 'خوش آمدید' },
  doi: { appName: 'अर्थसेतू (ArthaSetu)', advisor: 'अर्थसेतू गी पुछो', planner: 'माली योजना', schemes: 'सरकारी स्कीमां', dashboard: 'डैशबोर्ड', welcome: 'स्वागत ऐ' },
  brx: { appName: 'आरथासेतु (ArthaSetu)', advisor: 'आरथासेतुखौ सों', planner: 'रां-खान्थि येवजोना', schemes: 'सोरखारि बिथांखिफोर', dashboard: 'देसबर्ड', welcome: 'बरायबाय' },
  mni: { appName: 'অৰ্থসেতু (ArthaSetu)', advisor: 'অৰ্থসেতুদা হংবিয়ু', planner: 'শেল-থুমগী থৌরাং', schemes: 'লৈঙাক্কী স্কীমশিং', dashboard: 'দ্যাশবোর্ড', welcome: 'তরাম্না ওকচরি' },
  sat: { appName: 'ᱟᱨᱛᱷᱟᱥᱮᱛᱩ (ArthaSetu)', advisor: 'ᱟᱨᱛᱷᱟᱥᱮᱛᱩ ᱠᱩᱞᱤᱭᱮᱢᱮ', planner: 'ᱠᱟᱹᱣᱰᱤ ᱯᱞᱟᱱ', schemes: 'ᱥᱚᱨᱠᱟᱨᱤ ᱟᱪᱚᱨ', dashboard: 'ᱰᱮᱥᱵᱳᱨᱰ', welcome: 'ᱡᱚᱦᱟᱨ' },
  sd: { appName: 'ارٿ سيتو (ArthaSetu)', advisor: 'ارٿ سيتو کان پڇو', planner: 'مالياتي رٿابندي', schemes: 'سرڪاري اسڪيمون', dashboard: 'ڊيش بورڊ', welcome: 'ڀلي ڪري آيا' },
};

// Generate JSON for all languages with structured overrides
for (const lang of SUPPORTED_LANGUAGES) {
  if (lang.code === 'en' || lang.code === 'hi' || lang.code === 'bn') continue;

  const baseTerms = languageTerms[lang.code] || {
    appName: `${lang.nativeName} - ArthaSetu`,
    advisor: `Ask ArthaSetu (${lang.nativeName})`,
    planner: `Financial Plan (${lang.nativeName})`,
    schemes: `Government Schemes (${lang.nativeName})`,
    dashboard: 'Dashboard',
    welcome: 'Welcome',
  };

  // Clone english as template, override key localized headers
  const localeData: any = JSON.parse(JSON.stringify(en));
  localeData.appName = baseTerms.appName;
  localeData.nav.dashboard = baseTerms.dashboard;
  localeData.nav.advisor = baseTerms.advisor;
  localeData.nav.planner = baseTerms.planner;
  localeData.nav.schemes = baseTerms.schemes;
  localeData.dashboard.welcome = `${baseTerms.welcome},`;
  localeData.dashboard.askAI = baseTerms.advisor;
  localeData.dashboard.createPlan = baseTerms.planner;
  localeData.dashboard.findSchemes = baseTerms.schemes;
  localeData.advisor.title = baseTerms.advisor;
  localeData.planner.title = baseTerms.planner;
  localeData.schemes.title = baseTerms.schemes;

  // Metadata flag
  localeData._meta = {
    languageCode: lang.code,
    languageName: lang.name,
    nativeName: lang.nativeName,
    isMachineTranslated: lang.isMachineTranslated,
    status: lang.status,
  };

  fs.writeFileSync(resolve(localesDir, `${lang.code}.json`), JSON.stringify(localeData, null, 2));
  console.log(`✅ Generated locale: ${lang.code} (${lang.name} - ${lang.status})`);
}

console.log('🎉 All 22 Indian scheduled languages + English generated successfully in src/i18n/locales!');
