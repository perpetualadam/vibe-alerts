'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';

const NATIVE_IDS = new Set([
  'wix',
  'squarespace',
  'webflow',
  'jotform',
  'typeform',
  'gravity_forms',
  'elementor_forms',
  'contact_form_7',
  'wpforms',
  'fluent_forms',
]);

export default function PlatformIntegrations({ webhookToken, apiKey, onToast }) {
  const [platforms, setPlatforms] = useState([]);
  const [expanded, setExpanded] = useState('wix');
  const [copied, setCopied] = useState('');
  const [testing, setTesting] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard/integrations')
      .then((r) => r.json())
      .then((d) => setPlatforms(d.platforms ?? []))
      .catch(() => {});
  }, []);

  const copyText = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const webhookUrl = webhookToken
    ? `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')}/api/v1/webhook/${webhookToken}`
    : '';

  const sendTest = async (platformId) => {
    setTesting(platformId);
    try {
      const res = await fetch('/api/dashboard/integrations/test', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ platform: platformId }),
      });
      const json = await res.json();
      if (!res.ok) {
        onToast?.(json.error || 'Test notification failed', 'error');
        return;
      }
      onToast?.(json.message || 'Test notification sent', 'success');
    } catch {
      onToast?.('Test notification failed', 'error');
    } finally {
      setTesting(null);
    }
  };

  const native = platforms.filter((p) => NATIVE_IDS.has(p.id));
  const other = platforms.filter((p) => !NATIVE_IDS.has(p.id));
  const ordered = [...native, ...other];

  return (
    <section className="glass rounded-xl p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Website Platform Integrations</h2>
          <p className="text-sm text-vibe-muted mt-1">
            First-class setup guides for Wix, Squarespace, Webflow, Jotform, Typeform, and WordPress
            form plugins — each with Send Test Notification.
          </p>
        </div>
        <Link
          href="/dashboard/setup"
          className="text-sm text-vibe-accent hover:underline shrink-0"
        >
          Open setup wizard →
        </Link>
      </div>

      <div className="space-y-3">
        {ordered.map((platform) => {
          const isOpen = expanded === platform.id;
          const isNative = NATIVE_IDS.has(platform.id);
          return (
            <div key={platform.id} className="border border-vibe-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : platform.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] text-left"
              >
                <div>
                  <span className="font-medium">{platform.label}</span>
                  {isNative && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-vibe-accent">
                      Native
                    </span>
                  )}
                  <span className="ml-2 text-xs text-vibe-muted">v{platform.version}</span>
                  <p className="text-xs text-vibe-muted mt-0.5">{platform.description}</p>
                </div>
                <span className="text-vibe-muted">{isOpen ? '▾' : '▸'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-vibe-border pt-3">
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-vibe-muted mb-2">
                      Setup guide
                    </h3>
                    <ol className="text-sm text-vibe-muted space-y-2 list-decimal list-inside">
                      {(platform.setupSteps || []).map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {platform.pluginPath && (
                    <p className="text-xs text-vibe-muted">
                      Connector:{' '}
                      <code className="bg-black/40 px-1.5 py-0.5 rounded">{platform.pluginPath}</code>
                    </p>
                  )}

                  <div className="bg-black/30 rounded-lg p-3 space-y-2 text-xs font-mono">
                    <div>
                      <span className="text-vibe-muted">Webhook URL:</span>
                      <div className="text-vibe-accent break-all mt-1">{webhookUrl}</div>
                    </div>
                    <div>
                      <span className="text-vibe-muted">Required headers:</span>
                      <pre className="mt-1 text-vibe-muted whitespace-pre-wrap">{`X-VibeAlerts-Platform: ${platform.id}\nX-VibeAlerts-Key: ${apiKey ? '••••••••' : '(reveal API key above)'}`}</pre>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!apiKey || testing === platform.id}
                      onClick={() => sendTest(platform.id)}
                      className="text-sm px-3 py-1.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white disabled:opacity-50"
                    >
                      {testing === platform.id ? 'Sending…' : 'Send Test Notification'}
                    </button>
                    {apiKey && (
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            `curl -X POST "${webhookUrl}" -H "Content-Type: application/json" -H "X-VibeAlerts-Platform: ${platform.id}" -H "X-VibeAlerts-Key: ${apiKey}" -d "{\\"name\\":\\"Test\\",\\"email\\":\\"test@example.com\\",\\"message\\":\\"Hello\\"}"`,
                            platform.id
                          )
                        }
                        className="text-sm px-3 py-1.5 rounded-lg border border-vibe-border hover:bg-white/5"
                      >
                        {copied === platform.id ? 'Copied curl!' : 'Copy test curl'}
                      </button>
                    )}
                    <Link
                      href="/dashboard/setup"
                      className="text-sm px-3 py-1.5 rounded-lg border border-vibe-border hover:bg-white/5 inline-flex items-center"
                    >
                      Guided setup
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
