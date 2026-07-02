export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Language {
  id: string;
  name: string;
  flag: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  description: string;
  path: string;
  order: number;
}

export interface LearningItem {
  id: string;
  language: string;     // Foreign key to Language ID (e.g. 'tamil')
  subject: string;      // Foreign key to Subject ID (e.g. 'alphabet', 'words')
  category: string;     // e.g. 'Animals', 'Fruits'
  word: string;         // The word in target language (e.g. 'அம்மா')
  meaning?: string;     // Optional translation or explanation in English
  pronunciation?: string; // Optional pronunciation guide
  image?: string;       // Image URL or base64 data URL
  audio?: string;       // Audio URL or base64 data URL
  difficulty: Difficulty;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  language: string;
  questionText: string;
  audio?: string;
  image?: string;
  options: string[];
  correctAnswer: string;
  difficulty: Difficulty;
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: string;    // e.g. 'coins:100', 'completed:25', 'streak:5', 'quiz:5'
  unlocked: boolean;
  unlockedAt?: string;
}

export interface QuizHistory {
  id: string;
  language: string;
  subject: string;
  date: string;
  score: number;
  totalQuestions: number;
  starsEarned: number;
  coinsEarned: number;
}

export interface UserProgress {
  level: number;
  xp: number;
  stars: number;
  coins: number;
  dailyStreak: number;
  lastActiveDate?: string;
  unlockedLevels: string[]; // e.g. ['alphabet-level-2']
  quizHistory: QuizHistory[];
  completedItemIds: string[];
  attemptsPerItem: Record<string, number>;
  mistakesPerItem: Record<string, number>;
}

export interface Settings {
  soundEnabled: boolean;
  ttsEnabled: boolean;
  ttsVoice: string; // SpeechSynthesisVoice name or 'default'
  ttsSpeed: number; // Speech rate (0.5 to 2.0)
  pitch: number; // Speech pitch (0.5 to 2.0)
  volume: number; // Speech volume (0.0 to 1.0)
  ttsProvider: 'browser' | 'gemini' | 'elevenlabs';
  geminiVoiceName: string;
  darkMode: boolean;
  theme: 'light' | 'dark' | 'system';
}
