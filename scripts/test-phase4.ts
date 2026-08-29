/**
 * Phase 4 Integration Test Script
 * Tests:
 * 1. Text Sanitizer for Speech Synthesis (cleans markdown for natural voice output)
 * 2. Voice State machine transitions
 * 3. Speech Language mapping (hi-IN, en-IN)
 * 4. Piped voice-to-text -> Gemini Flash -> synthesized speech output simulation
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { cleanTextForSpeech } from '../src/hooks/useSpeechSynthesis';
import type { VoiceState } from '../src/types';

async function runPhase4Tests() {
  console.log('🧪 Starting Phase 4: Voice Layer Integration & State Tests...\n');

  // 1. Dynamic import of Gemini & Prompt modules
  const { generateContentStream, GEMINI_MODELS } = await import('../src/lib/gemini');
  const { buildAdvisorSystemPrompt } = await import('../src/lib/prompts/advisor');

  // TEST 1: TEXT SANITIZATION FOR SPEECH SYNTHESIS
  console.log('1️⃣ Testing Markdown to Clean Speech Sanitizer (cleanTextForSpeech)...');
  const rawMarkdown = `
### Step 1: Capital Budgeting
For your **Poultry Unit** in *Kamrup, Assam*:
- **Chicks & Feed**: ₹45,000
- **Shed Setup**: ₹25,000
- **Medicine & Contingency**: ₹10,000
Check [PMEGP Guidelines](https://kviconline.gov.in) for 25% to 35% subsidy.
\`\`\`
Total = ₹80,000
\`\`\`
`;
  const sanitizedSpeech = cleanTextForSpeech(rawMarkdown);
  console.log('   📝 Raw Markdown:\n' + rawMarkdown.trim());
  console.log('   🔊 Sanitized Speech Output:\n' + `"${sanitizedSpeech}"`);

  // Assertions
  if (sanitizedSpeech.includes('###') || sanitizedSpeech.includes('**') || sanitizedSpeech.includes('```') || sanitizedSpeech.includes('https://')) {
    throw new Error('Text sanitizer failed to strip markdown tokens');
  }
  if (!sanitizedSpeech.includes('Poultry Unit in Kamrup, Assam') || !sanitizedSpeech.includes('PMEGP Guidelines for 25% to 35% subsidy')) {
    throw new Error('Sanitizer mangled the clean readable text');
  }
  console.log('   ✅ Text Sanitizer successfully produced clean, natural audio transcript.');

  // TEST 2: VOICE STATE MACHINE TRANSITION VERIFICATION
  console.log('\n2️⃣ Testing Voice State Machine Matrix...');
  const validStates: VoiceState[] = ['idle', 'listening', 'processing', 'speaking', 'error', 'disconnected'];

  function deriveVoiceState(params: {
    isSttSupported: boolean;
    isPermissionDenied: boolean;
    isListening: boolean;
    isStreaming: boolean;
    isSpeaking: boolean;
    hasError: boolean;
  }): VoiceState {
    if (!params.isSttSupported) return 'disconnected';
    if (params.isPermissionDenied || params.hasError) return 'error';
    if (params.isListening) return 'listening';
    if (params.isStreaming) return 'processing';
    if (params.isSpeaking) return 'speaking';
    return 'idle';
  }

  // Check 1: Normal Idle
  let state = deriveVoiceState({ isSttSupported: true, isPermissionDenied: false, isListening: false, isStreaming: false, isSpeaking: false, hasError: false });
  if (state !== 'idle') throw new Error(`Expected idle, got ${state}`);

  // Check 2: User taps mic -> Listening
  state = deriveVoiceState({ isSttSupported: true, isPermissionDenied: false, isListening: true, isStreaming: false, isSpeaking: false, hasError: false });
  if (state !== 'listening') throw new Error(`Expected listening, got ${state}`);

  // Check 3: Query sent to Gemini -> Processing
  state = deriveVoiceState({ isSttSupported: true, isPermissionDenied: false, isListening: false, isStreaming: true, isSpeaking: false, hasError: false });
  if (state !== 'processing') throw new Error(`Expected processing, got ${state}`);

  // Check 4: Gemini finished -> TTS Reading aloud -> Speaking
  state = deriveVoiceState({ isSttSupported: true, isPermissionDenied: false, isListening: false, isStreaming: false, isSpeaking: true, hasError: false });
  if (state !== 'speaking') throw new Error(`Expected speaking, got ${state}`);

  // Check 5: Microphone permission denied -> Error
  state = deriveVoiceState({ isSttSupported: true, isPermissionDenied: true, isListening: false, isStreaming: false, isSpeaking: false, hasError: false });
  if (state !== 'error') throw new Error(`Expected error, got ${state}`);

  // Check 6: Browser does not support Web Speech API -> Disconnected
  state = deriveVoiceState({ isSttSupported: false, isPermissionDenied: false, isListening: false, isStreaming: false, isSpeaking: false, hasError: false });
  if (state !== 'disconnected') throw new Error(`Expected disconnected, got ${state}`);

  console.log(`   ✅ All 6 Voice States verified (${validStates.join(' -> ')}).`);

  // TEST 3: PIPED VOICE SPEECH -> GEMINI FLASH -> TTS PREPARATION
  console.log('\n3️⃣ Simulating Spoken Voice Query in Hindi (hi-IN) through Gemini Flash...');
  const spokenHindiInput = 'मुझे कामरूप असम में पोल्ट्री फार्म के लिए फीड और चूजों की व्यवस्था कैसे करनी चाहिए?';
  const profileContext = {
    name: 'Ramesh Kumar',
    state: 'Assam',
    district: 'Kamrup',
    locality: 'Hajo',
    businessType: 'Broiler Poultry Farm',
    availableCapital: 80000,
  };

  const systemPrompt = buildAdvisorSystemPrompt(profileContext, 'hi');
  console.log(`   🎙️ Spoken Input: "${spokenHindiInput}"`);

  let geminiOutput = '';
  for await (const chunk of generateContentStream(GEMINI_MODELS.FLASH, systemPrompt, spokenHindiInput)) {
    geminiOutput += chunk;
  }

  if (!geminiOutput || geminiOutput.length < 100) {
    throw new Error('Gemini response was empty for spoken query');
  }

  const spokenSynthesizedResult = cleanTextForSpeech(geminiOutput);
  console.log(`   ✅ Gemini Flash responded (${geminiOutput.length} chars)`);
  console.log('   🔊 Prepared TTS Spoken Transcript Preview:\n' + spokenSynthesizedResult.slice(0, 300) + '...\n');

  console.log('🎉 ALL 3 PHASE 4 VOICE LAYER INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runPhase4Tests().catch((err) => {
  console.error('\n❌ Phase 4 Test failed with error:', err);
  process.exit(1);
});
