// Web Audio API Synthesized Sound Effects
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a success chime (a happy major arpeggio: C4 -> E4 -> G4 -> C5)
 */
export function playSuccessSound(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Play 4 notes in sequence
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      
      gain.gain.setValueAtTime(0.15, now + index * 0.08);
      // Fade out
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.3);
    });
  } catch (error) {
    console.error('Failed to play success sound:', error);
  }
}

/**
 * Play an error buzzer sound (a short, low dissonant sound)
 */
export function playErrorSound(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130.81, now); // C3 low
    osc.frequency.linearRampToValueAtTime(110.00, now + 0.15); // Slide down
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (error) {
    console.error('Failed to play error sound:', error);
  }
}

/**
 * Play a neutral click sound for UI actions
 */
export function playClickSound(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (error) {
    console.error('Failed to play click sound:', error);
  }
}

/**
 * Play a milestone sound when unlocking an achievement
 */
export function playMilestoneSound(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Celebratory ascending and descending arpeggio
    const notes = [349.23, 440.00, 523.25, 659.25, 523.25, 659.25, 880.00]; // F4, A4, C5, E5, C5, E5, A5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.06);
      
      gain.gain.setValueAtTime(0.15, now + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.06 + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.06);
      osc.stop(now + index * 0.06 + 0.4);
    });
  } catch (error) {
    console.error('Failed to play milestone sound:', error);
  }
}

/**
 * Gets the list of available Tamil voices on the browser.
 */
export function getTamilVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  return voices.filter(voice => voice.lang.includes('ta'));
}

/**
 * Checks if SpeechSynthesis is supported in the current browser.
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

/**
 * Stops any currently active browser speech.
 */
export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speaks a word using SpeechSynthesis API in Tamil.
 * Returns true if speech was successful and was in Tamil.
 */
export function speakTamilWord(
  word: string, 
  voiceName: string = 'default', 
  rate: number = 0.8,
  pitch: number = 1.0,
  volume: number = 1.0,
  enabled = true,
  onStart?: () => void,
  onEnd?: () => void
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!enabled || !isSpeechSynthesisSupported()) {
      resolve(false);
      return;
    }

    // Cancel any active speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Find Tamil voices
    const tamilVoices = getTamilVoices();
    
    if (tamilVoices.length > 0) {
      let selectedVoice = tamilVoices.find(v => v.name === voiceName);
      if (!selectedVoice) {
        // Fallback to the first available Tamil voice
        selectedVoice = tamilVoices[0];
      }
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      // No Tamil voice found, fall back to default text-to-speech engine lang
      utterance.lang = 'ta-IN'; 
      console.warn('No native Tamil voice found. Attempting generic ta-IN language code.');
    }

    let fallbackTimeout: any = null;

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (onEnd) onEnd();
      resolve(true);
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (onEnd) onEnd();
      resolve(false);
    };

    window.speechSynthesis.speak(utterance);
    
    // Fallback for browsers that trigger speak but fail silently
    fallbackTimeout = setTimeout(() => {
      if (onEnd) onEnd();
      resolve(true);
    }, 2000);
  });
}
