'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { calculateProfileCompleteness } from '@/lib/profile/completeness';
import { useLanguage } from '@/contexts/LanguageContext';
import MessageBubble from '@/components/advisor/MessageBubble';
import SuggestedQuestions from '@/components/advisor/SuggestedQuestions';
import SaveAdviceModal from '@/components/advisor/SaveAdviceModal';
import VoiceButton from '@/components/voice/VoiceButton';
import VoiceVisualizer from '@/components/voice/VoiceVisualizer';
import Button from '@/components/ui/Button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { detectScriptLanguage } from '@/lib/lang/detectScript';
import type { ChatMessage, UserProfile, VoiceState } from '@/types';

interface ChatInterfaceProps {
  userProfile: Partial<UserProfile> | null;
  userId: string;
}

export default function ChatInterface({ userProfile, userId }: ChatInterfaceProps) {
  const { t, language, currentMeta } = useLanguage();
  const isHindi = language === 'hi';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSnippetToSave, setActiveSnippetToSave] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeSpeakingMessageId, setActiveSpeakingMessageId] = useState<string | null>(null);

  // Default speech language derived from user's UI preference
  const defaultSpeechLanguage = currentMeta?.speechCode || (isHindi ? 'hi-IN' : 'en-IN');

  const SPEECH_LANG_KEY = 'arthasetu-speech-language';
  const [speechLanguage, setSpeechLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SPEECH_LANG_KEY);
      if (saved) return saved;
    }
    return defaultSpeechLanguage;
  });

  // Re-sync speechLanguage when the UI language's speech code changes (unless
  // the user has an explicit saved preference). Adjusted during render
  // (React's recommended pattern for "state derived from a prop") rather
  // than in an effect — by the time `currentMeta.speechCode` first differs
  // from its previous value this is always a post-mount, client-side render,
  // so the localStorage read here is safe.
  const [prevSpeechCode, setPrevSpeechCode] = useState(currentMeta?.speechCode);
  if (currentMeta?.speechCode !== prevSpeechCode) {
    setPrevSpeechCode(currentMeta?.speechCode);
    if (typeof window !== 'undefined' && currentMeta?.speechCode && !localStorage.getItem(SPEECH_LANG_KEY)) {
      setSpeechLanguage(currentMeta.speechCode);
    }
  }

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech Synthesis Hook
  const {
    isSupported: isTtsSupported,
    isSpeaking: isTtsSpeaking,
    speak: ttsSpeak,
    stop: ttsStop,
  } = useSpeechSynthesis();

  // Speech Recognition Hook
  const {
    isSupported: isSttSupported,
    isListening,
    interimTranscript,
    error: sttError,
    isPermissionDenied,
    startListening,
    stopListening,
    abortListening,
  } = useSpeechRecognition({
    defaultLanguage: speechLanguage,
    onResult: (finalTranscript) => {
      if (finalTranscript.trim()) {
        handleSendMessage(finalTranscript, true);
      }
    },
    onError: (err) => {
      setToastMessage(err);
      setTimeout(() => setToastMessage(''), 5000);
    },
  });

  // Calculate current Voice State per PRD §8.6
  const currentVoiceState: VoiceState = !isSttSupported
    ? 'disconnected'
    : isPermissionDenied || sttError
    ? 'error'
    : isListening
    ? 'listening'
    : isStreaming
    ? 'processing'
    : isTtsSpeaking
    ? 'speaking'
    : 'idle';

  // Initial welcome message from ArthaSetu. `t` already reflects the current
  // language, so this only needs one code path (not separate "En"/"Hi"
  // variants) — and depending on `language` here (rather than the derived
  // `isHindi` boolean) means switching between any two languages, not just
  // to/from Hindi, correctly refreshes the greeting.
  // Seeds the first message once userProfile/language are available, and
  // re-seeds the greeting on a language switch. Has to stay an effect: the
  // message carries `new Date()`, which must not be computed at render time
  // (that would differ between server and client and break hydration).
  useEffect(() => {
    if (messages.length === 0) {
      const userName = userProfile?.name || '';
      const business = userProfile?.businessType || '';
      const location = userProfile?.locality || userProfile?.district || userProfile?.state || '';

      const locationPart = location ? t.advisor.chat.locationPart.replace('{{location}}', location) : '';
      const businessContext = business ? t.advisor.chat.businessPart.replace('{{business}}', business).replace('{{locationPart}}', locationPart) : '';
      const greetingNamed = t.advisor.chat.greetingNamed.replace('{{userName}}', userName).replace('{{businessContext}}', businessContext);

      // The advisor gathers the profile conversationally rather than through a
      // signup form, so when details are still missing the opening message says
      // so. Without this the first thing the user sees is "How can I help you
      // today?", which gives no hint that telling it where they are and what
      // they can spend is what unlocks scheme matching and real numbers.
      const { missingFields } = calculateProfileCompleteness(userProfile);
      // The blank line is layout, so it belongs here rather than inside 23
      // translated strings where a model can quietly drop it.
      const profileNudge = missingFields.length > 0 ? `\n\n${t.advisor.chat.profileNudge}` : '';

      const greeting = (userName ? greetingNamed : t.advisor.chat.greetingAnon) + profileNudge;

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([
        {
          id: 'welcome-1',
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, language, messages.length]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, isListening, scrollToBottom]);

  // Handle Send Message with Streaming Response
  const handleSendMessage = async (textToSend?: string, fromVoice = false) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isStreaming) return;

    // Detect language script before sending
    const detectedLanguageCode = detectScriptLanguage(query);

    // Stop ongoing speech when user sends a new message
    ttsStop();
    setActiveSpeakingMessageId(null);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
      isVoice: fromVoice,
    };

    const assistantPlaceholderId = `assistant-${Date.now() + 1}`;
    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputValue('');
    const el = textareaRef.current;
    if (el) el.style.height = '46px';
    setIsStreaming(true);

    try {
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: messages,
          userProfile,
          language: detectedLanguageCode, // Override language to the detected one!
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Advisor API error (status ${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAssistantText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullAssistantText += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholderId
              ? { ...msg, content: fullAssistantText }
              : msg
          )
        );
      }

      // Auto-speak completed response if the query itself was spoken (voice in -> voice out)
      if (fullAssistantText && fromVoice) {
        setActiveSpeakingMessageId(assistantPlaceholderId);
        ttsSpeak(fullAssistantText, speechLanguage);
      }
    } catch (err) {
      console.error('Streaming error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantPlaceholderId
            ? {
                ...msg,
                content: t.advisor.errorMessage,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle speech recognition
  const handleMicClick = () => {
    if (isTtsSpeaking) {
      ttsStop();
      setActiveSpeakingMessageId(null);
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening(speechLanguage);
    }
  };

  const handleSpeakMessage = (msgId: string, content: string) => {
    if (isTtsSpeaking && activeSpeakingMessageId === msgId) {
      ttsStop();
      setActiveSpeakingMessageId(null);
    } else {
      setActiveSpeakingMessageId(msgId);
      ttsSpeak(content, speechLanguage);
    }
  };

  const handleOpenSaveModal = (snippet: string) => {
    setActiveSnippetToSave(snippet);
    setSaveModalOpen(true);
  };

  return (
    <div className="flex flex-col h-[78vh] sm:h-[82vh] glass rounded-3xl border border-border/40 overflow-hidden shadow-2xl relative z-10">
      {/* Top Status & Controls Bar */}
      <div className="px-4 py-3 bg-surface/50 backdrop-blur-md border-b border-border/40 flex items-center justify-between gap-3 text-[10px] text-muted-foreground uppercase tracking-widest relative z-20">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-foreground">{t.advisor.chat.geminiActive}</span>
        </div>

      </div>

      {/* Toast alert for errors or save confirmations */}
      {toastMessage && (
        <div className="bg-saffron-500/10 border-b border-saffron-400 text-saffron-800 dark:text-saffron-200 px-4 py-2 text-xs font-semibold text-center animate-fade-in flex items-center justify-center gap-2">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Permission Denied Banner (Graceful text fallback) */}
      {isPermissionDenied && (
        <div className="bg-warning-light border-b border-warning text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs font-medium text-center animate-fade-in">
          {t.advisor.chat.micBlocked}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onSave={msg.role === 'assistant' ? handleOpenSaveModal : undefined}
            onSpeak={
              isTtsSupported && msg.role === 'assistant'
                ? (content) => handleSpeakMessage(msg.id, content)
                : undefined
            }
            isSpeaking={activeSpeakingMessageId === msg.id && isTtsSpeaking}
          />
        ))}

        {/* Loading / Streaming typing indicator */}
        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-center gap-2 text-xs text-muted py-2 animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
            <span className="ml-1 font-medium">{t.advisor.thinking}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Live Voice Visualizer Bar (active while speaking) */}
      {isListening && (
        <div className="px-4 pb-2">
          <VoiceVisualizer
            isListening={isListening}
            interimTranscript={interimTranscript}
            speechLanguage={speechLanguage}
            onStop={stopListening}
            onCancel={abortListening}
          />
        </div>
      )}

      {/* Suggested Starter Questions (shown when conversation is short) */}
      {messages.length <= 2 && !isStreaming && !isListening && (
        <div className="px-4 sm:px-6 pb-3 pt-1 border-t border-border-subtle bg-surface/60">
          <SuggestedQuestions
            profile={userProfile}
            onSelect={(q) => handleSendMessage(q)}
          />
        </div>
      )}

      {/* Input Form Bar */}
      <div className="p-3 sm:p-5 bg-surface/80 backdrop-blur-md border-t border-border/40 relative z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2 sm:gap-3"
        >
          {/* Text Area */}
          <div className="flex-1 relative rounded-2xl bg-surface-elevated border border-border/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                const el = textareaRef.current;
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 128) + 'px';
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? `${t.voice.listening} (${speechLanguage})...`
                  : t.advisor.placeholder
              }
              rows={1}
              className="w-full resize-none bg-transparent px-5 py-4 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none max-h-32 min-h-[52px] overflow-y-auto font-serif"
              disabled={isStreaming}
            />
          </div>

          {/* Voice Mic Button */}
          <VoiceButton
            state={currentVoiceState}
            onClick={handleMicClick}
          />

          {/* Send Button */}
          <Button
            type="submit"
            size="md"
            disabled={!inputValue.trim() || isStreaming}
            isLoading={isStreaming}
            className="px-5 rounded-2xl shrink-0"
          >
            {t.advisor.send}
          </Button>
        </form>
      </div>

      {/* Save Advice Modal */}
      {activeSnippetToSave && (
        <SaveAdviceModal
          isOpen={saveModalOpen}
          onClose={() => {
            setSaveModalOpen(false);
            setActiveSnippetToSave(null);
          }}
          userId={userId}
          content={activeSnippetToSave}
          businessContext={`${userProfile?.businessType || 'Enterprise'} in ${userProfile?.state || 'India'}`}
          onSaved={() => {
            setToastMessage(t.advisor.advisorSaved);
            setTimeout(() => setToastMessage(''), 3000);
          }}
        />
      )}
    </div>
  );
}
