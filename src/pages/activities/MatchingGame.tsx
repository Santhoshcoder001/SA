import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../hooks/useGameStore';
import { dbService } from '../../services/db';
import type { LearningItem } from '../../types';
import { playSuccessSound, playErrorSound, playClickSound } from '../../utils/soundEffects';
import { motion } from 'framer-motion';
import { CheckCircle2, RotateCcw, Grid } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MatchItem {
  id: string;
  display: React.ReactNode;
  matchId: string; // The Word ID it matches with
}

export const MatchingGame: React.FC = () => {
  const navigate = useNavigate();
  const { activeLanguageId, recordItemCompletion, settings } = useGameStore();

  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [leftItems, setLeftItems] = useState<MatchItem[]>([]);
  const [rightItems, setRightItems] = useState<MatchItem[]>([]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);

  const [matchedPairs, setMatchedPairs] = useState<string[]>([]); // word IDs that are matched
  const [isFinished, setIsFinished] = useState(false);

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

  // Set up matching sets (picks 3 random items)
  const setupGame = () => {
    if (items.length < 3) return;

    // Pick 3 random items
    const selected = [...items].sort(() => 0.5 - Math.random()).slice(0, 3);

    // Left column: images or fallbacks
    const left: MatchItem[] = selected.map((item) => ({
      id: `left-${item.id}`,
      matchId: item.id,
      display: item.image ? (
        <img src={item.image} alt="" className="h-16 w-16 object-contain rounded-xl" />
      ) : (
        <div className="h-16 w-16 bg-sky-100 flex items-center justify-center rounded-xl text-3xl font-extrabold select-none">
          🖼️
        </div>
      )
    }));

    // Right column: word labels (shuffled)
    const right: MatchItem[] = selected.map((item) => ({
      id: `right-${item.id}`,
      matchId: item.id,
      display: <span className="text-base font-black font-tamil tracking-tight">{item.word}</span>
    })).sort(() => 0.5 - Math.random());

    setLeftItems(left);
    setRightItems(right);
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairs([]);
    setIsFinished(false);
  };

  useEffect(() => {
    if (items.length >= 3) {
      setupGame();
    }
  }, [items]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length < 3) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="text-6xl">📭</div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Not enough items</h3>
        <p className="text-sm text-slate-500">
          You need at least 3 vocabulary words in database to play the Matching game.
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

  const handleLeftClick = (matchId: string) => {
    if (matchedPairs.includes(matchId)) return;
    playClickSound(settings.soundEnabled);

    if (selectedLeft === matchId) {
      setSelectedLeft(null); // Deselect
    } else {
      setSelectedLeft(matchId);
      // Check match if right was already selected
      if (selectedRight) {
        evaluateMatch(matchId, selectedRight);
      }
    }
  };

  const handleRightClick = (matchId: string) => {
    if (matchedPairs.includes(matchId)) return;
    playClickSound(settings.soundEnabled);

    if (selectedRight === matchId) {
      setSelectedRight(null); // Deselect
    } else {
      setSelectedRight(matchId);
      // Check match if left was already selected
      if (selectedLeft) {
        evaluateMatch(selectedLeft, matchId);
      }
    }
  };

  const evaluateMatch = (leftId: string, rightId: string) => {
    if (leftId === rightId) {
      // Success!
      const newMatches = [...matchedPairs, leftId];
      setMatchedPairs(newMatches);
      setSelectedLeft(null);
      setSelectedRight(null);
      playSuccessSound(settings.soundEnabled);

      // Record completion of the matched item
      recordItemCompletion(leftId, true, 0);

      if (newMatches.length === 3) {
        setIsFinished(true);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    } else {
      // Failure
      playErrorSound(settings.soundEnabled);
      setSelectedLeft(null);
      setSelectedRight(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-indigo-950 dark:text-white flex items-center justify-center gap-2">
          <Grid className="h-6 w-6 text-sky-500" /> Matching Columns
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Connect the picture to its correct word spelling!
        </p>
      </div>

      {/* Game board */}
      <div className="rounded-[40px] border-4 border-indigo-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-8 flex flex-col items-center min-h-[350px] justify-center relative">
        {!isFinished ? (
          <div className="grid grid-cols-2 gap-8 w-full max-w-lg">
            {/* Left Column (Pictures) */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left block pl-1">
                Pictures
              </span>
              {leftItems.map((item) => {
                const isMatched = matchedPairs.includes(item.matchId);
                const isSelected = selectedLeft === item.matchId;

                let borderClass = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800';
                if (isMatched) {
                  borderClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 opacity-60 pointer-events-none';
                } else if (isSelected) {
                  borderClass = 'border-sky-500 bg-sky-500/5 ring-4 ring-sky-300/30';
                }

                return (
                  <motion.button
                    key={item.id}
                    whileHover={!isMatched ? { scale: 1.03 } : {}}
                    whileTap={!isMatched ? { scale: 0.97 } : {}}
                    onClick={() => handleLeftClick(item.matchId)}
                    className={`w-full p-4 rounded-2xl border-4 shadow-sm flex items-center justify-center transition-all cursor-pointer h-24 ${borderClass}`}
                  >
                    {item.display}
                  </motion.button>
                );
              })}
            </div>

            {/* Right Column (Words) */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left block pl-1">
                Words
              </span>
              {rightItems.map((item) => {
                const isMatched = matchedPairs.includes(item.matchId);
                const isSelected = selectedRight === item.matchId;

                let borderClass = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800';
                if (isMatched) {
                  borderClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 opacity-60 pointer-events-none';
                } else if (isSelected) {
                  borderClass = 'border-sky-500 bg-sky-500/5 ring-4 ring-sky-300/30';
                }

                return (
                  <motion.button
                    key={item.id}
                    whileHover={!isMatched ? { scale: 1.03 } : {}}
                    whileTap={!isMatched ? { scale: 0.97 } : {}}
                    onClick={() => handleRightClick(item.matchId)}
                    className={`w-full p-4 rounded-2xl border-4 shadow-sm flex items-center justify-center transition-all cursor-pointer h-24 ${borderClass}`}
                  >
                    {item.display}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-6"
          >
            <div className="text-6xl animate-bounce">🏆</div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-indigo-950 dark:text-white flex items-center justify-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" /> Perfect Matching!
              </h3>
              <p className="text-sm font-bold text-slate-500">
                You matched all columns perfectly and earned bonus stars!
              </p>
            </div>
            <button
              onClick={setupGame}
              className="bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-extrabold py-3.5 px-8 rounded-2xl shadow-md flex items-center justify-center gap-2 mx-auto transition-all active:scale-95 text-sm cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" /> Play Again
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
