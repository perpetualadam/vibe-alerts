'use client';

import { useEffect, useState } from 'react';
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
 * Multi-tenant WhatsApp Business Cloud API connection panel.
 * Credentials are verified with Meta and stored encrypted server-side — never shown again.
 */
export default function WhatsAppConnection({
  status,
  recipientPhone,
  channelEnabled,
  onUpdated,
  onToast,
  isActive,
}) {
  const [form, setForm] = useState({
    wabaId: '',
    phoneNumberId: '',
    accessToken: '',
    phone: '',
  });
  const [busy, setBusy] = useState(null);
  const [showConnectForm, setShowConnectForm] = useState(false);

  const connection = status?.connection;
  const connected = Boolean(connection?.connected);
  const encryptionReady = Boolean(status?.encryptionReady);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      phone: recipientPhone || prev.phone || '',
    }));
  }, [recipientPhone]);

  useEffect(() => {
    if (!connected) setShowConnectForm(false);
  }, [connected]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const connect = async () => {
    setBusy('connect');
    try {
      const res = await fetch('/api/dashboard/whatsapp/connect', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({
          wabaId: form.wabaId.trim(),
          phoneNumberId: form.phoneNumberId.trim(),
          accessToken: form.accessToken.trim(),
          phone: form.phone.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Connect failed');

      setForm((prev) => ({
        ...prev,
        wabaId: '',
        phoneNumberId: '',
        accessToken: '',
      }));
      setShowConnectForm(false);
      onUpdated?.(json);
      onToast?.(
        json.warning || 'WhatsApp Business account connected',
        json.warning ? 'info' : 'success'
      );
    } catch (err) {
      onToast?.(err.message || 'Connect failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect your WhatsApp Business account? Alerts on this channel will stop.')) {
      return;
    }
    setBusy('disconnect');
    try {
      const res = await fetch('/api/dashboard/whatsapp/disconnect', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Disconnect failed');
      onUpdated?.(json);
      onToast?.('WhatsApp disconnected', 'success');
    } catch (err) {
      onToast?.(err.message || 'Disconnect failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy('test');
    try {
      const res = await fetch('/api/dashboard/whatsapp/test', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ phone: form.phone || recipientPhone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Test message failed');
      onUpdated?.(json);
      onToast?.('WhatsApp test message sent', 'success');
    } catch (err) {
      onToast?.(err.message || 'Test message failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const lastSuccess = formatRelativeTime(connection?.lastSuccessfulMessageAt);

  return (
    <section className="glass rounded-xl p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">WhatsApp Business</h2>
          <p className="text-sm text-vibe-muted mt-1">
            Connect your own Meta WhatsApp Business account via the official Cloud API.
            Access tokens are encrypted at rest and never returned to the browser.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
              connected
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-white/5 text-vibe-muted ring-1 ring-vibe-border'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? 'bg-emerald-400' : 'bg-vibe-muted'
              }`}
            />
            {connected ? 'Connected' : 'Not connected'}
          </span>
          {channelEnabled && (
            <span className="text-xs text-vibe-muted ring-1 ring-vibe-border px-2 py-1 rounded-lg">
              Channel on
            </span>
          )}
        </div>
      </div>

      {!encryptionReady && (
        <div className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          WhatsApp Business connections are unavailable on this deployment until{' '}
          <code className="font-mono">CREDENTIALS_ENCRYPTION_KEY</code> is configured.
        </div>
      )}

      {connected && (
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-vibe-muted text-xs uppercase tracking-wider">Connection status</dt>
            <dd className="mt-1 text-emerald-400 font-medium">Connected</dd>
          </div>
          <div>
            <dt className="text-vibe-muted text-xs uppercase tracking-wider">Business number</dt>
            <dd className="mt-1 font-mono text-sm">
              {connection.displayPhoneNumber || connection.phoneNumberId || '—'}
            </dd>
          </div>
          {connection.verifiedName && (
            <div>
              <dt className="text-vibe-muted text-xs uppercase tracking-wider">Verified name</dt>
              <dd className="mt-1">{connection.verifiedName}</dd>
            </div>
          )}
          <div>
            <dt className="text-vibe-muted text-xs uppercase tracking-wider">WABA ID</dt>
            <dd className="mt-1 font-mono text-sm">{connection.wabaId || '—'}</dd>
          </div>
          <div>
            <dt className="text-vibe-muted text-xs uppercase tracking-wider">Last successful message</dt>
            <dd className="mt-1">{lastSuccess ? lastSuccess : 'None yet'}</dd>
          </div>
          <div>
            <dt className="text-vibe-muted text-xs uppercase tracking-wider">Connected at</dt>
            <dd className="mt-1">
              {connection.connectedAt
                ? new Date(connection.connectedAt).toLocaleString()
                : '—'}
            </dd>
          </div>
        </dl>
      )}

      {(showConnectForm || !connected) && encryptionReady && (
        <div className="space-y-3 border-t border-vibe-border pt-4">
          <p className="text-xs text-vibe-muted">
            From Meta Business Suite → WhatsApp → API Setup: copy your WhatsApp Business Account ID,
            Phone Number ID, and a permanent (or long-lived) access token.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-vibe-muted mb-1.5 block">WhatsApp Business Account ID</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={form.wabaId}
                onChange={(e) => setField('wabaId', e.target.value)}
                placeholder="102290129340398"
                className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
              />
            </label>
            <label className="block text-sm">
              <span className="text-vibe-muted mb-1.5 block">Phone Number ID</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={form.phoneNumberId}
                onChange={(e) => setField('phoneNumberId', e.target.value)}
                placeholder="106540352242922"
                className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-vibe-muted mb-1.5 block">Access Token</span>
            <input
              type="password"
              autoComplete="off"
              value={form.accessToken}
              onChange={(e) => setField('accessToken', e.target.value)}
              placeholder="Permanent system user token"
              className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
            />
          </label>
          <label className="block text-sm">
            <span className="text-vibe-muted mb-1.5 block">Alert recipient phone (E.164, no +)</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="15551234567"
              className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!connected && encryptionReady && (
          <button
            type="button"
            onClick={connect}
            disabled={Boolean(busy) || !isActive}
            className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {busy === 'connect' ? 'Connecting…' : 'Connect WhatsApp'}
          </button>
        )}

        {connected && (
          <>
            <button
              type="button"
              onClick={sendTest}
              disabled={Boolean(busy) || !isActive}
              className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {busy === 'test' ? 'Sending…' : 'Send Test Message'}
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={Boolean(busy)}
              className="px-4 py-2 rounded-lg border border-vibe-border hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
            </button>
            <button
              type="button"
              onClick={() => setShowConnectForm((v) => !v)}
              disabled={Boolean(busy)}
              className="px-4 py-2 rounded-lg border border-vibe-border hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {showConnectForm ? 'Cancel reconnect' : 'Reconnect'}
            </button>
            {showConnectForm && (
              <button
                type="button"
                onClick={connect}
                disabled={Boolean(busy) || !isActive}
                className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {busy === 'connect' ? 'Saving…' : 'Save new credentials'}
              </button>
            )}
          </>
        )}

        {!isActive && (
          <span className="text-xs text-amber-400">
            Activate your subscription to connect and send test messages.
          </span>
        )}
      </div>
    </section>
  );
}
