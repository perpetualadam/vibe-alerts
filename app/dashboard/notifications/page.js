'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import DashboardNav from '@/components/dashboard/DashboardNav';
import NotificationHistory from '@/components/dashboard/NotificationHistory';
import ProviderCard from '@/components/dashboard/ProviderCard';
import WhatsAppConnection from '@/components/dashboard/WhatsAppConnection';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';
import { createClient } from '@/lib/supabase/client';
import { SITE } from '@/lib/seo/site';

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
        active
          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
          : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

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
  const [loggingOut, setLoggingOut] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const supabase = createClient();

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

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

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
    <div className="min-h-screen bg-vibe-bg">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg max-w-sm ${
            toast.type === 'error'
              ? 'bg-red-500/90 text-white'
              : toast.type === 'success'
                ? 'bg-emerald-500/90 text-white'
                : 'bg-vibe-surface text-white ring-1 ring-vibe-border'
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="border-b border-vibe-border bg-vibe-bg/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm text-vibe-muted hover:text-white transition-colors">
              ← {SITE.name}
            </Link>
            <h1 className="text-xl font-bold mt-1">Notifications</h1>
            <p className="text-sm text-vibe-muted truncate max-w-[240px] sm:max-w-none">
              {profile?.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge active={isActive} />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-xs text-vibe-muted hover:text-white transition-colors disabled:opacity-50"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
        <DashboardNav />
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Notification Providers</h2>
          <p className="text-sm text-vibe-muted max-w-2xl">
            Enable any combination of providers. Each inbound webhook is delivered through
            NotificationService to every enabled channel.
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

        <NotificationHistory key={historyKey} providers={providers} />
      </main>
    </div>
  );
}
