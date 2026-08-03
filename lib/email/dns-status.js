/**
 * Evaluate DNS snapshots for Cloudflare Email Routing + Resend coexistence.
 * Pure logic — callers supply dig/DNS results so this stays unit-testable.
 */

import { analyzeSpfForEmailRouting } from './spf.js';

const CLOUDFLARE_MX_SUFFIX = '.mx.cloudflare.net';

/**
 * @param {string} hostname
 * @returns {boolean}
 */
export function isCloudflareEmailRoutingMx(hostname) {
  const host = String(hostname ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
  return host.endsWith(CLOUDFLARE_MX_SUFFIX) || host === 'mx.cloudflare.net';
}

/**
 * @param {Array<{ exchange?: string, priority?: number }|string>} mxRecords
 * @returns {{ cloudflareMxCount: number, exchanges: string[], usingCloudflareRouting: boolean }}
 */
export function summarizeMxRecords(mxRecords = []) {
  const exchanges = (mxRecords ?? [])
    .map((record) => {
      if (typeof record === 'string') return record.trim().toLowerCase().replace(/\.$/, '');
      return String(record?.exchange ?? '')
        .trim()
        .toLowerCase()
        .replace(/\.$/, '');
    })
    .filter(Boolean);

  const cloudflareMxCount = exchanges.filter(isCloudflareEmailRoutingMx).length;
  return {
    cloudflareMxCount,
    exchanges,
    usingCloudflareRouting: cloudflareMxCount > 0,
  };
}

/**
 * Detect mixed/partial nameserver cutovers that break Email Routing.
 * vibe-alerts.com was observed with one Cloudflare NS + one name.com NS.
 *
 * @param {string[]} nameservers
 * @returns {{ cloudflareNs: string[], otherNs: string[], healthy: boolean, issues: string[] }}
 */
export function analyzeNameservers(nameservers = []) {
  const normalized = (nameservers ?? [])
    .map((ns) =>
      String(ns ?? '')
        .trim()
        .toLowerCase()
        .replace(/\.$/, '')
    )
    .filter(Boolean);

  const cloudflareNs = normalized.filter((ns) => ns.endsWith('.ns.cloudflare.com'));
  const otherNs = normalized.filter((ns) => !ns.endsWith('.ns.cloudflare.com'));
  const issues = [];

  if (normalized.length === 0) {
    issues.push('No nameservers found.');
  } else if (otherNs.length > 0 && cloudflareNs.length > 0) {
    issues.push(
      `Mixed nameservers detected (${cloudflareNs.join(', ')} + ${otherNs.join(', ')}). Email Routing requires DNS fully on Cloudflare — set BOTH registrar nameservers to the Cloudflare pair and remove registrar leftovers (e.g. name.com).`
    );
  } else if (cloudflareNs.length === 0) {
    issues.push(
      'Domain is not using Cloudflare nameservers. Email Routing only works when Cloudflare DNS is authoritative.'
    );
  } else if (cloudflareNs.length < 2) {
    issues.push(
      'Only one Cloudflare nameserver is configured. Use both nameservers shown in the Cloudflare dashboard Overview.'
    );
  }

  return {
    cloudflareNs,
    otherNs,
    healthy: issues.length === 0,
    issues,
  };
}

/**
 * @param {Object} snapshot
 * @param {string[]} [snapshot.nameservers]
 * @param {Array<{ exchange?: string, priority?: number }|string>} [snapshot.mxRecords]
 * @param {string[]} [snapshot.txtRecords] - root TXT values
 * @param {boolean} [snapshot.hasResendDkim]
 * @param {boolean} [snapshot.hasCloudflareRoutingDkim]
 * @returns {{
 *   ok: boolean,
 *   inboundReady: boolean,
 *   outboundReady: boolean,
 *   issues: string[],
 *   recommendations: string[],
 *   nameservers: ReturnType<typeof analyzeNameservers>,
 *   mx: ReturnType<typeof summarizeMxRecords>,
 *   spf: ReturnType<typeof analyzeSpfForEmailRouting>,
 * }}
 */
export function evaluateEmailDnsStatus({
  nameservers = [],
  mxRecords = [],
  txtRecords = [],
  hasResendDkim = false,
  hasCloudflareRoutingDkim = false,
} = {}) {
  const issues = [];
  const recommendations = [];

  const ns = analyzeNameservers(nameservers);
  issues.push(...ns.issues);

  const mx = summarizeMxRecords(mxRecords);
  if (mx.exchanges.length === 0) {
    issues.push(
      'No MX records found. Inbound mail to @yourdomain will fail. Enable Cloudflare Email Routing (or restore your mail provider MX).'
    );
    recommendations.push(
      'Cloudflare Dashboard → Email → Email Routing → enable routing so Cloudflare can publish route*.mx.cloudflare.net MX records.'
    );
  } else if (!mx.usingCloudflareRouting) {
    issues.push(
      `MX records exist but do not point at Cloudflare Email Routing (${mx.exchanges.join(', ')}).`
    );
  }

  const spfCandidates = (txtRecords ?? [])
    .map((value) => String(value ?? '').replace(/^"|"$/g, '').trim())
    .filter((value) => /^v=spf1\b/i.test(value));

  if (spfCandidates.length > 1) {
    issues.push(
      `Multiple SPF records found (${spfCandidates.length}). Keep exactly one merged v=spf1 TXT on the root domain.`
    );
  }

  const spf = analyzeSpfForEmailRouting(spfCandidates[0] ?? null);
  issues.push(...spf.issues);
  if (!spf.okForInboundAndOutbound) {
    recommendations.push(`Set root SPF TXT to: ${spf.recommended}`);
  }

  if (mx.usingCloudflareRouting && !hasCloudflareRoutingDkim) {
    issues.push(
      'Cloudflare Email Routing DKIM (cf2024-1._domainkey) is missing. Re-enable Email Routing DNS or restore the DKIM TXT record.'
    );
  }

  if (!hasResendDkim) {
    issues.push(
      'Resend DKIM is missing. Add the domain in Resend and publish the resend._domainkey (or provider-specific) TXT record so alert emails authenticate.'
    );
    recommendations.push(
      'In Resend → Domains, verify vibe-alerts.com (or your send domain) and keep DKIM TXT records after enabling Email Routing.'
    );
  }

  const inboundReady =
    ns.healthy && mx.usingCloudflareRouting && spf.hasCloudflareRouting && hasCloudflareRoutingDkim;
  const outboundReady = spf.hasResend && hasResendDkim && spfCandidates.length <= 1;
  const ok = issues.length === 0 && inboundReady && outboundReady;

  if (!ok && recommendations.length === 0) {
    recommendations.push(
      'See docs/CLOUDFLARE.md → Email Routing for the full inbound + Resend outbound checklist.'
    );
  }

  return {
    ok,
    inboundReady,
    outboundReady,
    issues,
    recommendations,
    nameservers: ns,
    mx,
    spf,
  };
}
