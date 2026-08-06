'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardShell from '@/components/dashboard/DashboardShell';
import NotificationHistory from '@/components/dashboard/NotificationHistory';
import ProviderCard from '@/components/dashboard/ProviderCard';
import PushNotificationsCard from '@/components/dashboard/PushNotificationsCard';
import WhatsAppConnection from '@/components/dashboard/WhatsAppConnection';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';

function formatDeliveryErrors(delivery) {
  if (!Array.isArray(delivery) || delivery.length === 0) return null;
  return delivery
    .filter((entry) => !entry.success)
    .map((entry) => `${entry.channel}: ${entry.error || 'failed'}`)
    .join(' · ');
}

export default function NotificationsPage() {
  const [providers, setProviders] = useState([]);
  const [whatsapp, setWhatsapp] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [toast, setToast] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/notifications');
      if (!res.ok) throw new Error('Failed to load notifications');
      const json = await res.json();
      setProviders(json.providers ?? []);
      setWhatsapp(json.whatsapp ?? null);
      setProfile(json.profile ?? null);
    } catch {
      showToast('Could not load notification settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isActive = profile?.stripe_subscription_status === 'active';

  const onToggleEnabled = async (provider, enabled) => {
    if (provider.enabled === enabled) return;
    setBusyKey(`toggle:${provider.id}`);
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({
          channel: provider.id,
          enabled,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update channel');
      showToast(
        enabled ? `${provider.label} enabled` : `${provider.label} disabled`,
        'success'
      );
      await load();
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setBusyKey(null);
    }
  };

  const onSaveConfig = async (providerId, config) => {
    setBusyKey(`save:${providerId}`);
    try {
      const provider = providers.find((p) => p.id === providerId);
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({
          channel: providerId,
          enabled: provider?.enabled ?? false,
          config,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      showToast(`${provider?.label || 'Provider'} settings saved`, 'success');
      await load();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setBusyKey(null);
    }
  };

  const onTest = async (providerId) => {
    setBusyKey(`test:${providerId}`);
    try {
      const res = await fetch('/api/dashboard/notifications/test', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({
          channels: [providerId],
          payload: { Name: 'John Doe', Message: 'System Test Working!' },
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        const detail = formatDeliveryErrors(result.delivery);
        throw new Error(detail || result.error || 'Test failed');
      }
      const detail = formatDeliveryErrors(result.delivery);
      if (detail) showToast(`Test sent with warnings — ${detail}`, 'info');
      else showToast('Test notification sent', 'success');
      await load();
      setHistoryKey((k) => k + 1);
    } catch (err) {
      showToast(err.message || 'Test failed', 'error');
      await load();
      setHistoryKey((k) => k + 1);
    } finally {
      setBusyKey(null);
    }
  };

  const applyWhatsAppUpdate = () => {
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vibe-bg">
        <div className="w-8 h-8 border-2 border-vibe-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const featured = providers.filter((p) =>
    ['telegram', 'discord', 'email', 'teams', 'whatsapp'].includes(p.id)
  );
  const others = providers.filter(
    (p) => !['telegram', 'discord', 'email', 'teams', 'whatsapp'].includes(p.id)
  );

  return (
    <DashboardShell
      title="Notifications"
      email={profile?.email}
      isActive={isActive}
      toast={toast}
    >
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Notification Providers</h2>
        <p className="text-sm text-vibe-muted max-w-2xl">
          Enable any combination of providers. Each inbound webhook is delivered through
          NotificationService to every enabled channel.{' '}
          <Link href="/dashboard/ai" className="text-vibe-accent hover:underline">
            Configure AI Lead Intelligence
          </Link>{' '}
          to enrich alerts with summaries and priority.
        </p>
      </section>

      <div className="space-y-4">
        {featured.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isActive={isActive}
            onToggleEnabled={onToggleEnabled}
            onTest={onTest}
            onSaveConfig={onSaveConfig}
            busyKey={busyKey}
          />
        ))}
      </div>

      <WhatsAppConnection
        status={whatsapp}
        recipientPhone={
          providers.find((p) => p.id === 'whatsapp')?.config?.phone
        }
        channelEnabled={Boolean(
          providers.find((p) => p.id === 'whatsapp')?.enabled
        )}
        onUpdated={applyWhatsAppUpdate}
        onToast={showToast}
        isActive={isActive}
      />

      {others.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">More providers</h2>
          {others.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isActive={isActive}
              onToggleEnabled={onToggleEnabled}
              onTest={onTest}
              onSaveConfig={onSaveConfig}
              busyKey={busyKey}
            />
          ))}
        </div>
      )}

      <PushNotificationsCard onToast={showToast} isActive={isActive} />

      <NotificationHistory key={historyKey} providers={providers} />
    </DashboardShell>
  );
}