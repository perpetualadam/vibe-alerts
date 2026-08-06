'use client';

import { useState } from 'react';

function formatRelativeTime(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return '—';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Single notification provider card for the Notifications settings page.
 */
export default function ProviderCard({
  provider,
  isActive,
  onToggleEnabled,
  onTest,
  onSaveConfig,
  busyKey,
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({});
  const testing = busyKey === `test:${provider.id}`;
  const toggling = busyKey === `toggle:${provider.id}`;
  const saving = busyKey === `save:${provider.id}`;

  const getFieldValue = (key) => {
    if (form[key] !== undefined) return form[key];
    // webhook_url is redacted — show placeholder when configured
    if (key === 'webhook_url' && provider.config?.webhook_configured) {
      return '';
    }
    return provider.config?.[key] ?? '';
  };

  const handleSave = async () => {
    const config = {};
    for (const field of provider.configSchema) {
      const value = getFieldValue(field.key);
      if (field.key === 'webhook_url' && !String(value).trim() && provider.config?.webhook_configured) {
        continue; // keep existing secret URL
      }
      config[field.key] = value;
    }
    await onSaveConfig(provider.id, config);
    setForm({});
  };

  return (
    <article className="glass rounded-xl overflow-hidden">
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold">{provider.label}</h3>
              <span className="text-xs text-vibe-muted">v{provider.version}</span>
            </div>
            <p className="text-sm text-vibe-muted mt-1">{provider.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                provider.connected
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'bg-white/5 text-vibe-muted ring-1 ring-vibe-border'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  provider.connected ? 'bg-emerald-400' : 'bg-vibe-muted'
                }`}
              />
              {provider.connected ? 'Connected' : 'Not connected'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                provider.health?.healthy
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
              }`}
              title={provider.health?.message || ''}
            >
              {provider.health?.healthy ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-black/20 px-3 py-2.5">
            <dt className="text-xs uppercase tracking-wider text-vibe-muted">Last successful</dt>
            <dd className="mt-1 font-medium">
              {provider.lastSuccess ? formatRelativeTime(provider.lastSuccess.at) : 'None yet'}
            </dd>
          </div>
          <div className="rounded-lg bg-black/20 px-3 py-2.5">
            <dt className="text-xs uppercase tracking-wider text-vibe-muted">Last failed</dt>
            <dd className="mt-1 font-medium">
              {provider.lastFailure ? (
                <span className="text-red-400" title={provider.lastFailure.error || ''}>
                  {formatRelativeTime(provider.lastFailure.at)}
                </span>
              ) : (
                'None'
              )}
            </dd>
            {provider.lastFailure?.error && (
              <p className="text-xs text-red-400/80 mt-1 line-clamp-2">{provider.lastFailure.error}</p>
            )}
          </div>
        </dl>

        {provider.platformReady === false && (
          <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            {provider.platformUnavailableMessage ||
              `${provider.label} is not available on this deployment yet.`}
          </p>
        )}

        {provider.health?.message && (
          <p className="text-xs text-vibe-muted">
            Health: {provider.health.message}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-vibe-muted mr-1">Channel</span>
            <button
              type="button"
              role="switch"
              aria-checked={provider.enabled}
              aria-label={`Enable ${provider.label}`}
              disabled={toggling || provider.platformReady === false}
              onClick={() => onToggleEnabled(provider, true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                provider.enabled
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'border border-vibe-border text-vibe-muted hover:bg-white/5'
              }`}
            >
              Enable
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={!provider.enabled}
              aria-label={`Disable ${provider.label}`}
              disabled={toggling}
              onClick={() => onToggleEnabled(provider, false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                !provider.enabled
                  ? 'bg-white/10 text-white ring-1 ring-vibe-border'
                  : 'border border-vibe-border text-vibe-muted hover:bg-white/5'
              }`}
            >
              Disable
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onTest(provider.id)}
              disabled={
                testing ||
                !isActive ||
                !provider.enabled ||
                !provider.connected ||
                provider.platformReady === false
              }
              className="px-3.5 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-40"
            >
              {testing ? 'Sending…' : 'Send Test Notification'}
            </button>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="px-3.5 py-2 rounded-lg border border-vibe-border hover:bg-white/5 text-sm font-medium transition-colors"
            >
              {expanded ? 'Hide settings' : 'Configure'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-3 border-t border-vibe-border pt-4">
          {provider.configSchema.map((field) => (
            <label key={field.key} className="block text-sm">
              <span className="text-vibe-muted mb-1.5 block">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </span>
              <input
                type={field.type === 'url' && provider.config?.webhook_configured ? 'password' : (field.type ?? 'text')}
                value={getFieldValue(field.key)}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={
                  field.key === 'webhook_url' && provider.config?.webhook_configured
                    ? '•••• webhook configured — paste to replace'
                    : field.placeholder
                }
                disabled={provider.platformReady === false}
                className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50 disabled:opacity-50"
              />
              {field.help && (
                <span className="block text-xs text-vibe-muted mt-1.5">{field.help}</span>
              )}
            </label>
          ))}

          {provider.setupGuide?.length > 0 && (
            <ol className="text-xs text-vibe-muted space-y-1.5 list-decimal list-inside bg-black/20 rounded-lg p-3">
              {provider.setupGuide.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || provider.platformReady === false}
            className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save ${provider.label}`}
          </button>
        </div>
      )}
    </article>
  );
}
