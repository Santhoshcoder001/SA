import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../hooks/useGameStore';
import { dbService } from '../../services/db';
import type { LearningItem } from '../../types';
import { SpeechButton } from '../../components/SpeechButton';
import { segmentWord, shuffleLetters, isArrangementCorrect } from '../../utils/wordSegmenter';
import { playSuccessSound, playErrorSound } from '../../utils/soundEffects';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, HelpCircle, RefreshCw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export const LetterArrangement: React.FC = () => {
  const navigate = useNavigate();
  const { activeLanguageId, recordItemCompletion, settings } = useGameStore();

  const [items, setItems] = useState<LearningItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [wordLetters, setWordLetters] = useState<string[]>([]);
  const [shuffledPool, setShuffledPool] = useState<string[]>([]);
  const [traySlots, setTraySlots] = useState<string[]>([]);
  
  const [hintState, setHintState] = useState(0); // 0: no hint, 1: first letter, 2: two letters, 3: solve
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const trayRef = useRef<HTMLDivElement>(null);

  // Load items
  useEffect(() => {
    if (!activeLanguageId) {
      navigate('/');
      return;
    }

    const fetchItems = async () => {
      const dbItems = await dbService.getLearningItems(activeLanguageId, 'words');
      const imported = dbItems.filter((i: LearningItem) => i.category === 'Imported');
      const finalItems = imported.length > 0 ? imported : dbItems;
      const shuffledItems = [...finalItems].sort(() => 0.5 - Math.random());
      setItems(shuffledItems);
      setLoading(false);
    };

    fetchItems();
  }, [activeLanguageId, navigate]);

  // Set up active item letters
  useEffect(() => {
    if (items.length > 0) {
      const currentItem = items[currentIndex];
      const letters = segmentWord(currentItem.word, activeLanguageId || 'english');
      setWordLetters(letters);
      setShuffledPool(shuffleLetters(letters));
      setTraySlots(Array(letters.length).fill(''));
      setIsSuccess(false);
      setIsError(false);
      setHintState(0);
    }
  }, [items, currentIndex, activeLanguageId]);

  const currentItem = items[currentIndex];

  const isSlotLockedByHint = (index: number): boolean => {
    if (hintState === 1 && index === 0) return true;
    if (hintState === 2 && (index === 0 || index === 1)) return true;
    if (hintState === 3) return true;
    return false;
  };

  const handlePoolTileClick = (letter: string, poolIndex: number) => {
    if (isSuccess || letter === '') return;

    // Find first empty slot in tray
    const nextSlot = traySlots.findIndex((char, idx) => char === '' && !isSlotLockedByHint(idx));
    if (nextSlot !== -1) {
      const newTray = [...traySlots];
      newTray[nextSlot] = letter;
      setTraySlots(newTray);

      const newPool = [...shuffledPool];
      newPool[poolIndex] = ''; // Placeholder
      setShuffledPool(newPool);
    }
  };

  const handleTrayTileClick = (trayIndex: number) => {
    if (isSuccess || isSlotLockedByHint(trayIndex)) return;

    const letter = traySlots[trayIndex];
    if (letter === '') return;

    // Put it back to pool
    const nextPoolIdx = shuffledPool.findIndex(char => char === '');
    if (nextPoolIdx !== -1) {
      const newPool = [...shuffledPool];
      newPool[nextPoolIdx] = letter;
      setShuffledPool(newPool);

      const newTray = [...traySlots];
      newTray[trayIndex] = '';
      setTraySlots(newTray);
    }
  };

  const handleShuffle = () => {
    setShuffledPool(shuffleLetters(wordLetters));
    setTraySlots(Array(wordLetters.length).fill(''));
    setHintState(0);
    setIsError(false);
  };

  const handleHint = () => {
    const nextState = Math.min(hintState + 1, 3);
    setHintState(nextState);

    if (nextState === 1) {
      // Lock 1st letter
      const newTray = [...traySlots];
      newTray[0] = wordLetters[0];
      setTraySlots(newTray);

      const firstIdx = shuffledPool.indexOf(wordLetters[0]);
      if (firstIdx !== -1) {
        const newPool = [...shuffledPool];
        newPool[firstIdx] = '';
        setShuffledPool(newPool);
      }
    } else if (nextState === 2) {
      // Lock 1st and 2nd
      const newTray = [...traySlots];
      newTray[0] = wordLetters[0];
      newTray[1] = wordLetters[1];
      setTraySlots(newTray);

      // Re-fill pool with remaining letters
      const remaining = [...wordLetters];
      remaining.splice(0, 2);
      const shuffledRem = shuffleLetters(remaining);
      while (shuffledRem.length < wordLetters.length) {
        shuffledRem.push('');
      }
      setShuffledPool(shuffledRem);
    } else if (nextState === 3) {
      // Solve completely
      setTraySlots([...wordLetters]);
      setShuffledPool(Array(wordLetters.length).fill(''));
    }
  };

  const checkSolution = () => {
    if (traySlots.some(c => c === '')) {
      alert('Please fill all slots first!');
      return;
    }

    const correct = isArrangementCorrect(traySlots, wordLetters);
    if (correct) {
      setIsSuccess(true);
      setIsError(false);
      playSuccessSound(settings.soundEnabled);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      
      // Update store
      recordItemCompletion(currentItem.id, true, hintState);
    } else {
      setIsError(true);
      playErrorSound(settings.soundEnabled);
      setTimeout(() => setIsError(false), 600); // End shake effect
    }
  };

  const handleNextWord = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  // Keyboard arrangement listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccess) return;
      const key = e.key.toUpperCase();
      
      // Look for key in shuffled pool
      const poolIdx = shuffledPool.findIndex(char => char.toUpperCase() === key && char !== '');
      if (poolIdx !== -1) {
        handlePoolTileClick(shuffledPool[poolIdx], poolIdx);
      } else if (e.key === 'Backspace') {
        // Remove last slot
        const filledSlots = traySlots.map((char, idx) => ({ char, idx })).filter(item => item.char !== '' && !isSlotLockedByHint(item.idx));
        if (filledSlots.length > 0) {
          const lastSlot = filledSlots[filledSlots.length - 1];
          handleTrayTileClick(lastSlot.idx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shuffledPool, traySlots, isSuccess]);

  // Drag handles (Framer Motion)
  const handleDragEnd = (_event: any, info: any, sourceIndex: number, source: 'pool' | 'tray') => {
    if (!trayRef.current || isSuccess) return;

    const slots = trayRef.current.querySelectorAll('[data-slot-idx]');
    let targetSlotIdx = -1;

    slots.forEach(slot => {
      const rect = slot.getBoundingClientRect();
      const clientX = info.point.x;
      const clientY = info.point.y;

      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        targetSlotIdx = parseInt(slot.getAttribute('data-slot-idx') || '-1', 10);
      }
    });

    if (targetSlotIdx !== -1 && !isSlotLockedByHint(targetSlotIdx)) {
      if (source === 'pool') {
        const letter = shuffledPool[sourceIndex];
        if (letter === '') return;

        const newTray = [...traySlots];
        const oldTrayLetter = newTray[targetSlotIdx];

        newTray[targetSlotIdx] = letter;
        setTraySlots(newTray);

        const newPool = [...shuffledPool];
        newPool[sourceIndex] = oldTrayLetter;
        setShuffledPool(newPool);
      } else {
        // Swap slots inside tray
        const newTray = [...traySlots];
        const temp = newTray[targetSlotIdx];
        newTray[targetSlotIdx] = newTray[sourceIndex];
        newTray[sourceIndex] = temp;
        setTraySlots(newTray);
      }
    }
  };

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

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-indigo-950 dark:text-white flex items-center justify-center gap-2">
          <Brain className="h-6 w-6 text-sky-500" /> Letter Arrangement
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Spell the word correctly! (Word {currentIndex + 1} of {items.length})
        </p>
      </div>

      {/* Gameplay card */}
      <div className="rounded-[40px] border-4 border-indigo-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-6 flex flex-col items-center">
        {/* Cute image */}
        {currentItem.image ? (
          <img 
            src={currentItem.image} 
            alt={currentItem.meaning || 'illustrative'}
            className="h-32 w-32 object-contain rounded-2xl border-2 border-sky-100 bg-sky-50/50 shadow-sm"
          />
        ) : (
          <div className="h-28 w-28 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-5xl select-none">
            🧩
          </div>
        )}

        {/* Translation meaning hint */}
        {currentItem.meaning && (
          <h3 className="text-base font-extrabold text-indigo-950 dark:text-indigo-400">
            Meaning: <span className="underline decoration-indigo-400">{currentItem.meaning}</span>
          </h3>
        )}

        {/* Tray dropzones */}
        <div
          ref={trayRef}
          className={`flex flex-wrap justify-center gap-2 p-5 w-full rounded-2xl border-4 border-dashed transition-all duration-300 ${
            isError 
              ? 'animate-shake border-rose-400 bg-rose-50/20'
              : isSuccess
              ? 'border-emerald-400 bg-emerald-50/20'
              : 'border-slate-200 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-900/10'
          }`}
        >
          {traySlots.map((letter, idx) => {
            const isLocked = isSlotLockedByHint(idx);
            const hasLetter = letter !== '';

            return (
              <div
                key={`tray-slot-${idx}`}
                data-slot-idx={idx}
                onClick={() => handleTrayTileClick(idx)}
                className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border-2 select-none cursor-pointer transition-all ${
                  isLocked
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400 font-extrabold shadow-sm'
                    : hasLetter
                    ? 'border-sky-500 bg-gradient-to-tr from-sky-500 to-indigo-500 text-white font-extrabold shadow-md'
                    : 'border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                {hasLetter && (
                  <motion.div
                    layoutId={`letter-${letter}-${idx}`}
                    drag={!isLocked && !isSuccess}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.6}
                    onDragEnd={(e, info) => handleDragEnd(e, info, idx, 'tray')}
                    className="w-full h-full flex items-center justify-center font-tamil text-xl sm:text-2xl font-black cursor-grab active:cursor-grabbing"
                  >
                    {letter}
                  </motion.div>
                )}
                {isLocked && <span className="absolute top-1 right-1 text-[8px] select-none">🔒</span>}
              </div>
            );
          })}
        </div>

        {/* Shuffled pool of tiles */}
        <div className="flex flex-wrap justify-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 w-full min-h-[90px]">
          {shuffledPool.map((letter, idx) => {
            const isEmpty = letter === '';

            return (
              <div
                key={`pool-slot-${idx}`}
                onClick={() => handlePoolTileClick(letter, idx)}
                className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border-2 select-none transition-all ${
                  isEmpty
                    ? 'border-dashed border-slate-200/50 bg-slate-50/10 dark:border-slate-900/5'
                    : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-800 shadow-md hover:border-indigo-500 cursor-grab active:cursor-grabbing font-extrabold active:scale-95 text-slate-800 dark:text-slate-100 font-tamil'
                }`}
              >
                {!isEmpty && (
                  <motion.div
                    layoutId={`letter-${letter}-${idx}`}
                    drag={!isSuccess}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.6}
                    onDragEnd={(e, info) => handleDragEnd(e, info, idx, 'pool')}
                    className="w-full h-full flex items-center justify-center text-xl sm:text-2xl font-black"
                  >
                    {letter}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status feedbacks */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full py-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 dark:border-emerald-950/20 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <CheckCircle2 className="h-5 w-5" /> Awesome! You spelled it correctly!
              <SpeechButton word={currentItem.word} className="scale-90 shadow-none border-transparent hover:bg-emerald-100 dark:hover:bg-emerald-900/30" size={14} />
            </motion.div>
          )}

          {isError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full py-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 dark:border-rose-950/20 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-black flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <AlertCircle className="h-5 w-5" /> Incorrect spelling. Try rearranging the letters!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons drawer */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full border-t border-slate-100 dark:border-slate-800 pt-5">
          <button
            onClick={handleShuffle}
            disabled={isSuccess}
            className="flex-1 min-w-[120px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </button>

          <button
            onClick={handleHint}
            disabled={isSuccess || hintState >= 3}
            className="flex-1 min-w-[120px] bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/15 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-500 font-extrabold py-3 px-4 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4" /> 
            {hintState === 0 ? 'Hint: 1st Letter' : hintState === 1 ? 'Hint: 2nd Letter' : 'Reveal Word'}
          </button>

          {isSuccess ? (
            <button
              onClick={handleNextWord}
              className="flex-1 min-w-[120px] bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-extrabold py-3 px-4 rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              Next Word <ArrowRight className="h-4 w-4 stroke-[3]" />
            </button>
          ) : (
            <button
              onClick={checkSolution}
              disabled={traySlots.some(c => c === '')}
              className="flex-1 min-w-[120px] bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Check Spelling
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
