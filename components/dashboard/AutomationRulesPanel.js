'use client';

import { useCallback, useEffect, useState } from 'react';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';

const CHANNEL_OPTIONS = ['whatsapp', 'teams', 'telegram', 'email', 'slack', 'discord'];

const EMPTY_DRAFT = {
  name: '',
  description: '',
  enabled: true,
  priority: 50,
  stop_processing: false,
  conditions: [{ type: 'field_eq', field: 'priority', value: 'High' }],
  actions: [{ type: 'notify_channels', channels: ['whatsapp', 'teams'] }],
};

function summarizeCondition(c) {
  switch (c.type) {
    case 'field_eq':
      return `${c.field} is ${c.value}`;
    case 'field_neq':
      return `${c.field} is not ${c.value}`;
    case 'field_contains':
      return `${c.field} contains “${c.value}”`;
    case 'field_gt':
      return `${c.field} > ${c.value}`;
    case 'field_gte':
      return `${c.field} ≥ ${c.value}`;
    case 'spam_score_gt':
      return `spam score > ${Math.round(Number(c.value) * 100)}%`;
    case 'spam_score_gte':
      return `spam score ≥ ${Math.round(Number(c.value) * 100)}%`;
    case 'any_field_contains':
      return `any field contains “${c.value}”`;
    default:
      return c.type;
  }
}

function summarizeAction(a) {
  switch (a.type) {
    case 'ignore':
      return 'ignore submission';
    case 'notify_channels':
      return `send to ${(a.channels || []).join(' + ')}`;
    case 'notify_workspace':
      return `notify ${a.workspace} workspace`;
    case 'set_priority':
      return `mark as ${a.value}`;
    case 'set_field':
      return `set ${a.field} = ${a.value}`;
    default:
      return a.type;
  }
}

/**
 * Manage if/then automation rules for inbound webhooks.
 */
