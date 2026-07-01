import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../hooks/useGameStore';
import { dbService } from '../../services/db';
import type { LearningItem } from '../../types';
import { SpeechButton } from '../../components/SpeechButton';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { playClickSound } from '../../utils/soundEffects';

export const Alphabet: React.FC = () => {
  const navigate = useNavigate();
  const { activeLanguageId, progress, recordItemCompletion, settings } = useGameStore();
  const [items, setItems] = useState<LearningItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeLanguageId) {
      navigate('/');
      return;
    }

    const fetchItems = async () => {
      const dbItems = await dbService.getLearningItems(activeLanguageId, 'alphabet');
      setItems(dbItems);
      setLoading(false);
    };

    fetchItems();
  }, [activeLanguageId, navigate]);

  const handleNext = () => {
    if (items.length === 0) return;
    playClickSound(settings.soundEnabled);
    
    // Track learning progress: complete the current item
    const currentItem = items[currentIndex];
    recordItemCompletion(currentItem.id, true, 0);

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Loop back to start
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    if (items.length === 0) return;
    playClickSound(settings.soundEnabled);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(items.length - 1);
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
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No letters available</h3>
        <p className="text-sm text-slate-500">
          Go to the Admin Panel to load or upload letters for this language.
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
  const isCompleted = progress.completedItemIds.includes(currentItem.id);

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-indigo-950 dark:text-white flex items-center justify-center gap-2">
          <BookOpen className="h-6 w-6 text-sky-500" /> Alphabet Sandbox
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Letter {currentIndex + 1} of {items.length}
        </p>
      </div>

      {/* Main card */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="rounded-[40px] border-4 border-indigo-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-8 shadow-xl text-center space-y-6 flex flex-col items-center relative overflow-hidden"
          >
            {/* Completion badge */}
            {isCompleted && (
              <span className="absolute top-4 right-4 bg-emerald-400 text-emerald-950 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase shadow-sm">
                Learned ✓
              </span>
            )}

            {/* Target Grapheme letter */}
            <h1 className="text-8xl sm:text-9xl font-black text-indigo-600 dark:text-sky-400 select-all font-tamil">
              {currentItem.word}
            </h1>

            {/* Pronunciation guide */}
            {currentItem.pronunciation && (
              <p className="text-sm font-black text-slate-400 tracking-wider">
                Sound: "{currentItem.pronunciation}"
              </p>
            )}

            {/* Audio Button */}
            <div className="flex justify-center gap-2">
              <SpeechButton 
                word={currentItem.word} 
                customAudio={currentItem.audio}
                className="rounded-full p-5 shadow-md border-2 border-indigo-100 hover:bg-sky-50" 
                size={28}
              />
            </div>

            {/* Illustrative Example */}
            {currentItem.meaning && (
              <div className="w-full max-w-sm rounded-3xl bg-indigo-50/50 dark:bg-slate-900/50 p-4 border-2 border-indigo-100/50 dark:border-slate-800 flex items-center gap-4">
                {currentItem.image ? (
                  <img 
                    src={currentItem.image} 
                    alt={currentItem.meaning} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-200 dark:bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0 select-none">
                    🖼️
                  </div>
                )}
                <div className="text-left">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Example word</span>
                  <h4 className="text-base font-black text-indigo-900 dark:text-sky-300">{currentItem.meaning}</h4>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Carousel buttons */}
        <div className="flex justify-between items-center mt-6 gap-4">
          <button
            onClick={handlePrev}
            className="flex-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-indigo-600 dark:text-sky-400 font-extrabold py-3.5 px-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 text-sm cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 stroke-[3]" /> Previous
          </button>
          <button
            onClick={handleNext}
            className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 text-sm cursor-pointer"
          >
            Next <ArrowRight className="h-5 w-5 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
