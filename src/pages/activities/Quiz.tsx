import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../hooks/useGameStore';
import { dbService } from '../../services/db';
import type { QuizQuestion, LearningItem } from '../../types';
import { segmentWord } from '../../utils/wordSegmenter';
import { playSuccessSound, playErrorSound, playMilestoneSound, playClickSound } from '../../utils/soundEffects';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, CheckCircle2, AlertCircle, RotateCcw, Home, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DynamicQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  image?: string;
}

export const Quiz: React.FC = () => {
  const navigate = useNavigate();
  const { activeLanguageId, recordQuizResult, settings } = useGameStore();

  const [questions, setQuestions] = useState<DynamicQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // Stats for final summary
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isQuizOver, setIsQuizOver] = useState(false);

  // Load questions
  useEffect(() => {
    if (!activeLanguageId) {
      navigate('/');
      return;
    }

    const loadQuestions = async () => {
      // 1. Fetch preloaded quiz questions
      const dbQuiz = await dbService.getQuizQuestions(activeLanguageId);
      // 2. Fetch vocabulary words to generate dynamic questions
      const words = await dbService.getLearningItems(activeLanguageId, 'words');

      const quizList: DynamicQuestion[] = [];

      // Add database questions
      dbQuiz.forEach((q: QuizQuestion) => {
        quizList.push({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          image: q.image
        });
      });

      // Dynamically generate word translation & picture identification questions
      if (words.length >= 3) {
        words.forEach((item: LearningItem, index: number) => {
          // Generates Translation Question
          if (item.meaning) {
            const distractors = words.filter((w: LearningItem) => w.id !== item.id && !!w.meaning);
            const distractorMeanings = distractors.map((w: LearningItem) => w.meaning as string);
            const selectedDist = distractorMeanings.sort(() => 0.5 - Math.random()).slice(0, 3);
            
            const options = [...selectedDist, item.meaning].sort(() => 0.5 - Math.random());
            quizList.push({
              id: `dyn-trans-${item.id}-${index}`,
              questionText: `What does the word "${item.word}" mean?`,
              options,
              correctAnswer: item.meaning,
              image: item.image
            });
          }

          // Generates Spelling Missing Letter Question
          const letters = segmentWord(item.word, activeLanguageId || 'english');
          if (letters.length > 2) {
            const blankIdx = Math.floor(Math.random() * (letters.length - 1)) + 1;
            const correctLetter = letters[blankIdx];
            const displayWord = letters.map((l, i) => i === blankIdx ? '_' : l).join(' ');

            const defaultDistractors = ['A', 'B', 'C', 'D', 'E', 'O', 'I', 'U'];
            const distractors = defaultDistractors.filter(l => l !== correctLetter).slice(0, 3);
            const options = [...distractors, correctLetter].sort(() => 0.5 - Math.random());

            quizList.push({
              id: `dyn-missing-${item.id}-${index}`,
              questionText: `Which letter is missing in: ${displayWord}?`,
              options,
              correctAnswer: correctLetter,
              image: item.image
            });
          }
        });
      }

      // Shuffle and pick 5 questions for this quiz session
      const shuffledQuiz = quizList.sort(() => 0.5 - Math.random()).slice(0, 5);
      setQuestions(shuffledQuiz);
      setLoading(false);
    };

    loadQuestions();
  }, [activeLanguageId, navigate]);

  // Timer loop
  useEffect(() => {
    if (loading || isQuizOver || selectedAnswer !== null) return;

    if (timeLeft === 0) {
      handleTimeout();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, loading, isQuizOver, selectedAnswer]);

  const handleTimeout = () => {
    // Treat as incorrect
    setSelectedAnswer('');
    setIsAnswerCorrect(false);
    playErrorSound(settings.soundEnabled);
  };

  const handleAnswerClick = (option: string) => {
    if (selectedAnswer !== null) return;
    playClickSound(settings.soundEnabled);

    setSelectedAnswer(option);
    const correct = option === questions[currentIdx].correctAnswer;
    setIsAnswerCorrect(correct);

    if (correct) {
      setScore(prev => prev + 1);
      playSuccessSound(settings.soundEnabled);
    } else {
      playErrorSound(settings.soundEnabled);
    }
  };

  const handleNext = () => {
    playClickSound(settings.soundEnabled);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setTimeLeft(15);
    } else {
      // Quiz completed!
      setIsQuizOver(true);
      
      const starsEarned = score;
      const coinsEarned = score * 5;

      // Save to Zustand
      recordQuizResult({
        language: activeLanguageId || 'english',
        subject: 'quiz',
        score,
        totalQuestions: questions.length,
        starsEarned,
        coinsEarned
      });

      // Confetti & milestone alert
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
      playMilestoneSound(settings.soundEnabled);
    }
  };

  const restartQuiz = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="text-6xl">📭</div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No questions available</h3>
        <p className="text-sm text-slate-500">
          Make sure to add some vocabulary words or quiz questions in the Admin Panel to generate quizzes.
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

  const activeQuestion = questions[currentIdx];

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-indigo-950 dark:text-white flex items-center justify-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" /> Quiz Arena
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Test your vocabulary & grammar!
        </p>
      </div>

      {!isQuizOver ? (
        <div className="rounded-[40px] border-4 border-indigo-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-6 flex flex-col items-center">
          {/* Quiz stats & timer */}
          <div className="flex items-center justify-between w-full border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-1.5 font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/20 px-3 py-1 rounded-xl">
              <Clock className="h-4.5 w-4.5 animate-pulse" />
              <span className="text-sm font-black font-mono">{timeLeft}s</span>
            </div>
          </div>

          {/* Question text */}
          <div className="text-center space-y-4 w-full">
            {activeQuestion.image && (
              <img 
                src={activeQuestion.image} 
                alt="Question helper"
                className="h-28 w-28 object-contain rounded-2xl border border-sky-100 shadow-sm mx-auto bg-sky-50/25"
              />
            )}
            <h3 className="text-xl font-extrabold text-indigo-950 dark:text-white leading-tight">
              {activeQuestion.questionText}
            </h3>
          </div>

          {/* Options grid */}
          <div className="w-full max-w-md grid grid-cols-1 gap-3 pt-4">
            {activeQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const optionIsCorrect = option === activeQuestion.correctAnswer;

              let btnClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-100 hover:border-sky-300';
              if (selectedAnswer !== null) {
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
                  whileHover={selectedAnswer === null ? { scale: 1.02 } : {}}
                  whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                  onClick={() => handleAnswerClick(option)}
                  disabled={selectedAnswer !== null}
                  className={`w-full py-4 px-6 rounded-2xl border-4 text-lg font-bold shadow-sm flex items-center justify-between transition-all cursor-pointer ${btnClass}`}
                >
                  <span>{option}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Correct/Wrong Feedback Alert */}
          <AnimatePresence>
            {selectedAnswer !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="w-full border-t border-slate-100 dark:border-slate-800 pt-5 mt-4"
              >
                {selectedAnswer === '' ? (
                  <div className="py-3.5 rounded-2xl bg-orange-50 border-2 border-orange-200 dark:border-orange-950/20 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-black flex items-center justify-center gap-2 shadow-sm text-sm">
                    <Clock className="h-5 w-5" /> Time is up! Correct answer: {activeQuestion.correctAnswer}
                  </div>
                ) : isAnswerCorrect ? (
                  <div className="py-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 dark:border-emerald-950/20 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center gap-2 shadow-sm text-sm">
                    <CheckCircle2 className="h-5 w-5" /> Spot on! That's correct!
                  </div>
                ) : (
                  <div className="py-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 dark:border-rose-950/20 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-black flex items-center justify-center gap-2 shadow-sm text-sm">
                    <AlertCircle className="h-5 w-5" /> Incorrect! Correct answer was: {activeQuestion.correctAnswer}
                  </div>
                )}

                <button
                  onClick={handleNext}
                  className="w-full mt-4 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-extrabold py-3.5 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {currentIdx < questions.length - 1 ? 'Next Question' : 'Finish Quiz'} <ArrowRight className="h-4 w-4 stroke-[3]" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Results summary Card */
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-[40px] border-4 border-indigo-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-8 shadow-xl text-center space-y-8 flex flex-col items-center"
        >
          <div className="text-7xl animate-bounce">🏆</div>
          
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-indigo-950 dark:text-white">Quiz Finished!</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              Here is what you accomplished:
            </p>
          </div>

          {/* Stats values grid */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
            <div className="bg-sky-50 border border-sky-100 dark:bg-slate-900 dark:border-slate-800 p-4 rounded-2xl text-center shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-2">Score</span>
              <span className="text-2xl font-black text-sky-600 dark:text-sky-400">{score}/{questions.length}</span>
            </div>

            <div className="bg-amber-50 border border-amber-100 dark:bg-slate-900 dark:border-slate-800 p-4 rounded-2xl text-center shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-2">Stars</span>
              <span className="text-2xl font-black text-amber-500">+{score} ⭐</span>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 dark:bg-slate-900 dark:border-slate-800 p-4 rounded-2xl text-center shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-2">Coins</span>
              <span className="text-2xl font-black text-yellow-600">+{score * 5} 🪙</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={restartQuiz}
              className="flex-1 bg-white hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-850 text-indigo-600 dark:text-sky-400 font-extrabold py-3.5 px-6 rounded-2xl border-2 border-slate-200 dark:border-slate-850 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 text-xs cursor-pointer"
            >
              <RotateCcw className="h-4.5 w-4.5" /> Retake Quiz
            </button>
            <button
              onClick={() => navigate('/subjects')}
              className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 text-xs cursor-pointer"
            >
              <Home className="h-4.5 w-4.5" /> Back to Dashboard
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
