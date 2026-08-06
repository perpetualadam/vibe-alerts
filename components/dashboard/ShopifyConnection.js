'use client';

import { useEffect, useMemo, useState } from 'react';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';

function formatRelativeTime(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Shopify App connection panel — OAuth install + merchant event selection.
 */
export default function ShopifyConnection({ status, onUpdated, onToast, isActive }) {
  const [shopInput, setShopInput] = useState('');
  const [busy, setBusy] = useState(null);
  const [selected, setSelected] = useState([]);

  const connection = status?.connection;
  const connected = Boolean(connection?.connected);
  const platformReady = Boolean(status?.platformReady);
  const topics = status?.availableTopics ?? [];

  useEffect(() => {
    if (connection?.enabledTopics?.length) {
      setSelected(connection.enabledTopics);
    }
  }, [connection?.enabledTopics]);

  const grouped = useMemo(() => {
    /** @type {Record<string, typeof topics>} */
    const map = {};
    for (const topic of topics) {
      const group = topic.group || 'Other';
      if (!map[group]) map[group] = [];
      map[group].push(topic);
    }
    return map;
  }, [topics]);

  const toggleTopic = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const connect = async () => {
    setBusy('connect');
    try {
      const res = await fetch('/api/dashboard/shopify/connect', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ shop: shopInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not start Shopify install');
      window.location.href = json.authUrl;
    } catch (err) {
      onToast?.(err.message || 'Connect failed', 'error');
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (
      !window.confirm(
        'Disconnect Shopify? Webhook subscriptions will be removed and store alerts will stop.'
      )
    ) {
      return;
    }
    setBusy('disconnect');
    try {
      const res = await fetch('/api/dashboard/shopify/disconnect', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Disconnect failed');
      onUpdated?.(json);
      onToast?.('Shopify disconnected', 'success');
    } catch (err) {
      onToast?.(err.message || 'Disconnect failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const saveTopics = async () => {
    setBusy('topics');
    try {
      const res = await fetch('/api/dashboard/shopify/topics', {
        method: 'PUT',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ topics: selected }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update events');
      onUpdated?.(json);
      onToast?.('Shopify notification events updated', 'success');
    } catch (err) {
      onToast?.(err.message || 'Failed to update events', 'error');
    } finally {
      setBusy(null);
    }
  };

  const lastWebhook = formatRelativeTime(connection?.lastWebhookAt);

  return (
    <section className="glass rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Shopify App</h2>
          <p className="text-sm text-vibe-muted mt-1">
            One-click OAuth install. Webhooks subscribe automatically — choose which store events
            trigger alerts (orders, customers, refunds, abandoned carts).
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            connected
              ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
              : 'bg-white/5 text-vibe-muted ring-1 ring-vibe-border'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-vibe-muted'}`}
          />
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {!platformReady && (
        <p className="text-sm text-amber-300/90 bg-amber-500/10 ring-1 ring-amber-500/20 rounded-lg px-3 py-2">
          Shopify App is unavailable until{' '}
          <code className="text-xs">SHOPIFY_API_KEY</code>,{' '}
          <code className="text-xs">SHOPIFY_API_SECRET</code>,{' '}
          <code className="text-xs">NEXT_PUBLIC_APP_URL</code>, and{' '}
          <code className="text-xs">CREDENTIALS_ENCRYPTION_KEY</code> are configured.
        </p>
      )}

      {connected ? (
        <div className="space-y-4">
          <div className="text-sm space-y-1">
            <p>
              <span className="text-vibe-muted">Shop:</span>{' '}
              <span className="font-mono text-vibe-accent">{connection.shopDomain}</span>
            </p>
            {connection.installedAt && (
              <p className="text-vibe-muted text-xs">
                Installed {new Date(connection.installedAt).toLocaleString()}
                {lastWebhook ? ` · Last event ${lastWebhook}` : ''}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Notify me about</h3>
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-vibe-muted">{group}</p>
                <div className="space-y-2">
                  {items.map((topic) => (
                    <label
                      key={topic.id}
                      className="flex items-start gap-3 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-vibe-border bg-black/30"
                        checked={selected.includes(topic.id)}
                        onChange={() => toggleTopic(topic.id)}
                        disabled={!isActive || busy === 'topics'}
                      />
                      <span>
                        <span className="font-medium">{topic.label}</span>
                        <span className="block text-xs text-vibe-muted">{topic.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={saveTopics}
              disabled={!isActive || busy === 'topics' || selected.length === 0}
              className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
            >
              {busy === 'topics' ? 'Saving…' : 'Save event preferences'}
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={busy === 'disconnect'}
              className="px-4 py-2 rounded-lg border border-vibe-border hover:bg-white/5 text-sm"
            >
              {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-vibe-muted mb-1.5 block">Shop domain</span>
            <input
              type="text"
              value={shopInput}
              onChange={(e) => setShopInput(e.target.value)}
              placeholder="mystore.myshopify.com"
              disabled={!platformReady || !isActive || busy === 'connect'}
              className="w-full bg-black/30 border border-vibe-border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </label>
          <button
            type="button"
            onClick={connect}
            disabled={!platformReady || !isActive || !shopInput.trim() || busy === 'connect'}
            className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {busy === 'connect' ? 'Redirecting…' : 'Install Shopify App'}
          </button>
          <p className="text-xs text-vibe-muted">
            You will authorize VibeAlerts on Shopify. Webhooks for your selected events (and required
            GDPR topics) are registered automatically — no Flow or manual webhook setup.
          </p>
        </div>
      )}
    </section>
  );
}
