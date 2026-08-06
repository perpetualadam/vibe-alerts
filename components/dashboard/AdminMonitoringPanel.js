'use client';

import { useCallback, useEffect, useState } from 'react';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';

function Stat({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-white',
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    bad: 'text-red-400',
  };
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-vibe-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tones[tone] || tones.default}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function StatusPill({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        ok ? 'text-emerald-400' : 'text-red-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {label}
    </span>
  );
}

/**
 * Platform ops monitoring — health, retry queue, DLQ, uptime.
 */
export default function AdminMonitoringPanel({ onToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolving, setResolving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/monitoring', { cache: 'no-store' });
      if (res.status === 403) {
        setError('Platform admin access required');
        setData(null);
        return;
      }
      if (!res.ok) {
        setError('Failed to load monitoring data');
        return;
      }
      setData(await res.json());
    } catch {
      setError('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const resolveDlq = async (id) => {
    setResolving(id);
    try {
      const res = await fetch('/api/admin/dlq', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ id, notes: 'Resolved from admin dashboard' }),
      });
      if (!res.ok) {
        onToast?.('Could not resolve dead letter', 'error');
        return;
      }
      onToast?.('Dead letter resolved', 'success');
      await load();
    } catch {
      onToast?.('Could not resolve dead letter', 'error');
    } finally {
      setResolving(null);
    }
  };

  if (loading && !data) {
    return <p className="text-sm text-vibe-muted">Loading monitoring snapshot…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-5 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const ready = data.readiness?.ready;
  const queue = data.queue || {};
  const summary = data.uptime?.summary || {};
  const checks = data.readiness?.checks || {};

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">System health</h2>
            <p className="text-sm text-vibe-muted mt-0.5">
              Readiness probes for Supabase, Redis, and platform config
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="text-xs text-vibe-muted hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat
            label="Readiness"
            value={ready ? 'Ready' : 'Degraded'}
            tone={ready ? 'good' : 'bad'}
          />
          <Stat
            label="Uptime (24h)"
            value={summary.availabilityPct != null ? `${summary.availabilityPct}%` : '—'}
            tone={
              summary.availabilityPct == null
                ? 'default'
                : summary.availabilityPct >= 99
                  ? 'good'
                  : summary.availabilityPct >= 95
                    ? 'warn'
                    : 'bad'
            }
          />
          <Stat label="Retrying" value={queue.retrying} tone={queue.retrying ? 'warn' : 'good'} />
          <Stat
            label="Dead letters"
            value={queue.deadLetters}
            tone={queue.deadLetters ? 'bad' : 'good'}
          />
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li>
            <StatusPill ok={checks.supabase?.ok} label={`Supabase ${checks.supabase?.latencyMs ?? '—'}ms`} />
          </li>
          <li>
            <StatusPill
              ok={checks.redis?.ok !== false}
              label={checks.redis?.configured === false ? 'Redis (not set)' : 'Redis'}
            />
          </li>
          <li>
            <StatusPill ok={data.sentryConfigured} label={data.sentryConfigured ? 'Sentry on' : 'Sentry off'} />
          </li>
          <li>
            <StatusPill ok={data.cronConfigured} label={data.cronConfigured ? 'Cron secret set' : 'Cron secret missing'} />
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-white">Delivery queue</h2>
          <p className="text-sm text-vibe-muted mt-0.5">
            Durable retries with exponential backoff; exhausted jobs land in the DLQ
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Due now" value={queue.due} tone={queue.due ? 'warn' : 'default'} />
          <Stat label="Failed (24h)" value={queue.failedLast24h} />
          <Stat label="Sent (24h)" value={data.deliveriesLast24h?.sent || 0} tone="good" />
          <Stat label="Retrying (24h)" value={data.deliveriesLast24h?.retrying || 0} />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-white">Dead letter queue</h2>
          <p className="text-sm text-vibe-muted mt-0.5">
            Deliveries that exhausted async retries — inspect and resolve
          </p>
        </div>
        {(data.deadLetters || []).length === 0 ? (
          <p className="text-sm text-vibe-muted">No unresolved dead letters.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm text-left min-w-[640px]">
              <thead className="text-xs uppercase tracking-wide text-vibe-muted border-b border-vibe-border">
                <tr>
                  <th className="py-2 pr-3 font-medium">Channel</th>
                  <th className="py-2 pr-3 font-medium">Error</th>
                  <th className="py-2 pr-3 font-medium">Attempts</th>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.deadLetters.map((row) => (
                  <tr key={row.id} className="border-b border-vibe-border/60">
                    <td className="py-2.5 pr-3 text-white font-medium">{row.channel}</td>
                    <td className="py-2.5 pr-3 text-vibe-muted max-w-xs truncate">
                      {row.error_message || '—'}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{row.attempt_count}</td>
                    <td className="py-2.5 pr-3 text-vibe-muted whitespace-nowrap">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        disabled={resolving === row.id}
                        onClick={() => resolveDlq(row.id)}
                        className="text-xs text-vibe-accent hover:text-white disabled:opacity-50"
                      >
                        {resolving === row.id ? '…' : 'Resolve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-white">Recent failures</h2>
          <p className="text-sm text-vibe-muted mt-0.5">Failed, dead, and retrying logs from the last 24 hours</p>
        </div>
        {(data.recentFailures || []).length === 0 ? (
          <p className="text-sm text-vibe-muted">No recent failures.</p>
        ) : (
          <ul className="space-y-2">
            {data.recentFailures.slice(0, 15).map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm border-b border-vibe-border/40 pb-2"
              >
                <span className="text-white font-medium">{row.channel}</span>
                <span className="text-xs uppercase tracking-wide text-vibe-muted">{row.status}</span>
                <span className="basis-full text-vibe-muted truncate">{row.error_message || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-vibe-muted">
        Snapshot {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : ''} · Probes:{' '}
        <code className="text-vibe-muted/80">/api/health</code>,{' '}
        <code className="text-vibe-muted/80">/api/health/ready</code>,{' '}
        <code className="text-vibe-muted/80">/api/uptime</code>
      </p>
    </div>
  );
}
