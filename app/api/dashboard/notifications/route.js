import { NextResponse } from 'next/server';
import { fetchChannelConfigs } from '@/lib/channel-configs/db';
import {
  DASHBOARD_PROVIDER_ORDER,
  fetchProviderDeliverySummary,
  isProviderConnected,
} from '@/lib/notifications/history';
import { getPluginCatalog, notificationService } from '@/lib/notifications';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { getWhatsAppStatus } from '@/lib/whatsapp/service';

/**
 * GET — Notifications dashboard overview:
 * providers with connected status, enable state, last success/fail, health.
 */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const { user, supabase } = auth;

  try {
    const [channelConfigs, whatsappStatus, catalog, profileRes] = await Promise.all([
      fetchChannelConfigs(supabase, user.id),
      getWhatsAppStatus(user.id).catch(() => ({
        platformReady: false,
        encryptionReady: false,
        connection: { connected: false },
      })),
      Promise.resolve(getPluginCatalog()),
      supabase
        .from('profiles')
        .select('stripe_subscription_status, email')
        .eq('id', user.id)
        .single(),
    ]);

    const ordered = [...catalog].sort((a, b) => {
      const ai = DASHBOARD_PROVIDER_ORDER.indexOf(a.id);
      const bi = DASHBOARD_PROVIDER_ORDER.indexOf(b.id);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const channelIds = ordered.map((p) => p.id);
    const [deliverySummary, healthResults] = await Promise.all([
      fetchProviderDeliverySummary(supabase, user.id, channelIds),
      notificationService.healthCheck({
        userId: user.id,
        channelConfigs,
      }),
    ]);

    const healthById = Object.fromEntries(
      healthResults.map((h) => [h.provider, h])
    );

    const providers = ordered.map((plugin) => {
      const entry = channelConfigs[plugin.id] ?? {
        enabled: false,
        config: {},
        connected_at: null,
      };
      const connected = isProviderConnected(plugin, entry, whatsappStatus);
      const delivery = deliverySummary[plugin.id] ?? {
        lastSuccess: null,
        lastFailure: null,
      };
      const health = healthById[plugin.id] ?? {
        healthy: false,
        provider: plugin.id,
        message: 'Unknown',
      };

      const safeConfig = { ...(entry.config ?? {}) };
      delete safeConfig.access_token;
      delete safeConfig.accessToken;
      if (safeConfig.webhook_url) {
        safeConfig.webhook_configured = true;
        delete safeConfig.webhook_url;
      }

      return {
        id: plugin.id,
        label: plugin.label,
        description: plugin.description,
        version: plugin.version,
        platformReady: plugin.platformReady,
        platformUnavailableMessage: plugin.platformUnavailableMessage,
        configSchema: plugin.configSchema,
        setupGuide: plugin.setupGuide,
        enabled: Boolean(entry.enabled),
        connected,
        connectedAt: entry.connected_at ?? null,
        config: safeConfig,
        lastSuccess: delivery.lastSuccess
          ? {
              at: delivery.lastSuccess.completed_at || delivery.lastSuccess.created_at,
              id: delivery.lastSuccess.id,
            }
          : null,
        lastFailure: delivery.lastFailure
          ? {
              at: delivery.lastFailure.completed_at || delivery.lastFailure.created_at,
              error: delivery.lastFailure.error_message,
              id: delivery.lastFailure.id,
            }
          : null,
        health: {
          healthy: Boolean(health.healthy),
          message: health.message ?? null,
          details: health.details ?? null,
        },
      };
    });

    return NextResponse.json({
      providers,
      whatsapp: whatsappStatus,
      profile: profileRes.data
        ? {
            email: profileRes.data.email,
            stripe_subscription_status: profileRes.data.stripe_subscription_status,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to load notification settings' },
      { status: 500 }
    );
  }
}
