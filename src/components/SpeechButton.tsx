import React, { useEffect, useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { speechService } from '../services/speechService';
import { Volume2, VolumeX, Square } from 'lucide-react';

interface SpeechButtonProps {
  word: string;
  customAudio?: string; // base64 or URL
  className?: string;
  size?: number;
}

export const SpeechButton: React.FC<SpeechButtonProps> = ({ 
  word, 
  customAudio,
  className = '', 
  size = 18 
}) => {
  const { activeLanguageId, settings } = useGameStore();
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Monitor global speech state
    const handleStateChange = (speaking: boolean) => {
      // Only set speaking if speechService is speaking the current word
      if (speaking && speechService.isSpeaking()) {
        setIsSpeaking(true);
      } else {
        setIsSpeaking(false);
      }
    };

    speechService.registerStateChange(handleStateChange);
    return () => {
      speechService.registerStateChange(() => {});
    };
  }, [word]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!word) return;

    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
    } else {
      speechService.speak(
        word,
        activeLanguageId || 'english',
        settings,
        customAudio
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (isSpeaking) {
        speechService.stop();
        setIsSpeaking(false);
      } else {
        speechService.speak(
          word,
          activeLanguageId || 'english',
          settings,
          customAudio
        );
      }
    }
  };

  if (!settings.ttsEnabled) {
    return (
      <span 
        className={`text-slate-300 dark:text-slate-700 cursor-not-allowed inline-flex items-center p-2.5 ${className}`} 
        title="Speech is disabled in settings"
        aria-hidden="true"
      >
        <VolumeX size={size} />
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={isSpeaking ? `Stop speaking ${word}` : `Pronounce ${word}`}
      className={`relative inline-flex items-center justify-center rounded-xl p-2.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer ${
        isSpeaking 
          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/40' 
          : 'bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40'
      } ${className}`}
    >
      {isSpeaking ? (
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-30"></span>
          <Square size={size} className="fill-current text-sky-500 shrink-0" />
        </div>
      ) : (
        <Volume2 size={size} className="shrink-0 transition-transform duration-200 hover:scale-110" />
      )}
    </button>
  );
};
