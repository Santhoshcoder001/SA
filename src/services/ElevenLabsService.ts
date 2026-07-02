/**
 * Service to handle text-to-speech calls using Gemini API.
 */
type GeminiTtsResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const DEFAULT_GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

function getGeminiApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
  if (!key) {
    throw new Error('Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your .env file.');
  }
  return key;
}

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function speakViaGeminiTts(text: string, voiceName: string): Promise<Blob> {
  const apiKey = getGeminiApiKey();
  const model = import.meta.env.VITE_GEMINI_TTS_MODEL || DEFAULT_GEMINI_TTS_MODEL;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName || 'Kore'
              }
            }
          }
        }
      })
    }
  );

  let payload: GeminiTtsResponse | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorMessage = payload?.error?.message || response.statusText || 'Gemini TTS request failed';
    throw new Error(`Gemini TTS failed: ${response.status} - ${errorMessage}`);
  }

  const part = payload?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  const base64Audio = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType || 'audio/wav';

  if (!base64Audio) {
    throw new Error('Gemini TTS returned no audio payload.');
  }

  return new Blob([decodeBase64ToArrayBuffer(base64Audio)], { type: mimeType });
}

/**
 * Checks if a Gemini API Key is available in the Vite environment.
 */
export function hasGeminiApiKey(): boolean {
  return (
    (typeof import.meta.env.VITE_GEMINI_API_KEY === 'string' && import.meta.env.VITE_GEMINI_API_KEY.length > 0) ||
    (typeof import.meta.env.VITE_GOOGLE_API_KEY === 'string' && import.meta.env.VITE_GOOGLE_API_KEY.length > 0)
  );
}

// Backward-compatible aliases to avoid breaking older imports.
export const speakTamilViaElevenLabs = speakViaGeminiTts;
export const hasElevenLabsApiKey = hasGeminiApiKey;
