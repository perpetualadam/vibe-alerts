'use client';

import { useCallback, useEffect, useState } from 'react';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';

function PriorityBadge({ priority }) {
  const tones = {
    High: 'text-red-300 bg-red-500/10 ring-red-500/30',
    Medium: 'text-amber-300 bg-amber-500/10 ring-amber-500/30',
    Low: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30',
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ring-1 ${
        tones[priority] || 'text-vibe-muted bg-white/5 ring-vibe-border'
      }`}
    >
      {priority || '—'}
    </span>
  );
}

/**
 * AI Lead Intelligence settings + recent insights.
 */
export default function AiLeadIntelligence({ onToast }) {
  const [settings, setSettings] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [settingsRes, insightsRes] = await Promise.all([
        fetch('/api/dashboard/ai/settings', { cache: 'no-store' }),
        fetch('/api/dashboard/ai/insights?limit=15', { cache: 'no-store' }),
      ]);
      const settingsJson = await settingsRes.json();
      const insightsJson = await insightsRes.json();
      if (!settingsRes.ok) throw new Error(settingsJson.error || 'Failed to load AI settings');
      setSettings(settingsJson.settings);
      setPlatform(settingsJson.platform);
      if (insightsRes.ok) setInsights(insightsJson.rows || []);
    } catch (err) {
      onToast?.(err.message || 'Could not load AI Lead Intelligence', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch) => {
    setBusy(true);
    try {
      const res = await fetch('/api/dashboard/ai/settings', {
        method: 'PATCH',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update');
      setSettings(json.settings);
      setPlatform(json.platform);
      onToast?.('AI settings saved', 'success');
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-vibe-muted">Loading AI Lead Intelligence…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">AI Lead Intelligence</h2>
          <p className="text-sm text-vibe-muted mt-0.5">
            Analyse every inbound lead for summary, category, priority, spam score, sentiment, and
            intent — without slowing webhook responses.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              disabled={busy || !platform?.configured}
              checked={Boolean(settings?.enabled)}
              onChange={(e) => save({ enabled: e.target.checked })}
            />
            <span>
              <span className="text-white font-medium">Enable AI analysis</span>
              <span className="block text-vibe-muted text-xs mt-0.5">
                Queue LLM analysis after each accepted webhook
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              disabled={busy || !settings?.enabled}
              checked={Boolean(settings?.includeInNotifications)}
              onChange={(e) => save({ includeInNotifications: e.target.checked })}
            />
            <span>
              <span className="text-white font-medium">Include AI summary in notifications</span>
              <span className="block text-vibe-muted text-xs mt-0.5">
                When on, alerts wait for analysis and include AI fields. When off, alerts send
                immediately and insights appear in the dashboard only.
              </span>
            </span>
          </label>
        </div>

        <div className="text-xs text-vibe-muted space-y-1">
          <p>
            Platform provider:{' '}
            {platform?.configured ? (
              <span className="text-emerald-400">
                {platform.active?.label} · {platform.active?.model}
              </span>
            ) : (
              <span className="text-amber-400">not configured</span>
            )}
          </p>
          <p>
            Supported: Groq, OpenAI, Anthropic, Grok (xAI). Set{' '}
            <code className="text-vibe-muted/80">AI_PROVIDER</code> plus the matching API key.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-white">Recent AI insights</h2>
          <p className="text-sm text-vibe-muted mt-0.5">Latest analysed leads for your account</p>
        </div>

        {insights.length === 0 ? (
          <p className="text-sm text-vibe-muted">
            No insights yet. Enable AI and send a test webhook to generate the first analysis.
          </p>
        ) : (
          <ul className="space-y-3">
            {insights.map((row) => (
              <li
                key={row.id}
                className="border border-vibe-border rounded-xl px-4 py-3 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={row.priority} />
                  <span className="text-xs text-vibe-muted">{row.category}</span>
                  <span className="text-xs text-vibe-muted">{row.sentiment}</span>
                  <span className="text-xs text-vibe-muted">
                    spam {Math.round(row.spamScore)}%
                  </span>
                  <span className="text-[10px] text-vibe-muted ml-auto">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-sm text-white">{row.summary}</p>
                <p className="text-xs text-vibe-muted">Intent: {row.estimatedIntent}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
