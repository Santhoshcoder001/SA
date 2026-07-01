import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../hooks/useGameStore';
import { motion } from 'framer-motion';
import { Sparkles, Brain, ArrowRight } from 'lucide-react';
import { playClickSound } from '../utils/soundEffects';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { languages, activeLanguageId, selectLanguage, settings } = useGameStore();

  const handleSelectLanguage = (langId: string) => {
    playClickSound(settings.soundEnabled);
    selectLanguage(langId);
  };

  const handleContinue = () => {
    if (activeLanguageId) {
      playClickSound(settings.soundEnabled);
      navigate('/subjects');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-6">
      <div className="max-w-xl w-full text-center space-y-8 px-4">
        {/* Animated Cute Mascot/Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="relative inline-block"
        >
          <div className="flex h-28 w-28 items-center justify-center rounded-[40px] bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-xl shadow-sky-500/30 mx-auto transform rotate-6 hover:rotate-0 transition-transform duration-300 cursor-pointer">
            <Brain className="h-16 w-16" />
          </div>
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-950 font-black p-2.5 rounded-2xl shadow-md text-xs flex items-center gap-1 border-2 border-white select-none"
          >
            <Sparkles className="h-3.5 w-3.5 fill-yellow-950" /> FUN!
          </motion.div>
        </motion.div>

        {/* Welcome Headers */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black text-indigo-950 dark:text-white tracking-tight">
            Welcome, Little Explorer!
          </h1>
          <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Choose the language you want to learn today and let's play some games!
          </p>
        </div>

        {/* Language Grid */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest text-left pl-1">
            Select Language
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {languages.map((lang) => {
              const isSelected = activeLanguageId === lang.id;
              return (
                <motion.button
                  key={lang.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectLanguage(lang.id)}
                  className={`flex flex-col items-center justify-center p-5 rounded-3xl border-4 transition-all shadow-md cursor-pointer ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 ring-4 ring-sky-300/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-sky-300'
                  }`}
                >
                  <span className="text-4xl mb-2 select-none">{lang.flag}</span>
                  <span className="text-sm font-black tracking-tight">{lang.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Continue Button */}
        <motion.button
          disabled={!activeLanguageId}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleContinue}
          className={`w-full py-4.5 px-8 rounded-3xl text-lg font-black text-white shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer ${
            activeLanguageId
              ? 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 shadow-indigo-500/30 active:scale-95'
              : 'bg-slate-300 dark:bg-slate-800 shadow-none cursor-not-allowed opacity-50'
          }`}
        >
          Let's Go! <ArrowRight className="h-6 w-6 stroke-[3]" />
        </motion.button>
      </div>
    </div>
  );
};
