import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../hooks/useGameStore';
import { dbService } from '../../services/db';
import type { LearningItem } from '../../types';
import { playSuccessSound, playErrorSound, playClickSound } from '../../utils/soundEffects';
import { motion } from 'framer-motion';
import { CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MemoryCard {
  id: string; // Unique ID (e.g. 'card-image-apple', 'card-word-apple')
  matchId: string; // The Word ID it matches with
  type: 'image' | 'word';
  content: React.ReactNode;
  isFlipped: boolean;
  isMatched: boolean;
}

export const MemoryGame: React.FC = () => {
  const navigate = useNavigate();
  const { activeLanguageId, recordItemCompletion, settings } = useGameStore();

  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]); // Indexes of flipped cards
  const [isFinished, setIsFinished] = useState(false);
  const [moves, setMoves] = useState(0);

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

  const setupGame = () => {
    if (items.length < 3) return;

    // Pick 3 random words
    const selected = [...items].sort(() => 0.5 - Math.random()).slice(0, 3);

    // Create cards (1 word card and 1 image card for each selected item)
    const deck: MemoryCard[] = [];
    selected.forEach((item) => {
      // Image Card
      deck.push({
        id: `card-img-${item.id}`,
        matchId: item.id,
        type: 'image',
        content: item.image ? (
          <img src={item.image} alt="" className="h-16 w-16 object-contain pointer-events-none" />
        ) : (
          <span className="text-4xl pointer-events-none">🖼️</span>
        ),
        isFlipped: false,
        isMatched: false
      });

      // Word Card
      deck.push({
        id: `card-word-${item.id}`,
        matchId: item.id,
        type: 'word',
        content: <span className="text-sm font-black font-tamil tracking-tight pointer-events-none">{item.word}</span>,
        isFlipped: false,
        isMatched: false
      });
    });

    // Shuffle deck
    const shuffledDeck = deck.sort(() => 0.5 - Math.random());
    setCards(shuffledDeck);
    setSelectedCards([]);
    setIsFinished(false);
    setMoves(0);
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
          You need at least 3 vocabulary words in database to play the Memory game.
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

  const handleCardClick = (index: number) => {
    if (cards[index].isFlipped || cards[index].isMatched || selectedCards.length >= 2) return;
    playClickSound(settings.soundEnabled);

    // Flip card
    const updatedCards = [...cards];
    updatedCards[index].isFlipped = true;
    setCards(updatedCards);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves(moves + 1);
      const firstIdx = newSelected[0];
      const secondIdx = newSelected[1];

      // Evaluate match
      if (cards[firstIdx].matchId === cards[secondIdx].matchId) {
        // Correct match
        setTimeout(() => {
          const matchedDeck = [...cards];
          matchedDeck[firstIdx].isMatched = true;
          matchedDeck[secondIdx].isMatched = true;
          setCards(matchedDeck);
          setSelectedCards([]);
          playSuccessSound(settings.soundEnabled);

          // Record completion of matched item
          recordItemCompletion(cards[firstIdx].matchId, true, 0);

          // Check if all matched
          if (matchedDeck.every(c => c.isMatched)) {
            setIsFinished(true);
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          }
        }, 600);
      } else {
        // Mismatch - flip back
        setTimeout(() => {
          const resetDeck = [...cards];
          resetDeck[firstIdx].isFlipped = false;
          resetDeck[secondIdx].isFlipped = false;
          setCards(resetDeck);
          setSelectedCards([]);
          playErrorSound(settings.soundEnabled);
        }, 1200);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-indigo-950 dark:text-white flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-sky-500" /> Memory Match Game
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Flip cards to match the picture to its correct word! (Moves: {moves})
        </p>
      </div>

      {/* Game board */}
      <div className="rounded-[40px] border-4 border-indigo-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-6 sm:p-8 shadow-xl flex flex-col items-center justify-center min-h-[350px] relative">
        {!isFinished ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-md">
            {cards.map((card, idx) => {
              const showFace = card.isFlipped || card.isMatched;

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(idx)}
                  className="perspective-1000 h-28 cursor-pointer relative"
                >
                  <motion.div
                    className="w-full h-full relative preserve-3d"
                    animate={{ rotateY: showFace ? 180 : 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Card Front (Back of card - face down) */}
                    <div className="absolute inset-0 backface-hidden rounded-2xl border-4 border-dashed border-sky-200 bg-sky-50/50 flex items-center justify-center text-3xl select-none shadow-sm">
                      🌟
                    </div>

                    {/* Card Back (Content - face up) */}
                    <div className={`absolute inset-0 backface-hidden rounded-2xl border-4 flex flex-col items-center justify-center shadow-md p-2 rotate-y-180 bg-white dark:bg-slate-800 ${
                      card.isMatched
                        ? 'border-emerald-400 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 opacity-60'
                        : 'border-sky-300'
                    }`}>
                      {card.content}
                    </div>
                  </motion.div>
                </div>
              );
            })}
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
                <CheckCircle2 className="h-6 w-6 text-emerald-500" /> Matches Found!
              </h3>
              <p className="text-sm font-bold text-slate-500">
                You cleared the memory board in {moves} moves!
              </p>
            </div>
            <button
              onClick={setupGame}
              className="bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-extrabold py-3.5 px-8 rounded-2xl shadow-md flex items-center justify-center gap-2 mx-auto transition-all active:scale-95 text-sm cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" /> Reset Board
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
