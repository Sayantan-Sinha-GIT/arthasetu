'use client';

import { useEffect, useState } from 'react';

// Last-resort boundary: catches errors thrown by the ROOT layout itself
// (fonts, providers, etc.), which src/app/error.tsx cannot catch since it
// lives inside that same layout. Must render its own <html>/<body> because
// it fully replaces the root layout when active.
// Reads the user's language choice directly from localStorage via try/catch,
// falling back to English + Hindi if unavailable.

interface GlobalErrorCopy {
  title: string;
  desc: string;
  reload: string;
}

const GLOBAL_ERROR_STRINGS: Record<string, GlobalErrorCopy> = {
  en: {
    title: "ArthaSetu couldn't load",
    desc: 'Something went wrong. Please reload the page.',
    reload: 'Reload',
  },
  hi: {
    title: 'अर्थसेतु लोड नहीं हो सका',
    desc: 'कुछ गड़बड़ हो गई। कृपया पेज को दोबारा लोड करें।',
    reload: 'दोबारा लोड करें',
  },
  bn: {
    title: 'অর্থসেতু লোড করা যায়নি',
    desc: 'কিছু সমস্যা হয়েছে। অনুগ্রহ করে পেজটি আবার লোড করুন।',
    reload: 'আবার লোড করুন',
  },
  as: {
    title: 'অৰ্থসেতু লোড নহল',
    desc: 'কিবা সমস্যা হৈছে। অনুগ্ৰহ কৰি পৃষ্ঠাখন পুনৰ লোড কৰক।',
    reload: 'পুনৰ লোড কৰক',
  },
  gu: {
    title: 'અર્થસેતુ લોડ થઈ શક્યું નથી',
    desc: 'કંઈક ખોટું થયું. કૃપા કરીને પૃષ્ઠને ફરીથી લોડ કરો.',
    reload: 'ફરીથી લોડ કરો',
  },
  kn: {
    title: 'ಅರ್ಥಸೇತು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ',
    desc: 'ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಪುಟವನ್ನು ಮರುಲೋಡ್ ಮಾಡಿ.',
    reload: 'ಮರುಲೋಡ್ ಮಾಡಿ',
  },
  ml: {
    title: 'അർത്ഥസേതു ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല',
    desc: 'എന്തോ കുഴപ്പം സംഭവിച്ചു. ദയവായി പേജ് വീണ്ടും ലോഡ് ചെയ്യുക.',
    reload: 'വീണ്ടും ലോഡ് ചെയ്യുക',
  },
  mr: {
    title: 'अर्थसेतू लोड होऊ शकला नाही',
    desc: 'काहीतरी चूक झाली. कृपया पृष्ठ पुन्हा लोड करा.',
    reload: 'पुन्हा लोड करा',
  },
  or: {
    title: 'ଅର୍ଥସେତୁ ଲୋଡ୍ ହୋଇପାରିଲା ନାହିଁ',
    desc: 'କିଛି ଭୁଲ୍ ହୋଇଗଲା। ଦୟାକରି ପୃଷ୍ଠାକୁ ପୁନର୍ବାର ଲୋଡ୍ କରନ୍ତୁ।',
    reload: 'ପୁନର୍ବାର ଲୋଡ୍ କରନ୍ତୁ',
  },
  pa: {
    title: 'ਅਰਥਸੇਤੂ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕਿਆ',
    desc: 'ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਪੰਨੇ ਨੂੰ ਦੁਬਾਰਾ ਲੋਡ ਕਰੋ।',
    reload: 'ਦੁਬਾਰਾ ਲੋਡ ਕਰੋ',
  },
  ta: {
    title: 'அர்த்தசேது ஏற்ற முடியவில்லை',
    desc: 'ஏதோ தவறு நடந்துவிட்டது. தயவுசெய்து பக்கத்தை மீண்டும் ஏற்றவும்.',
    reload: 'மீண்டும் ஏற்றவும்',
  },
  te: {
    title: 'అర్థసేతు లోడ్ కాలేదు',
    desc: 'ఏదో తప్పు జరిగింది. దయచేసి పేజీని మళ్లీ లోడ్ చేయండి.',
    reload: 'మళ్లీ లోడ్ చేయండి',
  },
  ur: {
    title: 'ارتھ سیتو لوڈ نہیں ہو سکا',
    desc: 'کچھ غلط ہو گیا۔ براہ کرم صفحہ کو دوبارہ لوڈ کریں۔',
    reload: 'دوبارہ لوڈ کریں',
  },
  brx: {
    title: 'अर्थसेतु लड जानो हायासै',
    desc: 'माबा गोरोन्थि जादों। अननानै बिलाइखौ फिन लड खालाम।',
    reload: 'फिन लड खालाम',
  },
  doi: {
    title: 'अर्थसेतु लोड नेईं होई सकेआ',
    desc: 'कुश गड़बड़ होई गेई। कृपया सफे गी परत लोड करो।',
    reload: 'परत लोड करो',
  },
  kok: {
    title: 'अर्थसेतु लोड जावंक ना',
    desc: 'काहींतरी चूक जाली. उपकार करून पान परतून लोड करात.',
    reload: 'परतून लोड करात',
  },
  ks: {
    title: 'ارتھ سیتو ہیکہِ نہٕ لوڈ گژھِتھ',
    desc: 'کینہہ غلط گوٚو۔ مہربٲنی کٔرِتھ ورقہٕ دُبارٕ لوڈ کٔرِو۔',
    reload: 'دُبارٕ لوڈ کٔرِو',
  },
  mai: {
    title: 'अर्थसेतु लोड नहि भ सकल',
    desc: 'किछु गड़बड़ भ गेल। कृपया पन्ना केँ पुनः लोड करू।',
    reload: 'पुनः लोड करू',
  },
  mni: {
    title: 'অর্থসেতু হাপ্পা ঙমদে',
    desc: 'খরা লান্থোকখ্রে। চানবীদুনা লমাই অসি অমুক হন্না লোড তৌবীয়ু।',
    reload: 'অমুক হন্না লোড তৌবীয়ু',
  },
  ne: {
    title: 'अर्थसेतु लोड हुन सकेन',
    desc: 'केही गलत भयो। कृपया पृष्ठ पुन: लोड गर्नुहोस्।',
    reload: 'पुन: लोड गर्नुहोस्',
  },
  sa: {
    title: 'अर्थसेतुः लोड् भवितुं न शक्तः',
    desc: 'किञ्चित् दोषः जातः। कृपया पृष्ठं पुनः लोड् कुर्वन्तु।',
    reload: 'पुनः लोड् कुर्वन्तु',
  },
  sat: {
    title: 'ᱚᱨᱛᱷᱚᱥᱮᱛᱩ ᱞᱳᱰ ᱵᱟᱝ ᱦᱩᱭ ᱞᱮᱱᱟ',
    desc: 'ᱡᱟᱦᱟᱸᱱᱟᱜ ᱵᱟᱹᱲᱤᱡ ᱮᱱᱟ᱾ ᱫᱟᱭᱟᱠᱟᱛᱮ ᱥᱟᱠᱟᱢ ᱫᱚᱦᱲᱟ ᱛᱮ ᱞᱳᱰ ᱢᱮ᱾',
    reload: 'ᱫᱚᱦᱲᱟ ᱛᱮ ᱞᱳᱰ ᱢᱮ',
  },
  sd: {
    title: 'ارٿ سيتو لوڊ نہ ٿي سگهيو',
    desc: 'ڪجھ غلط ٿي ويو. مهرباني ڪري صفحي کي ٻيهر لوڊ ڪريو.',
    reload: 'ٻيهر لوڊ ڪريو',
  },
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('arthasetu-language');
      return saved && GLOBAL_ERROR_STRINGS[saved] ? saved : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    console.error('ArthaSetu fatal root error:', error);
    try {
      fetch('/api/client-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message || 'Fatal root error',
          stack: error?.stack?.slice(0, 1000) || '',
          digest: error?.digest || '',
          url: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      }).catch(() => {});
    } catch {
      // Ignore network errors in global error boundary
    }
  }, [error]);

  const localized = lang ? GLOBAL_ERROR_STRINGS[lang] : null;

  return (
    <html lang={lang || 'en'}>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            padding: '24px',
          }}
        >
          <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#171717', margin: '0 0 8px' }}>
              {localized ? localized.title : "ArthaSetu couldn't load / अर्थसेतु लोड नहीं हो सका"}
            </h1>
            <p style={{ fontSize: 14, color: '#737373', margin: '0 0 20px' }}>
              {localized ? (
                localized.desc
              ) : (
                <>
                  Something went wrong. Please reload the page.
                  <br />
                  कुछ गड़बड़ हो गई। कृपया पेज को दोबारा लोड करें।
                </>
              )}
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                background: '#f97316',
                color: '#fff',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {localized ? localized.reload : 'Reload / दोबारा लोड करें'}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
