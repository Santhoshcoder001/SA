/**
 * Service to handle text-to-speech calls using ElevenLabs API.
 */
export async function speakTamilViaElevenLabs(word: string, voiceId: string): Promise<Blob> {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API Key is missing. Please check your .env file.');
  }

  // Use the standard multilingual model which supports Tamil
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: word,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    }
  );

  if (!response.ok) {
    let errorMessage = 'TTS Request failed';
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.detail?.message || errorMessage;
    } catch {
      try {
        errorMessage = await response.text() || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
    }
    throw new Error(`ElevenLabs TTS failed: ${response.status} - ${errorMessage}`);
  }

  return await response.blob();
}

/**
 * Checks if the ElevenLabs API Key is available in the Vite environment.
 */
export function hasElevenLabsApiKey(): boolean {
  return typeof import.meta.env.VITE_ELEVENLABS_API_KEY === 'string' && 
         import.meta.env.VITE_ELEVENLABS_API_KEY.length > 0;
}
