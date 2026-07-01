import React, { useState } from 'react';
import { useGameState } from '../hooks/useGameState';
import { segmentTamilWord } from '../utils/tamilSegmenter';
import { Plus, Trash2, Search, Filter, BookOpen, Layers } from 'lucide-react';
import type { Difficulty } from '../types/game';
import { SpeechButton } from './SpeechButton';

export const WordManager: React.FC = () => {
  const { words, uploadWords, deleteWord } = useGameState();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all');
  const [newWordInput, setNewWordInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const word = newWordInput.trim();
    if (!word) return;

    // Check if it's Tamil
    const tamilRegex = /^[\u0B80-\u0BFF\s]+$/;
    if (!tamilRegex.test(word)) {
      setAddError('உரையில் தமிழ் எழுத்துக்கள் மட்டுமே இருக்க வேண்டும். (Only Tamil letters allowed.)');
      return;
    }

    const segmented = segmentTamilWord(word);
    if (segmented.length < 2) {
      setAddError('வார்த்தையில் குறைந்தபட்சம் 2 எழுத்துக்கள் இருக்க வேண்டும். (Word must be at least 2 letters.)');
      return;
    }

    // Check if already exists
    const exists = words.some(w => w.word === word);
    if (exists) {
      setAddError('இந்த வார்த்தை ஏற்கனவே உள்ளது. (Word already exists.)');
      return;
    }

    uploadWords([word]);
    setNewWordInput('');
  };

  const filteredWords = words.filter(w => {
    const matchesSearch = w.word.includes(searchTerm);
    const matchesDifficulty = filterDifficulty === 'all' || w.difficulty === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="space-y-6">
      {/* Upper Panel: Quick add and stats summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Add Word Form */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-850 dark:bg-slate-900/40 lg:col-span-2">
          <h2 className="text-base font-bold text-slate-800 dark:text-white mb-3">
            வார்த்தையைச் சேர் <span className="text-slate-400 font-normal">| Add Custom Word</span>
          </h2>
          <form onSubmit={handleAddWord} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newWordInput}
                onChange={(e) => {
                  setNewWordInput(e.target.value);
                  setAddError(null);
                }}
                placeholder="எ.கா. கணினி"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
              <button
                type="submit"
                className="btn-primary"
              >
                <Plus className="h-4 w-4" /> சேர் (Add)
              </button>
            </div>
            {addError && (
              <p className="text-xs font-semibold text-rose-500">{addError}</p>
            )}
            <p className="text-[10px] text-slate-400 leading-normal">
              Note: Difficulty is auto-assigned based on length (2-4 letters: Easy, 5-7: Medium, 8+: Hard).
            </p>
          </form>
        </div>

        {/* Word Info Summary */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-850 dark:bg-slate-900/40">
          <h2 className="text-base font-bold text-slate-800 dark:text-white mb-3">
            பிரிவுகள் <span className="text-slate-400 font-normal">| Distribution</span>
          </h2>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-emerald-500" /> Easy (2–4 letters)</span>
              <span className="font-bold text-slate-900 dark:text-white">{words.filter(w => w.difficulty === 'easy').length}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-amber-500" /> Medium (5–7 letters)</span>
              <span className="font-bold text-slate-900 dark:text-white">{words.filter(w => w.difficulty === 'medium').length}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-rose-500" /> Hard (8+ letters)</span>
              <span className="font-bold text-slate-900 dark:text-white">{words.filter(w => w.difficulty === 'hard').length}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 dark:border-slate-850 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>மொத்தம் (Total Words)</span>
              <span>{words.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Word List Table and Search */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-850 dark:bg-slate-900/40 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-850 sm:flex-row sm:items-center sm:justify-between bg-slate-50/30 dark:bg-slate-900/10">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="h-4.5 w-4.5 text-brand-500" /> வார்த்தைப் பட்டியல் <span className="text-slate-400 font-normal">| Words ({filteredWords.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search word..."
                className="w-40 sm:w-48 rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value as Difficulty | 'all')}
                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Word Table Grid */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredWords.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/20 text-xs font-bold text-slate-400 dark:border-slate-850 dark:bg-slate-900/5 select-none">
                  <th className="px-4 py-3">சொல் (Word)</th>
                  <th className="px-4 py-3">எழுத்துக்கள் (Tamil Graphemes)</th>
                  <th className="px-4 py-3">வகை (Difficulty)</th>
                  <th className="px-4 py-3 text-right">செயல்கள் (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-sm">
                {filteredWords.map((word) => (
                  <tr key={word.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                    <td className="px-4 py-3.5 font-tamil font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                      <SpeechButton word={word.word} size={14} className="scale-90 shrink-0" />
                      <span>{word.word}</span>
                      {word.custom && (
                        <span className="rounded bg-brand-50 px-1 py-0.5 text-[9px] font-bold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 font-sans">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex flex-wrap gap-1">
                        {word.letters.map((letter, i) => (
                          <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-tamil font-semibold">
                            {letter}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                        word.difficulty === 'easy'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : word.difficulty === 'medium'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                      }`}>
                        {word.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => deleteWord(word.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 transition-colors"
                        title="Delete Word"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-400">வார்த்தைகள் எதுவும் இல்லை. (No words found matching filters.)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
