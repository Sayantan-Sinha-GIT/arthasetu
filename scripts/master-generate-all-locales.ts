export {};

import * as fs from 'fs';
import * as path from 'path';
import en from '../src/i18n/en';
import hi from '../src/i18n/hi';
import bn from '../src/i18n/bn';

const DEVANAGARI_BASE = JSON.parse(JSON.stringify(hi));
const BENGALI_BASE = JSON.parse(JSON.stringify(bn));

const REGIONAL_OVERRIDES: Record<string, any> = {
  ta: {
    appName: 'அர்த்தசேது',
    tagline: 'உங்கள் வணிகம். உங்கள் மொழி. உங்கள் திட்டம்.',
    nav: {
      home: 'முகப்பு',
      dashboard: 'கட்டுப்பாட்டகம்',
      advisor: 'அர்த்தசேதுவிடம் கேளுங்கள்',
      planner: 'நிதித் திட்டம்',
      schemes: 'அரசு திட்டங்கள்',
      savedPlans: 'சேமித்த திட்டங்கள்',
      savedAdvice: 'சேமித்த ஆலோசனைகள்',
      profile: 'சுயவிவரம்',
      admin: 'நிர்வாகி',
      login: 'உள்நுழைக',
      signup: 'பதிவு செய்க',
      logout: 'வெளியேறுக',
    },
    adminNav: {
      dashboard: '🛡️ கட்டுப்பாட்டகம்',
      schemes: '🏛️ திட்டங்கள்',
      history: '📜 தணிக்கை பதிவு',
      badge: 'நிர்வாகி',
      signedInAs: 'நிர்வாகியாக உள்நுழைந்துள்ளீர்கள்',
    },
    onboarding: {
      dob: 'பிறந்த தேதி',
      dobPlaceholder: 'உங்கள் பிறந்த தேதியைத் தேர்ந்தெடுக்கவும் (DD-MM-YYYY)',
      dobError: 'சரியான பிறந்த தேதியைத் தேர்ந்தெடுக்கவும் (வயது 18-100)',
      gender: 'பாலினம்',
      selectGender: 'பாலினத்தைத் தேர்ந்தெடுக்கவும்',
    },
    schemes: {
      title: 'அரசு திட்டங்கள்',
      subtitle: 'உங்கள் வணிகத்திற்கான மத்திய மற்றும் மாநில அரசு திட்டங்களை கண்டறியுங்கள்',
    },
    advisor: {
      title: 'அர்த்தசேதுவிடம் கேளுங்கள்',
      subtitle: 'உங்கள் AI வணிக ஆலோசகர் — எந்த கேள்வியும் கேட்கலாம்',
    },
    graminScore: {
      title: 'கிராமின் கடன் தயார்நிலை மதிப்பீடு',
      subtitle: 'உங்கள் கடன் தகுதி மற்றும் வங்கி தயார்நிலையை மதிப்பிடுங்கள்',
    },
    planner: {
      title: 'வணிக நிதித் திட்டம்',
      subtitle: 'துல்லியமான கணக்கீடுகளுடன் உங்கள் நிதித் திட்டத்தை உருவாக்குங்கள்',
    },
    common: {
      save: 'சேமி',
      cancel: 'ரத்து செய்',
      delete: 'நீக்கு',
      edit: 'திருத்து',
      loading: 'ஏற்றப்படுகிறது...',
      error: 'ஏதோ தவறு நடந்துவிட்டது',
      retry: 'மீண்டும் முயற்சி செய்',
      viewAll: 'அனைத்தையும் பார்',
      back: 'பின்செல்',
      confirm: 'உறுதிப்படுத்து',
      yes: 'ஆம்',
      no: 'இல்லை',
      close: 'மூடு',
      search: 'தேடு',
      noResults: 'முடிவுகள் எதுவும் இல்லை',
      rupee: '₹',
    },
    errors: {
      aiUnavailable: 'AI சேவை தற்காலிகமாக கிடைக்கவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.',
      networkError: 'இணைய இணைப்பு பிழை. இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
      saveFailed: 'சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
      loadFailed: 'தகவலை ஏற்றுவதில் தோல்வி.',
      authRequired: 'தொடர தயவுசெய்து உள்நுழையவும்.',
      invalidInput: 'உள்ளிட்ட தகவல்களை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
    },
    adminText: {
      loginTitle: 'நிர்வாகி உள்நுழைவு',
    },
    footer: {
      disclaimer: 'அர்த்தசேது திட்டமிடல் மதிப்பீடுகளை மட்டுமே வழங்குகிறது. நிதி முடிவுகளுக்கு முன் சுயமாக சரிபார்க்கவும்.',
      prototype: 'ஹேக்கத்தான் மாதிரி — ஸ்மார்ட் இந்தியா ஹேக்கத்தான்',
      teamLeader: 'குழு தலைவர்',
      leadDeveloper: 'முதன்மை மென்பொருளாளர்',
      testers: 'சோதனை குழுவினர்',
      teamName: 'CoreDumped',
    },
  },

  te: {
    appName: 'అర్థసేతు',
    tagline: 'మీ వ్యాపారం. మీ భాష. మీ ప్రణాళిక.',
    nav: {
      home: 'హోమ్',
      dashboard: 'డ్యాష్‌బోర్డ్',
      advisor: 'అర్థసేతును అడగండి',
      planner: 'ఆర్థిక ప్రణాళిక',
      schemes: 'ప్రభుత్వ పథకాలు',
      savedPlans: 'భద్రపరచిన ప్రణాళికలు',
      savedAdvice: 'భద్రపరచిన సలహాలు',
      profile: 'ప్రొఫైల్',
      admin: 'అడ్మిన్',
      login: 'లాగిన్',
      signup: 'సైన్ అప్',
      logout: 'లాగ్ అవుట్',
    },
    adminNav: {
      dashboard: '🛡️ డ్యాష్‌బోర్డ్',
      schemes: '🏛️ పథకాలు',
      history: '📜 ఆడిట్ లాగ్',
      badge: 'అడ్మిన్',
      signedInAs: 'అడ్మిన్‌గా లాగిన్ అయ్యారు',
    },
    onboarding: {
      dob: 'పుట్టిన తేదీ',
      dobPlaceholder: 'మీ పుట్టిన తేదీని ఎంచుకోండి (DD-MM-YYYY)',
      dobError: 'దయచేసి సరైన పుట్టిన తేదీని ఎంచుకోండి (వయస్సు 18-100 సంవత్సరాలు)',
      gender: 'లింగం',
      selectGender: 'లింగాన్ని ఎంచుకోండి',
    },
    schemes: {
      title: 'ప్రభుత్వ పథకాలు',
      subtitle: 'మీ వ్యాపారానికి సరిపోయే కేంద్ర మరియు రాష్ట్ర ప్రభుత్వ పథకాలను కనుగొనండి',
    },
    advisor: {
      title: 'అర్థసేతును అడగండి',
      subtitle: 'మీ AI వ్యాపార సలహాదారు — ఏదైనా అడగండి',
    },
    graminScore: {
      title: 'గ్రామీణ్ క్రెడిట్ సంసిద్ధత స్కోరు',
      subtitle: 'మీ రుణ అర్హత మరియు బ్యాంకింగ్ సంసిద్ధతను అంచనా వేయండి',
    },
    planner: {
      title: 'వ్యాపార ఆర్థిక ప్రణాళిక',
      subtitle: 'ఖచ్చితమైన గణనలతో మీ ఆర్థిక ప్రణాళికను రూపొందించండి',
    },
  },

  kn: {
    appName: 'ಅರ್ಥಸೇತು',
    tagline: 'ನಿಮ್ಮ ವ್ಯವಹಾರ. ನಿಮ್ಮ ಭಾಷೆ. ನಿಮ್ಮ ಯೋಜನೆ.',
    nav: {
      home: 'ಮುಖಪುಟ',
      dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      advisor: 'ಅರ್ಥಸೇತುವನ್ನು ಕೇಳಿ',
      planner: 'ಹಣಕಾಸು ಯೋಜನೆ',
      schemes: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು',
      savedPlans: 'ಉಳಿಸಿದ ಯೋಜನೆಗಳು',
      savedAdvice: 'ಉಳಿಸಿದ ಸಲಹೆಗಳು',
      profile: 'ಪ್ರೊಫೈಲ್',
      admin: 'ಅಡ್ಮಿನ್',
      login: 'ಲಾಗಿನ್',
      signup: 'ಸೈನ್ ಅಪ್',
      logout: 'ಲಾಗ್ ಔಟ್',
    },
    adminNav: {
      dashboard: '🛡️ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      schemes: '🏛️ ಯೋಜನೆಗಳು',
      history: '📜 ಆಡಿಟ್ ಲಾಗ್',
      badge: 'ನಿರ್ವಾಹಕ',
      signedInAs: 'ನಿರ್ವಾಹಕರಾಗಿ ಲಾಗಿನ್ ಆಗಿದ್ದೀರಿ',
    },
    onboarding: {
      dob: 'ಹುಟ್ಟಿದ ದಿನಾಂಕ',
      dobPlaceholder: 'ನಿಮ್ಮ ಹುಟ್ಟಿದ ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆಮಾಡಿ (DD-MM-YYYY)',
      dobError: 'ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಹುಟ್ಟಿದ ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆಮಾಡಿ (ವಯಸ್ಸು 18-100 ವರ್ಷಗಳು)',
      gender: 'ಲಿಂಗ',
      selectGender: 'ಲಿಂಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    },
    schemes: {
      title: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು',
      subtitle: 'ನಿಮ್ಮ ಉದ್ಯಮಕ್ಕೆ ಸೂಕ್ತವಾದ ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಕಂಡುಕೊಳ್ಳಿ',
    },
    advisor: {
      title: 'ಅರ್ಥಸೇತುವನ್ನು ಕೇಳಿ',
      subtitle: 'ನಿಮ್ಮ AI ವ್ಯಾಪಾರ ಸಲಹೆಗಾರ — ಏನನ್ನಾದರೂ ಕೇಳಿ',
    },
    graminScore: {
      title: 'ಗ್ರಾಮೀಣ ಕ್ರೆಡಿಟ್ ಸಿದ್ಧತೆ ಸ್ಕೋರ್',
      subtitle: 'ನಿಮ್ಮ ಸಾಲದ ಅರ್ಹತೆ ಮತ್ತು ಬ್ಯಾಂಕಿಂಗ್ ಸಿದ್ಧತೆಯನ್ನು ನಿರ್ಣಯಿಸಿ',
    },
    planner: {
      title: 'ಹಣಕಾಸು ಯೋಜನೆ',
      subtitle: 'ನಿಖರವಾದ ಲೆಕ್ಕಾಚಾರಗಳೊಂದಿಗೆ ನಿಮ್ಮ ವ್ಯಾಪಾರ ಯೋಜನೆಯನ್ನು ನಿರ್ಮಿಸಿ',
    },
  },

  ml: {
    appName: 'അർത്ഥസേതു',
    tagline: 'നിങ്ങളുടെ ബിസിനസ്സ്. നിങ്ങളുടെ ഭാഷ. നിങ്ങളുടെ പ്ലാൻ.',
    nav: {
      home: 'ഹോം',
      dashboard: 'ഡാഷ്‌ബോർഡ്',
      advisor: 'അർത്ഥസേതുവിനോട് ചോദിക്കുക',
      planner: 'സാമ്പത്തിക പ്ലാൻ',
      schemes: 'സർക്കാർ പദ്ധതികൾ',
      savedPlans: 'സേവ് ചെയ്ത പ്ലാനുകൾ',
      savedAdvice: 'സേവ് ചെയ്ത ഉപദേശങ്ങൾ',
      profile: 'പ്രൊഫൈൽ',
      admin: 'അഡ്മിൻ',
      login: 'ലോഗിൻ',
      signup: 'സൈൻ അപ്പ്',
      logout: 'ലോഗ് ഔട്ട്',
    },
    adminNav: {
      dashboard: '🛡️ ഡാഷ്‌ബോർഡ്',
      schemes: '🏛️ പദ്ധതികൾ',
      history: '📜 ഓഡിറ്റ് ലോഗ്',
      badge: 'അഡ്മിൻ',
      signedInAs: 'അഡ്മിനായി ലോഗിൻ ചെയ്തു',
    },
    onboarding: {
      dob: 'ജനനത്തീയതി',
      dobPlaceholder: 'നിങ്ങളുടെ ജനനത്തീയതി തിരഞ്ഞെടുക്കുക (DD-MM-YYYY)',
      dobError: 'സാധുവായ ജനനത്തീയതി തിരഞ്ഞെടുക്കുക (പ്രായം 18-100 വയസ്സ്)',
      gender: 'ലിംഗം',
      selectGender: 'ലിംഗം തിരഞ്ഞെടുക്കുക',
    },
    schemes: {
      title: 'സർക്കാർ പദ്ധതികൾ',
      subtitle: 'നിങ്ങളുടെ ബിസിനസ്സിന് അനുയോജ്യമായ കേന്ദ്ര-സംസ്ഥാന പദ്ധതികൾ കണ്ടെത്തുക',
    },
    advisor: {
      title: 'അർത്ഥസേതുവിനോട് ചോദിക്കുക',
      subtitle: 'നിങ്ങളുടെ AI ബിസിനസ്സ് ഉപദേശകൻ — എന്തും ചോദിക്കാം',
    },
    graminScore: {
      title: 'ഗ്രാമീൺ ക്രെഡിറ്റ് സന്നദ്ധത സ്കോർ',
      subtitle: 'നിങ്ങളുടെ വായ്പാ യോഗ്യതയും ബാങ്കിംഗ് സന്നദ്ധതയും വിലയിരുത്തുക',
    },
    planner: {
      title: 'സാമ്പത്തിക പ്ലാൻ',
      subtitle: 'കൃത്യമായ കണക്കുകൂട്ടലുകളോടെ ബിസിനസ്സ് പ്ലാൻ തയ്യാറാക്കുക',
    },
  },

  gu: {
    appName: 'અર્થસેતુ',
    tagline: 'તમારો વ્યવસાય. તમારી ભાષા. તમારો પ્લાન.',
    nav: {
      home: 'હોમ',
      dashboard: 'ડેશબોર્ડ',
      advisor: 'અર્થસેતુને પૂછો',
      planner: 'નાણાકીય પ્લાન',
      schemes: 'સરકારી યોજનાઓ',
      savedPlans: 'સાચવેલા પ્લાન',
      savedAdvice: 'સાચવેલી સલાહ',
      profile: 'પ્રોફાઇલ',
      admin: 'એડમિન',
      login: 'લૉગિન',
      signup: 'સાઇન અપ',
      logout: 'લૉગ આઉટ',
    },
    adminNav: {
      dashboard: '🛡️ ડેશબોર્ડ',
      schemes: '🏛️ યોજનાઓ',
      history: '📜 ઓડિટ લોગ',
      badge: 'એડમિન',
      signedInAs: 'એડમિન તરીકે લૉગિન છો',
    },
    onboarding: {
      dob: 'જન્મ તારીખ',
      dobPlaceholder: 'તમારી જન્મ તારીખ પસંદ કરો (DD-MM-YYYY)',
      dobError: 'કૃપા કરીને માન્ય જન્મ તારીખ પસંદ કરો (ઉંમર 18-100 વર્ષ)',
      gender: 'લિંગ',
      selectGender: 'લિંગ પસંદ કરો',
    },
    schemes: {
      title: 'સરકારી યોજનાઓ',
      subtitle: 'તમારા વ્યવસાય માટે યોગ્ય કેન્દ્ર અને રાજ્ય સરકારની યોજનાઓ શોધો',
    },
    advisor: {
      title: 'અર્થસેતુને પૂછો',
      subtitle: 'તમારા AI બિઝનેસ સલાહકાર — કંઈ પણ પૂછો',
    },
    graminScore: {
      title: 'ગ્રામીણ ક્રેડિટ તૈયારી સ્કોર',
      subtitle: 'તમારી લોન પાત્રતા અને બેંકિંગ તૈયારીનું મૂલ્યાંકન કરો',
    },
    planner: {
      title: 'નાણાકીય પ્લાન',
      subtitle: 'સચોટ ગણતરીઓ સાથે તમારા વ્યવસાયનું આયોજન કરો',
    },
  },

  pa: {
    appName: 'ਅਰਥਸੇਤੂ',
    tagline: 'ਤੁਹਾਡਾ ਕਾਰੋਬਾਰ। ਤੁਹਾਡੀ ਭਾਸ਼ਾ। ਤੁਹਾਡੀ ਯੋਜਨਾ।',
    nav: {
      home: 'ਮੁੱਖ ਪੰਨਾ',
      dashboard: 'ਡੈਸ਼ਬੋਰਡ',
      advisor: 'ਅਰਥਸੇਤੂ ਨੂੰ ਪੁੱਛੋ',
      planner: 'ਵਿੱਤੀ ਯੋਜਨਾ',
      schemes: 'ਸਰਕਾਰੀ ਸਕੀਮਾਂ',
      savedPlans: 'ਸੰਭਾਲੀਆਂ ਯੋਜਨਾਵਾਂ',
      savedAdvice: 'ਸੰਭਾਲੀ ਸਲਾਹ',
      profile: 'ਪ੍ਰੋਫਾਈਲ',
      admin: 'ਐਡਮਿਨ',
      login: 'ਲੌਗਇਨ',
      signup: 'ਸਾਈਨ ਅੱਪ',
      logout: 'ਲੌਗ ਆਊਟ',
    },
    adminNav: {
      dashboard: '🛡️ ਡੈਸ਼ਬੋਰਡ',
      schemes: '🏛️ ਸਕੀਮਾਂ',
      history: '📜 ਆਡਿਟ ਲੌਗ',
      badge: 'ਐਡਮਿਨ',
      signedInAs: 'ਐਡਮਿਨ ਵਜੋਂ ਲੌਗਇਨ ਹੋ',
    },
    onboarding: {
      dob: 'ਜਨਮ ਮਿਤੀ',
      dobPlaceholder: 'ਆਪਣੀ ਜਨਮ ਮਿਤੀ ਚੁਣੋ (DD-MM-YYYY)',
      dobError: 'ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਵੈਧ ਜਨਮ ਮਿਤੀ ਚੁਣੋ (ਉਮਰ 18-100 ਸਾਲ)',
      gender: 'ਲਿੰਗ',
      selectGender: 'ਲਿੰਗ ਚੁਣੋ',
    },
    schemes: {
      title: 'ਸਰਕਾਰੀ ਸਕੀਮਾਂ',
      subtitle: 'ਆਪਣੇ ਕਾਰੋਬਾਰ ਲਈ ਢੁਕਵੀਆਂ ਕੇਂਦਰੀ ਅਤੇ ਰਾਜ ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਲੱਭੋ',
    },
    advisor: {
      title: 'ਅਰਥਸੇਤੂ ਨੂੰ ਪੁੱਛੋ',
      subtitle: 'ਤੁਹਾਡਾ AI ਕਾਰੋਬਾਰੀ ਸਲਾਹਕਾਰ — ਕੁਝ ਵੀ ਪੁੱਛੋ',
    },
    graminScore: {
      title: 'ਗ੍ਰਾਮੀਣ ਕ੍ਰੈਡਿਟ ਤਿਆਰੀ ਸਕੋਰ',
      subtitle: 'ਆਪਣੀ ਕਰਜ਼ਾ ਯੋਗਤਾ ਅਤੇ ਬੈਂਕ ਤਿਆਰੀ ਦਾ ਮੁਲਾਂਕਣ ਕਰੋ',
    },
    planner: {
      title: 'ਵਿੱਤੀ ਯੋਜਨਾ',
      subtitle: 'ਸਹੀ ਗਣਨਾਵਾਂ ਨਾਲ ਆਪਣੀ ਵਪਾਰਕ ਯੋਜਨਾ ਬਣਾਓ',
    },
  },

  or: {
    appName: 'ଅର୍ଥସେତୁ',
    tagline: 'ଆପଣଙ୍କ ବ୍ୟବସାୟ। ଆପଣଙ୍କ ଭାଷା। ଆପଣଙ୍କ ଯୋଜନା।',
    nav: {
      home: 'ମୁଖ୍ୟ ପୃଷ୍ଠା',
      dashboard: 'ଡ୍ୟାସବୋର୍ଡ',
      advisor: 'ଅର୍ଥସେତୁକୁ ପଚାରନ୍ତୁ',
      planner: 'ଆର୍ଥିକ ଯୋଜନା',
      schemes: 'ସରକାରୀ ଯୋଜନା',
      savedPlans: 'ସଂରକ୍ଷିତ ଯୋଜନା',
      savedAdvice: 'ସଂରକ୍ଷିତ ପରାମର୍ଶ',
      profile: 'ପ୍ରୋଫାଇଲ',
      admin: 'ଆଡମିନ',
      login: 'ଲଗଇନ',
      signup: 'ସାଇନ ଅପ',
      logout: 'ଲଗ ଆଉଟ',
    },
    adminNav: {
      dashboard: '🛡️ ଡ୍ୟାସବୋର୍ଡ',
      schemes: '🏛️ ଯୋଜନାସମୂହ',
      history: '📜 ଅଡିଟ ଲଗ୍',
      badge: 'ଆଡମିନ',
      signedInAs: 'ଆଡମିନ ଭାବେ ଲଗଇନ ଅଛନ୍ତି',
    },
    onboarding: {
      dob: 'ଜନ୍ମ ତାରିଖ',
      dobPlaceholder: 'ଆପଣଙ୍କ ଜନ୍ମ ତାରିଖ ବାଛନ୍ତୁ (DD-MM-YYYY)',
      dobError: 'ଦୟାକରି ଏକ ବୈଧ ଜନ୍ମ ତାରିଖ ବାଛନ୍ତୁ (ବୟସ ୧୮-୧୦୦ ବର୍ଷ)',
      gender: 'ଲିଙ୍ଗ',
      selectGender: 'ଲିଙ୍ଗ ବାଛନ୍ତୁ',
    },
    schemes: {
      title: 'ସରକାରୀ ଯୋଜନା',
      subtitle: 'ଆପଣଙ୍କ ବ୍ୟବସାୟ ପାଇଁ ଉପଯୁକ୍ତ କେନ୍ଦ୍ର ଓ ରାଜ୍ୟ ସରକାରୀ ଯୋଜନା ଖୋଜନ୍ତୁ',
    },
    advisor: {
      title: 'ଅର୍ଥସେତୁକୁ ପଚାରନ୍ତୁ',
      subtitle: 'ଆପଣଙ୍କ AI ବ୍ୟବସାୟ ପରାମର୍ଶଦାତା — ଯାହା ଇଚ୍ଛା ପଚାରନ୍ତୁ',
    },
    graminScore: {
      title: 'ଗ୍ରାମୀଣ କ୍ରେଡିଟ୍ ପ୍ରସ୍ତୁତି ସ୍କୋର',
      subtitle: 'ଆପଣଙ୍କ ଋଣ ଯୋଗ୍ୟତା ଏବଂ ବ୍ୟାଙ୍କିଙ୍ଗ ପ୍ରସ୍ତୁତିର ମୂଲ୍ୟାଙ୍କନ କରନ୍ତୁ',
    },
    planner: {
      title: 'ଆର୍ଥିକ ଯୋଜନା',
      subtitle: 'ସଠିକ୍ ଗଣନା ସହିତ ଆପଣଙ୍କ ବ୍ୟବସାୟ ଯୋଜନା ପ୍ରସ୍ତୁତ କରନ୍ତୁ',
    },
  },

  ur: {
    appName: 'ارتھ سیتو',
    tagline: 'آپ کا کاروبار۔ آپ کی زبان۔ آپ کا منصوبہ۔',
    nav: {
      home: 'ہوم',
      dashboard: 'ڈیش بورڈ',
      advisor: 'ارتھ سیتو سے پوچھیں',
      planner: 'مالیاتی منصوبہ',
      schemes: 'سرکاری اسکیمیں',
      savedPlans: 'محفوظ منصوبے',
      savedAdvice: 'محفوظ مشورے',
      profile: 'پروفائل',
      admin: 'ایڈمن',
      login: 'لاگ ان',
      signup: 'سائن اپ',
      logout: 'لاگ آؤٹ',
    },
    adminNav: {
      dashboard: '🛡️ ڈیش بورڈ',
      schemes: '🏛️ اسکیمیں',
      history: '📜 آڈٹ لاگ',
      badge: 'ایڈمن',
      signedInAs: 'بطور ایڈمن لاگ ان ہیں',
    },
    onboarding: {
      dob: 'تاریخ پیدائش',
      dobPlaceholder: 'اپنی تاریخ پیدائش منتخب کریں (DD-MM-YYYY)',
      dobError: 'براہ کرم درست تاریخ پیدائش منتخب کریں (عمر 18-100 سال)',
      gender: 'جنس',
      selectGender: 'جنس منتخب کریں',
    },
    schemes: {
      title: 'سرکاری اسکیمیں',
      subtitle: 'اپنے کاروبار کے لیے موزوں مرکزی اور ریاستی حکومتی اسکیمیں تلاش کریں',
    },
    advisor: {
      title: 'ارتھ سیتو سے پوچھیں',
      subtitle: 'آپ کا AI کاروباری مشیر — کچھ بھی پوچھیں',
    },
    graminScore: {
      title: 'گرامین کریڈٹ تیاری اسکور',
      subtitle: 'اپنی قرض کی اہلیت اور بینکنگ تیاری کا اندازہ لگائیں',
    },
    planner: {
      title: 'مالیاتی منصوبہ',
      subtitle: 'درست حساب کتاب کے ساتھ اپنے کاروبار کی منصوبہ بندی کریں',
    },
    common: {
      save: 'محفوظ کریں',
      cancel: 'منسوخ کریں',
      delete: 'حذف کریں',
      edit: 'ترمیم کریں',
      loading: 'لوڈ ہو رہا ہے...',
      error: 'کچھ خرابی پیش آگئی',
      retry: 'دوبارہ کوشش کریں',
      viewAll: 'سب دیکھیں',
      back: 'پیچھے',
      confirm: 'تصدیق کریں',
      yes: 'ہاں',
      no: 'نہیں',
      close: 'بند کریں',
      search: 'تلاش کریں',
      noResults: 'کوئی نتیجہ نہیں ملا',
      rupee: '₹',
    },
    errors: {
      aiUnavailable: 'AI سروس عارضی طور پر دستیاب نہیں ہے۔ براہ کرم کچھ دیر بعد کوشش کریں۔',
      networkError: 'انٹرنیٹ کنکشن کا مسئلہ۔ براہ کرم رابطہ چیک کریں۔',
      saveFailed: 'محفوظ کرنے میں ناکامی۔ براہ کرم دوبارہ کوشش کریں۔',
      loadFailed: 'ڈیٹا لوڈ کرنے میں ناکامی۔',
      authRequired: 'آگے بڑھنے کے لیے براہ کرم لاگ ان کریں۔',
      invalidInput: 'براہ کرم درج کردہ معلومات کی جانچ کریں۔',
    },
    admin: {
      loginTitle: 'ایڈمن کنسول لاگ ان',
    },
    footer: {
      disclaimer: 'ارتھ سیتو معلوماتی مقصد کے لیے پروجیکٹ کے تخمینے فراہم کرتا ہے۔ مالی فیصلے کرنے سے پہلے از خود تصدیق کریں۔',
      prototype: 'ہیکاتھون پروٹو ٹائپ — اسمارٹ انڈیا ہیکاتھون',
      teamLeader: 'ٹیم لیڈر',
      leadDeveloper: 'لیڈ ڈیولپر',
      testers: 'ٹیسٹنگ ٹیم',
      teamName: 'CoreDumped',
    },
  },

  as: {
    appName: 'অৰ্থসেতু',
    tagline: 'আপোনাৰ ব্যৱসায়। আপোনাৰ ভাষা। আপোনাৰ পৰিকল্পনা।',
    nav: {
      home: 'মূল পৃষ্ঠা',
      dashboard: 'ডেচবৰ্ড',
      advisor: 'অৰ্থসেতুক সোধক',
      planner: 'বিত্তীয় পৰিকল্পনা',
      schemes: 'চৰকাৰী আঁচনি',
      savedPlans: 'সংৰক্ষিত পৰিকল্পনা',
      savedAdvice: 'সংৰক্ষিত পৰামৰ্শ',
      profile: 'প্ৰফাইল',
      admin: 'এডমিন',
      login: 'লগ ইন',
      signup: 'ছাইন আপ',
      logout: 'লগ আউট',
    },
    adminNav: {
      dashboard: '🛡️ ডেচবৰ্ড',
      schemes: '🏛️ আঁচনিসমূহ',
      history: '📜 অডিট লগতালিকা',
      badge: 'এডমিন',
      signedInAs: 'এডমিন হিচাপে প্ৰৱেশ কৰা হৈছে',
    },
    onboarding: {
      dob: 'জন্ম তাৰিখ',
      dobPlaceholder: 'আপোনাৰ জন্ম তাৰিখ বাছক (DD-MM-YYYY)',
      dobError: 'অনুগ্ৰহ কৰি সঠিক জন্ম তাৰিখ বাছক (বয়স ১৮-১০০ বছৰ)',
      gender: 'লিংগ',
      selectGender: 'লিংগ বাছক',
    },
    schemes: {
      title: 'চৰকাৰী আঁচনিসমূহ',
      subtitle: 'আপোনাৰ ব্যৱসায়ৰ বাবে উপযোগী কেন্দ্ৰীয় আৰু ৰাজ্যিক আঁচনিসমূহ বিচাৰক',
    },
    advisor: {
      title: 'অৰ্থসেতুক সোধক',
      subtitle: 'আপোনাৰ AI ব্যৱসায়িক উপদেষ্টা — যিকোনো কথা সোধক',
    },
    graminScore: {
      title: 'গ্রামীণ ক্রেডিট প্ৰস্তুতি স্ক’ৰ',
      subtitle: 'আপোনাৰ ঋণৰ যোগ্যতা আৰু বেংকিং প্ৰস্তুতি মূল্যায়ন কৰক',
    },
    planner: {
      title: 'বিত্তীয় পৰিকল্পনা',
      subtitle: 'সঠিক গণনাৰ সৈতে আপোনাৰ ব্যৱসায়িক পৰিকল্পনা প্ৰস্তুত কৰক',
    },
    common: {
      save: 'সংৰক্ষণ কৰক',
      cancel: 'বাতিল কৰক',
      delete: 'মচি পেলাওক',
      edit: 'সম্পাদনা কৰক',
      loading: 'লোড হৈ আছে...',
      error: 'কিবা ভুল হ’ল',
      retry: 'পুনৰ চেষ্টা কৰক',
      viewAll: 'সকলো চাওক',
      back: 'উভতি যাওক',
      confirm: 'নিশ্চিত কৰক',
      yes: 'হয়',
      no: 'নহয়',
      close: 'বন্ধ কৰক',
      search: 'সন্ধান কৰক',
      noResults: 'কোনো ফলাফল পোৱা নগ’ল',
      rupee: '₹',
    },
    errors: {
      aiUnavailable: 'AI সেৱা সাময়িকভাৱে অনুপলব্ধ। অনুগ্ৰহ কৰি কিছু সময় পিছত পুনৰ চেষ্টা কৰক।',
      networkError: 'ইণ্টাৰনেট সংযোগৰ সমস্যা। সংযোগ পৰীক্ষা কৰি পুনৰ চেষ্টা কৰক।',
      saveFailed: 'সংৰক্ষণ কৰাত ব্যৰ্থ হ’ল। পুনৰ চেষ্টা কৰক।',
      loadFailed: 'তথ্য লোড কৰাত ব্যৰ্থ হ’ল।',
      authRequired: 'অনুগ্ৰহ কৰি আগবাঢ়িবলৈ লগ ইন কৰক।',
      invalidInput: 'অনুগ্ৰহ কৰি দিয়া তথ্য পৰীক্ষা কৰি পুনৰ চেষ্টা কৰক।',
    },
    footer: {
      disclaimer: 'অৰ্থসেতুৱে তথ্যৰ বাবে পৰিকল্পনা অনুমান প্ৰদান কৰে। সিদ্ধান্ত লোৱাৰ আগতে স্বাধীনভাৱে পৰীক্ষা কৰক।',
      prototype: 'হেকাথন প্ৰ’ট’টাইপ — স্মাৰ্ট ইণ্ডিয়া হেকাথন',
      teamLeader: 'দলৰ দলপতি',
      leadDeveloper: 'প্ৰধান ডেভেলপাৰ',
      testers: 'পৰীক্ষকসকল',
      teamName: 'CoreDumped',
    },
  },

  mr: {
    appName: 'अर्थसेतू',
    tagline: 'तुमचा व्यवसाय. तुमची भाषा. तुमची योजना.',
    nav: {
      home: 'मुख्यपृष्ठ',
      dashboard: 'डॅशबोर्ड',
      advisor: 'अर्थसेतूला विचारा',
      planner: 'वित्तीय योजना',
      schemes: 'सरकारी योजना',
      savedPlans: 'जतन केलेल्या योजना',
      savedAdvice: 'जतन केलेले सल्ले',
      profile: 'प्रोफाइल',
      admin: 'अॅडमिन',
      login: 'लॉग इन',
      signup: 'साइन अप',
      logout: 'लॉग आउट',
    },
    adminNav: {
      dashboard: '🛡️ डॅशबोर्ड',
      schemes: '🏛️ योजना',
      history: '📜 ऑडिट लॉग',
      badge: 'अॅडमिन',
      signedInAs: 'अॅडमिन म्हणून लॉग इन आहात',
    },
    onboarding: {
      dob: 'जन्म तारीख',
      dobPlaceholder: 'तुमची जन्म तारीख निवडा (DD-MM-YYYY)',
      dobError: 'कृपया वैध जन्म तारीख निवडा (वय १८-१०० वर्षे)',
      gender: 'लिंग',
      selectGender: 'लिंग निवडा',
    },
    schemes: {
      title: 'सरकारी योजना',
      subtitle: 'तुमच्या व्यवसायासाठी योग्य केंद्र आणि राज्य सरकारी योजना शोधा',
    },
    advisor: {
      title: 'अर्थसेतूला विचारा',
      subtitle: 'तुमचा AI व्यवसाय सल्लागार — काहीही विचारा',
    },
    graminScore: {
      title: 'ग्रामीण क्रेडिट तयारी स्कोअर',
      subtitle: 'तुमची कर्ज पात्रता आणि बँकिंग तयारी तपासा',
    },
    planner: {
      title: 'वित्तीय योजना',
      subtitle: 'अचूक आकडेमोडीसह तुमच्या व्यवसायाची योजना आखा',
    },
  },

  sd: {
    appName: 'अर्थसेतु',
    tagline: 'तव्हांजो व्यापार. तव्हांजी बोली. तव्हांजी योजना.',
    admin: {
      loginTitle: 'ایڈمن کنسول لاگ ان (Admin Login)',
    },
    footer: {
      teamName: 'CoreDumped',
    },
  },
};

function deepMerge(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

async function synthesizeCleanLocales() {
  const localesDir = path.join(process.cwd(), 'src', 'i18n', 'locales');
  const codes = [
    'as', 'brx', 'doi', 'gu', 'kn', 'ks', 'kok', 'mai', 'ml', 'mni',
    'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur'
  ];

  for (const code of codes) {
    const isEastern = code === 'as' || code === 'mni' || code === 'sat';
    const base = JSON.parse(JSON.stringify(isEastern ? BENGALI_BASE : DEVANAGARI_BASE));

    if (REGIONAL_OVERRIDES[code]) {
      deepMerge(base, REGIONAL_OVERRIDES[code]);
    }

    const filePath = path.join(localesDir, `${code}.json`);
    fs.writeFileSync(filePath, JSON.stringify(base, null, 2), 'utf-8');
    console.log(`  ✅ [SYNTHESIZED NATIVE] ${code}.json`);
  }
}

synthesizeCleanLocales().catch(console.error);
