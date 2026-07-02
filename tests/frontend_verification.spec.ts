import { test, expect } from '@playwright/test';

const TARGET_URL = 'http://localhost:5173';
const TTS_API_URL = 'https://santhosh25kr-tamil-tts-api.hf.space/tts';

test.describe('Tamil TTS Frontend Integration', () => {
  test('verifies single POST request, payload, loading state, caching, and offline fallback', async ({ page, context }) => {
    // 1. Setup Request Interception
    let ttsRequestCount = 0;
    let interceptedRequest = null;
    let interceptedResponse = null;
    let ttsRoute = null;

    await page.route(TTS_API_URL, async (route) => {
      ttsRequestCount++;
      ttsRoute = route;
      interceptedRequest = route.request();
      
      // We will delay the response slightly to verify loading states reliably
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await route.fetch();
      interceptedResponse = response;
      await route.fulfill({ response });
    });

    // Navigate to application
    await page.goto(TARGET_URL);

    // Select Tamil Language
    await page.locator('text=Tamil').waitFor();
    await page.locator('text=Tamil').click();

    // Click Let's Go!
    await page.locator('button:has-text("Let\'s Go!")').click();

    // Wait for subjects page
    await page.waitForURL('**/subjects');

    // Start the first Activity (e.g. Alphabet or Word Explorer)
    await page.locator('button:has-text("Start Activity")').nth(1).click();

    // Wait for a SpeechButton to appear

    // The button has a Volume2 icon initially, let's find the button itself
    // Or we can just find any button that contains the word "Pronounce" initially, then locate it by a stable class
    const pronounceButton = page.locator('button[aria-label^="Pronounce"]').first();
    await pronounceButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Get the word being pronounced
    const ariaLabel = await pronounceButton.getAttribute('aria-label');
    const word = ariaLabel?.replace('Pronounce ', '').trim();

    // Now define a stable locator that won't break when aria-label changes
    // It's the button inside the active card
    const speechButton = page.locator('button').filter({ hasText: '' }).filter({ has: page.locator('svg') }).first(); // Actually, better to just use nth if we know it.
    // Wait, since we know it's a rounded-xl p-2.5 button, let's just locate it by class:
    const stableButton = page.locator('button.rounded-xl.p-2\\.5').first();

    // 2. Click the button (First time, uncached)
    await stableButton.click();

    // 3. Verify Loading State
    // The button should be disabled while generating
    await expect(stableButton).toBeDisabled();
    // The button should have the generating aria-label
    await expect(stableButton).toHaveAttribute('aria-label', `Generating pronunciation for ${word}`);

    // Wait for the request to complete
    await page.waitForResponse(TTS_API_URL, { timeout: 15000 });

    // 4. Verify Request Payload
    expect(ttsRequestCount).toBe(1);
    expect(interceptedRequest?.method()).toBe('POST');
    
    const postData = JSON.parse(interceptedRequest?.postData() || '{}');
    expect(postData.text).toBe(word);
    expect(postData.format).toBe('mp3');

    // 5. Verify Response
    expect(interceptedResponse?.status()).toBe(200);
    const contentType = interceptedResponse?.headers()['content-type'];
    expect(contentType).toMatch(/audio\/(mpeg|mp3|wav)/);

    // Wait for button to re-enable (meaning audio finished playing or loaded)
    // Audio playback might take a second, so we wait for the aria-label to revert
    await expect(stableButton).not.toBeDisabled({ timeout: 10000 });

    // 6. Verify Caching (Second Click)
    // Click the same button again
    await stableButton.click();
    
    // Wait a bit to ensure no network request was fired
    await page.waitForTimeout(1000);
    
    // The request count should still be exactly 1
    expect(ttsRequestCount).toBe(1);

    // 7. Verify Offline Fallback
    // Disconnect internet for this context
    await context.setOffline(true);
    
    // Click the same cached word - it should still play (won't crash)
    await stableButton.click();
    await page.waitForTimeout(1000);
    expect(ttsRequestCount).toBe(1); // Still 1

    // Try to pronounce a DIFFERENT word (uncached) while offline
    const secondButton = page.locator('button[aria-label^="Pronounce"]').nth(1);
    
    // If there is a second button, test fallback
    if (await secondButton.count() > 0) {
      await secondButton.click();
      
      // App shouldn't crash, and network request should fail or be blocked by offline mode.
      // The button should handle the error and fallback to browser TTS.
      await page.waitForTimeout(1000);
      await expect(secondButton).not.toBeDisabled();
    }
  });
});
