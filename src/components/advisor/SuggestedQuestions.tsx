'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { UserProfile } from '@/types';

interface SuggestedQuestionsProps {
  profile: Partial<UserProfile> | null;
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ profile, onSelect }: SuggestedQuestionsProps) {
  const { t, language } = useLanguage();
  const isHindi = language === 'hi';

  const business = profile?.businessType || 'business';
  const location = profile?.locality || profile?.district || profile?.state || 'my village';
  const capital = profile?.availableCapital ? `₹${profile.availableCapital.toLocaleString('en-IN')}` : 'my budget';

  const defaultQuestionsEn = [
    `How should I allocate ${capital} to start a ${business} in ${location}?`,
    `What government subsidy schemes apply to ${business} in ${profile?.state || 'India'}?`,
    `What are the most common risks for a new ${business} in the first 6 months?`,
    `How can I find reliable local customers and buyers in ${location}?`,
  ];

  const defaultQuestionsHi = [
    `${location} में ${capital} की लागत से ${business} कैसे शुरू करें?`,
    `${profile?.state || 'भारत'} में ${business} के लिए कौन-सी सरकारी सब्सिडी योजनाएं हैं?`,
    `शुरुआती 6 महीनों में ${business} के मुख्य जोखिम और सावधानियां क्या हैं?`,
    `${location} में स्थानीय ग्राहक और खरीदार कैसे खोजें?`,
  ];

  const shortLabelsMap: Record<string, string[]> = {
    en: ["Allocate my budget", "Check subsidy schemes", "First 6 months risks", "Find local customers"],
    hi: ["बजट आवंटन योजना", "सब्सिडी योजनाएं जांचें", "प्रथम 6 माह के जोखिम", "स्थानीय ग्राहक खोजें"],
    as: ["বাজেট আবণ্টন", "ভৰ্তুকি আঁচনি পৰীক্ষা", "প্ৰথম ৬ মাহৰ বিপদ", "স্থানীয় গ্ৰাহক সন্ধান"],
    bn: ["বাজেট বরাদ্দ", "ভর্তুকি প্রকল্প যাচাই", "প্রথম ৬ মাসের ঝুঁকি", "স্থানীয় ক্রেতা সন্ধান"],
    brx: ["बजेट बाहागो खालामनाय", "रेहाय आंसानि नायगिर", "गिबि ६ दाननि खैफbusiness", "स्थानीय ग्राहानि नायगिर"],
    doi: ["बजट बंड", "सब्सिडी योजनावां जांचो", "पैहले 6 म्हीने दे जोखिम", "स्थानीय ग्राहक लब्भो"],
    gu: ["બજેટ ફાળવણી", "સબસિડી યોજનાઓ તપાસો", "પ્રથમ 6 મહિનાના જોખમો", "સ્થાનિક ગ્રાહકો શોધો"],
    kn: ["ಬಜೆಟ್ ಹಂಚಿಕೆ", "ಸಬ್ಸಿಡಿ ಯೋಜನೆ ಪರಿಶೀಲನೆ", "ಮೊದಲ 6 ತಿಂಗಳ ಅಪಾಯಗಳು", "ಸ್ಥಳೀಯ ಗ್ರಾಹಕರ ಹುಡುಕಾಟ"],
    kok: ["बजेट वांटप", "सबसिडी येवजण्यो तपासात", "पयल्या 6 म्हयन्यांचे धोके", "स्थानिक ग्राहक सोदात"],
    ks: ["بجٹ الاٹمنٹ", "سبسڈی سکیٖمہٕ وُچھِو", "گۄڈنیٖکؠن 6 رؠتن ہٕنٛدی خطرات", "مقامی گاہک لَبِو"],
    mai: ["बजट आवंटन", "सब्सिडी योजना जांचू", "पहिल 6 मासक जोखिम", "स्थानीय ग्राहक खोजू"],
    ml: ["ബജറ്റ് വിഹിതം", "സബ്‌സിഡി പദ്ധതികൾ", "ആദ്യ 6 മാസത്തെ അപകടസാധ്യതകൾ", "പ്രാദേശിക ഉപഭോക്താക്കൾ"],
    mni: ["বজেট খাইদোকপা", "সবসিদি স্কিমশিং থিজিনবা", "অহানবা থা ৬কী রিস্কশিং", "লোকেল কস্তমরশিং থিবা"],
    mr: ["बजेट वाटप", "अनुदान योजना तपासा", "पहिले ६ महिन्यांतील जोखीम", "स्थानिक ग्राहक शोधा"],
    ne: ["बजेट विनियोजन", "अनुदान योजना जाँच", "पहिलो ६ महिनाको जोखिम", "स्थानीय ग्राहक खोज"],
    or: ["ବଜେଟ୍ ବଣ୍ଟନ", "ସବସିଡି ଯୋଜନା ଯାଞ୍ଚ", "ପ୍ରଥମ ୬ ମାସର ବିପଦ", "ସ୍ଥାନୀୟ ଗ୍ରାହକ ସନ୍ଧାନ"],
    pa: ["ਬਜਟ ਵੰਡ", "ਸਬਸਿਡੀ ਸਕੀਮਾਂ ਦੀ ਜਾਂਚ", "ਪਹਿਲੇ 6 ਮਹੀਨਿਆਂ ਦੇ ਜੋਖਮ", "ਸਥਾਨਕ ਗਾਹਕ ਲੱਭੋ"],
    sa: ["बजट-आवंटनम्", "अनुदान-योजना-परीक्षणम्", "प्रथम-षण्मासानां विपदः", "स्थानिक-ग्राहकाणां शोधनम्"],
    sat: ["ᱵᱟᱡᱮᱴ ᱦᱟᱹᱴᱤᱧ", "ᱥᱟᱵᱽᱥᱤᱰᱤ ᱡᱚᱡᱚᱱᱟ ᱧᱮᱞ", "ᱯᱩᱭᱞᱩ ᱖ ᱪᱟᱸᱫᱚ ᱨᱮᱱᱟᱜ ᱵᱚᱛᱚᱨ", "ᱟᱹᱛᱩ ᱨᱤᱱ ᱠᱟᱥᱴᱚᱢᱟᱨ ᱯᱟᱸᱡᱟ"],
    sd: ["بجٽ ورڇ", "سبسڊي اسڪيمون چيڪ ڪريو", "پهرين 6 مهينن جا خطرا", "مقامي گراهڪ ڳوليو"],
    ta: ["பட்ஜெட் ஒதுக்கீடு", "மானியத் திட்டங்கள்", "முதல் 6 மாத அபாயங்கள்", "உள்ளூர் வாடிக்கையாளர்கள்"],
    te: ["బడ్జెట్ కేటాయింపు", "సబ్సిడీ పథకాలు", "మొదటి 6 నెలల రిస్కులు", "స్థానిక కస్టమర్లు"],
    ur: ["بجٹ مختص کریں", "سبسڈی اسکیمیں چیک کریں", "پہلے 6 ماہ کے خطرات", "مقامی گاہک تلاش کریں"]
  };

  const shortLabels = shortLabelsMap[language] || shortLabelsMap['en'];
  const questions = isHindi ? defaultQuestionsHi : defaultQuestionsEn;

  return (
    <div className="space-y-2.5 animate-fade-in">
      <p className="text-xs font-semibold text-muted flex items-center gap-1.5">
        <span>✨</span>
        <span>{t.advisor.suggestedQuestions}</span>
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {questions.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(q)}
            className="shrink-0 whitespace-nowrap text-left py-2 px-3.5 rounded-2xl text-xs font-medium bg-surface hover:bg-surface-elevated text-foreground border border-border hover:border-primary/40 transition-all active:scale-95"
          >
            💬 {shortLabels[i]}
          </button>
        ))}
      </div>
    </div>
  );
}
