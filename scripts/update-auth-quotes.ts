import * as fs from 'fs';
import * as path from 'path';

const translations: Record<string, { quoteText: string; quoteSubtext: string }> = {
  en: {
    quoteText: 'Your business deserves a plan as ambitious as you are.',
    quoteSubtext: "Built for India's Real Economy",
  },
  hi: {
    quoteText: 'आपका व्यवसाय आपकी ही तरह महत्वाकांक्षी योजना का हकदार है।',
    quoteSubtext: 'भारत की वास्तविक अर्थव्यवस्था के लिए निर्मित',
  },
  bn: {
    quoteText: 'আপনার ব্যবসা আপনার মতোই উচ্চাভিলাষী একটি পরিকল্পনার যোগ্য।',
    quoteSubtext: 'ভারতের প্রকৃত অর্থনীতির জন্য নির্মিত',
  },
  as: {
    quoteText: 'আপোনাৰ ব্যৱসায় আপোনাৰ দৰেই অভিলাষী পৰিকল্পনাৰ যোগ্য।',
    quoteSubtext: 'ভাৰতৰ প্ৰকৃত অৰ্থনীতিৰ বাবে নিৰ্মিত',
  },
  brx: {
    quoteText: 'नोंथांनि फालांगिया नोंथांनि बादिनो गिदिर आचिंनि हकदार।',
    quoteSubtext: 'भारतनि आथिखाल रांखान्थिनि थाखाय बानायनाय',
  },
  doi: {
    quoteText: 'तुंदा बपार तुंदे वांगर इक बड्डी योजना दा हकदार ऐ।',
    quoteSubtext: 'भारत दी असली अर्थव्यवस्था लेई तैआर',
  },
  gu: {
    quoteText: 'તમારો વ્યવસાય તમારા જેટલો જ મહત્વાકાંક્ષી આયોજન માટે યોગ્ય છે.',
    quoteSubtext: 'ભારતની વાસ્તવિક અર્થવ્યવસ્થા માટે નિર્મિત',
  },
  kn: {
    quoteText: 'ನಿಮ್ಮ ವ್ಯಾಪಾರವು ನಿಮ್ಮಷ್ಟೇ ಮಹತ್ವಾಕಾಂಕ್ಷೆಯ ಯೋಜನೆಗೆ ಅರ್ಹವಾಗಿದೆ.',
    quoteSubtext: 'ಭಾರತದ ನೈಜ ಆರ್ಥಿಕತೆಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ',
  },
  ks: {
    quoteText: 'تہنٛد کاروبار چھُ تہنٛد پٲٹھۍ اکھ بوڑ منصوٗبہٕ حَقدار۔',
    quoteSubtext: 'ہِندوستان چہِ اَصٕل مَعیشَت خٲطرٕ تیار',
  },
  kok: {
    quoteText: 'तुमचो वेवसाय तुमच्या भशेनूच व्हड येवजणेक पात्र आसा.',
    quoteSubtext: 'भारताचे खऱ्या अर्थवेवस्थे खातीर तयार',
  },
  mai: {
    quoteText: 'अहाँक व्यवसाय अहाँक जकां महत्वाकांक्षी योजनाक हकदार अछि।',
    quoteSubtext: 'भारतक वास्तविक अर्थव्यवस्था लेल निर्मित',
  },
  ml: {
    quoteText: 'നിങ്ങളുടെ ബിസിനസ്സ് നിങ്ങളെപ്പോലെ തന്നെ വലിയൊരു പദ്ധതി അർഹിക്കുന്നു.',
    quoteSubtext: 'ഇന്ത്യയുടെ യഥാർത്ഥ സമ്പദ്‌വ്യവസ്ഥയ്ക്കായി നിർമ്മിച്ചത്',
  },
  mni: {
    quoteText: 'নহাক্কী ললোন-ইতিক অসি নহাক্কুম্না চাউরবা থৌরাং অমা ফংফম থোকই।',
    quoteSubtext: 'ভারতকী শেংলবা শেন্মীৎলোনগীদমক শেম্বা',
  },
  mr: {
    quoteText: 'तुमचा व्यवसाय तुमच्याइतक्याच महत्त्वाकांक्षी योजनेस पात्र आहे.',
    quoteSubtext: 'भारताच्या वास्तविक अर्थव्यवस्थेसाठी निर्मित',
  },
  ne: {
    quoteText: 'तपाईंको व्यवसाय तपाईं जत्तिकै महत्त्वाकांक्षी योजनाको हकदार छ।',
    quoteSubtext: 'भारतको वास्तविक अर्थतन्त्रका लागि निर्मित',
  },
  or: {
    quoteText: 'ଆପଣଙ୍କ ବ୍ୟବସାୟ ଆପଣଙ୍କ ପରି ଏକ ମହତ୍ତ୍ୱାକାଂକ୍ଷୀ ଯୋଜନାର ଯୋଗ୍ୟ।',
    quoteSubtext: 'ଭାରତର ପ୍ରକୃତ ଅର୍ଥନୀତି ପାଇଁ ନିର୍ମିତ',
  },
  pa: {
    quoteText: 'ਤੁਹਾਡਾ ਕਾਰੋਬਾਰ ਤੁਹਾਡੇ ਵਾਂਗ ਹੀ ਇੱਕ ਅਭਿਲਾਸ਼ੀ ਯੋਜਨਾ ਦਾ ਹੱਕਦਾਰ ਹੈ।',
    quoteSubtext: 'ਭਾਰਤ ਦੀ ਅਸਲ ਆਰਥਿਕਤਾ ਲਈ ਬਣਾਇਆ ਗਿਆ',
  },
  sa: {
    quoteText: 'भवतः व्यवसायः भवतः इव महत्त्वाकांक्षिणीं योजनाम् अर्हति।',
    quoteSubtext: 'भारतस्य वास्तविकार्थव्यवस्थायै निर्मितम्',
  },
  sat: {
    quoteText: 'ᱟᱢᱟᱜ ᱵᱮᱯᱟᱨ ᱟᱢ ᱞᱮᱠᱟ ᱜᱮ ᱢᱟᱨᱟᱝ ᱰᱟᱦᱟᱨ ᱨᱮᱱᱟᱜ ᱦᱚᱠ ᱢᱮᱱᱟᱜ-ᱟ᱾',
    quoteSubtext: 'ᱵᱷᱟᱨᱚᱛ ᱨᱮᱱᱟᱜ ᱟᱥᱚᱞ ᱠᱟᱹᱣᱰᱤ ᱟᱹᱨᱤ ᱞᱟᱹᱜᱤᱫ ᱵᱮᱱᱟᱣ',
  },
  sd: {
    quoteText: 'توهان جو ڪاروبار توهان وانگر هڪ وڏي رٿابندي جو حقدار آهي.',
    quoteSubtext: 'ڀارت جي حقيقي معيشت لاءِ تيار',
  },
  ta: {
    quoteText: 'உங்கள் தொழில் உங்களைப் போலவே லட்சியமிக்க ஒரு திட்டத்திற்கு தகுதியானது.',
    quoteSubtext: 'இந்தியாவின் உண்மையான பொருளாதாரத்திற்காக உருவாக்கப்பட்டது',
  },
  te: {
    quoteText: 'మీ వ్యాపారం మీలాగే ప్రతిష్టాత్మకమైన ప్రణాళికకు అర్హమైనది.',
    quoteSubtext: 'భారతదేశ నిజమైన ఆర్థిక వ్యవస్థ కోసం నిర్మించబడింది',
  },
  ur: {
    quoteText: 'آپ کا کاروبار آپ ہی کی طرح ایک پرعزم منصوبے کا مستحق ہے۔',
    quoteSubtext: 'ہندوستان کی حقیقی معیشت کے لیے تیار کردہ',
  },
};

// Update JSON files
const localesDir = path.resolve(process.cwd(), 'src/i18n/locales');
for (const [code, val] of Object.entries(translations)) {
  const jsonPath = path.join(localesDir, `${code}.json`);
  if (fs.existsSync(jsonPath)) {
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!json.auth) json.auth = {};
    json.auth.quoteText = val.quoteText;
    json.auth.quoteSubtext = val.quoteSubtext;
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');
    console.log(`Updated ${code}.json`);
  }
}
