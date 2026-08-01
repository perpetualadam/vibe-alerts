'use client';

import { useEffect, useState } from 'react';

/**
 * Renders channel configuration from the plugin registry catalog.
 * No hardcoded channel definitions — driven by /api/dashboard/plugins.
 */
export default function ChannelSettings({
  plugins,
  channelConfigs,
  onSave,
  onTest,
  testing,
  isActive,
}) {
  const [form, setForm] = useState({});
  const [enabled, setEnabled] = useState({});
  const [saving, setSaving] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!plugins?.length) return;
    const enabledMap = {};
    for (const plugin of plugins) {
      enabledMap[plugin.id] = channelConfigs?.[plugin.id]?.enabled ?? plugin.id === 'telegram';
    }
    setEnabled(enabledMap);
    if (!expanded) setExpanded(plugins[0]?.id ?? null);
  }, [plugins, channelConfigs, expanded]);

  const getFieldValue = (pluginId, fieldKey) => {
    const overrideKey = `${pluginId}.${fieldKey}`;
    if (form[overrideKey] !== undefined) return form[overrideKey];
    return channelConfigs?.[pluginId]?.config?.[fieldKey] ?? '';
  };

  const isPluginConfigured = (plugin) => {
    const entry = channelConfigs?.[plugin.id];
    if (!entry?.config) return false;
    return plugin.configSchema.every((field) => {
      if (!field.required) return true;
      return Boolean(String(entry.config[field.key] ?? '').trim());
    });
  };

  const anyConfigured = plugins?.some(isPluginConfigured) ?? false;

  const toggleEnabled = (pluginId) => {
    setEnabled((prev) => {
      const next = { ...prev, [pluginId]: !prev[pluginId] };
      const enabledCount = Object.values(next).filter(Boolean).length;
      if (enabledCount === 0) return prev;
      return next;
    });
  };

  const savePlugin = async (plugin) => {
    setSaving(plugin.id);
    try {
      const config = {};
      for (const field of plugin.configSchema) {
        config[field.key] = getFieldValue(plugin.id, field.key);
      }

      await onSave({
        channel: plugin.id,
        enabled: enabled[plugin.id],
        config,
      });
      setForm({});
    } finally {
      setSaving(null);
    }
  };

  if (!plugins?.length) {
    return (
      <section className="glass rounded-xl p-6">
        <p className="text-sm text-vibe-muted">Loading notification plugins…</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Notification Channels</h2>
          <p className="text-sm text-vibe-muted mt-1">
            Plugin registry — enable channels and configure destinations. All enabled & configured plugins receive each lead.
          </p>
        </div>
        <button
          type="button"
          onClick={onTest}
          disabled={testing || !anyConfigured || !isActive}
          className="px-4 py-2 rounded-lg border border-vibe-border hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          {testing ? 'Sending…' : 'Send Test Alert'}
        </button>
      </div>

      <div className="space-y-3">
        {plugins.map((plugin) => {
          const isOpen = expanded === plugin.id;
          const configured = isPluginConfigured(plugin);

          return (
            <div key={plugin.id} className="glass rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : plugin.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <label
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={enabled[plugin.id] ?? false}
                      onChange={() => toggleEnabled(plugin.id)}
                      className="rounded border-vibe-border bg-black/40 text-vibe-accent focus:ring-vibe-accent/50"
                    />
                  </label>
                  <div>
                    <span className="font-medium">{plugin.label}</span>
                    <span className="ml-2 text-xs text-vibe-muted">v{plugin.version}</span>
                    <p className="text-xs text-vibe-muted">{plugin.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium ${
                      configured ? 'text-emerald-400' : 'text-vibe-muted'
                    }`}
                  >
                    {configured ? '● Configured' : '○ Not configured'}
                  </span>
                  <span className="text-vibe-muted text-sm">{isOpen ? '▾' : '▸'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-vibe-border pt-4">
                  {plugin.configSchema.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm text-vibe-muted mb-1.5">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <input
                        type={field.type ?? 'text'}
                        value={getFieldValue(plugin.id, field.key)}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [`${plugin.id}.${field.key}`]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        className="w-full bg-black/40 border border-vibe-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
                      />
                      {field.help && (
                        <p className="text-xs text-vibe-muted mt-1.5">{field.help}</p>
                      )}
                    </div>
                  ))}

                  {plugin.setupGuide?.length > 0 && (
                    <ol className="text-xs text-vibe-muted space-y-2 list-decimal list-inside bg-black/20 rounded-lg p-3">
                      {plugin.setupGuide.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  )}

                  <button
                    type="button"
                    onClick={() => savePlugin(plugin)}
                    disabled={saving === plugin.id}
                    className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving === plugin.id ? 'Saving…' : `Save ${plugin.label}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function isAnyChannelConfiguredFromCatalog(plugins, channelConfigs) {
  if (!plugins?.length || !channelConfigs) return false;
  return plugins.some((plugin) => {
    const entry = channelConfigs[plugin.id];
    if (!entry?.enabled) return false;
    return plugin.configSchema.every((field) => {
      if (!field.required) return true;
      return Boolean(String(entry.config?.[field.key] ?? '').trim());
    });
  });
}
