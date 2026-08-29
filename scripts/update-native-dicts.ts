export {};

import * as fs from 'fs';
import * as path from 'path';

// Complete native translations dictionary for all sections across all languages
const FULL_NATIVE_DICTS: Record<string, any> = {
  // ──────────────────────────────────────────────────────────────────────────
  // TAMIL (தமிழ்) — 100% Pure Tamil Script
  // ──────────────────────────────────────────────────────────────────────────
  ta: {
    appName: 'அர்த்தசேது',
    tagline: 'உங்கள் வணிகம். உங்கள் மொழி. உங்கள் திட்டம்.',
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
    admin: {
      loginTitle: 'நிர்வாகி உள்நுழைவு',
      loginSubtitle: 'அர்த்தசேது திட்ட மேலாண்மை தளம்',
      loginButton: 'நிர்வாக தளத்தில் உள்நுழையவும்',
      backHome: '← முகப்பிற்கு திரும்பு',
      registerLink: 'நிர்வாக கணக்கை பதிவு செய் (/signup) →',
      portalTitle: 'அர்த்தசேது மேலாண்மை தளம்',
      draftNewScheme: 'புதிய திட்ட வரைவு (AI)',
      publishedSchemes: 'வெளியிடப்பட்ட திட்டங்கள்',
      pendingProposals: 'மதிப்பாய்வு நிலுவையில் உள்ளவை',
      auditEntries: 'மொத்த தணிக்கை பதிவுகள்',
      registeredUsers: 'பதிவுசெய்த தொழில்முனைவோர்',
      liveSchemesTab: 'செயலில் உள்ள திட்டங்கள்',
      reviewQueueTab: 'மதிப்பாய்வு வரிசை',
      userManagementTab: 'பயனர் மேலாண்மை',
      queueEmpty: 'மதிப்பாய்வு வரிசை காலியாக உள்ளது! புதிய வரைவுகள் இல்லை.',
      userGovernance: 'பயனர் ஆளுமை மற்றும் கணக்கு நீக்கம்',
      userGovernanceDesc: 'பயனர்களை பார்க்கவும் கணக்குகளை சட்டப்பூர்வமாக நீக்கவும் நிர்வாக கட்டுப்பாடுகள்.',
      deleteUser: 'பயனரை நீக்கு',
      userErasureTitle: 'நிர்வாக பயனர் கணக்கு அழிப்பு',
      userErasureDesc: 'பயனர் கணக்கை நிரந்தரமாக நீக்கி தணிக்கை பதிவேட்டில் பதிவு செய்',
      targetAccount: 'குறிப்பிட்ட கணக்கு',
      confirmDeleteUser: 'உறுதிசெய்து நீக்குங்கள்',
      auditLogTitle: 'திட்ட புதுப்பிப்பு தணிக்கை பதிவு',
      auditLogSubtitle: 'AI உருவாக்கிய கொள்கை மாற்றங்கள் மற்றும் நிர்வாக ஒப்புதல்களின் வரலாறு',
      schemesDirectoryTitle: 'அரசு திட்ட ஆவணங்கள்',
      schemesDirectorySubtitle: 'அர்த்தசேதுவின் அனைத்து மத்திய மற்றும் மாநில திட்டங்களின் பட்டியல்',
      addNewScheme: 'புதிய திட்டத்தை சேர்',
      editScheme: 'AI திருத்தம் / முன்மொழிவு →',
      searchPlaceholder: 'பெயர், மாநிலம் அல்லது பிரிவு மூலம் தேடுங்கள்...',
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

  // ──────────────────────────────────────────────────────────────────────────
  // URDU (اردو) — 100% Pure Urdu Script
  // ──────────────────────────────────────────────────────────────────────────
  ur: {
    appName: 'ارتھ سیتو',
    tagline: 'آپ کا کاروبار۔ آپ کی زبان۔ آپ کا منصوبہ۔',
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
      loginSubtitle: 'ارتھ سیتو اسکیم گورننس پورٹل',
      loginButton: 'ایڈمن کنسول میں سائن ان کریں',
      backHome: '← ہوم پیج پر واپس جائیں',
      registerLink: 'ایڈمن اکاؤنٹ رجسٹر کریں (/signup) →',
      portalTitle: 'ارتھ سیتو گورننس پورٹل',
      draftNewScheme: 'نئی اسکیم کا مسودہ (AI)',
      publishedSchemes: 'شائع شدہ اسکیمیں',
      pendingProposals: 'زیر جائزہ تجاویز',
      auditEntries: 'کل آڈٹ لاگ اندراجات',
      registeredUsers: 'رجسٹرڈ کاروباری افراد',
      liveSchemesTab: 'فعال اسکیمیں',
      reviewQueueTab: 'جائزہ کی قطار',
      userManagementTab: 'صارفین کا انتظام',
      queueEmpty: 'جائزہ کی قطار خالی ہے! کوئی مسودہ زیر التوا نہیں ہے۔',
      userGovernance: 'صارفین کی نگرانی اور اکاؤنٹ کا خاتمہ',
      userGovernanceDesc: 'صارفین کو دیکھنے اور اکاؤنٹس کو قانونی طور پر ختم کرنے کے انتظامی اختیارات۔',
      deleteUser: 'صارف کو حذف کریں',
      userErasureTitle: 'ایڈمن صارف اکاؤنٹ کا خاتمہ',
      userErasureDesc: 'صارف کو مستقل طور پر حذف کریں اور آڈٹ میں ریکارڈ کریں',
      targetAccount: 'ہدف اکاؤنٹ',
      confirmDeleteUser: 'تصدیق کریں اور حذف کریں',
      auditLogTitle: 'اسکیم اپ ڈیٹ آڈٹ لاگ',
      auditLogSubtitle: 'AI پالیسی تبدیلیوں اور ایڈمن منظوریوں کی مستقل تاریخ',
      schemesDirectoryTitle: 'سرکاری اسکیموں کا ریکارڈ',
      schemesDirectorySubtitle: 'ارتھ سیتو کی تمام مرکزی اور ریاستی اسکیموں کی ڈائرکٹری',
      addNewScheme: 'نئی اسکیم شامل کریں',
      editScheme: 'AI ترمیم / تجویز →',
      searchPlaceholder: 'نام، ریاست یا زمرے سے تلاش کریں...',
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

  // ──────────────────────────────────────────────────────────────────────────
  // ASSAMESE (অসমীয়া) — 100% Pure Assamese Script
  // ──────────────────────────────────────────────────────────────────────────
  as: {
    appName: 'অৰ্থসেতু',
    tagline: 'আপোনাৰ ব্যৱসায়। আপোনাৰ ভাষা। আপোনাৰ পৰিকল্পনা।',
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
    admin: {
      loginTitle: 'এডমিন কনচোলত প্ৰৱেশ',
      loginSubtitle: 'অৰ্থসেতু আঁচনি পৰিচালনা প’ৰ্টেল',
      loginButton: 'এডমিন কনচোলত ছাইন ইন কৰক',
      backHome: '← মূল পৃষ্ঠালৈ উভতি যাওক',
      registerLink: 'এডমিন একাউণ্ট পঞ্জীয়ন কৰক (/signup) →',
      portalTitle: 'অৰ্থসেতু পৰিচালনা প’ৰ্টেল',
      draftNewScheme: 'নতুন আঁচনিৰ খচৰা (AI)',
      publishedSchemes: 'প্ৰকাশিত আঁচনিসমূহ',
      pendingProposals: 'পৰ্যালোচনাৰ বাবে থকা প্ৰস্তাৱ',
      auditEntries: 'মুঠ অডিট লগ প্ৰবিষ্টি',
      registeredUsers: 'পঞ্জীভুক্ত উদ্যমীসকল',
      liveSchemesTab: 'সক্ৰিয় আঁচনিসমূহ',
      reviewQueueTab: 'পৰ্যালোচনাৰ তালিকা',
      userManagementTab: 'ব্যৱহাৰকাৰী ব্যৱস্থাপনা',
      queueEmpty: 'পৰ্যালোচনাৰ তালিকা খালী! কোনো নতুন খচৰা বাকী নাই।',
      userGovernance: 'ব্যৱহাৰকাৰী পৰিচালনা আৰু একাউণ্ট বিলোপ',
      userGovernanceDesc: 'ব্যৱহাৰকাৰী চাবলৈ আৰু একাউণ্ট আইনগতভাৱে বিলোপ কৰিবলৈ প্ৰশাসনিক নিয়ন্ত্ৰণ।',
      deleteUser: 'ব্যৱহাৰকাৰী বিলোপ কৰক',
      userErasureTitle: 'এডমিন ব্যৱহাৰকাৰী একাউণ্ট মোচন',
      userErasureDesc: 'ব্যৱহাৰকাৰী স্থায়ীভাৱে মচি পেলাওক আৰু অডিট ট্ৰেইলত লিপিবদ্ধ কৰক',
      targetAccount: 'নিৰ্দিষ্ট একাউণ্ট',
      confirmDeleteUser: 'নিশ্চিত কৰক আৰু বিলোপ কৰক',
      auditLogTitle: 'আঁচনি উন্নীতকৰণ অডিট লগ',
      auditLogSubtitle: 'AI দ্বাৰা প্ৰস্তুত নীতিৰ সলনি আৰু এডমিন অনুমোদনৰ স্থায়ী ইতিহাস',
      schemesDirectoryTitle: 'চৰকাৰী আঁচনিৰ তথ্য',
      schemesDirectorySubtitle: 'অৰ্থসেতুৰ সকলো কেন্দ্ৰীয় আৰু ৰাজ্যিক আঁচনিৰ তালিকা',
      addNewScheme: 'নতুন আঁচনি যোগ কৰক',
      editScheme: 'AI সম্পাদনা / প্ৰস্তাৱ →',
      searchPlaceholder: 'নাম, ৰাজ্য বা শ্ৰেণী অনুসৰি সন্ধান কৰক...',
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

  // ──────────────────────────────────────────────────────────────────────────
  // SINDHI (सिन्धी / سنڌي)
  // ──────────────────────────────────────────────────────────────────────────
  sd: {
    appName: 'अर्थसेतु',
    tagline: 'तव्हांजो व्यापार. तव्हांजी बोली. तव्हांजी योजना.',
    common: {
      save: 'महफूज़ करियो',
      cancel: 'रद्द करियो',
      delete: 'मिटायो',
      edit: 'तब्दील करियो',
      loading: 'लोड थी रह्यो आहे...',
      error: 'का खराबी थी पयी',
      retry: 'बिहर कोशिश करियो',
      viewAll: 'सब दिशो',
      back: 'पुठिया',
      confirm: 'पको करियो',
      yes: 'हा',
      no: 'ना',
      close: 'बंद करियो',
      search: 'गोल्हियो',
      noResults: 'को नतीजो न मिलियो',
      rupee: '₹',
    },
    errors: {
      aiUnavailable: 'AI सर्विस थोरे वक्त लए बंद आहे. मेहरबानी करे वरी कोशिश करियो.',
      networkError: 'इंटरनेट जो मसलो आहे. कनेक्शन तपासी वरी कोशिश करियो.',
      saveFailed: 'महफूज़ न थी सकियो. वरी कोशिश करियो.',
      loadFailed: 'डाटा लोड न थी सकियो.',
      authRequired: 'अगें वधण लए लॉगिन करियो.',
      invalidInput: 'दर्ज कैल मालूमात तपासी वरी कोशिश करियो.',
    },
    admin: {
      loginTitle: 'ایڈمن کنسول لاگ ان (Admin Login)',
      loginSubtitle: 'अर्थसेतु योजना प्रशासन पोर्टल',
      loginButton: 'एडमिन कंसोल में साइन इन करियो',
      backHome: '← मुख्य पृष्ट ते वापस वञो',
      registerLink: 'एडमिन खातो रजिस्टर करियो (/signup) →',
      portalTitle: 'अर्थसेतु प्रशासन पोर्टल',
      draftNewScheme: 'नयीं योजना जो मसुदो (AI)',
      publishedSchemes: 'शाया कैल योजनाऊं',
      pendingProposals: 'तपास लए बाकी प्रस्ताव',
      auditEntries: 'कुल ऑडिट लॉग प्रविष्टियूं',
      registeredUsers: 'रजिस्टर कैल उद्यमी',
      liveSchemesTab: 'चालू योजनाऊं',
      reviewQueueTab: 'तपास सूची',
      userManagementTab: 'वापरिंदड प्रबंध',
      queueEmpty: 'तपास सूची खाली आहे! को मसुदो बाकी न आहे.',
      userGovernance: 'वापरिंदड प्रशासन ऐं खातो मिटायण',
      userGovernanceDesc: 'वापरिंदडण खे डिसण ऐं खातो कानूनी तौर ते मिटायण जा अख्तियारात.',
      deleteUser: 'वापरिंदड मिटायो',
      userErasureTitle: 'एडमिन वापरिंदड खातो मिटायण',
      userErasureDesc: 'खातो पके तौर ते मिटायो ऐं ऑडिट में दर्ज करियो',
      targetAccount: 'मकसद खातो',
      confirmDeleteUser: 'पको करे मिटायो',
      auditLogTitle: 'योजना अपडेट ऑडिट लॉग',
      auditLogSubtitle: 'AI नीति तब्दीलियूं ऐं एडमिन मंज़ूरियन जी पकी तारीख',
      schemesDirectoryTitle: 'सरकारी योजनाऊं जो रिकॉर्ड',
      schemesDirectorySubtitle: 'अर्थसेतु जी समूरी केंद्रीय ऐं रियासती योजनाऊं जी लिस्ट',
      addNewScheme: 'नयीं योजना शामिल करियो',
      editScheme: 'AI तब्दीली / प्रस्ताव →',
      searchPlaceholder: 'नालो, रियासत या वर्ग सां गोल्हियो...',
    },
    footer: {
      disclaimer: 'अर्थसेतु मालूमाती मकसद लए अंदाजो डींदे आहे. माली फैसलो करण खां अग में पाणि तपासी डिठो वञे.',
      prototype: 'हैकाथॉन प्रोटोटाइप — स्मार्ट इंडिया हैकाथॉन',
      teamLeader: 'टीम लीडर',
      leadDeveloper: 'लीड डेवलपर',
      testers: 'टेस्टिंग टीम',
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

async function updateAllFullNativeDicts() {
  const localesDir = path.join(process.cwd(), 'src', 'i18n', 'locales');

  for (const [code, dict] of Object.entries(FULL_NATIVE_DICTS)) {
    const filePath = path.join(localesDir, `${code}.json`);
    if (fs.existsSync(filePath)) {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      deepMerge(existing, dict);
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');
      console.log(`  ✅ [EMBEDDED FULL NATIVE SCRIPT] ${code}.json`);
    }
  }
}

updateAllFullNativeDicts().catch(console.error);
