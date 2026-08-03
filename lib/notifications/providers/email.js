import { NotificationProvider } from './base';
import { getOptionalEnv } from '@/lib/env';
import { getSupportEmail } from '@/lib/legal/site';
import { logger } from '@/lib/logger';
import { escapeHtml, formatFieldLabel, payloadToPlainLines } from '@/lib/notifications/utils/text';
import { buildMergedSpfRecord } from '@/lib/email/spf';

const RESEND_API = 'https://api.resend.com/emails';

/**
 * Enrich Resend/domain failures with Cloudflare Email Routing SPF guidance.
 * Enabling Email Routing often overwrites root SPF and drops include:resend.com.
 * @param {string} message
 * @returns {string}
 */
export function enrichEmailProviderError(message) {
  const text = String(message ?? '').trim() || 'Email send failed';
  if (
    /spf|dkim|dmarc|domain(?:\s+is)?\s+not\s+verified|not\s+verified|dns|from\s+address|sender/i.test(
      text
    )
  ) {
    return `${text} If you enabled Cloudflare Email Routing, keep a single root SPF record that includes both Cloudflare and Resend (${buildMergedSpfRecord()}) and preserve Resend DKIM TXT records. See docs/CLOUDFLARE.md.`;
  }
  return text;
}

function formatEmailHtml(payload, sourceLabel = 'Website Form') {
  const rows = Object.entries(payload)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:8px 12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">${escapeHtml(formatFieldLabel(key))}</td><td style="padding:8px 12px;color:#111827;border-bottom:1px solid #e5e7eb;">${escapeHtml(String(value))}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
<div style="background:#6366f1;color:#fff;padding:16px 20px;font-size:18px;font-weight:600;">🔔 New Lead — ${escapeHtml(sourceLabel)}</div>
<table style="width:100%;border-collapse:collapse;">${rows}</table>
<div style="padding:12px 20px;font-size:12px;color:#9ca3af;">Received via VibeAlerts</div>
</div></body></html>`;
}

export class EmailProvider extends NotificationProvider {
  static id = 'email';
  static version = '1.0.0';
  static label = 'Email';
  static description = 'HTML email alerts via Resend';
  static configSchema = [
    {
      key: 'to',
      label: 'Recipient Email',
      type: 'email',
      placeholder: 'you@yourbusiness.com',
      required: true,
    },
  ];
  static platformUnavailableMessage =
    'Email alerts are not enabled on VibeAlerts yet. Use Telegram, Slack, or Teams, or contact support to request email delivery.';
  static setupGuide = [
    'Enter the email address where you want to receive lead alerts.',
    'Save this channel, then send a test alert from the button above.',
    'If alerts do not arrive within a minute, check your spam folder.',
  ];

  isPlatformReady() {
    const { resendApiKey, resendFromEmail } = getOptionalEnv();
    return Boolean(resendApiKey && resendFromEmail);
  }

  validateConfig(config) {
    const to = String(config.to ?? '').trim();
    if (!to) return { valid: false, error: 'Recipient email is required' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return { valid: false, error: 'Invalid email address' };
    }
    return { valid: true, config: { to } };
  }

  formatMessage(payload) {
    return {
      subject: '🔔 New Lead — VibeAlerts',
      html: formatEmailHtml(payload),
      text: payloadToPlainLines(payload).join('\n'),
    };
  }

  async send(context) {
    const validated = this.validateConfig(this.getConfig(context));
    if (!validated.valid) {
      return { success: false, error: validated.error, retryable: false };
    }

    const { resendApiKey, resendFromEmail } = getOptionalEnv();
    if (!resendApiKey || !resendFromEmail) {
      return {
        success: false,
        error: 'Email alerts are not available on this platform yet',
        retryable: false,
      };
    }

    const formatted = this.formatMessage(context.payload);
    const supportEmail = getSupportEmail();
    const replyTo =
      supportEmail &&
      supportEmail.toLowerCase() !== String(resendFromEmail).trim().toLowerCase()
        ? supportEmail
        : undefined;

    try {
      const res = await fetch(RESEND_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [validated.config.to],
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: formatted.subject,
          html: formatted.html,
          text: formatted.text,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rawError =
          data.message ||
          (typeof data.error === 'string' ? data.error : data.error?.message) ||
          `HTTP ${res.status}`;
        return {
          success: false,
          error: enrichEmailProviderError(rawError),
          response: data,
          retryable: res.status >= 500 || res.status === 429,
        };
      }
      return { success: true, response: data };
    } catch (err) {
      logger.error('Email send failed', { error: err.message });
      return { success: false, error: enrichEmailProviderError(err.message), retryable: true };
    }
  }
}

export const emailPlugin = {
  id: EmailProvider.id,
  version: EmailProvider.version,
  label: EmailProvider.label,
  description: EmailProvider.description,
  configSchema: EmailProvider.configSchema,
  setupGuide: EmailProvider.setupGuide,
  platformUnavailableMessage: EmailProvider.platformUnavailableMessage,
  provider: new EmailProvider(),
};
