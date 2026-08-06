'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChannelBreakdownChart,
  DailyUsageChart,
  MonthlyUsageChart,
  SpamDailyChart,
  TopSourcesChart,
} from '@/components/dashboard/analytics/AnalyticsCharts';
import MetricCard from '@/components/dashboard/analytics/MetricCard';
import DashboardNav from '@/components/dashboard/DashboardNav';
import { formatMs } from '@/lib/analytics/dates';
import { createClient } from '@/lib/supabase/client';
import { SITE } from '@/lib/seo/site';

function defaultRange() {
  const to = new Date();
  const from = new Date(Date.now() - 29 * 86400000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

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

export default function AnalyticsPage() {
  const initial = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [provider, setProvider] = useState('all');
  const [theme, setTheme] = useState('dark');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [subActive, setSubActive] = useState(false);

  const supabase = createClient();

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ from, to, provider });
    return params.toString();
  }, [from, to, provider]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, dashRes] = await Promise.all([
        fetch(`/api/dashboard/analytics?${queryString}`),
        fetch('/api/dashboard'),
      ]);
      const json = await analyticsRes.json();
      if (!analyticsRes.ok) throw new Error(json.error || 'Failed to load analytics');
      setData(json);

      if (dashRes.ok) {
        const dash = await dashRes.json();
        setProfileEmail(dash.profile?.email || '');
        setSubActive(dash.profile?.stripe_subscription_status === 'active');
      }
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vibe-analytics-theme');
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      // ignore
    }
  }, []);

  const setThemePersist = (next) => {
    setTheme(next);
    try {
      localStorage.setItem('vibe-analytics-theme', next);
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const exportCsv = () => {
    window.location.href = `/api/dashboard/analytics/export?${queryString}`;
  };

  const overview = data?.overview ?? {};
  const spam = data?.spam ?? overview.spam ?? {};
  const providers = data?.providers ?? [];
  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen transition-colors ${
        isLight ? 'bg-zinc-100 text-zinc-900 analytics-light' : 'bg-vibe-bg text-white'
      }`}
    >
      <header
        className={`border-b sticky top-0 z-40 backdrop-blur-lg ${
          isLight
            ? 'border-zinc-200 bg-white/90'
            : 'border-vibe-border bg-vibe-bg/80'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className={`text-sm transition-colors ${
                isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-vibe-muted hover:text-white'
              }`}
            >
              ← {SITE.name}
            </Link>
            <h1 className="text-xl font-bold mt-1">Analytics</h1>
            <p
              className={`text-sm truncate max-w-[240px] sm:max-w-none ${
                isLight ? 'text-zinc-500' : 'text-vibe-muted'
              }`}
            >
              {profileEmail}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setThemePersist(isLight ? 'dark' : 'light')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                isLight
                  ? 'border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                  : 'border-vibe-border hover:bg-white/5 text-vibe-muted'
              }`}
              aria-label="Toggle dark mode"
            >
              {isLight ? 'Dark mode' : 'Light mode'}
            </button>
            <StatusBadge active={subActive} />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={`text-xs transition-colors disabled:opacity-50 ${
                isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-vibe-muted hover:text-white'
              }`}
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
        <div className={isLight ? '[&_nav]:border-zinc-200 [&_nav]:bg-white/70' : ''}>
          <DashboardNav />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section
          className={`rounded-xl p-4 sm:p-5 border ${
            isLight
              ? 'bg-white border-zinc-200 shadow-sm'
              : 'glass'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <label className="block text-sm">
                <span className={`text-xs uppercase tracking-wider mb-1.5 block ${isLight ? 'text-zinc-500' : 'text-vibe-muted'}`}>
                  From
                </span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-vibe-accent/50 ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                      : 'bg-black/40 border-vibe-border'
                  }`}
                />
              </label>
              <label className="block text-sm">
                <span className={`text-xs uppercase tracking-wider mb-1.5 block ${isLight ? 'text-zinc-500' : 'text-vibe-muted'}`}>
                  To
                </span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-vibe-accent/50 ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                      : 'bg-black/40 border-vibe-border'
                  }`}
                />
              </label>
              <label className="block text-sm">
                <span className={`text-xs uppercase tracking-wider mb-1.5 block ${isLight ? 'text-zinc-500' : 'text-vibe-muted'}`}>
                  Provider
                </span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-vibe-accent/50 ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                      : 'bg-black/40 border-vibe-border'
                  }`}
                >
                  <option value="all">All providers</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="px-4 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Refreshing…' : 'Apply filters'}
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  isLight
                    ? 'border-zinc-300 hover:bg-zinc-100'
                    : 'border-vibe-border hover:bg-white/5'
                }`}
              >
                Export CSV
              </button>
            </div>
          </div>
          {data?.meta?.source === 'fallback' && (
            <p className={`text-xs mt-3 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
              Using fallback aggregation — run migration `007_analytics.sql` for optimized RPC queries.
              {data.meta.capped ? ' Results may be capped for large datasets.' : ''}
            </p>
          )}
        </section>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {loading && !data ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-vibe-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard light={isLight} label="Total Webhooks" value={overview.totalWebhooks ?? 0} accent="accent" />
              <MetricCard light={isLight} label="Notifications Sent" value={overview.notificationsSent ?? 0} />
              <MetricCard light={isLight} label="Successful Deliveries" value={overview.successfulDeliveries ?? 0} accent="success" />
              <MetricCard light={isLight} label="Failed Deliveries" value={overview.failedDeliveries ?? 0} accent="danger" />
              <MetricCard light={isLight} label="Average Delivery Time" value={formatMs(overview.averageDeliveryTimeMs ?? 0)} hint="Successful sends only" />
              <MetricCard light={isLight} label="Active Providers" value={overview.activeProviders ?? 0} hint="Currently enabled channels" />
              <MetricCard light={isLight} label="Top Channel" value={overview.topChannel || '—'} accent="accent" />
              <MetricCard
                light={isLight}
                label="Spam Flagged"
                value={spam.flagged ?? 0}
                hint={`Rate ${(((spam.flagRate ?? 0) * 100) || 0).toFixed(1)}% · avg score ${spam.averageScore ?? 0}`}
                accent="danger"
              />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <DailyUsageChart data={data?.daily ?? []} />
              <MonthlyUsageChart data={data?.monthly ?? []} />
              <TopSourcesChart data={data?.topSources ?? []} />
              <ChannelBreakdownChart data={data?.channels ?? []} />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                <SpamDailyChart data={spam.daily ?? []} />
              </div>
              <div
                className={`rounded-xl p-4 sm:p-5 border ${
                  isLight ? 'bg-white border-zinc-200' : 'glass'
                }`}
              >
                <h3 className="text-sm font-semibold">AI Spam Detection Statistics</h3>
                <p className={`text-xs mt-1 ${isLight ? 'text-zinc-500' : 'text-vibe-muted'}`}>
                  Heuristic scoring on inbound form payloads (honeypots, keywords, URL density).
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className={isLight ? 'text-zinc-500' : 'text-vibe-muted'}>Scanned</dt>
                    <dd className="font-semibold tabular-nums">{spam.scanned ?? 0}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className={isLight ? 'text-zinc-500' : 'text-vibe-muted'}>Flagged</dt>
                    <dd className="font-semibold tabular-nums text-amber-500">{spam.flagged ?? 0}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className={isLight ? 'text-zinc-500' : 'text-vibe-muted'}>Clean</dt>
                    <dd className="font-semibold tabular-nums text-emerald-500">{spam.clean ?? Math.max(0, (spam.scanned ?? 0) - (spam.flagged ?? 0))}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className={isLight ? 'text-zinc-500' : 'text-vibe-muted'}>Avg score</dt>
                    <dd className="font-semibold tabular-nums">{spam.averageScore ?? 0}</dd>
                  </div>
                </dl>
                <div className="mt-5">
                  <p className={`text-xs uppercase tracking-wider mb-2 ${isLight ? 'text-zinc-500' : 'text-vibe-muted'}`}>
                    Top signals
                  </p>
                  {!spam.topSignals?.length ? (
                    <p className={`text-sm ${isLight ? 'text-zinc-500' : 'text-vibe-muted'}`}>
                      No spam signals in this range.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {spam.topSignals.map((s) => (
                        <li
                          key={s.name}
                          className={`flex justify-between text-sm gap-2 ${
                            isLight ? 'text-zinc-700' : 'text-white/90'
                          }`}
                        >
                          <span className="truncate font-mono text-xs">{s.name}</span>
                          <span className="tabular-nums shrink-0">{s.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            <section
              className={`rounded-xl p-4 sm:p-5 border overflow-x-auto ${
                isLight ? 'bg-white border-zinc-200' : 'glass'
              }`}
            >
              <h3 className="text-sm font-semibold mb-3">Channel performance</h3>
              <table className="w-full text-sm text-left min-w-[560px]">
                <thead>
                  <tr className={`text-xs uppercase tracking-wider border-b ${isLight ? 'text-zinc-500 border-zinc-200' : 'text-vibe-muted border-vibe-border'}`}>
                    <th className="py-2 pr-3 font-medium">Provider</th>
                    <th className="py-2 pr-3 font-medium">Total</th>
                    <th className="py-2 pr-3 font-medium">Sent</th>
                    <th className="py-2 pr-3 font-medium">Failed</th>
                    <th className="py-2 font-medium">Avg delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.channels ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className={`py-6 text-center ${isLight ? 'text-zinc-500' : 'text-vibe-muted'}`}>
                        No channel deliveries in this range.
                      </td>
                    </tr>
                  )}
                  {(data?.channels ?? []).map((row) => (
                    <tr
                      key={row.provider}
                      className={`border-b last:border-0 ${isLight ? 'border-zinc-100' : 'border-vibe-border/60'}`}
                    >
                      <td className="py-2.5 pr-3 capitalize font-medium">{row.provider}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{row.total}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-emerald-500">{row.sent}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-red-500">{row.failed}</td>
                      <td className="py-2.5 tabular-nums">{formatMs(row.avgDeliveryMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
