/**
 * Wix Velo backend web module
 * Upload to your Wix site: backend/vibeAlerts.web.js
 *
 * Usage from page code:
 *   import { sendToVibeAlerts } from 'backend/vibeAlerts.web.js';
 *   await sendToVibeAlerts({ name, email, message });
 */
import { fetch } from 'wix-fetch';

const WEBHOOK_URL = 'YOUR_WEBHOOK_URL';
const API_KEY = 'YOUR_API_KEY';

export async function sendToVibeAlerts(formData) {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VibeAlerts-Platform': 'wix',
      'X-VibeAlerts-Key': API_KEY,
    },
    body: JSON.stringify({
      _platform: 'wix',
      ...formData,
    }),
  });
  return response.json;
}
