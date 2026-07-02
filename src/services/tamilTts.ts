const HF_API_URL = "https://santhosh25kr-tamil-tts-api.hf.space";

/**
 * Service to handle text-to-speech calls using the deployed Hugging Face Tamil TTS API.
 */
export async function speakTamilViaHf(text: string): Promise<Blob> {
  const response = await fetch(`${HF_API_URL}/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.trim(),
      format: "mp3", // Use MP3 for smaller download size and faster playback
    }),
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {
      // Ignore JSON parse errors if response is plain text
    }
    throw new Error(`Tamil TTS API failed: ${response.status} - ${errorDetail}`);
  }

  // The API returns the raw binary audio data
  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("Tamil TTS API returned an empty audio file.");
  }

  return blob;
}
