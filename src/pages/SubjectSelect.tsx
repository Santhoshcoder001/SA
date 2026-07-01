import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../hooks/useGameStore';
import { dbService } from '../services/db';
import type { LearningItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { playClickSound, playMilestoneSound } from '../utils/soundEffects';
import { Award, Play, Printer, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SubjectSelect: React.FC = () => {
  const navigate = useNavigate();
  const { 
    activeLanguageId, 
    languages, 
    subjects, 
    selectSubject, 
    progress,
    settings 
  } = useGameStore();

  const [subjectProgress, setSubjectProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [showCertificate, setShowCertificate] = useState(false);
  const [isCourseComplete, setIsCourseComplete] = useState(false);

  useEffect(() => {
    if (!activeLanguageId) {
      navigate('/');
      return;
    }

    const calculateProgress = async () => {
      const allItems = await dbService.getLearningItems(activeLanguageId);
      const stats: Record<string, { completed: number; total: number }> = {};

      subjects.forEach(sub => {
        stats[sub.id] = { completed: 0, total: 0 };
      });

      allItems.forEach((item: LearningItem) => {
        if (!stats[item.subject]) {
          stats[item.subject] = { completed: 0, total: 0 };
        }
        stats[item.subject].total += 1;
        if (progress.completedItemIds.includes(item.id)) {
          stats[item.subject].completed += 1;
        }
      });

      setSubjectProgress(stats);

      // Check if all alphabet and word items are completed
      const courseTotal = allItems.filter(i => i.subject === 'alphabet' || i.subject === 'words').length;
      const courseCompleted = allItems.filter(i => (i.subject === 'alphabet' || i.subject === 'words') && progress.completedItemIds.includes(i.id)).length;
      
      const courseDone = courseTotal > 0 && courseTotal === courseCompleted;
      setIsCourseComplete(courseDone);

      // Trigger automatic celebration the first time they see it!
      if (courseDone) {
        confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } });
      }
    };

    calculateProgress();
  }, [activeLanguageId, subjects, progress.completedItemIds, navigate]);

  const handleSelectSubject = (subId: string, path: string) => {
    playClickSound(settings.soundEnabled);
    selectSubject(subId);
    navigate(path);
  };

  const handlePrint = () => {
    playClickSound(settings.soundEnabled);
    window.print();
  };

  const selectedLang = languages.find(l => l.id === activeLanguageId);

  const getSubjectEmoji = (iconKey: string): string => {
    switch (iconKey.toLowerCase()) {
      case 'a': return '🔤';
      case 'book': return '📚';
      case 'move': return '🧩';
      case 'helpcircle': return '❓';
      case 'image': return '🎨';
      case 'volume2': return '🎧';
      case 'creditcard': return '🗂️';
      case 'grid': return '🔗';
      case 'sparkles': return '🧠';
      case 'trophy': return '🏆';
      default: return '🎈';
    }
  };

  const getSubjectBgColor = (subId: string): string => {
    switch (subId) {
      case 'alphabet': return 'bg-rose-500/10 border-rose-200 text-rose-700 dark:border-rose-900/50 dark:text-rose-400';
      case 'words': return 'bg-amber-500/10 border-amber-200 text-amber-700 dark:border-amber-900/50 dark:text-amber-400';
      case 'letter-arrangement': return 'bg-emerald-500/10 border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400';
      case 'missing-letter': return 'bg-sky-500/10 border-sky-200 text-sky-700 dark:border-sky-900/50 dark:text-sky-400';
      case 'picture-id': return 'bg-indigo-500/10 border-indigo-200 text-indigo-700 dark:border-indigo-900/50 dark:text-indigo-400';
      case 'listening': return 'bg-purple-500/10 border-purple-200 text-purple-700 dark:border-purple-900/50 dark:text-purple-400';
      case 'flashcards': return 'bg-pink-500/10 border-pink-200 text-pink-700 dark:border-pink-900/50 dark:text-pink-400';
      case 'matching': return 'bg-teal-500/10 border-teal-200 text-teal-700 dark:border-teal-900/50 dark:text-teal-400';
      case 'memory': return 'bg-cyan-500/10 border-cyan-200 text-cyan-700 dark:border-cyan-900/50 dark:text-cyan-400';
      case 'quiz': return 'bg-yellow-500/10 border-yellow-200 text-yellow-700 dark:border-yellow-900/50 dark:text-yellow-500';
      default: return 'bg-sky-500/10 border-sky-200 text-sky-700 dark:border-sky-900/50 dark:text-sky-400';
    }
  };

  return (
    <div className="space-y-8 py-4">
      {/* Upper greeting panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-3xl p-6 md:p-8 text-white shadow-xl">
        <div className="space-y-2">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider select-none">
            Selected Language: {selectedLang?.flag} {selectedLang?.name}
          </span>
          <h2 className="text-3xl font-black tracking-tight">Choose Your Learning Activity!</h2>
          <p className="text-sm font-bold text-sky-100 max-w-lg">
            Complete activities to earn stars and coins, level up, and unlock certificates!
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isCourseComplete && (
            <button
              onClick={() => {
                playMilestoneSound(settings.soundEnabled);
                setShowCertificate(true);
              }}
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-black px-6 py-3.5 rounded-2xl shadow-md transition-all active:scale-95 text-sm shrink-0 flex items-center gap-1.5 border border-white"
            >
              <Award className="h-4.5 w-4.5 fill-yellow-950" /> Claim Certificate 🏆
            </button>
          )}
          <button
            onClick={() => {
              playClickSound(settings.soundEnabled);
              navigate('/');
            }}
            className="bg-white hover:bg-slate-50 text-indigo-900 font-extrabold px-6 py-3.5 rounded-2xl shadow-md transition-all active:scale-95 text-sm shrink-0"
          >
            Change Language
          </button>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((sub, index) => {
          const stats = subjectProgress[sub.id] || { completed: 0, total: 0 };
          const completedRatio = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
          const bgThemeClass = getSubjectBgColor(sub.id);

          return (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -6 }}
              className={`rounded-3xl border-4 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all ${bgThemeClass}`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="text-4xl select-none">{getSubjectEmoji(sub.icon)}</div>
                  {stats.total > 0 && stats.completed === stats.total && (
                    <span className="bg-yellow-400 text-yellow-950 font-black px-2 py-0.5 rounded-xl text-[10px] uppercase shadow-sm border border-white">
                      Completed 🏆
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-black tracking-tight text-indigo-950 dark:text-white">
                  {sub.name}
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                  {sub.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-slate-100/50 dark:border-slate-800/50">
                {sub.id === 'quiz' ? (
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>Quiz History</span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {progress.quizHistory.filter(q => q.language === activeLanguageId).length} Completed
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>Items Solved</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        {stats.completed}/{stats.total} ({completedRatio}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200/20">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${completedRatio}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleSelectSubject(sub.id, sub.path)}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 text-xs cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-white" /> Start Activity
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* PRINTABLE CERTIFICATE MODAL */}
      <AnimatePresence>
        {showCertificate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-white print:static">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full rounded-3xl border-8 border-double border-yellow-400 bg-amber-50/50 p-8 shadow-2xl dark:bg-slate-900 print:border-8 print:shadow-none print:w-full print:max-w-none print:border-yellow-400"
            >
              {/* Close button - hidden when printing */}
              <div className="flex justify-end print:hidden">
                <button
                  onClick={() => setShowCertificate(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Certificate Inner Frame */}
              <div className="text-center border-4 border-yellow-300 rounded-2xl p-6 sm:p-10 space-y-6 bg-white dark:bg-slate-900 border-double print:border-4">
                <div className="flex justify-center text-5xl">🏆</div>
                
                <h1 className="text-3xl sm:text-4xl font-serif font-black text-indigo-950 dark:text-yellow-400 tracking-tight">
                  CERTIFICATE OF EXCELLENCE
                </h1>
                
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  This certifies that
                </p>

                <div className="py-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-sky-400 underline decoration-indigo-200">
                    LITTLE EXPLORER
                  </h2>
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  has successfully mastered the alphabet and completed the learning activities for the
                  <span className="font-extrabold text-indigo-900 dark:text-sky-300"> {selectedLang?.name} </span>
                  course on the Antigravity Kids Learning Platform.
                </p>

                <div className="pt-8 flex justify-between items-center gap-4 text-left border-t border-slate-100 dark:border-slate-800 text-[10px] font-black tracking-wider text-slate-400">
                  <div>
                    <p className="uppercase">Platform</p>
                    <p className="text-indigo-900 dark:text-sky-300 font-extrabold text-xs">ANTIGRAVITY KIDS</p>
                  </div>
                  <div className="text-right">
                    <p className="uppercase">Date Earned</p>
                    <p className="text-indigo-900 dark:text-sky-300 font-extrabold text-xs">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - hidden when printing */}
              <div className="mt-6 flex justify-center gap-3 print:hidden">
                <button
                  onClick={handlePrint}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-6 rounded-2xl shadow-md transition-all active:scale-95 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Print Certificate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
