import { NextResponse } from 'next/server';
import { fetchChannelConfigs } from '@/lib/channel-configs/db';
import { DEFAULT_TEST_PAYLOAD, notificationService } from '@/lib/notifications';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';

/**
 * POST — run provider.test() on every enabled & configured notification provider.
 * Goes through NotificationService (never calls providers from the route directly).
 *
 * Body (optional): { payload?, channels?: string[] }
 */
export async function POST(request) {
  const auth = await requireDashboardUser(request, { csrf: true });
  if (auth.error) return auth.error;

  const { user, supabase } = auth;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, stripe_subscription_status')
    .eq('id', user.id)
    .single();

  if (profile?.stripe_subscription_status !== 'active') {
    return NextResponse.json(
      { error: 'Payment required. Please activate your subscription.' },
      { status: 402 }
    );
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const channelConfigs = await fetchChannelConfigs(supabase, user.id);
  const payload =
    body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
      ? /** @type {Record<string, string>} */ (
          Object.fromEntries(
            Object.entries(body.payload).map(([k, v]) => [k, String(v ?? '')])
          )
        )
      : DEFAULT_TEST_PAYLOAD;

  const channels = Array.isArray(body.channels)
    ? body.channels.filter((c) => typeof c === 'string')
    : undefined;

  try {
    const delivery = await notificationService.test({
      userId: user.id,
      profile: profile ?? { id: user.id },
      settings: settings ?? {},
      channelConfigs,
      payload,
      channels,
    });

    const summary = delivery.map((r) => ({
      channel: r.channel,
      success: r.success,
      error: r.error ?? null,
    }));
    const anySuccess = summary.some((r) => r.success);

    if (!anySuccess) {
      return NextResponse.json(
        {
          error: 'Notification test failed for all enabled providers.',
          delivery: summary,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      delivery: summary,
      warning: summary.some((r) => !r.success)
        ? 'Some providers failed. See delivery details.'
        : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to run notification test' },
      { status: 500 }
    );
  }
}
