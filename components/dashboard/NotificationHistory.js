'use client';

import { useCallback, useEffect, useState } from 'react';

const OUTCOMES = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
];

function formatTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function StatusPill({ status }) {
  const map = {
    sent: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30',
    failed: 'bg-red-500/10 text-red-400 ring-red-500/30',
    retrying: 'bg-amber-500/10 text-amber-400 ring-amber-500/30',
    pending: 'bg-white/5 text-vibe-muted ring-vibe-border',
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ring-1 ${
        map[status] || map.pending
      }`}
    >
      {status === 'sent' ? 'Success' : status === 'failed' ? 'Failure' : status}
    </span>
  );
}

/**
 * Filterable notification history table (desktop) + stacked cards (mobile).
 */
export default function NotificationHistory({ providers = [] }) {
  const [provider, setProvider] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const limit = 25;

  const load = useCallback(
    async (nextOffset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          provider,
          outcome,
          limit: String(limit),
          offset: String(nextOffset),
        });
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const res = await fetch(`/api/dashboard/notifications/logs?${params}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load history');
        setRows(json.rows ?? []);
        setTotal(json.total ?? 0);
        setOffset(nextOffset);
      } catch (err) {
        setError(err.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    },
    [provider, outcome, from, to]
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const providerLabel = (id) =>
    providers.find((p) => p.id === id)?.label || id;

  return (
    <section className="glass rounded-xl p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Notification History</h2>
        <p className="text-sm text-vibe-muted mt-1">
          Delivery log across all providers. Filter by provider, outcome, and date.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block text-sm">
          <span className="text-vibe-muted text-xs uppercase tracking-wider mb-1.5 block">
            Provider
          </span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full bg-black/40 border border-vibe-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
          >
            <option value="all">All providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-vibe-muted text-xs uppercase tracking-wider mb-1.5 block">
            Status
          </span>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full bg-black/40 border border-vibe-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
          >
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-vibe-muted text-xs uppercase tracking-wider mb-1.5 block">
            From date
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full bg-black/40 border border-vibe-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
          />
        </label>

        <label className="block text-sm">
          <span className="text-vibe-muted text-xs uppercase tracking-wider mb-1.5 block">
            To date
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full bg-black/40 border border-vibe-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
          />
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto -mx-1">
        <table className="w-full text-sm text-left min-w-[720px]">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-vibe-muted border-b border-vibe-border">
              <th className="py-3 pr-3 font-medium">Time</th>
              <th className="py-3 pr-3 font-medium">Source</th>
              <th className="py-3 pr-3 font-medium">Provider</th>
              <th className="py-3 pr-3 font-medium">Status</th>
              <th className="py-3 pr-3 font-medium">Delivery Time</th>
              <th className="py-3 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-vibe-muted">
                  Loading history…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-vibe-muted">
                  No notifications match these filters.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="border-b border-vibe-border/60 last:border-0">
                  <td className="py-3 pr-3 whitespace-nowrap text-vibe-muted">
                    {formatTime(row.time)}
                  </td>
                  <td className="py-3 pr-3 capitalize">{row.source}</td>
                  <td className="py-3 pr-3">{providerLabel(row.provider)}</td>
                  <td className="py-3 pr-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="py-3 pr-3 text-vibe-muted">{row.deliveryTime || '—'}</td>
                  <td className="py-3 text-red-400/90 max-w-[220px] truncate" title={row.error || ''}>
                    {row.error || '—'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading && <p className="text-sm text-vibe-muted text-center py-6">Loading history…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-vibe-muted text-center py-6">
            No notifications match these filters.
          </p>
        )}
        {!loading &&
          rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-vibe-border bg-black/20 p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{providerLabel(row.provider)}</span>
                <StatusPill status={row.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-vibe-muted">
                <div>
                  <span className="block uppercase tracking-wider mb-0.5">Time</span>
                  <span className="text-white/90">{formatTime(row.time)}</span>
                </div>
                <div>
                  <span className="block uppercase tracking-wider mb-0.5">Source</span>
                  <span className="text-white/90 capitalize">{row.source}</span>
                </div>
                <div>
                  <span className="block uppercase tracking-wider mb-0.5">Delivery</span>
                  <span className="text-white/90">{row.deliveryTime || '—'}</span>
                </div>
              </div>
              {row.error && (
                <p className="text-xs text-red-400 break-words">{row.error}</p>
              )}
            </div>
          ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <p className="text-xs text-vibe-muted">
          {total === 0
            ? '0 results'
            : `Showing ${offset + 1}–${Math.min(offset + rows.length, total)} of ${total}`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || offset <= 0}
            onClick={() => load(Math.max(0, offset - limit))}
            className="px-3 py-1.5 rounded-lg border border-vibe-border text-sm hover:bg-white/5 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={loading || offset + limit >= total}
            onClick={() => load(offset + limit)}
            className="px-3 py-1.5 rounded-lg border border-vibe-border text-sm hover:bg-white/5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
