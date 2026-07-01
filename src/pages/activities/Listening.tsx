import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../hooks/useGameStore';
import { dbService } from '../../services/db';
import type { LearningItem } from '../../types';
import { speechService } from '../../services/speechService';
import { SpeechButton } from '../../components/SpeechButton';
import { playSuccessSound, playErrorSound } from '../../utils/soundEffects';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export const Listening: React.FC = () => {
  const navigate = useNavigate();
  const { activeLanguageId, recordItemCompletion, settings } = useGameStore();

  const [items, setItems] = useState<LearningItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Load items
  useEffect(() => {
    if (!activeLanguageId) {
      navigate('/');
      return;
    }

    const fetchItems = async () => {
      const dbItems = await dbService.getLearningItems(activeLanguageId, 'words');
      setItems(dbItems);
      setLoading(false);
    };

    fetchItems();
  }, [activeLanguageId, navigate]);

  const currentItem = items[currentIndex];

  // Set up active item options and auto-trigger audio play
  useEffect(() => {
    if (items.length > 0 && currentItem) {
      // Build options
      const distractors = items.filter(item => item.word !== currentItem.word);
      const shuffledDistractors = [...distractors].sort(() => 0.5 - Math.random());
      const selectedDistractors = shuffledDistractors.slice(0, 3).map(item => item.word);
      const finalOptions = [...selectedDistractors, currentItem.word].sort(() => 0.5 - Math.random());

      setOptions(finalOptions);
      setSelectedOption(null);
      setIsCorrect(null);

      // Auto play audio
      const timer = setTimeout(() => {
        speechService.speak(
          currentItem.word,
          activeLanguageId || 'english',
          settings,
          currentItem.audio
        );
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [items, currentIndex, activeLanguageId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="text-6xl">📭</div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No words available</h3>
        <p className="text-sm text-slate-500">
          Add some vocabulary words in the Admin Panel.
        </p>
        <button
          onClick={() => navigate('/subjects')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-2xl shadow-md transition-all active:scale-95"
        >
          Back to Subjects
        </button>
      </div>
    );
  }

  const handleOptionClick = (option: string) => {
    if (selectedOption !== null) return;

    setSelectedOption(option);
    const correct = option === currentItem.word;
    setIsCorrect(correct);

    if (correct) {
      playSuccessSound(settings.soundEnabled);
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      recordItemCompletion(currentItem.id, true, 0);
    } else {
      playErrorSound(settings.soundEnabled);
      recordItemCompletion(currentItem.id, false, 0);
    }
  };

  const handleNextWord = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-indigo-950 dark:text-white flex items-center justify-center gap-2">
          <Volume2 className="h-6 w-6 text-sky-500" /> Listening Activity
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Listen to the sound and identify the word! (Word {currentIndex + 1} of {items.length})
        </p>
      </div>

      {/* Gameplay card */}
      <div className="rounded-[40px] border-4 border-indigo-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-6 flex flex-col items-center">
        {/* Large Play Audio Card */}
        <div className="flex flex-col items-center justify-center p-8 bg-sky-50/50 dark:bg-slate-900/50 rounded-3xl border-4 border-dashed border-sky-200/50 w-full max-w-sm">
          <SpeechButton 
            word={currentItem.word}
            customAudio={currentItem.audio}
            className="rounded-full shadow-lg p-7 border-2 border-sky-400 bg-sky-500 text-white hover:bg-sky-600 scale-125"
            size={36}
          />
          <span className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest mt-6">
            Tap to hear again
          </span>
        </div>

        {/* Option buttons */}
        <div className="w-full max-w-sm space-y-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">
            Select the correct written word
          </span>
          <div className="grid grid-cols-1 gap-3">
            {options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const optionIsCorrect = option === currentItem.word;

              let btnClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100 hover:border-sky-300';
              if (selectedOption !== null) {
                if (optionIsCorrect) {
                  btnClass = 'bg-emerald-500 border-emerald-500 text-white font-black ring-4 ring-emerald-300/30';
                } else if (isSelected) {
                  btnClass = 'bg-rose-500 border-rose-500 text-white font-black ring-4 ring-rose-300/30';
                } else {
                  btnClass = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-650 opacity-60 cursor-not-allowed';
                }
              }

              return (
                <motion.button
                  key={idx}
                  whileHover={selectedOption === null ? { scale: 1.02 } : {}}
                  whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                  onClick={() => handleOptionClick(option)}
                  disabled={selectedOption !== null}
                  className={`w-full py-4 px-6 rounded-2xl border-4 text-xl font-extrabold font-tamil shadow-sm flex items-center justify-between transition-all cursor-pointer ${btnClass}`}
                >
                  <span>{option}</span>
                  {selectedOption !== null && optionIsCorrect && <span className="text-sm">✓</span>}
                  {selectedOption !== null && isSelected && !optionIsCorrect && <span className="text-sm">✗</span>}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Feedback Alert */}
        <AnimatePresence>
          {selectedOption !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full"
            >
              {isCorrect ? (
                <div className="py-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 dark:border-emerald-950/20 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center gap-2 shadow-sm text-sm">
                  <CheckCircle2 className="h-5 w-5" /> Well done! That is correct!
                </div>
              ) : (
                <div className="py-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 dark:border-rose-950/20 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-black flex items-center justify-center gap-2 shadow-sm text-sm">
                  <AlertCircle className="h-5 w-5" /> Oops! Try listening again and select the other word.
                </div>
              )}

              <button
                onClick={handleNextWord}
                className="w-full mt-4 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-extrabold py-3.5 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                Next Word <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
