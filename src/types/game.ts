export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Word {
  id: string;
  word: string;
  letters: string[];
  length: number;
  difficulty: Difficulty;
  completed: boolean;
  attempts: number;
  hintCount: number;
  custom?: boolean; // True if uploaded by the user
}

export interface GameStats {
  totalWords: number;
  completedWords: number;
  accuracy: number;
  mistakes: number;
  totalAttempts: number;
  bestStreak: number;
  currentStreak: number;
  totalScore: number;
  completedIds: string[];
  attemptsPerWord: Record<string, number>;
  mistakesPerWord: Record<string, number>;
  dailyCompletedDates: string[]; // YYYY-MM-DD format
}

export interface GameSettings {
  soundEnabled: boolean;
  ttsEnabled: boolean;
  ttsVoice: string; // SpeechSynthesisVoice name or 'default'
  ttsSpeed: number; // Speech rate (0.5 to 2.0)
  pitch: number; // Speech pitch (0.5 to 2.0)
  volume: number; // Speech volume (0.0 to 1.0)
  ttsProvider: 'browser' | 'elevenlabs'; // Speech service provider
  elevenLabsVoiceId: string; // ElevenLabs voice identifier
  darkMode: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  icon: string;
  condition: string; // e.g. 'streak:5', 'completed:10', 'difficulty:hard'
}

export interface GameState {
  words: Word[];
  activeWordId: string | null;
  shuffledLetters: string[]; // Current drag & drop tiles array
  currentArrangement: string[]; // Current order arranged by the user
  gameMode: 'practice' | 'challenge' | 'review'; // challenge is Daily Challenge, review is incorrect words
  selectedDifficulty: Difficulty | 'all';
  score: number;
  streak: number;
  stats: GameStats;
  settings: GameSettings;
  achievements: Achievement[];
  isLoading: boolean;
  error: string | null;
  hintState: number; // 0 = no hints, 1 = first letter, 2 = first & random, 3 = show word
}
