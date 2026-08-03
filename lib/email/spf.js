/**
 * SPF helpers for coexisting Cloudflare Email Routing (inbound) with Resend (outbound).
 *
 * Email Routing writes a root SPF record that often overwrites sender includes.
 * Domains that send via Resend must merge both into a single v=spf1 TXT record.
 */

export const CLOUDFLARE_EMAIL_ROUTING_SPF_INCLUDE = '_spf.mx.cloudflare.net';
export const RESEND_SPF_INCLUDE = 'resend.com';

/**
 * Parse include: mechanisms from an SPF record string.
 * @param {string} spf
 * @returns {string[]}
 */
export function parseSpfIncludes(spf) {
  if (!spf || typeof spf !== 'string') return [];
  const matches = spf.matchAll(/\binclude:([^\s]+)/gi);
  const includes = [];
  for (const match of matches) {
    const value = match[1]?.trim();
    if (value) includes.push(value.toLowerCase());
  }
  return includes;
}

/**
 * Normalize and de-dupe SPF includes (case-insensitive), preserving first-seen order.
 * @param {string[]} includes
 * @returns {string[]}
 */
export function normalizeSpfIncludes(includes) {
  const seen = new Set();
  const out = [];
  for (const raw of includes ?? []) {
    const value = String(raw ?? '')
      .trim()
      .toLowerCase()
      .replace(/^include:/i, '');
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/**
 * Build a single root-domain SPF record that authorizes Cloudflare Email Routing
 * and optional outbound senders (e.g. Resend).
 *
 * @param {Object} [options]
 * @param {string[]} [options.includes] - Additional include hosts (without include:)
 * @param {boolean} [options.includeCloudflare=true]
 * @param {boolean} [options.includeResend=true]
 * @param {'~all'|'-all'|'+all'|'?all'} [options.allMechanism='~all']
 * @returns {string}
 */
export function buildMergedSpfRecord({
  includes = [],
  includeCloudflare = true,
  includeResend = true,
  allMechanism = '~all',
} = {}) {
  const merged = normalizeSpfIncludes([
    ...(includeCloudflare ? [CLOUDFLARE_EMAIL_ROUTING_SPF_INCLUDE] : []),
    ...(includeResend ? [RESEND_SPF_INCLUDE] : []),
    ...includes,
  ]);

  if (merged.length === 0) {
    return `v=spf1 ${allMechanism}`;
  }

  return `v=spf1 ${merged.map((host) => `include:${host}`).join(' ')} ${allMechanism}`;
}

/**
 * Analyze a root SPF record for Cloudflare Email Routing + Resend readiness.
 * @param {string|null|undefined} spfRecord
 * @returns {{
 *   present: boolean,
 *   includes: string[],
 *   hasCloudflareRouting: boolean,
 *   hasResend: boolean,
 *   okForInboundAndOutbound: boolean,
 *   issues: string[],
 *   recommended: string,
 * }}
 */
export function analyzeSpfForEmailRouting(spfRecord) {
  const recommended = buildMergedSpfRecord();
  const issues = [];

  if (!spfRecord || !String(spfRecord).trim()) {
    return {
      present: false,
      includes: [],
      hasCloudflareRouting: false,
      hasResend: false,
      okForInboundAndOutbound: false,
      issues: [
        'Missing root SPF TXT record. Email Routing and Resend both need a single merged SPF record.',
      ],
      recommended,
    };
  }

  const text = String(spfRecord).trim().replace(/^"|"$/g, '');
  if (!/^v=spf1\b/i.test(text)) {
    issues.push('TXT record does not start with v=spf1.');
  }

  const includes = parseSpfIncludes(text);
  const hasCloudflareRouting = includes.includes(CLOUDFLARE_EMAIL_ROUTING_SPF_INCLUDE);
  const hasResend = includes.includes(RESEND_SPF_INCLUDE);

  if (!hasCloudflareRouting) {
    issues.push(
      `SPF is missing include:${CLOUDFLARE_EMAIL_ROUTING_SPF_INCLUDE} (required for Cloudflare Email Routing).`
    );
  }
  if (!hasResend) {
    issues.push(
      `SPF is missing include:${RESEND_SPF_INCLUDE}. Enabling Email Routing often overwrites Resend authorization and breaks outbound alert delivery.`
    );
  }

  return {
    present: true,
    includes,
    hasCloudflareRouting,
    hasResend,
    okForInboundAndOutbound: hasCloudflareRouting && hasResend && issues.length === 0,
    issues,
    recommended,
  };
}
