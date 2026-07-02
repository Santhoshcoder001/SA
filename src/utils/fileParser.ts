// @ts-ignore
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { segmentWord } from './wordSegmenter';

// Configure PDFJS worker path using the installed package version
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.4.120'}/pdf.worker.min.js`;

// Unicode ranges for supported languages only
const LANG_REGEX_MAP: Record<string, RegExp> = {
  english: /[a-zA-Z]+/g,
  tamil: /[\u0B80-\u0BFF]+/g,
};

export interface ParseResult {
  words: string[];
  duplicatesRemoved: number;
  invalidRows: number;
  totalRaw: number;
}

/**
 * Extracts words line-by-line from raw text.
 * Supports both "one word per line" format and inline token extraction.
 */
export function extractWordsFromText(text: string, languageId: string): ParseResult {
  if (!text) return { words: [], duplicatesRemoved: 0, invalidRows: 0, totalRaw: 0 };

  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const words: string[] = [];
  let duplicatesRemoved = 0;
  let invalidRows = 0;
  let totalRaw = 0;

  const regex = LANG_REGEX_MAP[languageId] || /[a-zA-Z]+/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Try to extract a single clean word from this line
    const matches = line.match(regex);
    if (!matches || matches.length === 0) {
      invalidRows++;
      continue;
    }

    // For "one word per line" format, use the first token only
    const token = matches[0].trim();
    const letters = segmentWord(token, languageId);

    // Validate: must be at least 2 graphemes to avoid noise
    if (letters.length < 2) {
      invalidRows++;
      continue;
    }

    totalRaw++;
    const normalised = languageId === 'english' ? token.toUpperCase() : token;

    if (seen.has(normalised)) {
      duplicatesRemoved++;
    } else {
      seen.add(normalised);
      words.push(normalised);
    }
  }

  return { words, duplicatesRemoved, invalidRows, totalRaw };
}

/**
 * Legacy helper for compatibility: extracts unique words from raw text using regex.
 */
export function extractWords(text: string, languageId: string): string[] {
  return extractWordsFromText(text, languageId).words;
}

/**
 * Parses a DOCX file using mammoth.js and extracts words line-by-line.
 */
export async function parseDocxFile(file: File, languageId: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error('Failed to read file as ArrayBuffer'));
          return;
        }

        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        resolve(extractWordsFromText(text, languageId));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('FileReader error occurred'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses a PDF file using pdfjs-dist and extracts words line-by-line.
 */
export async function parsePdfFile(file: File, languageId: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error('Failed to read file as ArrayBuffer'));
          return;
        }

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join('\n'); // Join with newlines to preserve line structure
          fullText += pageText + '\n';
        }

        resolve(extractWordsFromText(fullText, languageId));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('FileReader error occurred'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses a JSON file containing words.
 * Supports two formats:
 * 1. Plain array: ["word1", "word2", ...]
 * 2. Object array: [{ "word": "word1", ... }, ...]
 * 3. Object with language keys: { "english": ["word1", ...], "tamil": [...] }
 */
export async function parseJsonFile(file: File, languageId: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          reject(new Error('Failed to read file'));
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          reject(new Error('Invalid JSON format'));
          return;
        }

        let rawLines: string[] = [];

        if (Array.isArray(parsed)) {
          rawLines = parsed.map((item) => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null) {
              const obj = item as Record<string, unknown>;
              return String(obj.word || obj.Word || obj.text || obj.Text || '');
            }
            return '';
          });
        } else if (typeof parsed === 'object' && parsed !== null) {
          const obj = parsed as Record<string, unknown>;
          // Try language-keyed format
          const langWords = obj[languageId] || obj['words'];
          if (Array.isArray(langWords)) {
            rawLines = langWords.map((w) => (typeof w === 'string' ? w : ''));
          }
        }

        resolve(extractWordsFromText(rawLines.join('\n'), languageId));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('FileReader error occurred'));
    };

    reader.readAsText(file, 'utf-8');
  });
}
