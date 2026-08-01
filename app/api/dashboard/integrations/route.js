import { getPlatformCatalog } from '@/lib/integrations/registry';
import { buildHtmlSnippet } from '@/lib/integrations/platforms/html';
import { getWebhookUrl } from '@/lib/env';

/** GET platform integration catalog for dashboard */
export async function GET() {
  const platforms = getPlatformCatalog();
  return Response.json({ platforms });
}

/** POST generate platform-specific snippet with user's webhook URL */
export async function POST(request) {
  try {
    const { platform, webhookToken, apiKey } = await request.json();
    if (!platform || !webhookToken || !apiKey) {
      return Response.json({ error: 'platform, webhookToken, and apiKey required' }, { status: 400 });
    }

    const webhookUrl = getWebhookUrl(webhookToken);

    if (platform === 'html') {
      return Response.json({ snippet: buildHtmlSnippet(webhookUrl, apiKey) });
    }

    const headers = `X-VibeAlerts-Platform: ${platform}\nX-VibeAlerts-Key: ${apiKey}`;
    return Response.json({
      webhookUrl,
      headers,
      curlExample: `curl -X POST "${webhookUrl}" -H "Content-Type: application/json" -H "X-VibeAlerts-Platform: ${platform}" -H "X-VibeAlerts-Key: ${apiKey}" -d "{\\"name\\":\\"Test\\",\\"email\\":\\"test@example.com\\"}"`,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
