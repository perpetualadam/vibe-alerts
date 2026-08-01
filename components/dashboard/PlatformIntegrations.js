'use client';

import { useEffect, useState } from 'react';

export default function PlatformIntegrations({ webhookToken, apiKey }) {
  const [platforms, setPlatforms] = useState([]);
  const [expanded, setExpanded] = useState('wordpress');
  const [copied, setCopied] = useState('');

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

  return (
    <section className="glass rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Website Platform Integrations</h2>
        <p className="text-sm text-vibe-muted mt-1">
          Connect WordPress, Wix, Webflow, Shopify, or any HTML form. All use your webhook URL + API key.
        </p>
      </div>

      <div className="space-y-3">
        {platforms.map((platform) => {
          const isOpen = expanded === platform.id;
          return (
            <div key={platform.id} className="border border-vibe-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : platform.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] text-left"
              >
                <div>
                  <span className="font-medium">{platform.label}</span>
                  <span className="ml-2 text-xs text-vibe-muted">v{platform.version}</span>
                  <p className="text-xs text-vibe-muted mt-0.5">{platform.description}</p>
                </div>
                <span className="text-vibe-muted">{isOpen ? '▾' : '▸'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-vibe-border pt-3">
                  <ol className="text-sm text-vibe-muted space-y-2 list-decimal list-inside">
                    {platform.setupSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>

                  {platform.pluginPath && (
                    <p className="text-xs text-vibe-muted">
                      Connector file:{' '}
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
                      {copied === platform.id ? 'Copied curl!' : 'Copy test curl command'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
