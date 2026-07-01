import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../hooks/useGameStore';
import { dbService } from '../../services/db';
import type { LearningItem } from '../../types';
import { SpeechButton } from '../../components/SpeechButton';
import { segmentWord } from '../../utils/wordSegmenter';
import { playSuccessSound, playErrorSound } from '../../utils/soundEffects';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export const MissingLetter: React.FC = () => {
  const navigate = useNavigate();
  const { activeLanguageId, recordItemCompletion, settings } = useGameStore();

  const [items, setItems] = useState<LearningItem[]>([]);
  const [alphabetLetters, setAlphabetLetters] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [wordLetters, setWordLetters] = useState<string[]>([]);
  const [blankIndex, setBlankIndex] = useState(-1);
  const [options, setOptions] = useState<string[]>([]);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Load items
  useEffect(() => {
    if (!activeLanguageId) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      const dbItems = await dbService.getLearningItems(activeLanguageId, 'words');
      const dbAlph = await dbService.getLearningItems(activeLanguageId, 'alphabet');
      
      setItems(dbItems);
      setAlphabetLetters(dbAlph.map((a: LearningItem) => a.word));
      setLoading(false);
    };

    fetchData();
  }, [activeLanguageId, navigate]);

  // Set up active item for missing letter
  useEffect(() => {
    if (items.length > 0) {
      const currentItem = items[currentIndex];
      const letters = segmentWord(currentItem.word, activeLanguageId || 'english');
      
      // Select a random index to hide (prefer index > 0 if length > 2 to keep it easier)
      const hideIdx = letters.length > 1 ? Math.floor(Math.random() * (letters.length - 1)) + 1 : 0;
      const targetLetter = letters[hideIdx];

      // Build distractors
      const defaultDistractorsMap: Record<string, string[]> = {
        english: ['A', 'E', 'I', 'O', 'U', 'S', 'T', 'N'],
        tamil: ['அ', 'ஆ', 'க', 'ம', 'ப', 'த', 'வ', '்'],
        hindi: ['अ', 'क', 'म', 'र', 'स', 'त', 'ी', 'ा'],
        telugu: ['అ', 'క', 'మ', 'త', 'ప', 'ర', 'ి', 'ు'],
        kannada: ['ಅ', 'ಕ', 'ಮ', 'ತ', 'ಪ', 'ರ', 'ಿ', 'ು'],
        malayalam: ['അ', 'ക', 'മ', 'ത', 'പ', 'ര', 'ി', 'ു']
      };

      const fallbackList = defaultDistractorsMap[activeLanguageId || 'english'] || ['A', 'B', 'C', 'D'];
      const pool = alphabetLetters.length > 0 ? alphabetLetters : fallbackList;

      // Filter out correct answer to prevent duplicate options
      const distractors = pool.filter(l => l !== targetLetter && l !== '');
      
      // Shuffle distractors and pick 3
      const shuffledDistractors = [...distractors].sort(() => 0.5 - Math.random());
      const selectedDistractors = shuffledDistractors.slice(0, 3);

      // Mix correct answer in random position
      const finalOptions = [...selectedDistractors, targetLetter].sort(() => 0.5 - Math.random());

      setWordLetters(letters);
      setBlankIndex(hideIdx);
      setOptions(finalOptions);
      setSelectedOption(null);
      setIsCorrect(null);
    }
  }, [items, currentIndex, alphabetLetters, activeLanguageId]);

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
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No spelling words available</h3>
        <p className="text-sm text-slate-500">
          Add some vocabulary words in the Admin Panel first.
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

  const currentItem = items[currentIndex];
  const targetLetter = wordLetters[blankIndex];

  const handleOptionClick = (option: string) => {
    if (selectedOption !== null) return; // Answered already
    
    setSelectedOption(option);
    const correct = option === targetLetter;
    setIsCorrect(correct);

    if (correct) {
      playSuccessSound(settings.soundEnabled);
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      
      // Update progress
      recordItemCompletion(currentItem.id, true, 0);
    } else {
      playErrorSound(settings.soundEnabled);
      // Give attempts record but not completed
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
          <HelpCircle className="h-6 w-6 text-sky-500" /> Missing Letter
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Find the missing letter! (Word {currentIndex + 1} of {items.length})
        </p>
      </div>

      {/* Gameplay card */}
      <div className="rounded-[40px] border-4 border-indigo-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-6 flex flex-col items-center">
        {/* Cute image support */}
        {currentItem.image ? (
          <img 
            src={currentItem.image} 
            alt={currentItem.word}
            className="h-32 w-32 object-contain rounded-2xl border-2 border-sky-100 bg-sky-50/50 shadow-sm"
          />
        ) : (
          <div className="h-28 w-28 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-5xl select-none">
            🔎
          </div>
        )}

        {/* Translation meaning hint */}
        {currentItem.meaning && (
          <h3 className="text-base font-extrabold text-indigo-950 dark:text-indigo-400">
            Meaning: <span className="underline decoration-indigo-400">{currentItem.meaning}</span>
          </h3>
        )}

        {/* Word Display with Blank */}
        <div className="flex items-center gap-2 justify-center py-6 w-full max-w-md bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200/50 dark:border-slate-800">
          {wordLetters.map((letter, idx) => {
            const isBlank = idx === blankIndex;
            return (
              <span 
                key={idx}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl font-tamil text-3xl font-black transition-all ${
                  isBlank
                    ? selectedOption 
                      ? isCorrect 
                        ? 'bg-emerald-500 text-white shadow-md' 
                        : 'bg-rose-500 text-white shadow-md'
                      : 'border-4 border-dashed border-sky-400 bg-sky-50/30 dark:bg-sky-950/20 text-transparent animate-pulse'
                    : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                }`}
              >
                {isBlank ? (selectedOption ? selectedOption : '_') : letter}
              </span>
            );
          })}
        </div>

        {/* Options Grid */}
        <div className="w-full max-w-sm space-y-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left block pl-1">
            Tap the correct letter
          </span>
          <div className="grid grid-cols-2 gap-4">
            {options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const optionIsCorrect = option === targetLetter;
              
              let btnClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100 hover:border-sky-300';
              if (selectedOption !== null) {
                if (optionIsCorrect) {
                  btnClass = 'bg-emerald-500 border-emerald-500 text-white ring-4 ring-emerald-300/30';
                } else if (isSelected) {
                  btnClass = 'bg-rose-500 border-rose-500 text-white ring-4 ring-rose-300/30';
                } else {
                  btnClass = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed';
                }
              }

              return (
                <motion.button
                  key={idx}
                  whileHover={selectedOption === null ? { scale: 1.05 } : {}}
                  whileTap={selectedOption === null ? { scale: 0.95 } : {}}
                  onClick={() => handleOptionClick(option)}
                  disabled={selectedOption !== null}
                  className={`py-4 rounded-2xl border-4 text-2xl font-black font-tamil shadow-md flex items-center justify-center transition-all cursor-pointer ${btnClass}`}
                >
                  {option}
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
                  <CheckCircle2 className="h-5 w-5" /> Superb! That is correct!
                  <SpeechButton word={currentItem.word} className="scale-90 border-transparent hover:bg-emerald-100 dark:hover:bg-emerald-900/30 shadow-none" size={14} />
                </div>
              ) : (
                <div className="py-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 dark:border-rose-950/20 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-black flex items-center justify-center gap-2 shadow-sm text-sm">
                  <AlertCircle className="h-5 w-5" /> Oh no, that's incorrect. Try again next time!
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
