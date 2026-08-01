import { getPlatformCatalog } from '@/lib/integrations/registry';
import { buildHtmlSnippet } from '@/lib/integrations/platforms/html';
import { getWebhookUrl } from '@/lib/env';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/** GET platform integration catalog for dashboard */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const platforms = getPlatformCatalog();
  return Response.json({ platforms });
}

/** POST generate platform-specific snippet using the authenticated user's credentials */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  try {
    const { platform } = await request.json();
    if (!platform || typeof platform !== 'string') {
      return Response.json({ error: 'platform is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const [{ data: profile }, { data: settings }] = await Promise.all([
      admin.from('profiles').select('webhook_token').eq('id', auth.user.id).single(),
      admin.from('user_settings').select('api_key').eq('user_id', auth.user.id).single(),
    ]);

    if (!profile?.webhook_token || !settings?.api_key) {
      return Response.json({ error: 'Account not fully configured' }, { status: 404 });
    }

    const webhookUrl = getWebhookUrl(profile.webhook_token);
    const apiKey = settings.api_key;

    if (platform === 'html') {
      return Response.json({ snippet: buildHtmlSnippet(webhookUrl, apiKey) });
    }

    const headers = `X-VibeAlerts-Platform: ${platform}\nX-VibeAlerts-Key: ${apiKey}`;
    return Response.json({
      webhookUrl,
      headers,
      curlExample: `curl -X POST "${webhookUrl}" -H "Content-Type: application/json" -H "X-VibeAlerts-Platform: ${platform}" -H "X-VibeAlerts-Key: ${apiKey}" -d "{\\"name\\":\\"Test\\",\\"email\\":\\"test@example.com\\"}"`,
    });
  } catch {
    return Response.json({ error: 'Failed to generate integration snippet' }, { status: 500 });
  }
}
