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

/** Controls how `parsePdfFile` extracts text */
export type PdfExtractionMode = 'filtered' | 'raw';

export interface ParseResult {
  words: string[];
  duplicatesRemoved: number;
  invalidRows: number;
  totalRaw: number;
  /** Preview of the first 20 raw lines (before filtering) */
  rawPreview: string[];
}

/**
 * Extracts words line-by-line from raw text using language-specific Unicode filtering.
 * Supports "one word per line" format.
 */
export function extractWordsFromText(text: string, languageId: string): ParseResult {
  if (!text) return { words: [], duplicatesRemoved: 0, invalidRows: 0, totalRaw: 0, rawPreview: [] };

  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const words: string[] = [];
  const rawPreview: string[] = [];
  let duplicatesRemoved = 0;
  let invalidRows = 0;
  let totalRaw = 0;

  const regex = LANG_REGEX_MAP[languageId] || /[a-zA-Z]+/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Collect raw preview (first 20 non-empty lines)
    if (rawPreview.length < 20) rawPreview.push(line);

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

  return { words, duplicatesRemoved, invalidRows, totalRaw, rawPreview };
}

/**
 * Extracts all non-empty text lines from raw text without any language filtering.
 * Used in "raw" PDF extraction mode for generic/multi-language PDFs.
 */
export function extractRawTextLines(text: string): ParseResult {
  if (!text) return { words: [], duplicatesRemoved: 0, invalidRows: 0, totalRaw: 0, rawPreview: [] };

  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const words: string[] = [];
  const rawPreview: string[] = [];
  let duplicatesRemoved = 0;
  let invalidRows = 0;
  let totalRaw = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Collect raw preview (first 20 non-empty lines)
    if (rawPreview.length < 20) rawPreview.push(line);

    // In raw mode: any non-blank line is a word/entry; skip lines shorter than 2 chars
    if (line.length < 2) {
      invalidRows++;
      continue;
    }

    totalRaw++;
    // Deduplicate case-insensitively but preserve original casing
    const key = line.toLowerCase();
    if (seen.has(key)) {
      duplicatesRemoved++;
    } else {
      seen.add(key);
      words.push(line);
    }
  }

  return { words, duplicatesRemoved, invalidRows, totalRaw, rawPreview };
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
 * Parses a PDF file using pdfjs-dist.
 *
 * @param file       - The PDF File object
 * @param languageId - Target language (used in 'filtered' mode only)
 * @param mode       - 'filtered': apply Unicode script filtering per language (default)
 *                     'raw':      extract all readable lines as-is (generic PDFs)
 */
export async function parsePdfFile(
  file: File,
  languageId: string,
  mode: PdfExtractionMode = 'filtered'
): Promise<ParseResult> {
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

        // Guard: ensure at least one page
        if (pdf.numPages === 0) {
          reject(new Error('The PDF has no readable pages. It may be image-only or encrypted.'));
          return;
        }

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();

          // Reconstruct lines using y-coordinate grouping.
          // Items sharing the same rounded y-value are on the same visual line.
          const itemsByLine = new Map<number, string[]>();
          for (const item of textContent.items as Array<{ str: string; transform: number[] }>) {
            if (!item.str) continue;
            const y = Math.round(item.transform[5]);
            if (!itemsByLine.has(y)) itemsByLine.set(y, []);
            itemsByLine.get(y)!.push(item.str);
          }

          // Sort top-to-bottom (higher y = higher on page in PDF coordinate space)
          const sortedYs = Array.from(itemsByLine.keys()).sort((a, b) => b - a);
          for (const y of sortedYs) {
            const lineText = itemsByLine.get(y)!.join(' ').trim();
            if (lineText) fullText += lineText + '\n';
          }
          fullText += '\n'; // Page separator
        }

        // Detect image-only / encrypted PDFs that return no text
        if (!fullText.trim()) {
          reject(new Error(
            'No readable text found in this PDF. It appears to be a scanned image or encrypted PDF. ' +
            'Please use a text-based PDF, or convert it to a Word (.docx) file first.'
          ));
          return;
        }

        // Apply extraction strategy
        if (mode === 'raw') {
          resolve(extractRawTextLines(fullText));
        } else {
          resolve(extractWordsFromText(fullText, languageId));
        }
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
 * Supports three formats:
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
