'use client';

import { useEffect, useState } from 'react';

// Route-segment error boundary. Catches any otherwise-uncaught render error
// anywhere in the app (e.g. a translation key crash, a bad API response
// shape) and shows a recoverable screen instead of leaving the browser on a
// dead/blank page. Deliberately has NO dependency on LanguageContext or any
// other app context — if something upstream is broken, this must still work.
// Reads the user's persisted language directly from localStorage to display
// localized error copy in their chosen language, falling back to bilingual
// English + Hindi if storage is unavailable or no preference is set.

interface ErrorCopy {
  title: string;
  desc: string;
  tryAgain: string;
  goHome: string;
}

const ERROR_STRINGS: Record<string, ErrorCopy> = {
  en: {
    title: 'Something went wrong',
    desc: 'An unexpected error occurred. Please try again.',
    tryAgain: 'Try Again',
    goHome: 'Go Home',
  },
  hi: {
    title: 'कुछ गड़बड़ हो गई',
    desc: 'एक अनपेक्षित समस्या हुई। कृपया फिर से प्रयास करें।',
    tryAgain: 'फिर से प्रयास करें',
    goHome: 'होम पर जाएं',
  },
  bn: {
    title: 'কিছু ভুল হয়েছে',
    desc: 'একটি অপ্রত্যাশিত সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
    tryAgain: 'আবার চেষ্টা করুন',
    goHome: 'হোমে যান',
  },
  as: {
    title: 'কিবা বিজুতি ঘটিছে',
    desc: 'এটা অপ্ৰত্যাশিত ত্ৰুটি হৈছে। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।',
    tryAgain: 'পুনৰ চেষ্টা কৰক',
    goHome: 'গৃহ পৃষ্ঠালৈ যাওক',
  },
  gu: {
    title: 'કંઈક ખોટું થયું',
    desc: 'અનપેક્ષિત ભૂલ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.',
    tryAgain: 'ફરી પ્રયાસ કરો',
    goHome: 'હોમ પર જાઓ',
  },
  kn: {
    title: 'ಏನೋ ತಪ್ಪಾಗಿದೆ',
    desc: 'ಅನಿರೀಕ್ಷಿತ ದೋಷ ಸಂಭವಿಸಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    tryAgain: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    goHome: 'ಮುಖಪುಟಕ್ಕೆ ಹೋಗಿ',
  },
  ml: {
    title: 'എന്തോ കുഴപ്പം സംഭവിച്ചു',
    desc: 'പ്രതീക്ഷിക്കാത്ത പിശക് സംഭവിച്ചു. ദയവായി വീണ്ടും ശ്രമിക്കുക.',
    tryAgain: 'വീണ്ടും ശ്രമിക്കുക',
    goHome: 'ഹോമിലേക്ക് പോകുക',
  },
  mr: {
    title: 'काहीतरी चूक झाली',
    desc: 'अनपेक्षित त्रुटी आली. कृपया पुन्हा प्रयत्न करा.',
    tryAgain: 'पुन्हा प्रयत्न करा',
    goHome: 'मुख्यपृष्ठावर जा',
  },
  or: {
    title: 'କିଛି ଭୁଲ୍ ହୋଇଗଲା',
    desc: 'ଏକ ଅପ୍ରତ୍ୟାଶିତ ତ୍ରୁଟି ଘଟିଛି। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
    tryAgain: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ',
    goHome: 'ମୁଖ୍ୟପୃଷ୍ଠାକୁ ଯାଆନ୍ତୁ',
  },
  pa: {
    title: 'ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ',
    desc: 'ਅਣਕਿਆਸੀ ਗਲਤੀ ਆਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    tryAgain: 'ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
    goHome: 'ਹੋਮ ਤੇ ਜਾਓ',
  },
  ta: {
    title: 'ஏதோ தவறு நடந்துவிட்டது',
    desc: 'எதிர்பாராத பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
    tryAgain: 'மீண்டும் முயற்சிக்கவும்',
    goHome: 'முகப்பிற்கு செல்க',
  },
  te: {
    title: 'ఏదో తప్పు జరిగింది',
    desc: 'ఊహించని లోపం ఏర్పడింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
    tryAgain: 'మళ్ళీ ప్రయత్నించండి',
    goHome: 'హోమ్‌కు వెళ్లండి',
  },
  ur: {
    title: 'کچھ غلط ہو گیا',
    desc: 'غیر متوقع خرابی پیش آگئی۔ براہ کرم دوبارہ کوشش کریں۔',
    tryAgain: 'دوبارہ کوشش کریں',
    goHome: 'ہوم پر جائیں',
  },
  brx: {
    title: 'माबा गोरोन्थि जाबाय',
    desc: 'अनपेक्षित गोरोन्थि जादों। अननानै फिन नाजा।',
    tryAgain: 'फिन नाजा',
    goHome: 'हमाव थां',
  },
  doi: {
    title: 'कुश गड़बड़ होई गेई',
    desc: 'अनपेक्षित गलती होई। कृपया परत कोशश करो।',
    tryAgain: 'परत कोशश करो',
    goHome: 'होम ते जाओ',
  },
  kok: {
    title: 'काहींतरी चूक जाली',
    desc: 'अपेक्षित नसलेली त्रुटी आयली. उपकार करून परतून यत्न करात.',
    tryAgain: 'परतून यत्न करात',
    goHome: 'घरा वचात',
  },
  ks: {
    title: 'کینہہ غلط گوٚو',
    desc: 'غأر متوقع غلطی گیٔ۔ مہربٲنی کٔرِتھ دُبارٕ کوٗشِش کٔرِو۔',
    tryAgain: 'دُبارٕ کوٗشِش کٔرِو',
    goHome: 'ہومَس پؠٹھ گژھِو',
  },
  mai: {
    title: 'किछु गड़बड़ भ गेल',
    desc: 'अप्रत्याशित त्रुटि भेल। कृपया पुनः प्रयास करू।',
    tryAgain: 'पुनः प्रयास करू',
    goHome: 'होम पर जाउ',
  },
  mni: {
    title: 'খরা লান্থোকখ্রে',
    desc: 'অরানবা থবক থোকখ্রে। চানবীদুনা অমুক হন্না হোৎনবীয়ু।',
    tryAgain: 'অমুক হন্না হোৎনবীয়ু',
    goHome: 'হোমদা চৎলু',
  },
  ne: {
    title: 'केही गलत भयो',
    desc: 'अप्रत्याशित त्रुटि देखा पर्यो। कृपया पुन: प्रयास गर्नुहोस्।',
    tryAgain: 'पुन: प्रयास गर्नुहोस्',
    goHome: 'गृहपृष्ठमा जानुहोस्',
  },
  sa: {
    title: 'किञ्चित् दोषः जातः',
    desc: 'अनपेक्षितः दोषः जातः। कृपया पुनः प्रयतताम्।',
    tryAgain: 'पुनः प्रयतताम्',
    goHome: 'मुख्यपृष्ठं गच्छतु',
  },
  sat: {
    title: 'ᱡᱟᱦᱟᱸᱱᱟᱜ ᱵᱟᱹᱲᱤᱡ ᱮᱱᱟ',
    desc: 'ᱟᱸᱥ ᱵᱟᱝ ᱛᱟᱦᱮᱸ ᱠᱟᱱ ᱵᱟᱹᱲᱤᱡ ᱦᱩᱭ ᱮᱱᱟ᱾ ᱫᱟᱭᱟᱠᱟᱛᱮ ᱟᱨᱦᱚᱸ ᱪᱮᱥᱴᱟᱭ ᱢᱮ᱾',
    tryAgain: 'ᱟᱨᱦᱚᱸ ᱪᱮᱥᱴᱟᱭ ᱢᱮ',
    goHome: 'ᱢᱩᱬᱩᱛ ᱛᱮ ᱪᱟᱞᱟᱜ ᱢᱮ',
  },
  sd: {
    title: 'ڪجھ غلط ٿي ويو',
    desc: 'اڻڄاتل غلطي ٿي پئي. مهرباني ڪري ٻيهر ڪوشش ڪريو.',
    tryAgain: 'ٻيهر ڪوشش ڪريو',
    goHome: 'گھر ڏانھن وڃو',
  },
};

export default function ErrorBoundary({
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
      return saved && ERROR_STRINGS[saved] ? saved : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    console.error('ArthaSetu unhandled error:', error);
    try {
      fetch('/api/client-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message || 'Unhandled UI error',
          stack: error?.stack?.slice(0, 1000) || '',
          digest: error?.digest || '',
          url: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      }).catch(() => {});
    } catch {
      // Ignore network errors in error boundary
    }
  }, [error]);

  const localized = lang ? ERROR_STRINGS[lang] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
            {localized ? localized.title : 'Something went wrong / कुछ गड़बड़ हो गई'}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {localized ? (
              localized.desc
            ) : (
              <>
                An unexpected error occurred. Please try again.
                <br />
                एक अनपेक्षित समस्या हुई। कृपया फिर से प्रयास करें।
              </>
            )}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {localized ? localized.tryAgain : 'Try Again / फिर से प्रयास करें'}
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            {localized ? localized.goHome : 'Go Home / होम पर जाएं'}
          </a>
        </div>
      </div>
    </div>
  );
}
