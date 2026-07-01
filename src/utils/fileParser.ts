// @ts-ignore
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { segmentWord } from './wordSegmenter';

// Configure PDFJS worker path using matching CDN version
const PDFJS_VERSION = '3.4.120';
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || PDFJS_VERSION}/pdf.worker.min.js`;

// Regex mappings for the languages
const LANG_REGEX_MAP: Record<string, RegExp> = {
  english: /[a-zA-Z]+/g,
  tamil: /[\u0B80-\u0BFF]+/g,
  hindi: /[\u0900-\u097F]+/g,
  telugu: /[\u0C00-\u0C7F]+/g,
  kannada: /[\u0C80-\u0CFF]+/g,
  malayalam: /[\u0D00-\u0D7F]+/g
};

/**
 * Extracts words from raw text depending on the language's unicode range.
 */
export function extractWords(text: string, languageId: string): string[] {
  if (!text) return [];

  const regex = LANG_REGEX_MAP[languageId] || /[a-zA-Z]+/g;
  const matches = text.match(regex) || [];

  const uniqueWords = new Set<string>();

  for (const match of matches) {
    const cleanWord = match.trim();
    const letters = segmentWord(cleanWord, languageId);
    // Standard validation: ignore single-letter debris or excessively long strings
    if (letters.length >= 2 && letters.length <= 15) {
      uniqueWords.add(cleanWord.toUpperCase()); // Store uppercase for uniformity in spelling games
    }
  }

  return Array.from(uniqueWords);
}

/**
 * Parses a DOCX file using mammoth.js and extracts words.
 */
export async function parseDocxFile(file: File, languageId: string): Promise<string[]> {
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
        const words = extractWords(text, languageId);
        resolve(words);
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
 * Parses a PDF file using pdfjs-dist and extracts words.
 */
export async function parsePdfFile(file: File, languageId: string): Promise<string[]> {
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
            .join(' ');
          fullText += pageText + '\n';
        }
        
        const words = extractWords(fullText, languageId);
        resolve(words);
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
