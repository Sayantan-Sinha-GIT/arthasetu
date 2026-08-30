import * as fs from 'fs';
import * as path from 'path';

const VOICE_TRANSLATIONS: Record<string, { selectLanguage: string; speechLanguage: string }> = {
  en: { selectLanguage: 'Select speech language', speechLanguage: 'Voice Language' },
  hi: { selectLanguage: 'आवाज़ की भाषा चुनें', speechLanguage: 'वॉयस भाषा' },
  bn: { selectLanguage: 'ভয়েস ভাষা নির্বাচন করুন', speechLanguage: 'ভয়েস ভাষা' },
  as: { selectLanguage: 'কণ্ঠৰ ভাষা বাছক', speechLanguage: 'কণ্ঠৰ ভাষা' },
  brx: { selectLanguage: 'राव सायखनाय', speechLanguage: 'खुगायाव बुंनाय राव' },
  doi: { selectLanguage: 'बोली दी भाशा चुनो', speechLanguage: 'आवाज़ भाशा' },
  gu: { selectLanguage: 'બોલવાની ભાષા પસંદ કરો', speechLanguage: 'અવાજની ભાષા' },
  kn: { selectLanguage: 'ಧ್ವನಿ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ', speechLanguage: 'ಧ್ವನಿ ಭಾಷೆ' },
  ks: { selectLanguage: 'آوازٕچ زَبانہٕ ژارِو', speechLanguage: 'آوازٕچ زَبان' },
  kok: { selectLanguage: 'उलोवपाची भास वेचून काढा', speechLanguage: 'आवाजाची भास' },
  mai: { selectLanguage: 'आवाज केर भाषा चुनू', speechLanguage: 'आवाज भाषा' },
  ml: { selectLanguage: 'വോയ്സ് ഭാഷ തിരഞ്ഞെടുക്കുക', speechLanguage: 'വോയ്സ് ഭാഷ' },
  mni: { selectLanguage: 'ৱাফোইগী লোন খনবা', speechLanguage: 'খোল্লাউ লোন' },
  mr: { selectLanguage: 'आवाजाची भाषा निवडा', speechLanguage: 'आवाज भाषा' },
  ne: { selectLanguage: 'आवाजको भाषा छान्नुहोस्', speechLanguage: 'आवाज भाषा' },
  or: { selectLanguage: 'ଭଏସ୍ ଭାଷା ଚୟନ କରନ୍ତୁ', speechLanguage: 'ଭଏସ୍ ଭାଷା' },
  pa: { selectLanguage: 'ਆਵਾਜ਼ ਦੀ ਭਾਸ਼ਾ ਚੁਣੋ', speechLanguage: 'ਆਵਾਜ਼ ਭਾਸ਼ਾ' },
  sa: { selectLanguage: 'ध्वनिभाषां चिनोतु', speechLanguage: 'ध्वनिभाषा' },
  sat: { selectLanguage: 'ᱨᱚᱲ ᱨᱮᱱᱟᱜ ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ ᱢᱮ', speechLanguage: 'ᱨᱚᱲ ᱯᱟᱹᱨᱥᱤ' },
  sd: { selectLanguage: 'آواز جي ٻولي چونڊيو', speechLanguage: 'آواز جي ٻولي' },
  ta: { selectLanguage: 'குரல் மொழியைத் தேர்ந்தெடுக்கவும்', speechLanguage: 'குரல் மொழி' },
  te: { selectLanguage: 'వాయిస్ భాషను ఎంచుకోండి', speechLanguage: 'వాయిస్ భాష' },
  ur: { selectLanguage: 'آواز کی زبان منتخب کریں', speechLanguage: 'آواز کی زبان' },
};

const localesDir = path.join(process.cwd(), 'src/i18n/locales');
const files = fs.readdirSync(localesDir);

for (const file of files) {
  if (!file.endsWith('.json')) continue;
  const lang = file.replace('.json', '');
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const t = VOICE_TRANSLATIONS[lang] || VOICE_TRANSLATIONS.en;
  if (!data.voice) data.voice = {};
  data.voice.selectLanguage = t.selectLanguage;
  data.voice.speechLanguage = t.speechLanguage;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('Successfully updated:', file);
}

console.log('All 23 locale JSONs updated with voice keys.');
