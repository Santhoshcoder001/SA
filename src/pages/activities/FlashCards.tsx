import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../hooks/useGameStore';
import { dbService } from '../../services/db';
import type { LearningItem } from '../../types';
import { SpeechButton } from '../../components/SpeechButton';
import { playClickSound } from '../../utils/soundEffects';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CreditCard, Sparkles } from 'lucide-react';

export const FlashCards: React.FC = () => {
  const navigate = useNavigate();
  const { activeLanguageId, progress, recordItemCompletion, settings } = useGameStore();

  const [items, setItems] = useState<LearningItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);

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

  // Reset flip state when moving card
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

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

  const currentItem = items[currentIndex];
  const isLearned = progress.completedItemIds.includes(currentItem.id);

  const handleFlip = () => {
    playClickSound(settings.soundEnabled);
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    playClickSound(settings.soundEnabled);
    // Mark as memorized
    recordItemCompletion(currentItem.id, true, 0);

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    playClickSound(settings.soundEnabled);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(items.length - 1);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 py-4">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-indigo-950 dark:text-white flex items-center justify-center gap-2">
          <CreditCard className="h-6 w-6 text-sky-500" /> Flash Cards
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Tap the card to flip it! (Card {currentIndex + 1} of {items.length})
        </p>
      </div>

      {/* Card wrapper */}
      <div className="perspective-1000 w-full h-80 cursor-pointer relative" onClick={handleFlip}>
        <motion.div
          className="w-full h-full relative preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Card Front (Picture) */}
          <div className="absolute inset-0 backface-hidden rounded-[40px] border-4 border-indigo-200 bg-white dark:border-slate-850 dark:bg-slate-900 shadow-xl p-6 flex flex-col items-center justify-center gap-4">
            {currentItem.image ? (
              <img 
                src={currentItem.image} 
                alt="Card clue"
                className="max-h-48 max-w-full rounded-2xl object-contain shadow-sm border border-slate-100"
              />
            ) : (
              <div className="h-36 w-36 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-7xl select-none">
                ❓
              </div>
            )}
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1 select-none animate-pulse">
              <Sparkles className="h-3 w-3" /> Tap to Flip
            </span>
          </div>

          {/* Card Back (Word definition) */}
          <div className="absolute inset-0 backface-hidden rounded-[40px] border-4 border-indigo-200 bg-white dark:border-slate-850 dark:bg-slate-900 shadow-xl p-6 flex flex-col items-center justify-center gap-4 rotate-y-180">
            {currentItem.category && (
              <span className="bg-sky-100 text-sky-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {currentItem.category}
              </span>
            )}

            <h1 className="text-4xl font-black text-indigo-900 dark:text-sky-400 font-tamil select-all">
              {currentItem.word}
            </h1>

            {currentItem.meaning && (
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 text-center">
                "{currentItem.meaning}"
              </p>
            )}

            {/* Speech and stats */}
            <div className="flex items-center gap-3">
              <SpeechButton 
                word={currentItem.word}
                customAudio={currentItem.audio}
                className="rounded-full shadow-md border-2 border-indigo-50 hover:bg-sky-50"
                size={22}
              />
              {currentItem.pronunciation && (
                <span className="text-xs font-bold text-slate-400 font-mono">
                  [{currentItem.pronunciation}]
                </span>
              )}
            </div>

            {isLearned && (
              <span className="bg-emerald-400 text-emerald-950 font-black px-2.5 py-0.5 rounded-xl text-[9px] uppercase tracking-wider">
                Learned ✓
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between items-center gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="flex-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-indigo-600 dark:text-sky-400 font-extrabold py-3.5 px-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 text-sm cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 stroke-[3]" /> Previous
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 text-sm cursor-pointer"
        >
          Mastered! <ArrowRight className="h-5 w-5 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