export default function AutomationRulesPanel({ onToast }) {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/rules', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load rules');
      const json = await res.json();
      setRules(json.rules || []);
      setTemplates(json.templates || []);
    } catch (err) {
      onToast?.(err.message || 'Could not load rules', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT, conditions: [...EMPTY_DRAFT.conditions], actions: [...EMPTY_DRAFT.actions] });
  };

  const openEdit = (rule) => {
    setEditingId(rule.id);
    setDraft({
      name: rule.name,
      description: rule.description || '',
      enabled: rule.enabled,
      priority: rule.priority,
      stop_processing: rule.stopProcessing,
      conditions: rule.conditions?.length ? rule.conditions : EMPTY_DRAFT.conditions,
      actions: rule.actions?.length ? rule.actions : EMPTY_DRAFT.actions,
    });
  };

  const parsePrompt = async () => {
    setBusy('parse');
    try {
      const res = await fetch('/api/dashboard/rules', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ action: 'parse', prompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not parse rule');
      setEditingId(null);
      setDraft(json.draft);
      onToast?.('Draft ready — review and save', 'success');
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const addFromTemplate = async (templateId) => {
    setBusy(`tpl-${templateId}`);
    try {
      const res = await fetch('/api/dashboard/rules', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ action: 'from_template', templateId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not add template');
      onToast?.('Rule created from template', 'success');
      await load();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    setBusy('save');
    try {
      const url = editingId ? `/api/dashboard/rules/${editingId}` : '/api/dashboard/rules';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: dashboardMutationHeaders(),
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      onToast?.(editingId ? 'Rule updated' : 'Rule created', 'success');
      setDraft(null);
      setEditingId(null);
      await load();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const toggleRule = async (rule) => {
    setBusy(`toggle-${rule.id}`);
    try {
      const res = await fetch(`/api/dashboard/rules/${rule.id}`, {
        method: 'PATCH',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ action: 'toggle', enabled: !rule.enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Toggle failed');
      await load();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const removeRule = async (rule) => {
    if (!window.confirm(`Delete rule “${rule.name}”?`)) return;
    setBusy(`del-${rule.id}`);
    try {
      const res = await fetch(`/api/dashboard/rules/${rule.id}`, {
        method: 'DELETE',
        headers: dashboardMutationHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      onToast?.('Rule deleted', 'success');
      await load();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const updateCondition = (index, patch) => {
    setDraft((prev) => {
      const conditions = [...prev.conditions];
      conditions[index] = { ...conditions[index], ...patch };
      return { ...prev, conditions };
    });
  };

  const updateAction = (index, patch) => {
    setDraft((prev) => {
      const actions = [...prev.actions];
      actions[index] = { ...actions[index], ...patch };
      return { ...prev, actions };
    });
  };

  if (loading) {
    return <p className="text-sm text-vibe-muted">Loading automation rules…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-white">Describe a rule</h2>
          <p className="text-sm text-vibe-muted mt-0.5">
            Plain English drafts — e.g. “If priority is High, send to WhatsApp and Teams.”
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="If message contains 'urgent', mark as Critical."
            className="flex-1 bg-black/40 border border-vibe-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vibe-accent/50"
          />
          <button
            type="button"
            disabled={!prompt.trim() || busy === 'parse'}
            onClick={parsePrompt}
            className="px-4 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {busy === 'parse' ? 'Parsing…' : 'Draft rule'}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-white">Starter templates</h2>
          <p className="text-sm text-vibe-muted mt-0.5">One-click rules for common routing scenarios</p>
        </div>
        <ul className="grid sm:grid-cols-2 gap-3">
          {templates.map((tpl) => (
            <li key={tpl.id} className="border border-vibe-border rounded-xl px-4 py-3 space-y-2">
              <p className="font-medium text-sm text-white">{tpl.name}</p>
              <p className="text-xs text-vibe-muted">{tpl.description}</p>
              <button
                type="button"
                disabled={busy === `tpl-${tpl.id}`}
                onClick={() => addFromTemplate(tpl.id)}
                className="text-xs text-vibe-accent hover:underline disabled:opacity-50"
              >
                {busy === `tpl-${tpl.id}` ? 'Adding…' : 'Add this rule'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Your rules</h2>
            <p className="text-sm text-vibe-muted mt-0.5">
              Lower priority numbers run first. Channel filters require those providers to be enabled.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="text-sm px-3 py-1.5 rounded-lg border border-vibe-border hover:bg-white/5"
          >
            New rule
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="text-sm text-vibe-muted">No rules yet — add a template or describe one above.</p>
        ) : (
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="border border-vibe-border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{rule.name}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wide ${
                        rule.enabled ? 'text-emerald-400' : 'text-vibe-muted'
                      }`}
                    >
                      {rule.enabled ? 'On' : 'Off'}
                    </span>
                    <span className="text-[10px] text-vibe-muted">priority {rule.priority}</span>
                  </div>
                  <p className="text-xs text-vibe-muted">
                    If {(rule.conditions || []).map(summarizeCondition).join(' and ')}, then{' '}
                    {(rule.actions || []).map(summarizeAction).join('; ')}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busy === `toggle-${rule.id}`}
                    onClick={() => toggleRule(rule)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-vibe-border hover:bg-white/5"
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(rule)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-vibe-border hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy === `del-${rule.id}`}
                    onClick={() => removeRule(rule)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {draft && (
        <section className="border border-vibe-border rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">
              {editingId ? 'Edit rule' : 'New rule'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setEditingId(null);
              }}
              className="text-xs text-vibe-muted hover:text-white"
            >
              Cancel
            </button>
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-vibe-muted">Name</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full bg-black/40 border border-vibe-border rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-vibe-muted">Run order (lower first)</span>
              <input
                type="number"
                min={0}
                max={10000}
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
                className="w-full bg-black/40 border border-vibe-border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 mt-6 text-sm text-vibe-muted">
              <input
                type="checkbox"
                checked={Boolean(draft.stop_processing)}
                onChange={(e) => setDraft({ ...draft, stop_processing: e.target.checked })}
              />
              Stop after this rule matches
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-vibe-muted">Conditions (all must match)</p>
            {draft.conditions.map((c, i) => (
              <div key={i} className="grid sm:grid-cols-3 gap-2">
                <select
                  value={c.type}
                  onChange={(e) => updateCondition(i, { type: e.target.value })}
                  className="bg-black/40 border border-vibe-border rounded-lg px-2 py-2 text-sm"
                >
                  <option value="field_eq">Field equals</option>
                  <option value="field_contains">Field contains</option>
                  <option value="field_gt">Field greater than</option>
                  <option value="spam_score_gt">Spam score greater than</option>
                  <option value="any_field_contains">Any field contains</option>
                </select>
                {!String(c.type).startsWith('spam_score') && c.type !== 'any_field_contains' ? (
                  <input
                    value={c.field || ''}
                    onChange={(e) => updateCondition(i, { field: e.target.value })}
                    placeholder="field (priority)"
                    className="bg-black/40 border border-vibe-border rounded-lg px-2 py-2 text-sm"
                  />
                ) : (
                  <div />
                )}
                <input
                  value={c.value ?? ''}
                  onChange={(e) =>
                    updateCondition(i, {
                      value: String(c.type).startsWith('spam_score')
                        ? Number(e.target.value)
                        : e.target.value,
                    })
                  }
                  placeholder={String(c.type).startsWith('spam_score') ? '0.8' : 'value'}
                  className="bg-black/40 border border-vibe-border rounded-lg px-2 py-2 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              className="text-xs text-vibe-accent"
              onClick={() =>
                setDraft({
                  ...draft,
                  conditions: [...draft.conditions, { type: 'field_eq', field: '', value: '' }],
                })
              }
            >
              + Add condition
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-vibe-muted">Actions</p>
            {draft.actions.map((a, i) => (
              <div key={i} className="space-y-2 border border-vibe-border/60 rounded-lg p-3">
                <select
                  value={a.type}
                  onChange={(e) => updateAction(i, { type: e.target.value })}
                  className="w-full bg-black/40 border border-vibe-border rounded-lg px-2 py-2 text-sm"
                >
                  <option value="notify_channels">Send to channels</option>
                  <option value="notify_workspace">Notify workspace</option>
                  <option value="ignore">Ignore submission</option>
                  <option value="set_priority">Set priority</option>
                  <option value="set_field">Set field</option>
                </select>
                {a.type === 'notify_channels' && (
                  <div className="flex flex-wrap gap-2">
                    {CHANNEL_OPTIONS.map((ch) => {
                      const selected = (a.channels || []).includes(ch);
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => {
                            const set = new Set(a.channels || []);
                            if (selected) set.delete(ch);
                            else set.add(ch);
                            updateAction(i, { channels: [...set] });
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg border ${
                            selected
                              ? 'border-vibe-accent bg-vibe-accent/15 text-white'
                              : 'border-vibe-border text-vibe-muted'
                          }`}
                        >
                          {ch}
                        </button>
                      );
                    })}
                  </div>
                )}
                {a.type === 'notify_workspace' && (
                  <input
                    value={a.workspace || ''}
                    onChange={(e) => updateAction(i, { workspace: e.target.value })}
                    placeholder="Sales"
                    className="w-full bg-black/40 border border-vibe-border rounded-lg px-2 py-2 text-sm"
                  />
                )}
                {a.type === 'set_priority' && (
                  <input
                    value={a.value || ''}
                    onChange={(e) => updateAction(i, { value: e.target.value })}
                    placeholder="Critical"
                    className="w-full bg-black/40 border border-vibe-border rounded-lg px-2 py-2 text-sm"
                  />
                )}
                {a.type === 'set_field' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={a.field || ''}
                      onChange={(e) => updateAction(i, { field: e.target.value })}
                      placeholder="field"
                      className="bg-black/40 border border-vibe-border rounded-lg px-2 py-2 text-sm"
                    />
                    <input
                      value={a.value || ''}
                      onChange={(e) => updateAction(i, { value: e.target.value })}
                      placeholder="value"
                      className="bg-black/40 border border-vibe-border rounded-lg px-2 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              className="text-xs text-vibe-accent"
              onClick={() =>
                setDraft({
                  ...draft,
                  actions: [...draft.actions, { type: 'set_field', field: '', value: '' }],
                })
              }
            >
              + Add action
            </button>
          </div>

          <p className="text-xs text-vibe-muted">
            Workspace routing matches channels whose config includes{' '}
            <code className="text-vibe-muted/80">workspace</code> (e.g. set Teams/Slack config{' '}
            <code className="text-vibe-muted/80">workspace=Sales</code>).
          </p>

          <button
            type="button"
            disabled={busy === 'save'}
            onClick={saveDraft}
            className="px-4 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {busy === 'save' ? 'Saving…' : editingId ? 'Save changes' : 'Create rule'}
          </button>
        </section>
      )}
    </div>
  );
}
