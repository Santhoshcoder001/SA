import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language, Subject, UserProgress, Settings, Achievement, QuizHistory } from '../types';
import { dbService } from '../services/db';

interface GameStoreState {
  languages: Language[];
  subjects: Subject[];
  activeLanguageId: string | null;
  activeSubjectId: string | null;
  progress: UserProgress;
  settings: Settings;
  achievements: Achievement[];
  isLoading: boolean;
  error: string | null;

  // Initialization
  initializeSystem: () => Promise<void>;
  
  // Selections
  selectLanguage: (langId: string | null) => void;
  selectSubject: (subId: string | null) => void;

  // Settings
  updateSettings: (settings: Partial<Settings>) => void;

  // Database updates (so UI triggers refresh)
  refreshContent: () => Promise<void>;

  // Progress Actions
  addCoins: (amount: number) => void;
  addStars: (amount: number) => void;
  addXp: (amount: number) => void;
  recordItemCompletion: (itemId: string, isCorrect: boolean, hintCount: number) => void;
  recordQuizResult: (quizHistoryEntry: Omit<QuizHistory, 'id' | 'date'>) => void;
  resetProgress: () => void;
  checkAchievements: () => void;
}

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_step', title: 'First Step', description: 'Solve your first learning activity!', icon: '🎈', condition: 'completed:1', unlocked: false },
  { id: 'smart_kid', title: 'Smart Kid', description: 'Solve 10 learning items!', icon: '⭐', condition: 'completed:10', unlocked: false },
  { id: 'genius', title: 'Genius Mind', description: 'Solve 25 learning items!', icon: '🧠', condition: 'completed:25', unlocked: false },
  { id: 'streak_3', title: 'On Fire', description: 'Maintain a 3-day daily streak or 3 correct answers!', icon: '🔥', condition: 'streak:3', unlocked: false },
  { id: 'streak_5', title: 'Super Kid', description: 'Maintain a 5-day streak or 5 correct answers!', icon: '⚡', condition: 'streak:5', unlocked: false },
  { id: 'wealthy', title: 'Coin Collector', description: 'Earn 100 coins!', icon: '🪙', condition: 'coins:100', unlocked: false }
];

const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  ttsEnabled: true,
  ttsVoice: 'default',
  ttsSpeed: 0.8,
  pitch: 1.0,
  volume: 1.0,
  ttsProvider: 'gemini',
  geminiVoiceName: 'Kore',
  darkMode: false,
  theme: 'light'
};

