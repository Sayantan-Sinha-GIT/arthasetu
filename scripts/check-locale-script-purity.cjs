const fs = require('fs');
const { checkOne, LOCALE_SCRIPT } = require('./locale-script-purity.cjs');
function read(code) {
  if (code === 'hi' || code === 'bn') {
    const s = fs.readFileSync(`src/i18n/${code}.ts`, 'utf8');
    const m = s.match(/"voiceUnavailable":\s*"([^"]*)"/);
    return m ? m[1] : null;
  }
  const j = JSON.parse(fs.readFileSync(`src/i18n/locales/${code}.json`, 'utf8'));
  return j.tts && j.tts.voiceUnavailable;
}
const bad = [];
for (const code of Object.keys(LOCALE_SCRIPT)) {
  const t = read(code);
  if (!t) { console.log(`?? ${code}: missing`); bad.push(code); continue; }
  const r = checkOne(code, t);
  if (r.foreign.length || r.latin > 0) { bad.push(code); console.log(`❌ ${code}: foreign=[${r.foreign}] latin=${r.latin}`); }
  else console.log(`✅ ${code}`);
}
fs.mkdirSync('scripts/output', { recursive: true });
fs.writeFileSync('scripts/output/bad-locales.json', JSON.stringify(bad));
console.log('\nNEEDS RETRY:', bad.join(',') || '(none)');
