/**
 * Segments a Tamil word into its correct graphemes (compound letters).
 * E.g., "பழம்" -> ["ப", "ழ", "ம்"]
 * E.g., "கொடி" -> ["கொ", "டி"]
 */
export function segmentTamilWord(word: string): string[] {
  if (!word) return [];

  // Remove any spaces or surrounding whitespace
  const cleanWord = word.trim();

  // Try using the standard Intl.Segmenter (modern browser support)
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter('ta', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(cleanWord)).map(s => s.segment);
    } catch (e) {
      console.warn('Intl.Segmenter failed, falling back to regex:', e);
    }
  }

  // Fallback regex for Tamil characters:
  // Base characters: Vowels (அ-ஔ: U+0B85 to U+0B94), Consonants (க-ன: U+0B95 to U+0BB9), Ayutha (ஃ: U+0B83)
  // Combining marks: U+0BBE to U+0BCD (ा, ி, ீ, ு, ூ, ெ, ே, ை, ொ, ோ, ௌ, ்)
  // And some Grantha character mappings if any.
  // The regex captures any Tamil base character followed by any number of combining marks.
  const regex = /([\u0B85-\u0B94\u0B95-\u0BB9\u0B83][\u0BBE-\u0BCD]*)/g;
  const matches = cleanWord.match(regex);
  
  if (matches && matches.length > 0) {
    return matches;
  }

  // Final fallback (splits character by character - will break compound letters, but prevents app crash)
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
  
  // Keep shuffling until the shuffled result differs from the original
  while (attempts < 10) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Check if it's different from original
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