const DEFAULT_PROGRESS: UserProgress = {
  level: 1,
  xp: 0,
  stars: 0,
  coins: 0,
  dailyStreak: 0,
  unlockedLevels: ['level-1'],
  quizHistory: [],
  completedItemIds: [],
  attemptsPerItem: {},
  mistakesPerItem: {}
};

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      languages: [],
      subjects: [],
      activeLanguageId: null,
      activeSubjectId: null,
      progress: DEFAULT_PROGRESS,
      settings: DEFAULT_SETTINGS,
      achievements: INITIAL_ACHIEVEMENTS,
      isLoading: false,
      error: null,

      initializeSystem: async () => {
        set({ isLoading: true, error: null });
        try {
          // Initialize DB
          await dbService.init();

          // Load languages
          let dbLangs = await dbService.getLanguages();
          let dbSubjs = await dbService.getSubjects();

          // Check if DB is empty - if so, preload
          if (dbLangs.length === 0) {
            console.log('IndexedDB empty. Preloading default languages & subjects...');
            
            // Fetch languages list
            const langsRes = await fetch('/languages/languages.json');
            const defaultLangs: Language[] = await langsRes.json();
            for (const lang of defaultLangs) {
              await dbService.saveLanguage(lang);
            }

            // Fetch subjects list
            const subjsRes = await fetch('/languages/subjects.json');
            const defaultSubjs: Subject[] = await subjsRes.json();
            for (const subj of defaultSubjs) {
              await dbService.saveSubject(subj);
            }

            // For each language, load its preloaded learning items and quiz items
            for (const lang of defaultLangs) {
              // Alphabet
              try {
                const alphRes = await fetch(`/languages/${lang.id}/alphabet.json`);
                if (alphRes.ok) {
                  const items = await alphRes.json();
                  await dbService.bulkSaveLearningItems(items);
                }
              } catch (e) {
                console.warn(`No alphabet items found for ${lang.id}`);
              }

              // Words
              try {
                const wordsRes = await fetch(`/languages/${lang.id}/words.json`);
                if (wordsRes.ok) {
                  const items = await wordsRes.json();
                  await dbService.bulkSaveLearningItems(items);
                }
              } catch (e) {
                console.warn(`No words found for ${lang.id}`);
              }

              // Quiz
              try {
                const quizRes = await fetch(`/languages/${lang.id}/quiz.json`);
                if (quizRes.ok) {
                  const items = await quizRes.json();
                  await dbService.bulkSaveQuizQuestions(items);
                }
              } catch (e) {
                console.warn(`No quiz questions found for ${lang.id}`);
              }
            }

            // Reload database contents
            dbLangs = await dbService.getLanguages();
            dbSubjs = await dbService.getSubjects();
          }

          set({ languages: dbLangs, subjects: dbSubjs, isLoading: false });

          // Initialize streak calculations
          const today = new Date().toISOString().split('T')[0];
          const lastActive = get().progress.lastActiveDate;
          if (lastActive && lastActive !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (lastActive === yesterdayStr) {
              // Continued streak
              set(state => ({
                progress: {
                  ...state.progress,
                  dailyStreak: state.progress.dailyStreak + 1,
                  lastActiveDate: today
                }
              }));
            } else {
              // Broke streak
              set(state => ({
                progress: {
                  ...state.progress,
                  dailyStreak: 1,
                  lastActiveDate: today
                }
              }));
            }
          } else if (!lastActive) {
            // First time active
            set(state => ({
              progress: {
                ...state.progress,
                dailyStreak: 1,
                lastActiveDate: today
              }
            }));
          }

          get().checkAchievements();

        } catch (err: any) {
          console.error('System initialization failed:', err);
          set({ error: err.message || 'System failed to initialize.', isLoading: false });
        }
      },

      selectLanguage: (langId) => set({ activeLanguageId: langId }),
      selectSubject: (subId) => set({ activeSubjectId: subId }),

      updateSettings: (newSettings) => set((state) => {
        const merged = { ...state.settings, ...newSettings };
        
        // Sync theme class
        if (merged.theme === 'dark' || (merged.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        return { settings: merged };
      }),

      refreshContent: async () => {
        const langs = await dbService.getLanguages();
        const subjs = await dbService.getSubjects();
        set({ languages: langs, subjects: subjs });
      },

      addCoins: (amount) => set((state) => {
        const newCoins = state.progress.coins + amount;
        setTimeout(() => get().checkAchievements(), 100);
        return { progress: { ...state.progress, coins: newCoins } };
      }),

      addStars: (amount) => set((state) => ({
        progress: { ...state.progress, stars: state.progress.stars + amount }
      })),

      addXp: (amount) => set((state) => {
        const newXp = state.progress.xp + amount;
        // Level up formula: Level * 100 XP
        const nextLevelThreshold = state.progress.level * 100;
        let newLevel = state.progress.level;
        let finalXp = newXp;

        if (finalXp >= nextLevelThreshold) {
          newLevel += 1;
          finalXp = finalXp - nextLevelThreshold;
          
          // Sound effect or notification can be triggered
          import('canvas-confetti').then((confetti) => {
            confetti.default({ particleCount: 150, spread: 80 });
          });
        }

        return {
          progress: {
            ...state.progress,
            level: newLevel,
            xp: finalXp
          }
        };
      }),

      recordItemCompletion: (itemId, isCorrect, hintCount) => set((state) => {
        const attempts = (state.progress.attemptsPerItem[itemId] || 0) + 1;
        const mistakes = (state.progress.mistakesPerItem[itemId] || 0) + (isCorrect ? 0 : 1);

        let completedIds = [...state.progress.completedItemIds];
        if (isCorrect && !completedIds.includes(itemId)) {
          completedIds.push(itemId);
        }

        const nextProgress = {
          ...state.progress,
          completedItemIds: completedIds,
          attemptsPerItem: { ...state.progress.attemptsPerItem, [itemId]: attempts },
          mistakesPerItem: { ...state.progress.mistakesPerItem, [itemId]: mistakes }
        };

        // Earn XP and coins on correct solve
        if (isCorrect) {
          const xpEarned = Math.max(10, 30 - hintCount * 5 - mistakes * 2);
          const coinsEarned = Math.max(2, 10 - hintCount * 2);
          
          nextProgress.xp += xpEarned;
          nextProgress.coins += coinsEarned;
          nextProgress.stars += 1;

          // Level up logic
          const threshold = nextProgress.level * 100;
          if (nextProgress.xp >= threshold) {
            nextProgress.xp -= threshold;
            nextProgress.level += 1;
          }
        }

        setTimeout(() => get().checkAchievements(), 100);

        return { progress: nextProgress };
      }),

      recordQuizResult: (historyEntry) => set((state) => {
        const newQuizEntry: QuizHistory = {
          ...historyEntry,
          id: `quiz-${Date.now()}`,
          date: new Date().toISOString().split('T')[0]
        };

        const nextProgress = {
          ...state.progress,
          stars: state.progress.stars + historyEntry.starsEarned,
          coins: state.progress.coins + historyEntry.coinsEarned,
          quizHistory: [...state.progress.quizHistory, newQuizEntry]
        };

        setTimeout(() => get().checkAchievements(), 100);

        return { progress: nextProgress };
      }),

      resetProgress: () => set(() => ({
        progress: DEFAULT_PROGRESS,
        achievements: INITIAL_ACHIEVEMENTS,
        activeLanguageId: null,
        activeSubjectId: null
      })),

      checkAchievements: () => set((state) => {
        let achievedSomething = false;
        const updatedAchievements = state.achievements.map((ach) => {
          if (ach.unlocked) return ach;

          const [conditionType, conditionValue] = ach.condition.split(':');
          const value = parseInt(conditionValue, 10);
          let shouldUnlock = false;

          if (conditionType === 'completed' && state.progress.completedItemIds.length >= value) {
            shouldUnlock = true;
          } else if (conditionType === 'streak' && state.progress.dailyStreak >= value) {
            shouldUnlock = true;
          } else if (conditionType === 'coins' && state.progress.coins >= value) {
            shouldUnlock = true;
          }

          if (shouldUnlock) {
            achievedSomething = true;
            return {
              ...ach,
              unlocked: true,
              unlockedAt: new Date().toLocaleDateString()
            };
          }

          return ach;
        });

        if (achievedSomething) {
          // Fire confetti celebration
          import('canvas-confetti').then((confetti) => {
            confetti.default({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
          });
        }

        return achievedSomething ? { achievements: updatedAchievements } : {};
      })
    }),
    {
      name: 'kids-learning-platform-state',
      merge: (persistedState, currentState) => {
        const typedPersisted = (persistedState as Partial<GameStoreState>) || {};
        return {
          ...currentState,
          ...typedPersisted,
          settings: {
            ...currentState.settings,
            ...(typedPersisted.settings || {})
          }
        };
      },
      partialize: (state) => ({
        progress: state.progress,
        settings: state.settings,
        achievements: state.achievements,
        activeLanguageId: state.activeLanguageId,
        activeSubjectId: state.activeSubjectId
      })
    }
  )
);
