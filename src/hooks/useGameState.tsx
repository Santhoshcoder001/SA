import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Word, GameStats, GameSettings, Achievement, Difficulty, GameState } from '../types/game';
import { DEFAULT_WORDS } from '../utils/defaultWords';
import { segmentTamilWord, shuffleLetters, isArrangementCorrect } from '../utils/tamilSegmenter';
import { playSuccessSound, playErrorSound, playMilestoneSound, speakTamilWord, isSpeechSynthesisSupported, getTamilVoices, stopSpeaking } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { getCachedAudio, cacheAudio, clearAudioCache } from '../services/AudioCache';
import { hasGeminiApiKey } from '../services/ElevenLabsService';
import { speakTamilViaHf } from '../services/tamilTts';

interface GameContextType extends GameState {
  selectWord: (wordId: string) => void;
  nextWord: () => void;
  skipWord: () => void;
  resetProgress: () => void;
  updateArrangement: (arrangement: string[]) => void;
  checkAnswer: () => boolean;
  revealHint: () => void;
  shuffleCurrentWord: () => void;
  setDifficulty: (difficulty: Difficulty | 'all') => void;
  setGameMode: (mode: 'practice' | 'challenge' | 'review') => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  uploadWords: (words: string[]) => void;
  deleteWord: (wordId: string) => void;
  pronounceActiveWord: () => void;
  startDailyChallenge: () => void;
  activeWord: Word | null;
  dailyChallengeProgress: { current: number; total: number } | null;
  recentUnlockedAchievement: Achievement | null;
  clearAchievementToast: () => void;
  importProgress: (dataStr: string) => boolean;
  exportProgress: () => string;
  isSpeaking: boolean;
  isGenerating: boolean;
  speakingText: string | null;
  stopSpeaking: () => void;
  speakWord: (word: string) => Promise<boolean>;
  hasTamilVoice: boolean;
  isTtsSupported: boolean;
  geminiApiKeyExists: boolean;
  clearCache: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  ttsEnabled: true,
  ttsVoice: 'default',
  ttsSpeed: 0.8,
  pitch: 1.0,
  volume: 1.0,
  ttsProvider: 'gemini',
  geminiVoiceName: 'Kore',
  darkMode: false,
};

