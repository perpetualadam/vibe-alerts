'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';
import WizardChecklist from '@/components/dashboard/setup/WizardChecklist';

function CopyField({ label, value, onCopied }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-vibe-muted">{label}</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono text-vibe-accent break-all">
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            onCopied?.();
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 text-xs px-3 py-2 rounded-lg border border-vibe-border hover:bg-white/5"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function resolveActiveStep(steps) {
  if (!steps?.platform) return 'platform';
  if (!steps?.credentials) return 'credentials';
  if (!steps?.instructions) return 'instructions';
  if (!steps?.test) return 'test';
  if (!steps?.complete) return 'complete';
  return 'complete';
}

/**
 * Multi-step Website Integration Wizard.
 */
export default function IntegrationWizard({ onToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [activeStep, setActiveStep] = useState('platform');
  const [snippet, setSnippet] = useState('');
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/setup');
      if (!res.ok) throw new Error('Failed to load setup wizard');
      const json = await res.json();
      setData(json);
      setActiveStep(resolveActiveStep(json.progress?.steps));
    } catch (err) {
      onToast?.(err.message || 'Could not load wizard', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const progress = data?.progress;
  const steps = progress?.steps || {};
  const guide = data?.guide;
  const credentials = data?.credentials;

  const completedCount = useMemo(() => {
    return Object.values(steps).filter(Boolean).length;
  }, [steps]);

  const mutate = async (body) => {
    const res = await fetch('/api/dashboard/setup', {
      method: 'PUT',
      headers: dashboardMutationHeaders(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Update failed');
    return json;
  };

  const selectPlatform = async (platformId) => {
    setBusy('platform');
    setTestResult(null);
    setSnippet('');
    try {
      const json = await mutate({ action: 'select_platform', platform: platformId });
      setData((prev) => ({
        ...prev,
        progress: json.progress,
        guide: json.guide,
      }));
      setActiveStep('credentials');
      onToast?.(`${json.guide.label} selected`, 'success');
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const markStep = async (step, nextActive) => {
    setBusy(step);
    try {
      const json = await mutate({ action: 'mark_step', step });
      setData((prev) => ({ ...prev, progress: json.progress }));
      if (nextActive) setActiveStep(nextActive);
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const loadSnippet = async () => {
    setBusy('snippet');
    try {
      const res = await fetch('/api/dashboard/integrations', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ platform: 'html' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not generate snippet');
      setSnippet(json.snippet || '');
      onToast?.('HTML snippet ready', 'success');
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const runTest = async (mode) => {
    setBusy(mode === 'verify_site' ? 'verify' : 'test');
    setTestResult(null);
    try {
      const res = await fetch('/api/dashboard/setup/test', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTestResult({ ok: false, error: json.error, delivery: json.delivery });
        if (json.progress) {
          setData((prev) => ({ ...prev, progress: json.progress }));
        }
        throw new Error(json.error || 'Connection test failed');
      }
      setTestResult({
        ok: true,
        message: json.message,
        eventId: json.eventId,
        delivery: json.delivery,
        warning: json.warning,
      });
      setData((prev) => ({ ...prev, progress: json.progress }));
      setActiveStep('complete');
      onToast?.(json.message || 'Connection test passed', 'success');
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const complete = async () => {
    setBusy('complete');
    try {
      const res = await fetch('/api/dashboard/setup/complete', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not complete setup');
      setData((prev) => ({ ...prev, progress: json.progress }));
      onToast?.('Website integration setup complete', 'success');
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-vibe-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-vibe-muted">Could not load the setup wizard. Refresh and try again.</p>
    );
  }

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-start">
      <aside className="glass rounded-xl p-4 space-y-4 lg:sticky lg:top-28">
        <div>
          <p className="text-xs uppercase tracking-wide text-vibe-muted">Progress</p>
          <p className="text-sm mt-1">
            {completedCount} / {(data.checklist || []).length} steps
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-vibe-accent transition-all"
              style={{
                width: `${Math.round(
                  (completedCount / Math.max((data.checklist || []).length, 1)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
        <WizardChecklist
          checklist={data.checklist || []}
          steps={steps}
          activeStep={activeStep}
          onSelect={setActiveStep}
        />
      </aside>

      <section className="glass rounded-xl p-6 space-y-6 min-w-0">
        {activeStep === 'platform' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">What platform are you using?</h2>
              <p className="text-sm text-vibe-muted mt-1">
                We will show tailored install steps for your site builder or form tool.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {(data.platforms || []).map((platform) => {
                const selected = progress?.platform === platform.id;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    disabled={busy === 'platform'}
                    onClick={() => selectPlatform(platform.id)}
                    className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                      selected
                        ? 'border-vibe-accent bg-vibe-accent/10'
                        : 'border-vibe-border hover:bg-white/5'
                    }`}
                  >
                    <span className="font-medium block">
                      {platform.label}
                      {platform.native ? (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-vibe-accent">
                          Native
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-vibe-muted mt-1 block">
                      {platform.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeStep === 'credentials' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Your connection credentials</h2>
              <p className="text-sm text-vibe-muted mt-1">
                Copy these into {guide?.label || 'your platform'}. Keep the API key private.
              </p>
            </div>
            {!credentials?.subscriptionActive && (
              <p className="text-sm text-amber-300/90 bg-amber-500/10 ring-1 ring-amber-500/20 rounded-lg px-3 py-2">
                Your subscription is inactive. You can still copy credentials, but the connection
                test requires an active plan.{' '}
                <Link href="/dashboard" className="underline text-vibe-accent">
                  Subscribe on the dashboard
                </Link>
                .
              </p>
            )}
            <CopyField label="Webhook URL" value={credentials?.webhookUrl} />
            <CopyField label="API Key" value={credentials?.apiKey} />
            <div className="bg-black/30 rounded-lg p-3 text-xs font-mono text-vibe-muted space-y-1">
              <div>X-VibeAlerts-Platform: {guide?.integrationId || '…'}</div>
              <div>X-VibeAlerts-Key: {credentials?.apiKey ? '••••••••' : '(unavailable)'}</div>
            </div>
            <button
              type="button"
              disabled={!progress?.platform || busy === 'credentials'}
              onClick={() => markStep('credentials', 'instructions')}
              className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
            >
              {busy === 'credentials' ? 'Saving…' : "I've copied my credentials"}
            </button>
          </div>
        )}

        {activeStep === 'instructions' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
                Set up {guide?.label || 'your platform'}
              </h2>
              <p className="text-sm text-vibe-muted mt-1">{guide?.blurb}</p>
            </div>
            {!guide ? (
              <p className="text-sm text-vibe-muted">Choose a platform first.</p>
            ) : (
              <ol className="space-y-4">
                {guide.steps.map((step, i) => (
                  <li key={i} className="border border-vibe-border rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">
                      <span className="text-vibe-muted mr-2">{i + 1}.</span>
                      {step.title}
                    </p>
                    <p className="text-sm text-vibe-muted leading-relaxed">{step.body}</p>
                    {step.kind === 'credentials' && (
                      <div className="pt-2 space-y-2">
                        <CopyField label="Webhook URL" value={credentials?.webhookUrl} />
                        <CopyField label="API Key" value={credentials?.apiKey} />
                      </div>
                    )}
                    {step.kind === 'code' && (
                      <div className="pt-2 space-y-2">
                        <button
                          type="button"
                          onClick={loadSnippet}
                          disabled={busy === 'snippet'}
                          className="text-sm px-3 py-1.5 rounded-lg border border-vibe-border hover:bg-white/5"
                        >
                          {busy === 'snippet' ? 'Generating…' : 'Generate HTML snippet'}
                        </button>
                        {snippet && (
                          <pre className="text-xs bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                            {snippet}
                          </pre>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {guide?.tips?.length > 0 && (
              <ul className="text-xs text-vibe-muted list-disc list-inside space-y-1">
                {guide.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            )}
            <button
              type="button"
              disabled={!steps.credentials || busy === 'instructions'}
              onClick={() => markStep('instructions', 'test')}
              className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
            >
              {busy === 'instructions' ? 'Saving…' : 'I finished these steps'}
            </button>
          </div>
        )}

        {activeStep === 'test' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Test the connection</h2>
              <p className="text-sm text-vibe-muted mt-1">
                We will not mark setup complete until a webhook reaches VibeAlerts for{' '}
                {guide?.label || 'your platform'}.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={!steps.instructions || busy === 'test'}
                onClick={() => runTest('simulate')}
                className="px-4 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
              >
                {busy === 'test' ? 'Sending…' : 'Send Test Notification'}
              </button>
              <button
                type="button"
                disabled={!steps.instructions || busy === 'verify'}
                onClick={() => runTest('verify_site')}
                className="px-4 py-2.5 rounded-lg border border-vibe-border hover:bg-white/5 text-sm disabled:opacity-50"
              >
                {busy === 'verify' ? 'Checking…' : 'I submitted a form on my site'}
              </button>
            </div>
            <p className="text-xs text-vibe-muted">
              <strong className="text-white/80 font-medium">Send Test Notification</strong> posts a
              sample {guide?.label} payload through your webhook and fans out to enabled channels
              (recommended).{' '}
              <strong className="text-white/80 font-medium">I submitted a form</strong> looks for a
              real event from your site in the last 30 minutes.
            </p>
            {testResult && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  testResult.ok
                    ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-red-500/10 text-red-300 ring-1 ring-red-500/30'
                }`}
              >
                {testResult.ok ? testResult.message : testResult.error}
                {testResult.eventId && (
                  <span className="block text-xs mt-1 opacity-80 font-mono">
                    event: {testResult.eventId}
                  </span>
                )}
                {testResult.warning && (
                  <span className="block text-xs mt-1">{testResult.warning}</span>
                )}
              </div>
            )}
            {progress?.lastTestStatus === 'passed' && !testResult && (
              <p className="text-sm text-emerald-300">
                Last test passed{progress.lastTestAt ? ` · ${new Date(progress.lastTestAt).toLocaleString()}` : ''}.
                Continue to mark complete.
              </p>
            )}
          </div>
        )}

        {activeStep === 'complete' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Finish setup</h2>
              <p className="text-sm text-vibe-muted mt-1">
                {steps.test
                  ? 'Connection verified. Mark the wizard complete when you are ready.'
                  : 'Pass the connection test before finishing.'}
              </p>
            </div>
            {steps.complete ? (
              <div className="rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/30 px-4 py-3 space-y-2">
                <p className="text-sm text-emerald-300 font-medium">Setup complete</p>
                <p className="text-xs text-vibe-muted">
                  {guide?.label} is connected
                  {progress.completedAt
                    ? ` · ${new Date(progress.completedAt).toLocaleString()}`
                    : ''}
                  . Manage notification channels anytime from the Notifications page.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href="/dashboard/notifications"
                    className="text-sm px-3 py-1.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white"
                  >
                    Open Notifications
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveStep('platform')}
                    className="text-sm px-3 py-1.5 rounded-lg border border-vibe-border hover:bg-white/5"
                  >
                    Set up another platform
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={!steps.test || busy === 'complete'}
                onClick={complete}
                className="px-4 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
              >
                {busy === 'complete' ? 'Saving…' : 'Mark setup complete'}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
