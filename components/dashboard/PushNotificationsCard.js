'use client';

import { useCallback, useEffect, useState } from 'react';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Enable / disable browser Web Push for the PWA dashboard.
 */
export default function PushNotificationsCard({ onToast, isActive }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(null);
  const [permission, setPermission] = useState('default');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/push');
      if (!res.ok) throw new Error('Failed to load push status');
      setStatus(await res.json());
    } catch (err) {
      onToast?.(err.message || 'Could not load push settings', 'error');
    }
  }, [onToast]);

  useEffect(() => {
    load();
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, [load]);

  const browserSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const enable = async () => {
    setBusy('enable');
    try {
      if (!status?.configured || !status.publicKey) {
        throw new Error('Push is not configured on this deployment');
      }
      if (!browserSupported) {
        throw new Error('This browser does not support Web Push');
      }

      // Ensure SW is registered (production) or attempt register for push testing
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        throw new Error('Notification permission was not granted');
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(status.publicKey),
      });

      const res = await fetch('/api/dashboard/push/subscribe', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify(subscription.toJSON()),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Subscribe failed');

      await load();
      onToast?.('Push notifications enabled on this device', 'success');
    } catch (err) {
      onToast?.(err.message || 'Could not enable push', 'error');
    } finally {
      setBusy(null);
    }
  };

  const disable = async () => {
    setBusy('disable');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await fetch('/api/dashboard/push/unsubscribe', {
          method: 'POST',
          headers: dashboardMutationHeaders(),
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      await load();
      onToast?.('Push notifications disabled on this device', 'success');
    } catch (err) {
      onToast?.(err.message || 'Could not disable push', 'error');
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy('test');
    try {
      const res = await fetch('/api/dashboard/push/test', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Test push failed');
      onToast?.(json.message || 'Test push sent', 'success');
    } catch (err) {
      onToast?.(err.message || 'Test push failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const subscribed = (status?.subscriptionCount || 0) > 0;

  return (
    <section className="glass rounded-xl p-5 sm:p-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Push notifications</h2>
          <p className="text-sm text-vibe-muted mt-1">
            Get alerts on this device when leads arrive — works with the installed PWA.
          </p>
        </div>
        <span
          className={`shrink-0 text-xs px-2.5 py-1 rounded-full ring-1 ${
            subscribed
              ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30'
              : 'bg-white/5 text-vibe-muted ring-vibe-border'
          }`}
        >
          {subscribed ? 'On' : 'Off'}
        </span>
      </div>

      {!status?.configured && (
        <p className="text-sm text-amber-300/90 bg-amber-500/10 ring-1 ring-amber-500/20 rounded-lg px-3 py-2">
          Set <code className="text-xs">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> and{' '}
          <code className="text-xs">VAPID_PRIVATE_KEY</code> to enable Web Push.
        </p>
      )}

      {!browserSupported && (
        <p className="text-sm text-vibe-muted">
          This browser does not support Web Push. Try Chrome, Edge, or Safari 16+.
        </p>
      )}

      <p className="text-xs text-vibe-muted">
        Permission: <span className="text-white/80">{permission}</span>
        {status?.subscriptionCount != null
          ? ` · ${status.subscriptionCount} device(s) registered`
          : ''}
      </p>

      <div className="flex flex-wrap gap-2">
        {!subscribed ? (
          <button
            type="button"
            onClick={enable}
            disabled={!status?.configured || !isActive || busy === 'enable'}
            className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {busy === 'enable' ? 'Enabling…' : 'Enable on this device'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={sendTest}
              disabled={busy === 'test'}
              className="px-4 py-2 rounded-lg border border-vibe-border hover:bg-white/5 text-sm"
            >
              {busy === 'test' ? 'Sending…' : 'Send test push'}
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={busy === 'disable'}
              className="px-4 py-2 rounded-lg border border-vibe-border hover:bg-white/5 text-sm"
            >
              {busy === 'disable' ? 'Disabling…' : 'Disable on this device'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
