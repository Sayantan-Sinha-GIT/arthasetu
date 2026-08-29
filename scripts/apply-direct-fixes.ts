import fs from 'fs';
import path from 'path';

function updateLocaleJson(code: string, updates: Record<string, string>) {
  const p = path.resolve(process.cwd(), `src/i18n/locales/${code}.json`);
  if (!fs.existsSync(p)) return;
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

  for (const keyPath of Object.keys(updates)) {
    const val = updates[keyPath];
    const parts = keyPath.split('.');
    let cur = data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = val;
  }

  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Updated ${code}.json`);
}

// Direct authentic native translations for remaining specific keys
updateLocaleJson('ta', {
  'advisor.title': 'அர்த்தசேது AI வணிக ஆலோசகர்',
  'planner.operatingMargin': 'செயல்பாட்டு லாப வரம்பு',
  'footer.teamName': 'CoreDumped குழு',
  'landing.badge': 'ஸ்மார்ட் இந்தியா ஹேக்கத்தான் — தலைப்பு 69',
});

updateLocaleJson('te', {
  'advisor.title': 'అర్థసేతు AI వ్యాపార సలహాదారు',
  'footer.teamName': 'కోర్‌డంప్డ్ బృందం',
  'landing.badge': 'స్మార్ట్ ఇండియా హ్యాకథాన్ — అంశం 69',
});

updateLocaleJson('ur', {
  'advisor.title': 'ارتھ سیتو AI کاروباری مشیر',
  'footer.teamName': 'ٹیم کور ڈمپڈ',
  'landing.badge': 'سمارٹ انڈیا ہیکاتھون — عنوان 69',
});

updateLocaleJson('pa', {
  'advisor.title': 'ਅਰਥਸੇਤੂ AI ਕਾਰੋਬਾਰੀ ਸਲਾਹਕਾਰ',
  'footer.teamName': 'ਕੋਰ-ਡੰਪਡ ਟੀਮ',
  'landing.badge': 'ਸਮਾਰਟ ਇੰਡੀਆ ਹੈਕਾਥੌਨ — ਵਿਸ਼ਾ 69',
});

updateLocaleJson('sa', {
  'advisor.title': 'अर्थसेतु AI उद्योग-उपदेष्टा',
  'footer.teamName': 'कोर्डम्प्ड गणः',
  'landing.badge': 'स्मार्ट इण्डिया हैकाथॉन् — विषयः ६९',
});

updateLocaleJson('sat', {
  'advisor.title': 'ArthaSetu AI ᱵᱮᱯᱟᱨ ᱫᱤᱥᱟᱹ-ᱩᱫᱩᱜᱤᱡ',
  'footer.teamName': 'CoreDumped ᱜᱟᱫᱮᱞ',
  'landing.badge': 'Smart India Hackathon — Topic 69',
});

updateLocaleJson('sd', {
  'advisor.title': 'ارتھ سيتو AI ڪاروباري صلاحڪار',
  'footer.teamName': 'ٽيم ڪور ڊمپڊ',
  'landing.badge': 'سمارٽ انڊيا هيڪٿون — موضوع 69',
});

updateLocaleJson('mai', {
  'advisor.title': 'अर्थसेतु AI व्यापार सलाहकार',
  'footer.teamName': 'कोरडम्पड टीम',
  'landing.badge': 'स्मार्ट इंडिया हैकाथॉन — विषय 69',
});

updateLocaleJson('mr', {
  'advisor.title': 'अर्थसेतु AI व्यवसाय सल्लागार',
  'footer.teamName': 'कोरडम्पड टीम',
  'landing.badge': 'स्मार्ट इंडिया हॅकाथॉन — विषय ६९',
});

updateLocaleJson('gu', {
  'advisor.title': 'અર્થસેતુ AI વ્યવસાય સલાહકાર',
  'footer.teamName': 'કોરડમ્પ્ڈ ટીમ',
  'landing.badge': 'સ્માર્ટ ઇન્ડિયા હેકાથોન — વિષય 69',
});

updateLocaleJson('doi', {
  'advisor.title': 'अर्थसेतु AI कम्म-कार सलाहकार',
  'footer.teamName': 'कोरडम्पड टीम',
  'landing.badge': 'स्मार्ट इंडिया हैकाथॉन — विषय 69',
});

updateLocaleJson('brx', {
  'advisor.title': 'ArthaSetu AI फालांगि सुबुरुनगिरि',
  'footer.teamName': 'CoreDumped हानजा',
  'landing.badge': 'Smart India Hackathon — Topic 69',
});

console.log('Direct fixes applied successfully.');
