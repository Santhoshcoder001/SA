import type { Word } from '../types/game';
import { segmentTamilWord } from './tamilSegmenter';

const PRELOADED_RAW_WORDS = [
  // Easy (2-4 letters)
  { word: 'அம்மா', difficulty: 'easy' },
  { word: 'அப்பா', difficulty: 'easy' },
  { word: 'பழம்', difficulty: 'easy' },
  { word: 'மரம்', difficulty: 'easy' },
  { word: 'கடல்', difficulty: 'easy' },
  { word: 'நிலா', difficulty: 'easy' },
  { word: 'பூனை', difficulty: 'easy' },
  { word: 'நாய்', difficulty: 'easy' },
  { word: 'கல்', difficulty: 'easy' },
  { word: 'வண்டு', difficulty: 'easy' },
  { word: 'தம்பி', difficulty: 'easy' },
  { word: 'தங்கை', difficulty: 'easy' },
  { word: 'இலை', difficulty: 'easy' },
  { word: 'ஊஞ்சல்', difficulty: 'easy' },
  { word: 'பந்து', difficulty: 'easy' },
  { word: 'பட்டம்', difficulty: 'easy' },
  { word: 'ஆடு', difficulty: 'easy' },
  { word: 'மாடு', difficulty: 'easy' },
  { word: 'சிங்கம்', difficulty: 'easy' },
  { word: 'யானை', difficulty: 'easy' },

  // Medium (5-7 letters)
  { word: 'விளையாட்டு', difficulty: 'medium' },
  { word: 'தமிழகம்', difficulty: 'medium' },
  { word: 'வாழைப்பழம்', difficulty: 'medium' },
  { word: 'தமிழ்மொழி', difficulty: 'medium' },
  { word: 'முக்கோணம்', difficulty: 'medium' },
  { word: 'புத்தகம்', difficulty: 'medium' },
  { word: 'பட்டாம்பூச்சி', difficulty: 'medium' },
  { word: 'திருவள்ளுவர்', difficulty: 'medium' },
  { word: 'வானவில்', difficulty: 'medium' },
  { word: 'கண்ணாடி', difficulty: 'medium' },
  { word: 'தொலைபேசி', difficulty: 'medium' },
  { word: 'மின்மினி', difficulty: 'medium' },
  { word: 'நண்பர்கள்', difficulty: 'medium' },
  { word: 'பள்ளிக்கூடம்', difficulty: 'medium' },
  { word: 'சூரியகாந்தி', difficulty: 'medium' },

  // Hard (8+ letters)
  { word: 'பல்கலைக்கழகம்', difficulty: 'hard' },
  { word: 'தொலைக்காட்சி', difficulty: 'hard' },
  { word: 'சுற்றுச்சூழல்', difficulty: 'hard' },
  { word: 'விண்வெளிஆராய்ச்சி', difficulty: 'hard' },
  { word: 'பெருங்காயத்தூள்', difficulty: 'hard' },
  { word: 'குடியரசுத்தினம்', difficulty: 'hard' },
  { word: 'சுதந்திரதினம்', difficulty: 'hard' },
  { word: 'இணையதளம்', difficulty: 'hard' },
  { word: 'அலைபேசிசேவை', difficulty: 'hard' },
  { word: 'உயிரியல்பூங்கா', difficulty: 'hard' }
] as const;

export const DEFAULT_WORDS: Word[] = PRELOADED_RAW_WORDS.map((item, index) => {
  const letters = segmentTamilWord(item.word);
  return {
    id: `preload-${index}-${item.word}`,
    word: item.word,
    letters,
    length: letters.length,
    difficulty: item.difficulty,
    completed: false,
    attempts: 0,
    hintCount: 0
  };
});
