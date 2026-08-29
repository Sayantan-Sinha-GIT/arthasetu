// ─── All 22 Scheduled Indian Languages + English Master Registry ───

export interface LanguageMeta {
  code: string;
  name: string; // English name
  nativeName: string; // Native script
  speechCode: string; // BCP-47 speech recognition / synthesis code
  isMachineTranslated: boolean;
  status: 'human_verified' | 'machine_translated';
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-IN', isMachineTranslated: false, status: 'human_verified' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN', isMachineTranslated: false, status: 'human_verified' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', speechCode: 'as-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN', isMachineTranslated: false, status: 'human_verified' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', speechCode: 'brx-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', speechCode: 'doi-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', speechCode: 'gu-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कॉशुर / کٲشُر', speechCode: 'ks-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', speechCode: 'kok-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', speechCode: 'mai-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', speechCode: 'ml-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'mni', name: 'Manipuri (Meitei)', nativeName: 'মৈতৈলোন্', speechCode: 'mni-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', speechCode: 'ne-NP', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', speechCode: 'or-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', speechCode: 'sa-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', speechCode: 'sat-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي / सिन्धी', speechCode: 'sd-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechCode: 'te-IN', isMachineTranslated: true, status: 'machine_translated' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', speechCode: 'ur-IN', isMachineTranslated: true, status: 'machine_translated' },
];

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export function getLanguageMeta(code: string): LanguageMeta {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}
