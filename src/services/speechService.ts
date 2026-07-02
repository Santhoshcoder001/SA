import { speakViaGeminiTts, hasGeminiApiKey } from './ElevenLabsService';
import { getCachedAudio, cacheAudio } from './AudioCache';
import { speakTamilViaHf } from './tamilTts';

// Map language IDs to standard voice locale strings
const LANG_LOCALE_MAP: Record<string, string> = {
  english: 'en-US',
  tamil: 'ta-IN',
  hindi: 'hi-IN',
  telugu: 'te-IN',
  kannada: 'kn-IN',
  malayalam: 'ml-IN'
};

export class SpeechService {
  private activeAudio: HTMLAudioElement | null = null;
  private isCurrentlySpeaking = false;
  private isCurrentlyGenerating = false;
  private onStateChangeCallback: ((speaking: boolean) => void) | null = null;
  private onGenerateStateChangeCallback: ((generating: boolean) => void) | null = null;

  registerStateChange(callback: (speaking: boolean) => void) {
    this.onStateChangeCallback = callback;
  }

  registerGenerateStateChange(callback: (generating: boolean) => void) {
    this.onGenerateStateChangeCallback = callback;
  }

  private setSpeaking(state: boolean) {
    this.isCurrentlySpeaking = state;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }

  private setGenerating(state: boolean) {
    this.isCurrentlyGenerating = state;
    if (this.onGenerateStateChangeCallback) {
      this.onGenerateStateChangeCallback(state);
    }
  }

  isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }

  isGenerating(): boolean {
    return this.isCurrentlyGenerating;
  }

  /**
   * Main speech method that handles pre-recorded audio, Gemini, or Web Speech API fallback.
   */
  async speak(
    text: string,
    languageId: string,
    settings: {
      ttsEnabled: boolean;
      ttsProvider: 'browser' | 'gemini' | 'elevenlabs';
      geminiVoiceName: string;
      ttsSpeed: number;
      volume: number;
      pitch: number;
    },
    customAudioData?: string // base64 string or URL
  ): Promise<boolean> {
    if (!settings.ttsEnabled) return false;

    this.stop();

    // 1. Check if custom pre-recorded audio is available (base64 or direct URL)
    if (customAudioData) {
      try {
        let src = customAudioData;
        if (customAudioData.startsWith('data:audio') || !customAudioData.includes(':')) {
          // If it is raw base64 without prefix, prefix it
          if (!customAudioData.startsWith('data:')) {
            src = `data:audio/mp3;base64,${customAudioData}`;
          }
        }
        await this.playAudioSrc(src, settings.ttsSpeed, settings.volume);
        return true;
      } catch (err) {
        console.error('Failed to play pre-recorded audio, falling back to synthesis:', err);
      }
    }

    // 2. Cloud TTS integration (HF for Tamil, Gemini for others)
    const isTamil = languageId === 'tamil';
    const apiKeyExists = hasGeminiApiKey();
    const cloudTtsEnabled = settings.ttsProvider === 'gemini' || settings.ttsProvider === 'elevenlabs';
    
    // We allow HF API to proceed even without Gemini API key, as it's our own free endpoint.
    if (isTamil || (cloudTtsEnabled && apiKeyExists)) {
      try {
        // Query IndexedDB Audio Cache
        let audioBlob = await getCachedAudio(text);

        if (!audioBlob) {
          this.setGenerating(true); // Network request starting
          if (isTamil) {
            audioBlob = await speakTamilViaHf(text);
          } else {
            audioBlob = await speakViaGeminiTts(text, settings.geminiVoiceName);
          }
          await cacheAudio(text, audioBlob);
        }
        
        this.setGenerating(false);

        const audioUrl = URL.createObjectURL(audioBlob);
        await this.playAudioSrc(audioUrl, settings.ttsSpeed, settings.volume, () => {
          URL.revokeObjectURL(audioUrl);
        });
        return true;
      } catch (err) {
        this.setGenerating(false);
        console.error('Cloud TTS failed, falling back to Browser SpeechSynthesis:', err);
      }
    }

    // 3. Fallback: Browser Web Speech API
    return this.speakViaBrowser(text, languageId, settings);
  }

  /**
   * Play an audio source (URL or Base64 data URL)
   */
  private playAudioSrc(
    src: string,
    speed: number,
    volume: number,
    cleanup?: () => void
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.setSpeaking(true);
      const audio = new Audio(src);
      this.activeAudio = audio;
      audio.playbackRate = speed;
      audio.volume = volume;

      audio.onended = () => {
        this.setSpeaking(false);
        this.activeAudio = null;
        if (cleanup) cleanup();
        resolve(true);
      };

      audio.onerror = (e) => {
        this.setSpeaking(false);
        this.activeAudio = null;
        if (cleanup) cleanup();
        reject(e);
      };

      audio.play().catch(reject);
    });
  }

  /**
   * Speak using browser's built-in Web Speech API
   */
  private speakViaBrowser(
    text: string,
    languageId: string,
    settings: {
      ttsSpeed: number;
      volume: number;
      pitch: number;
    }
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve(false);
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.ttsSpeed;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      const targetLocale = LANG_LOCALE_MAP[languageId] || 'en-US';
      utterance.lang = targetLocale;

      // Try to find a voice that matches the target language locale
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-').includes(targetLocale.toLowerCase()));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      let timeout: any = null;

      utterance.onstart = () => {
        this.setSpeaking(true);
      };

      utterance.onend = () => {
        if (timeout) clearTimeout(timeout);
        this.setSpeaking(false);
        resolve(true);
      };

      utterance.onerror = (e) => {
        console.error('SpeechSynthesis error:', e);
        if (timeout) clearTimeout(timeout);
        this.setSpeaking(false);
        resolve(false);
      };

      window.speechSynthesis.speak(utterance);

      // Fail-safe timeout in case speech end is never fired
      timeout = setTimeout(() => {
        this.setSpeaking(false);
        resolve(true);
      }, 5000);
    });
  }

  /**
   * Stop any active audio playbacks or speech syntheses
   */
  stop() {
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch (e) {
        // ignore
      }
      this.activeAudio = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    this.setSpeaking(false);
  }
}

export const speechService = new SpeechService();
