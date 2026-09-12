/**
 * Small, dependency-free helpers the advisor route and chat screen share.
 */

/**
 * Written into the reply stream when the AI fails part-way. The chat screen
 * swaps it for a message in the user's own language and a "Try again" button;
 * the server used to write an English sentence straight into the answer.
 */
export const ADVISOR_ERROR_MARKER = '[[ARTHASETU_AI_ERROR]]';

/**
 * Everyday words for business, money and common rural trades, in Roman letters
 * and in the Devanagari and Bengali scripts. A message containing one is about
 * the user's livelihood, so it skips the scope check: people write "murgi
 * palan", "dukan loan" or "पैसा चाहिए", and a model judging such a fragment on
 * its own can turn them away.
 */
const ROMAN_WORDS = /\b(dukaa?n|dhandh?a|vyapar|byapar|byabsa|bebsa|karobar|kaam|rojgar|rozgar|paisa|paise|karz|karza|karja|rin|byaj|bachat|kamai|munafa|nafa|yojana|yojna|sarkari|subsidy|sabsidi|murgi|bakri|gaay|gai|bhains|dudh|doodh|dairy|silai|kirana|chai|parlour|chakki|kheti|kisan|machine|machin|shop|business|loan|lon|mudra|pmegp|bank|profit|price|dam|daam|becha|bechna|kharcha|kharch|lagat)\b/i;
const INDIC_WORDS = /दुकान|व्यापार|व्यवसाय|धंधा|रोजगार|पैसा|पैसे|कर्ज|क़र्ज़|लोन|ब्याज|बचत|कमाई|मुनाफा|योजना|सरकारी|सब्सिडी|मुर्गी|बकरी|गाय|भैंस|दूध|सिलाई|किराना|खेती|किसान|मशीन|खर्च|लागत|ব্যবসা|দোকান|ঋণ|লোন|টাকা|প্রকল্প|মুরগি|ছাগল|গরু|দুধ|সেলাই|চাষ|খরচ/;

/** Common little words of Hindi and Bengali as people type them in Roman letters. */
const ROMAN_HINDI = /\b(hai|hain|hu|hoon|mujhe|mujhko|mera|meri|mere|hum|humko|hamara|aap|aapka|kaise|kaisa|kya|kyu|kyun|kitna|kitne|kitni|chahiye|chaiye|karna|karni|karu|kare|karein|hoga|hogi|milega|milegi|nahi|nahin|bhi|aur|lekin|abhi|ke|ka|ki|ko|se|liye|mein|wala|wali|bata|batao|bataiye|shuru|kab|kahan|kaha)\b/gi;
const ROMAN_BENGALI = /\b(ami|amar|amake|apni|apnar|tumi|ache|achhe|nei|kivabe|kibhabe|koto|lagbe|chai|debe|pabo|korbo|korte|hobe|kothay|keno|ekta|kichu|taka|dokan|byabsa|jonno|theke|bolun|bolo)\b/gi;

/**
 * "Hindi" or "Bengali" when a message is that language typed in Roman letters.
 *
 * The prompt already asked for a reply in the same Roman-letter style, and a
 * live test still answered "murgi palan kaise shuru kare" and "loan chahiye" in
 * English. Naming the language outright for that one message is what works.
 */
export function detectRomanIndianLanguage(message: string): 'Hindi' | 'Bengali' | null {
  if (/[^\x00-\x7F₹]/.test(message.replace(/[‘’“”–—]/g, ''))) return null;
  const hindi = message.match(ROMAN_HINDI)?.length ?? 0;
  const bengali = message.match(ROMAN_BENGALI)?.length ?? 0;
  const best = Math.max(hindi, bengali);
  // One such word is enough in a message of two or three words ("loan chahiye").
  const needed = message.trim().split(/\s+/).length <= 3 ? 1 : 2;
  if (best < needed) return null;
  return bengali > hindi ? 'Bengali' : 'Hindi';
}

/**
 * A rupee amount the way people say it: "₹3 lakh", "₹1.5 crore", "₹50,000".
 * Handed to the model beside the raw number, which it once rendered as
 * "₹3,000,000" for a ₹3 lakh loan.
 */
export function formatIndianRupees(amount: number | null | undefined): string | undefined {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return undefined;
  const trim = (value: number) => String(Number(value.toFixed(2)));
  if (amount >= 1_00_00_000) return `₹${trim(amount / 1_00_00_000)} crore`;
  if (amount >= 1_00_000) return `₹${trim(amount / 1_00_000)} lakh`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function looksLikeEverydayBusinessMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  // A few words cannot be judged fairly on their own, and the advisor itself
  // politely declines anything outside its scope.
  if (trimmed.split(/\s+/).length <= 3) return true;
  return ROMAN_WORDS.test(trimmed) || INDIC_WORDS.test(trimmed);
}
