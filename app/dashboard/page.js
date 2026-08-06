'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import ChannelSettings, {
  isAnyChannelConfiguredFromCatalog,
} from '@/components/dashboard/ChannelSettings';
import DashboardShell from '@/components/dashboard/DashboardShell';
import PlatformIntegrations from '@/components/dashboard/PlatformIntegrations';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';
import { getSubscriptionTrialLabel } from '@/lib/stripe/trial';

function HealthIndicator({ plugins, channelConfigs, settings, events, profile }) {
  const channelsOk = isAnyChannelConfiguredFromCatalog(plugins, channelConfigs);
  const isSubActive = profile?.stripe_subscription_status === 'active';
  const recentFail = events?.some(
    (e) => e.processing_status === 'failed' && Date.now() - new Date(e.created_at) < 86400000
  );

  let status = 'healthy';
  let label = 'All systems operational';
  if (!isSubActive) {
    status = 'warning';
    label = 'Subscription inactive';
  } else if (!channelsOk) {
    status = 'warning';
    label = 'No notification channels configured';
  } else if (recentFail) {
    status = 'degraded';
    label = 'Recent delivery failures';
  }

  const colors = {
    healthy: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/30',
    warning: 'text-amber-400 bg-amber-500/10 ring-amber-500/30',
    degraded: 'text-orange-400 bg-orange-500/10 ring-orange-500/30',
  };

  const enabledLabels = plugins
    ?.filter((p) => channelConfigs?.[p.id]?.enabled)
    .map((p) => p.label)
    .join(', ');

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg text-sm ring-1 ${colors[status]}`}>
      <span className="font-medium">Webhook Health:</span> {label}
      {enabledLabels && (
        <span className="text-vibe-muted">· Active plugins: {enabledLabels}</span>
      )}
      {settings?.last_webhook_at && (
        <span className="text-vibe-muted">
          · Last alert {formatRelativeTime(settings.last_webhook_at)}
        </span>
      )}
    </div>
  );
}

function ActivityFeed({ events, logs }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold text-vibe-muted uppercase tracking-wider mb-4">
          Recent Webhooks
        </h3>
        {!events?.length ? (
          <p className="text-sm text-vibe-muted">No webhook activity yet.</p>
        ) : (
          <ul className="space-y-3 max-h-64 overflow-y-auto">
            {events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-2 text-sm border-b border-vibe-border pb-2 last:border-0">
                <div>
                  <EventStatus status={e.processing_status} />
                  {e.error_message && (
                    <p className="text-vibe-muted text-xs mt-1">{e.error_message}</p>
                  )}
                  {Array.isArray(e.delivery_summary) && e.delivery_summary.length > 0 && (
                    <ul className="text-vibe-muted text-xs mt-1 space-y-0.5">
                      {e.delivery_summary.map((entry) => (
                        <li key={entry.channel}>
                          {entry.channel}: {entry.success ? 'sent' : entry.error || 'failed'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <time className="text-xs text-vibe-muted whitespace-nowrap">
                  {formatRelativeTime(e.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold text-vibe-muted uppercase tracking-wider mb-4">
          Notification History
        </h3>
        {!logs?.length ? (
          <p className="text-sm text-vibe-muted">No notifications sent yet.</p>
        ) : (
          <ul className="space-y-3 max-h-64 overflow-y-auto">
            {logs.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-2 text-sm border-b border-vibe-border pb-2 last:border-0">
                <div>
                  <span className="capitalize text-vibe-muted">{l.channel}</span>
                  {' · '}
                  <NotifStatus status={l.status} />
                  {l.error_message && (
                    <p className="text-vibe-muted text-xs mt-1">{l.error_message}</p>
                  )}
                </div>
                <time className="text-xs text-vibe-muted whitespace-nowrap">
                  {formatRelativeTime(l.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EventStatus({ status }) {
  const map = {
    completed: 'text-emerald-400',
    failed: 'text-red-400',
    rejected: 'text-amber-400',
    processing: 'text-blue-400',
    pending: 'text-vibe-muted',
  };
  return <span className={`capitalize font-medium ${map[status] ?? ''}`}>{status}</span>;
}

function NotifStatus({ status }) {
  const map = {
    sent: 'text-emerald-400',
    failed: 'text-red-400',
    retrying: 'text-amber-400',
    pending: 'text-vibe-muted',
  };
  return <span className={`capitalize font-medium ${map[status] ?? ''}`}>{status}</span>;
}

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDeliveryErrors(delivery) {
  if (!Array.isArray(delivery) || delivery.length === 0) return null;
  return delivery
    .filter((entry) => !entry.success)
    .map((entry) => `${entry.channel}: ${entry.error || 'failed'}`)
    .join(' · ');
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || '';

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, pluginsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/dashboard/plugins'),
      ]);
      if (!dashRes.ok) throw new Error('Failed to load dashboard');
      const json = await dashRes.json();
      setData(json);
      if (pluginsRes.ok) {
        const { plugins: catalog } = await pluginsRes.json();
        setPlugins(catalog ?? []);
      }
    } catch {
      showToast('Could not load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    if (billing === 'success') {
      showToast('Subscription activated. You can send test alerts now.', 'success');
      fetchDashboard();
      window.history.replaceState({}, '', '/dashboard');
    } else if (billing === 'cancelled') {
      showToast('Checkout cancelled.', 'info');
      window.history.replaceState({}, '', '/dashboard');
    }
    // Run once on mount to handle Stripe redirect query params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not open billing portal');
      window.location.href = json.url;
    } catch (err) {
      showToast(err.message || 'Could not open billing portal', 'error');
      setBillingLoading(false);
    }
  };

  const webhookUrl = data?.profile?.webhook_token
    ? `${appUrl}/api/v1/webhook/${data.profile.webhook_token}`
    : '';

  const saveChannelSettings = async (body) => {
    const res = await fetch('/api/dashboard/settings', {
      method: 'PATCH',
      headers: dashboardMutationHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Save failed');
    }
    const row = await res.json();
    setData((prev) => ({
      ...prev,
      channelConfigs: {
        ...prev.channelConfigs,
        [row.channel]: {
          enabled: row.enabled,
          config: row.config,
          connected_at: row.connected_at,
        },
      },
    }));
    showToast('Channel settings saved', 'success');
  };

  const sendTestAlert = async () => {
    setTesting(true);
    try {
      // Dashboard tests go through NotificationService → enabled providers
      // (never call providers from the client; webhook layer stays for real leads).
      const res = await fetch('/api/dashboard/notifications/test', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({
          payload: { Name: 'John Doe', Message: 'System Test Working!' },
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        const detail = formatDeliveryErrors(result.delivery);
        throw new Error(detail || result.error || `Test failed (HTTP ${res.status})`);
      }

      const detail = formatDeliveryErrors(result.delivery);
      if (detail) {
        showToast(`Test sent with warnings — ${detail}`, 'info');
      } else {
        showToast('Test alert sent! Check your enabled channels and Notification History below.', 'success');
      }
      fetchDashboard();
    } catch (err) {
      showToast(err.message || 'Test alert failed', 'error');
      fetchDashboard();
    } finally {
      setTesting(false);
    }
  };

  const revealApiKey = async () => {
    if (apiKey) {
      setShowApiKey((v) => !v);
      return;
    }
    try {
      const credRes = await fetch('/api/dashboard/signing-credentials');
      if (!credRes.ok) throw new Error('Could not load API key');
      const { api_key } = await credRes.json();
      setApiKey(api_key);
      setShowApiKey(true);
    } catch {
      showToast('Could not load API key', 'error');
    }
  };

  const regenerateToken = async () => {
    if (!confirm('Regenerate webhook URL? Existing integrations will stop working until updated.')) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await fetch('/api/dashboard/regenerate-token', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
      });
      if (!res.ok) throw new Error('Regeneration failed');
      const json = await res.json();
      setData((prev) => ({
        ...prev,
        profile: { ...prev.profile, webhook_token: json.webhook_token },
      }));
      showToast('Webhook URL regenerated', 'success');
    } catch {
      showToast('Failed to regenerate token', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-vibe-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isActive = data?.profile?.stripe_subscription_status === 'active';
  const trialLabel = getSubscriptionTrialLabel();

  return (
    <DashboardShell
      title="Dashboard"
      email={data?.profile?.email}
      isActive={isActive}
      toast={toast}
    >
      <section className="glass rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-sm text-vibe-muted mt-1">
            {isActive
              ? 'Manage plans, usage, invoices, promo codes, and team seats.'
              : trialLabel
                ? `Start your ${trialLabel.toLowerCase()} — monthly or annual plans with promo codes.`
                : 'Activate a plan to receive form webhook alerts. Inactive accounts return 402 Payment Required.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/dashboard/billing"
            className="px-5 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors whitespace-nowrap text-center"
          >
            {isActive ? 'Open billing' : trialLabel ? 'Start free trial' : 'View plans'}
          </Link>
          {isActive && (
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={billingLoading}
              className="px-5 py-2.5 rounded-lg border border-vibe-border hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {billingLoading ? 'Opening…' : 'Customer Portal'}
            </button>
          )}
        </div>
      </section>

      <HealthIndicator
        plugins={plugins}
        channelConfigs={data?.channelConfigs}
        settings={data?.settings}
        events={data?.webhookEvents}
        profile={data?.profile}
      />

      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Webhook URL</h2>
          <button
            onClick={regenerateToken}
            disabled={regenerating}
            className="text-xs text-vibe-muted hover:text-white transition-colors disabled:opacity-50"
          >
            {regenerating ? 'Regenerating…' : 'Regenerate URL'}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <code className="flex-1 bg-black/40 rounded-lg px-3 sm:px-4 py-3 text-xs sm:text-sm font-mono text-vibe-accent break-all">
            {webhookUrl}
          </code>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(webhookUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-4 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <span className="text-sm text-vibe-muted">API Key:</span>
          <code className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-sm font-mono break-all">
            {showApiKey && apiKey ? apiKey : '••••••••••••••••'}
          </code>
          <button
            type="button"
            onClick={revealApiKey}
            className="text-xs text-vibe-muted hover:text-white transition-colors whitespace-nowrap"
          >
            {showApiKey ? 'Hide' : 'Reveal'}
          </button>
        </div>
      </section>

      <section className="glass rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Website Integration Wizard</h2>
          <p className="text-sm text-vibe-muted mt-1">
            Choose WordPress, Shopify, Google Forms, Wix, Squarespace, Webflow, or Custom — get
            tailored steps, test the connection, and track progress with a checklist.
          </p>
        </div>
        <Link
          href="/dashboard/setup"
          className="px-5 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors whitespace-nowrap text-center"
        >
          Open Setup Wizard
        </Link>
      </section>

      <PlatformIntegrations
        webhookToken={data?.profile?.webhook_token}
        apiKey={showApiKey ? apiKey : null}
      />

      <section className="grid sm:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Notification providers</h2>
            <p className="text-sm text-vibe-muted mt-1">
              Manage Telegram, Discord, Email, Teams, WhatsApp, and more — connection status,
              health, test sends, and delivery history.
            </p>
          </div>
          <Link
            href="/dashboard/notifications"
            className="px-5 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors whitespace-nowrap text-center"
          >
            Open Notifications
          </Link>
        </div>
        <div className="glass rounded-xl p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Analytics</h2>
            <p className="text-sm text-vibe-muted mt-1">
              Webhooks, delivery success rates, latency, sources, and spam detection stats
              with date filters and CSV export.
            </p>
          </div>
          <Link
            href="/dashboard/analytics"
            className="px-5 py-2.5 rounded-lg border border-vibe-border hover:bg-white/5 text-sm font-medium transition-colors whitespace-nowrap text-center"
          >
            Open Analytics
          </Link>
        </div>
      </section>

      <ChannelSettings
        plugins={plugins}
        channelConfigs={data?.channelConfigs}
        onSave={saveChannelSettings}
        onTest={sendTestAlert}
        testing={testing}
        isActive={isActive}
      />

      <ActivityFeed events={data?.webhookEvents} logs={data?.notificationLogs} />
    </DashboardShell>
  );
}