const DEFAULT_STATS: GameStats = {
  totalWords: DEFAULT_WORDS.length,
  completedWords: 0,
  accuracy: 100,
  mistakes: 0,
  totalAttempts: 0,
  bestStreak: 0,
  currentStreak: 0,
  totalScore: 0,
  completedIds: [],
  attemptsPerWord: {},
  mistakesPerWord: {},
  dailyCompletedDates: [],
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_word', title: 'முதல் வெற்றி (First Win)', description: 'Solve your first Tamil word!', unlocked: false, icon: '🌟', condition: 'completed:1' },
  { id: 'streak_3', title: 'தொடர் வெற்றி (On a Roll)', description: 'Get a streak of 3 correct answers!', unlocked: false, icon: '🔥', condition: 'streak:3' },
  { id: 'streak_5', title: 'சொல் வித்தகர் (Word Wizard)', description: 'Get a streak of 5 correct answers!', unlocked: false, icon: '⚡', condition: 'streak:5' },
  { id: 'streak_10', title: 'தமிழ் அறிஞர் (Tamil Scholar)', description: 'Get a streak of 10 correct answers!', unlocked: false, icon: '👑', condition: 'streak:10' },
  { id: 'total_10', title: 'ஆர்வலர் (Dedicated Learner)', description: 'Solve 10 words in total!', unlocked: false, icon: '📚', condition: 'completed:10' },
  { id: 'total_25', title: 'சொற்களஞ்சியம் (Vocab Master)', description: 'Solve 25 words in total!', unlocked: false, icon: '🎓', condition: 'completed:25' },
  { id: 'hard_solve', title: 'துணிச்சல்காரர் (Fearless)', description: 'Solve a Hard difficulty word!', unlocked: false, icon: '🛡️', condition: 'difficulty:hard' },
  { id: 'no_hints', title: 'சுயசிந்தனை (Pure Genius)', description: 'Solve a word without using any hints!', unlocked: false, icon: '🧠', condition: 'nohints:1' },
];

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load data from localStorage or fall back
  const [words, setWords] = useState<Word[]>(() => {
    const saved = localStorage.getItem('tamil-game-words');
    return saved ? JSON.parse(saved) : DEFAULT_WORDS;
  });

  const [stats, setStats] = useState<GameStats>(() => {
    const saved = localStorage.getItem('tamil-game-stats');
    return saved ? JSON.parse(saved) : DEFAULT_STATS;
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('tamil-game-settings');
    const parsed = saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    
    // Apply dark mode immediately on boot
    if (parsed.darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    return parsed;
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('tamil-game-achievements');
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [currentArrangement, setCurrentArrangement] = useState<string[]>([]);
  
  const [gameMode, setGameModeState] = useState<'practice' | 'challenge' | 'review'>('practice');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'all'>('all');
  
  const [hintState, setHintState] = useState<number>(0);
  const isLoading = false;
  const [error, setError] = useState<string | null>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const speakingTextRef = useRef<string | null>(null);

  useEffect(() => {
    speakingTextRef.current = speakingText;
  }, [speakingText]);

  const [hasTamilVoice, setHasTamilVoice] = useState(false);
  const [isTtsSupported, setIsTtsSupported] = useState(false);

  useEffect(() => {
    const checkTts = () => {
      const supported = isSpeechSynthesisSupported();
      setIsTtsSupported(supported);
      if (supported) {
        const tamilVoices = getTamilVoices();
        setHasTamilVoice(tamilVoices.length > 0);
      }
    };

    checkTts();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = checkTts;
    }
  }, []);
  
  // Daily challenge state
  const [dailyWordIds, setDailyWordIds] = useState<string[]>([]);
  const [dailyCurrentIndex, setDailyCurrentIndex] = useState<number>(0);

  // Unlocked achievement animation toast state
  const [recentUnlockedAchievement, setRecentUnlockedAchievement] = useState<Achievement | null>(null);

  // Sync words and stats to localStorage when changed
  useEffect(() => {
    localStorage.setItem('tamil-game-words', JSON.stringify(words));
  }, [words]);

  useEffect(() => {
    localStorage.setItem('tamil-game-stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('tamil-game-settings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('tamil-game-achievements', JSON.stringify(achievements));
  }, [achievements]);

  // Find active word details
  const activeWord = words.find(w => w.id === activeWordId) || null;

  // Track daily challenge status
  const dailyChallengeProgress = gameMode === 'challenge' && dailyWordIds.length > 0 
    ? { current: dailyCurrentIndex + 1, total: dailyWordIds.length }
    : null;

  // Clear achievement toast helper
  const clearAchievementToast = () => setRecentUnlockedAchievement(null);

  // Select a word and set up letters
  const selectWord = (wordId: string) => {
    const targetWord = words.find(w => w.id === wordId);
    if (!targetWord) return;

    setActiveWordId(wordId);
    setHintState(0);

    // Shuffle letters ensuring order is actually scrambled
    const shuffled = shuffleLetters(targetWord.letters);
    setShuffledLetters(shuffled);
    // Initialize arrangement empty slots (null for unassigned)
    setCurrentArrangement(Array(targetWord.letters.length).fill(''));
    
    // Automatically trigger pronunciation if settings allow
    if (settings.ttsEnabled) {
      speakWord(targetWord.word);
    }
  };

  // Check achievements after a correct word solve
  const checkAchievements = (solvedWord: Word, newStats: GameStats) => {
    const updatedAchievements = achievements.map(ach => {
      if (ach.unlocked) return ach;

      let shouldUnlock = false;
      const [type, value] = ach.condition.split(':');

      if (type === 'completed' && newStats.completedWords >= parseInt(value, 10)) {
        shouldUnlock = true;
      } else if (type === 'streak' && newStats.currentStreak >= parseInt(value, 10)) {
        shouldUnlock = true;
      } else if (type === 'difficulty' && solvedWord.difficulty === value) {
        shouldUnlock = true;
      } else if (type === 'nohints' && solvedWord.hintCount === 0) {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        // Unlock celebration!
        playMilestoneSound(settings.soundEnabled);
        setRecentUnlockedAchievement({
          ...ach,
          unlocked: true,
          unlockedAt: new Date().toLocaleDateString(),
        });
        return {
          ...ach,
          unlocked: true,
          unlockedAt: new Date().toLocaleDateString(),
        };
      }
      return ach;
    });

    setAchievements(updatedAchievements);
  };

  // Get available words for current mode and difficulty filters
  const getEligibleWords = (): Word[] => {
    if (gameMode === 'review') {
      // Find words with failures or registered attempts that are not yet marked as completed in general
      return words.filter(w => {
        const attempts = stats.attemptsPerWord[w.id] || 0;
        const isCompleted = stats.completedIds.includes(w.id);
        return attempts > 0 && !isCompleted;
      });
    }

    // Practice mode filtering
    return words.filter(w => {
      const difficultyMatch = selectedDifficulty === 'all' || w.difficulty === selectedDifficulty;
      const isCompleted = stats.completedIds.includes(w.id);
      
      // Let completed words reappear in practice mode if all words in difficulty are completed
      const totalInDifficulty = words.filter(word => selectedDifficulty === 'all' || word.difficulty === selectedDifficulty);
      const completedInDifficulty = totalInDifficulty.filter(word => stats.completedIds.includes(word.id));
      const allCompleted = totalInDifficulty.length > 0 && totalInDifficulty.length === completedInDifficulty.length;
      
      return difficultyMatch && (!isCompleted || allCompleted);
    });
  };

  // Select next word
  const nextWord = () => {
    if (gameMode === 'challenge') {
      // Move to next word in the daily pool
      const nextIndex = dailyCurrentIndex + 1;
      if (nextIndex < dailyWordIds.length) {
        setDailyCurrentIndex(nextIndex);
        selectWord(dailyWordIds[nextIndex]);
      } else {
        // Daily challenge finished!
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Celebrate completion
        confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
        playSuccessSound(settings.soundEnabled);

        setStats(prev => {
          const alreadyCompletedToday = prev.dailyCompletedDates.includes(todayStr);
          const newCompletedDates = alreadyCompletedToday 
            ? prev.dailyCompletedDates 
            : [...prev.dailyCompletedDates, todayStr];

          return {
            ...prev,
            dailyCompletedDates: newCompletedDates,
            totalScore: prev.totalScore + 100, // Bonus for challenge
          };
        });

        alert('வாழ்த்துகள்! (Congratulations!) You completed today\'s Daily Challenge and earned 100 bonus points! 🏆');
        
        // Return to practice mode
        setGameModeState('practice');
        setActiveWordId(null);
      }
      return;
    }

    const eligible = getEligibleWords();
    if (eligible.length === 0) {
      if (gameMode === 'review') {
        alert('நன்று! No words to review. Switch to Practice mode to learn new words.');
        setGameModeState('practice');
      } else {
        setError('No words available for selected filters.');
      }
      return;
    }

    // Pick a random word from eligible list
    const randomIndex = Math.floor(Math.random() * eligible.length);
    const chosen = eligible[randomIndex];
    selectWord(chosen.id);
  };

  // Skip current word
  const skipWord = () => {
    if (!activeWordId) return;
    
    // Break streak
    setStats(prev => ({
      ...prev,
      currentStreak: 0,
      totalAttempts: prev.totalAttempts + 1,
    }));

    nextWord();
  };

  // Shuffle letters again
  const shuffleCurrentWord = () => {
    if (!activeWord) return;
    setShuffledLetters(shuffleLetters(activeWord.letters));
    setCurrentArrangement(Array(activeWord.letters.length).fill(''));
  };

  // Hints system
  const revealHint = () => {
    if (!activeWord) return;
    
    const nextHintState = Math.min(hintState + 1, 3);
    setHintState(nextHintState);

    // Track hint count for this word session
    setWords(prev => prev.map(w => {
      if (w.id === activeWord.id) {
        return { ...w, hintCount: w.hintCount + 1 };
      }
      return w;
    }));

    if (nextHintState === 1) {
      // Hint 1: Snap first letter to correct slot, remove from shuffled letters
      const firstLetter = activeWord.letters[0];
      const newArr = [...currentArrangement];
      newArr[0] = firstLetter;
      setCurrentArrangement(newArr);

      // Find first occurrence of this letter in shuffledLetters and replace with empty string
      const letterIndex = shuffledLetters.indexOf(firstLetter);
      if (letterIndex !== -1) {
        const newShuffled = [...shuffledLetters];
        newShuffled[letterIndex] = '';
        setShuffledLetters(newShuffled);
      }
    } else if (nextHintState === 2) {
      // Hint 2: Snap first and second letter
      const firstLetter = activeWord.letters[0];
      const secondLetter = activeWord.letters[1];
      const newArr = [...currentArrangement];
      newArr[0] = firstLetter;
      newArr[1] = secondLetter;
      setCurrentArrangement(newArr);

      // Remove from shuffled letters pool
      // Reset shuffled pool then remove first and second
      const remainingLetters = [...activeWord.letters];
      remainingLetters.splice(0, 2); // remove first two
      
      const newShuffled = shuffleLetters(remainingLetters);
      // Pad pool with blanks to match size
      while (newShuffled.length < activeWord.letters.length) {
        newShuffled.push('');
      }
      setShuffledLetters(newShuffled);
    } else if (nextHintState === 3) {
      // Hint 3: Auto-solve word
      setCurrentArrangement([...activeWord.letters]);
      setShuffledLetters(Array(activeWord.letters.length).fill(''));
    }
  };

  // Update current user tile arrangement
  const updateArrangement = (newArrangement: string[]) => {
    setCurrentArrangement(newArrangement);
  };

  // Check user arrangement answer
  const checkAnswer = (): boolean => {
    if (!activeWord) return false;

    const isCorrect = isArrangementCorrect(currentArrangement, activeWord.letters);
    
    // Track attempts
    const newWordAttempts = (stats.attemptsPerWord[activeWord.id] || 0) + 1;
    const newWordMistakes = (stats.mistakesPerWord[activeWord.id] || 0) + (isCorrect ? 0 : 1);

    if (isCorrect) {
      // Success Confetti
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 } });
      playSuccessSound(settings.soundEnabled);

      // Pronounce word
      speakWord(activeWord.word);

      const scoreEarned = Math.max(10, 30 - (hintState * 8) - (newWordMistakes * 3));
      const newCompletedIds = stats.completedIds.includes(activeWord.id) 
        ? stats.completedIds 
        : [...stats.completedIds, activeWord.id];

      const nextStreak = stats.currentStreak + 1;
      const nextBestStreak = Math.max(stats.bestStreak, nextStreak);

      // Update word state
      setWords(prev => prev.map(w => {
        if (w.id === activeWord.id) {
          return { ...w, completed: true, attempts: newWordAttempts };
        }
        return w;
      }));

      // Calculate overall accuracy
      const totalAtts = stats.totalAttempts + 1;
      const totalMists = stats.mistakes + newWordMistakes;
      const calculatedAccuracy = Math.round(((totalAtts - totalMists) / totalAtts) * 100);

      const newStats: GameStats = {
        ...stats,
        completedWords: newCompletedIds.length,
        totalScore: stats.totalScore + scoreEarned,
        currentStreak: nextStreak,
        bestStreak: nextBestStreak,
        totalAttempts: totalAtts,
        mistakes: totalMists,
        accuracy: Math.max(0, isNaN(calculatedAccuracy) ? 100 : calculatedAccuracy),
        completedIds: newCompletedIds,
        attemptsPerWord: {
          ...stats.attemptsPerWord,
          [activeWord.id]: newWordAttempts,
        },
        mistakesPerWord: {
          ...stats.mistakesPerWord,
          [activeWord.id]: newWordMistakes,
        }
      };

      setStats(newStats);
      checkAchievements(activeWord, newStats);

      // Mark the active word completed in global lists
      setTimeout(() => {
        nextWord();
      }, 1800);

    } else {
      // Failure
      playErrorSound(settings.soundEnabled);
      
      setStats(prev => {
        const totalAtts = prev.totalAttempts + 1;
        const totalMists = prev.mistakes + 1;
        const calculatedAccuracy = Math.round(((totalAtts - totalMists) / totalAtts) * 100);

        return {
          ...prev,
          totalAttempts: totalAtts,
          mistakes: totalMists,
          currentStreak: 0, // reset streak
          accuracy: Math.max(0, isNaN(calculatedAccuracy) ? 100 : calculatedAccuracy),
          mistakesPerWord: {
            ...prev.mistakesPerWord,
            [activeWord.id]: newWordMistakes,
          },
          attemptsPerWord: {
            ...prev.attemptsPerWord,
            [activeWord.id]: newWordAttempts,
          }
        };
      });
    }

    return isCorrect;
  };

  // Upload words from files (PDF/DOCX)
  const uploadWords = (newRawWords: string[]) => {
    if (newRawWords.length === 0) return;

    setWords(prev => {
      // Find existing words to avoid duplicates
      const existingCleanWords = prev.map(w => w.word);
      const filteredNewWords = newRawWords.filter(word => !existingCleanWords.includes(word));

      const newProcessedWords: Word[] = filteredNewWords.map((word, idx) => {
        const letters = segmentTamilWord(word);
        
        // Classify difficulty
        let difficulty: Difficulty = 'easy';
        if (letters.length >= 5 && letters.length <= 7) difficulty = 'medium';
        else if (letters.length >= 8) difficulty = 'hard';

        return {
          id: `upload-${Date.now()}-${idx}-${word}`,
          word,
          letters,
          length: letters.length,
          difficulty,
          completed: false,
          attempts: 0,
          hintCount: 0,
          custom: true
        };
      });

      const updatedWords = [...prev, ...newProcessedWords];
      
      // Update statistics totalWords count
      setStats(s => ({
        ...s,
        totalWords: updatedWords.length
      }));

      return updatedWords;
    });
  };

  // Delete a specific word
  const deleteWord = (wordId: string) => {
    setWords(prev => {
      const filtered = prev.filter(w => w.id !== wordId);
      setStats(s => ({
        ...s,
        totalWords: filtered.length
      }));
      return filtered;
    });
  };

  // Set game difficulty
  const setDifficulty = (diff: Difficulty | 'all') => {
    setSelectedDifficulty(diff);
    setActiveWordId(null);
  };

  // Set game mode
  const setGameMode = (mode: 'practice' | 'challenge' | 'review') => {
    setGameModeState(mode);
    setActiveWordId(null);
    if (mode === 'challenge') {
      startDailyChallenge();
    }
  };

  // Start the Daily Challenge
  const startDailyChallenge = () => {
    setError(null);
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (stats.dailyCompletedDates.includes(todayStr)) {
      alert('இன்றைய சவால் முடிந்துவிட்டது! (You have already completed today\'s Daily Challenge! Come back tomorrow.)');
      setGameModeState('practice');
      return;
    }

    // Select 5 words: 2 easy, 2 medium, 1 hard
    const easyPool = words.filter(w => w.difficulty === 'easy');
    const medPool = words.filter(w => w.difficulty === 'medium');
    const hardPool = words.filter(w => w.difficulty === 'hard');

    if (easyPool.length < 2 || medPool.length < 2 || hardPool.length < 1) {
      alert('சவாலைத் தொடங்க போதிய சொற்கள் இல்லை. Please upload more files or reset default words.');
      setGameModeState('practice');
      return;
    }

    // Deterministic selection based on Date hash to make it uniform for all users on a day,
    // but random enough for daily gameplay.
    const charCodeSum = todayStr.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    
    const getDeterministicItems = (pool: Word[], count: number) => {
      const poolCopy = [...pool];
      const selected: Word[] = [];
      for (let i = 0; i < count; i++) {
        const index = (charCodeSum + i * 17) % poolCopy.length;
        selected.push(poolCopy[index]);
        poolCopy.splice(index, 1);
      }
      return selected;
    };

    const challengeWords = [
      ...getDeterministicItems(easyPool, 2),
      ...getDeterministicItems(medPool, 2),
      ...getDeterministicItems(hardPool, 1),
    ];

    const ids = challengeWords.map(w => w.id);
    setDailyWordIds(ids);
    setDailyCurrentIndex(0);
    
    // Select the first word
    selectWord(ids[0]);
  };

  // Ref for active cloud TTS audio element and Object URL
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const geminiApiKeyExists = hasGeminiApiKey();

  // Helper to trigger browser speech synthesis fallback
  const triggerBrowserVoice = async (wordText: string): Promise<boolean> => {
    setIsSpeaking(true);
    setSpeakingText(wordText);
    const result = await speakTamilWord(
      wordText,
      settings.ttsVoice,
      settings.ttsSpeed,
      settings.pitch,
      settings.volume,
      true,
      () => {
        setIsSpeaking(true);
        setSpeakingText(wordText);
      },
      () => {
        setIsSpeaking(false);
        setSpeakingText(null);
      }
    );
    return result;
  };

  // Speak a custom word or stop if active
  const speakWord = async (wordText: string): Promise<boolean> => {
    if (!wordText) return false;
    
    // Toggle stop if already playing the exact same word
    if (isSpeaking && speakingText === wordText) {
      stopSpeakingText();
      return true;
    }

    // Stop currently running playback
    stopSpeakingText();

    setIsSpeaking(true);
    setSpeakingText(wordText);

    try {
      // 1. Query Cache
      let audioBlob = await getCachedAudio(wordText);

        // Check if canceled during async DB query
        if (speakingTextRef.current !== wordText) {
          return false;
        }

        if (!audioBlob) {
          setIsGenerating(true);
          // 2. Fetch from API
          // For now, assume all words here are Tamil since it's a Tamil game
          audioBlob = await speakTamilViaHf(wordText);
          // 3. Cache Audio Blob
          await cacheAudio(wordText, audioBlob);
        }
        setIsGenerating(false);

        // Check if canceled during API fetch
        if (speakingTextRef.current !== wordText) {
          return false;
        }

        // Create Object URL and play audio
        const audioUrl = URL.createObjectURL(audioBlob);
        activeAudioUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        // Apply Speed and Volume config
        audio.playbackRate = settings.ttsSpeed;
        audio.volume = settings.volume;

        audio.onended = () => {
          setIsSpeaking(false);
          setSpeakingText(null);
          activeAudioRef.current = null;
          if (activeAudioUrlRef.current) {
            URL.revokeObjectURL(activeAudioUrlRef.current);
            activeAudioUrlRef.current = null;
          }
        };

        audio.onerror = (e) => {
          console.error('Audio element playback error, falling back:', e);
          if (activeAudioUrlRef.current) {
            URL.revokeObjectURL(activeAudioUrlRef.current);
            activeAudioUrlRef.current = null;
          }
          triggerBrowserVoice(wordText);
        };

        audio.play();
        return true;
      } catch (err) {
        setIsGenerating(false);
        console.error('Cloud pronunciation failed, falling back to browser synthesis:', err);
        return triggerBrowserVoice(wordText);
      }
  };

  // Pronounce active word text to speech
  const pronounceActiveWord = () => {
    if (!activeWord) return;
    speakWord(activeWord.word);
  };

  const stopSpeakingText = () => {
    stopSpeaking(); // cancels browser SpeechSynthesis
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }
    setIsSpeaking(false);
    setIsGenerating(false);
    setSpeakingText(null);
  };

  // Clear IndexedDB Cache database
  const clearCache = async () => {
    await clearAudioCache();
    alert('ஒலி சேமிப்பு நீக்கப்பட்டது! (Speech audio cache cleared successfully!)');
  };

  // Update Settings
  const updateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Reset all game data to defaults
  const resetProgress = () => {
    if (confirm('Are you sure you want to reset all score, achievements, custom words, and stats? This cannot be undone.')) {
      localStorage.removeItem('tamil-game-words');
      localStorage.removeItem('tamil-game-stats');
      localStorage.removeItem('tamil-game-settings');
      localStorage.removeItem('tamil-game-achievements');
      
      setWords(DEFAULT_WORDS);
      setStats(DEFAULT_STATS);
      setSettings(DEFAULT_SETTINGS);
      setAchievements(INITIAL_ACHIEVEMENTS);
      setActiveWordId(null);
      setGameModeState('practice');
      setSelectedDifficulty('all');
      
      alert('விளையாட்டுத் தரவுகள் மீட்டமைக்கப்பட்டன! (Progress reset successfully!)');
    }
  };

  // Export current game progress to a Base64 JSON string
  const exportProgress = (): string => {
    const data = {
      words,
      stats,
      achievements,
      settings,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };
    return btoa(JSON.stringify(data));
  };

  // Import game progress from a Base64 JSON string
  const importProgress = (dataStr: string): boolean => {
    try {
      const decoded = atob(dataStr);
      const parsed = JSON.parse(decoded);
      
      if (!parsed.words || !parsed.stats || !parsed.achievements) {
        throw new Error('Invalid backup file');
      }

      setWords(parsed.words);
      setStats(parsed.stats);
      setAchievements(parsed.achievements);
      if (parsed.settings) setSettings(parsed.settings);
      
      setActiveWordId(null);
      
      alert('தரவுகள் வெற்றிகரமாக இறக்கப்பட்டன! (Backup imported successfully!)');
      return true;
    } catch (e) {
      console.error(e);
      alert('தரவிறக்கம் தோல்வியடைந்தது. Please make sure the code is correct.');
      return false;
    }
  };

  return (
    <GameContext.Provider value={{
      words,
      activeWordId,
      shuffledLetters,
      currentArrangement,
      gameMode,
      selectedDifficulty,
      score: stats.totalScore,
      streak: stats.currentStreak,
      stats,
      settings,
      achievements,
      isLoading,
      error,
      hintState,
      selectWord,
      nextWord,
      skipWord,
      resetProgress,
      updateArrangement,
      checkAnswer,
      revealHint,
      shuffleCurrentWord,
      setDifficulty,
      setGameMode,
      updateSettings,
      uploadWords,
      deleteWord,
      pronounceActiveWord,
      startDailyChallenge,
      activeWord,
      dailyChallengeProgress,
      recentUnlockedAchievement,
      clearAchievementToast,
      importProgress,
      exportProgress,
      isSpeaking,
      isGenerating,
      speakingText,
      stopSpeaking: stopSpeakingText,
      speakWord,
      hasTamilVoice,
      isTtsSupported,
      geminiApiKeyExists,
      clearCache
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
};
