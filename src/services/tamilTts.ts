const HF_API_URL = "https://santhosh25kr-tamil-tts-api.hf.space";

/** Timeout for first (cold) request — HF free tier may have a cold start up to 30s */
const COLD_START_TIMEOUT_MS = 30_000;
/** Timeout for subsequent (warm) requests */
const WARM_REQUEST_TIMEOUT_MS = 15_000;
/** Number of automatic retries before giving up */
const MAX_RETRIES = 1;

/**
 * Performs a single TTS fetch with an AbortController timeout.
 */
async function fetchTts(text: string, timeoutMs: number): Promise<Blob> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${HF_API_URL}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), format: "mp3" }),
      signal: controller.signal,
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

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error("Tamil TTS API returned an empty audio file.");
    }

    return blob;
  } finally {
    clearTimeout(timerId);
  }
}

/**
 * Service to handle text-to-speech calls using the deployed Hugging Face Tamil TTS API.
 * Features:
 * - AbortController timeout (30s cold start, 15s warm)
 * - 1 automatic retry on transient failures
 * - Classifies errors (timeout vs. server error vs. empty response)
 */
export async function speakTamilViaHf(text: string): Promise<Blob> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Use a longer timeout on the first attempt (cold start), shorter on retry
      const timeoutMs = attempt === 0 ? COLD_START_TIMEOUT_MS : WARM_REQUEST_TIMEOUT_MS;
      const blob = await fetchTts(text, timeoutMs);
      return blob;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const isAbort = lastError.name === 'AbortError';
      const errorMsg = isAbort
        ? `Tamil TTS request timed out (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
        : `Tamil TTS failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}`;

      console.warn(errorMsg);

      // Don't retry on non-transient server errors (4xx)
      const isClientError = lastError.message.includes('4') && lastError.message.includes('Tamil TTS API failed');
      if (isClientError) break;
    }
  }

  throw lastError ?? new Error("Tamil TTS: Unknown error after retries");
}

/**
 * Quick connectivity check — returns true if the HF Space is reachable.
 */
export async function checkTamilTtsHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(`${HF_API_URL}/healthz`, { signal: controller.signal });
    clearTimeout(timerId);
    return res.ok;
  } catch {
    return false;
  }
}
