const LANG_LOCALE_MAP: Record<string, string> = {
  english: 'en',
  tamil: 'ta',
  hindi: 'hi',
  telugu: 'te',
  kannada: 'kn',
  malayalam: 'ml'
};

/**
 * Segments a word into its correct graphemes based on the language.
 * E.g. (Tamil) "பழம்" -> ["ப", "ழ", "ம்"]
 * E.g. (Hindi) "फल" -> ["फ", "ल"]
 * E.g. (English) "CAT" -> ["C", "A", "T"]
 */
export function segmentWord(word: string, languageId: string): string[] {
  if (!word) return [];

  const cleanWord = word.trim();
  const locale = LANG_LOCALE_MAP[languageId] || 'en';

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(cleanWord)).map(s => s.segment);
    } catch (e) {
      console.warn(`Intl.Segmenter failed for locale ${locale}, falling back:`, e);
    }
  }

  // Fallback regex for Indic characters (consonant + optional diacritic combining marks)
  // This matches a base character followed by diacritics
  if (languageId === 'tamil') {
    const regex = /([\u0B85-\u0B94\u0B95-\u0BB9\u0B83][\u0BBE-\u0BCD]*)/g;
    const matches = cleanWord.match(regex);
    if (matches && matches.length > 0) return matches;
  } else if (languageId === 'hindi') {
    const regex = /([\u0905-\u0939\u0958-\u095F][\u093E-\u094D]*)/g;
    const matches = cleanWord.match(regex);
    if (matches && matches.length > 0) return matches;
  } else if (languageId === 'telugu') {
    const regex = /([\u0C05-\u0C39][\u0C3E-\u0C4D]*)/g;
    const matches = cleanWord.match(regex);
    if (matches && matches.length > 0) return matches;
  } else if (languageId === 'kannada') {
    const regex = /([\u0C85-\u0CB9][\u0CBE-\u0CCD]*)/g;
    const matches = cleanWord.match(regex);
    if (matches && matches.length > 0) return matches;
  } else if (languageId === 'malayalam') {
    const regex = /([\u0D05-\u0D39][\u0D3E-\u0D4D]*)/g;
    const matches = cleanWord.match(regex);
    if (matches && matches.length > 0) return matches;
  }

  // Standard character split for English or as a final fallback
  return cleanWord.split('');
}

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * Guarantees a new arrangement (doesn't match the original if length > 1)
 */
export function shuffleLetters(letters: string[]): string[] {
  if (letters.length <= 1) return [...letters];
  
  let shuffled = [...letters];
  let attempts = 0;
  
  while (attempts < 10) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Check if different from original
    let isDifferent = false;
    for (let i = 0; i < letters.length; i++) {
      if (shuffled[i] !== letters[i]) {
        isDifferent = true;
        break;
      }
    }
    
    if (isDifferent) {
      return shuffled;
    }
    
    attempts++;
  }
  
  return shuffled;
}

/**
 * Checks if two string arrays are equal
 */
export function isArrangementCorrect(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((val, index) => val === arr2[index]);
}
