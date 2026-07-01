import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronRight, Play, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { SpeechButton } from './SpeechButton';

export const GameArea: React.FC = () => {
  const {
    activeWord,
    shuffledLetters,
    currentArrangement,
    updateArrangement,
    checkAnswer,
    revealHint,
    shuffleCurrentWord,
    nextWord,
    skipWord,
    hintState,
    gameMode,
    dailyChallengeProgress,
  } = useGameState();

  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [poolLetters, setPoolLetters] = useState<string[]>([]);
  const trayRef = useRef<HTMLDivElement>(null);

  // Sync state words letters
  useEffect(() => {
    if (activeWord) {
      setPoolLetters([...shuffledLetters]);
      setIsSuccess(false);
      setIsError(false);
    }
  }, [activeWord, shuffledLetters]);

  if (!activeWord) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 mb-4 rounded-full bg-brand-50 dark:bg-brand-950/20 text-brand-500 flex items-center justify-center animate-bounce-subtle">
          <Play className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">விளையாட்டைத் தொடங்கவும்!</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Press start to generate your first word spelling challenge.
        </p>
        <button
          onClick={nextWord}
          className="mt-5 btn-primary font-bold px-6 py-3 tracking-wide"
        >
          தொடங்கு (Start Game) <ChevronRight className="h-4.5 w-4.5" />
        </button>
      </div>
    );
  }

  // Check if slot index is locked by active hint state
  const isSlotLockedByHint = (index: number): boolean => {
    if (hintState === 1 && index === 0) return true;
    if (hintState === 2 && (index === 0 || index === 1)) return true;
    if (hintState === 3) return true;
    return false;
  };

  // Move letter from pool to the first available tray slot
  const handlePoolTileClick = (letter: string, poolIndex: number) => {
    if (isSuccess || letter === '') return;

    // Find first empty slot in tray (excluding locked slots)
    const nextEmptyIndex = currentArrangement.findIndex((char, idx) => char === '' && !isSlotLockedByHint(idx));

    if (nextEmptyIndex !== -1) {
      const newTray = [...currentArrangement];
      newTray[nextEmptyIndex] = letter;
      updateArrangement(newTray);

      const newPool = [...poolLetters];
      newPool[poolIndex] = ''; // Empty placeholder
      setPoolLetters(newPool);
    }
  };

  // Move letter from tray slot back to pool
  const handleTrayTileClick = (trayIndex: number) => {
    if (isSuccess || isSlotLockedByHint(trayIndex)) return;

    const letter = currentArrangement[trayIndex];
    if (letter === '') return;

    // Find first empty slot in pool
    const nextEmptyPoolIndex = poolLetters.findIndex(char => char === '');

    if (nextEmptyPoolIndex !== -1) {
      const newPool = [...poolLetters];
      newPool[nextEmptyPoolIndex] = letter;
      setPoolLetters(newPool);

      const newTray = [...currentArrangement];
      newTray[trayIndex] = '';
      updateArrangement(newTray);
    }
  };

  // Check arrangement answer
  const handleSubmit = () => {
    if (currentArrangement.some(char => char === '')) {
      alert('தயவுசெய்து அனைத்து எழுத்துக்களையும் நிரப்பவும். (Please fill all slots.)');
      return;
    }

    const correct = checkAnswer();
    if (correct) {
      setIsSuccess(true);
      setIsError(false);
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 500); // end shake animation
    }
  };

  // Framer Motion Custom Drag Handler
  const handleDragEnd = (_event: any, info: any, sourceIndex: number, source: 'pool' | 'tray') => {
    if (!trayRef.current || isSuccess) return;

    // Find if release happened over a tray slot
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

    // If dropped on a valid, unlocked tray slot
    if (targetSlotIdx !== -1 && !isSlotLockedByHint(targetSlotIdx)) {
      if (source === 'pool') {
        const letter = poolLetters[sourceIndex];
        if (letter === '') return;

        const newTray = [...currentArrangement];
        const oldTrayLetter = newTray[targetSlotIdx];

        newTray[targetSlotIdx] = letter;
        updateArrangement(newTray);

        const newPool = [...poolLetters];
        newPool[sourceIndex] = oldTrayLetter; // Send old tray letter back to pool
        setPoolLetters(newPool);
      } else if (source === 'tray') {
        // Swap slots inside tray
        const newTray = [...currentArrangement];
        const temp = newTray[targetSlotIdx];
        newTray[targetSlotIdx] = newTray[sourceIndex];
        newTray[sourceIndex] = temp;
        updateArrangement(newTray);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header Info Panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/50 pb-3 dark:border-slate-800/50">
        <div>
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
            activeWord.difficulty === 'easy'
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
              : activeWord.difficulty === 'medium'
              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
          }`}>
            {activeWord.difficulty}
          </span>
          <span className="ml-2 text-xs text-slate-400 font-medium font-mono">
            {activeWord.letters.length} எழுத்துக்கள் (Letters)
          </span>
        </div>

        {gameMode === 'challenge' && dailyChallengeProgress && (
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg border border-indigo-200/20">
            Daily Challenge: {dailyChallengeProgress.current} / {dailyChallengeProgress.total}
          </div>
        )}
      </div>

      {/* Spoken Audio Pronunciation Control */}
      <div className="flex justify-center">
        <SpeechButton word={activeWord.word} className="rounded-full p-4.5 shadow-md border border-brand-200/25" size={26} />
      </div>

      {/* Tray Area (Dropzones) */}
      <div
        ref={trayRef}
        className={`flex flex-wrap justify-center gap-2.5 py-8 px-4 rounded-2xl border transition-all duration-300 ${
          isError 
            ? 'animate-shake border-red-500 bg-red-50/10' 
            : isSuccess 
            ? 'border-success-500 bg-success-50/10'
            : 'border-slate-200/50 bg-slate-50/30 dark:border-slate-800/50 dark:bg-slate-900/10'
        }`}
      >
        {currentArrangement.map((letter, index) => {
          const isLocked = isSlotLockedByHint(index);
          const hasLetter = letter !== '';

          return (
            <div
              key={`tray-slot-${index}`}
              data-slot-idx={index}
              onClick={() => handleTrayTileClick(index)}
              className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl text-center select-none cursor-pointer transition-all duration-200 ${
                isLocked
                  ? 'border-2 border-amber-300 bg-amber-50/20 shadow-md text-amber-700 dark:border-amber-700/60 dark:text-amber-400'
                  : hasLetter
                  ? 'bg-gradient-to-tr from-brand-600 to-brand-500 text-white shadow-md'
                  : 'border-2 border-dashed border-slate-200 bg-white/20 dark:border-slate-800'
              }`}
            >
              {hasLetter && (
                <motion.div
                  layoutId={`letter-${letter}-${index}`}
                  drag={!isLocked && !isSuccess}
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.6}
                  onDragEnd={(e, info) => handleDragEnd(e, info, index, 'tray')}
                  className="w-full h-full flex items-center justify-center font-tamil text-xl sm:text-2xl font-bold cursor-grab active:cursor-grabbing"
                >
                  {letter}
                </motion.div>
              )}
              {isLocked && (
                <span className="absolute top-0.5 right-0.5 text-[9px]">🔒</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Available Letters Pool */}
      <div className="flex flex-wrap justify-center gap-2.5 py-4 min-h-[90px] border-t border-slate-200/20">
        {poolLetters.map((letter, index) => {
          const isEmpty = letter === '';

          return (
            <div
              key={`pool-slot-${index}`}
              onClick={() => handlePoolTileClick(letter, index)}
              className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl text-center select-none transition-all duration-200 ${
                isEmpty
                  ? 'border border-dashed border-slate-200/20 bg-slate-50/10 dark:border-slate-800/10'
                  : 'bg-white border border-slate-200/80 shadow-sm hover:border-brand-500 hover:shadow-md dark:bg-slate-900 dark:border-slate-800 cursor-grab active:cursor-grabbing active:scale-95'
              }`}
            >
              {!isEmpty && (
                <motion.div
                  layoutId={`letter-${letter}-${index}`}
                  drag={!isSuccess}
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.6}
                  onDragEnd={(e, info) => handleDragEnd(e, info, index, 'pool')}
                  className="w-full h-full flex items-center justify-center font-tamil text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100"
                >
                  {letter}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Notifications / Feedback Messages */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 justify-center rounded-xl bg-success-50 border border-success-100 text-success-600 dark:bg-success-950/20 dark:border-success-950/20 dark:text-success-400 py-3 text-sm font-bold shadow-sm"
          >
            <CheckCircle2 className="h-4.5 w-4.5" /> மிகச்சரியானது! (Excellent! Correct Answer)
            <SpeechButton word={activeWord.word} size={14} className="ml-1.5 scale-90 border-transparent hover:bg-success-100 dark:hover:bg-success-900/30" />
          </motion.div>
        )}
        {isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-950/20 dark:text-rose-400 py-3 text-sm font-bold shadow-sm"
          >
            <AlertCircle className="h-4.5 w-4.5" /> தவறானது! மீண்டும் முயற்சிக்கவும். (Wrong! Try again.)
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
        {/* Shuffle Button */}
        <button
          onClick={shuffleCurrentWord}
          disabled={isSuccess}
          className="btn-secondary text-xs"
          title="Reshuffle letters"
        >
          <RefreshCw className="h-4 w-4" /> கலைக்க (Shuffle)
        </button>

        {/* Hint Button */}
        <button
          onClick={revealHint}
          disabled={isSuccess || hintState >= 3}
          className="rounded-xl px-4 py-2.5 border border-amber-200/50 hover:bg-amber-50 text-amber-700 bg-white font-medium text-xs dark:bg-slate-900 dark:border-amber-950/25 dark:text-amber-500 dark:hover:bg-amber-950/10 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
        >
          <HelpCircle className="h-4 w-4" /> 
          {hintState === 0 ? 'உதவி: 1வது எழுத்து (Hint: 1st Letter)' : hintState === 1 ? 'உதவி: 2வது எழுத்து (Hint: 2nd Letter)' : 'விடை (Reveal Word)'}
        </button>

        {/* Skip Button */}
        <button
          onClick={skipWord}
          className="btn-secondary text-xs"
        >
          தவிர்க்க (Skip)
        </button>

        {/* Check/Verify Answer Button */}
        <button
          onClick={handleSubmit}
          disabled={isSuccess || currentArrangement.some(c => c === '')}
          className="btn-success text-xs font-bold px-6"
        >
          சரிபார்க்க (Check)
        </button>
      </div>
    </div>
  );
};
