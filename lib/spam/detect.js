/**
 * Heuristic spam detection for inbound form webhooks.
 * Lightweight, explainable signals for analytics (not a hosted LLM call).
 * Scores 0–1; flagged when score >= threshold.
 */

const DEFAULT_THRESHOLD = 0.72;

const SPAM_KEYWORDS = [
  'viagra',
  'cialis',
  'crypto airdrop',
  'nft drop',
  'seo backlink',
  'guest post',
  'make money fast',
  'work from home $$$',
  'casino',
  'betting odds',
  'porn',
  'xxx',
  'click here now',
  'limited time offer',
  'act now!!!',
];

const HONEYPOT_KEYS = [
  'website',
  'url',
  'honeypot',
  'fax',
  'company_url',
  'bot_field',
  '_gotcha',
];

/**
 * @typedef {Object} SpamResult
 * @property {number} score
 * @property {boolean} flagged
 * @property {string[]} signals
 */

/**
 * @param {Record<string, string>} payload
 * @param {{ threshold?: number }} [options]
 * @returns {SpamResult}
 */
export function detectSpam(payload, options = {}) {
  const threshold =
    typeof options.threshold === 'number' ? options.threshold : DEFAULT_THRESHOLD;
  /** @type {string[]} */
  const signals = [];
  let score = 0;

  const entries = Object.entries(payload ?? {}).filter(
    ([key]) => !key.startsWith('_')
  );
  const values = entries.map(([, v]) => String(v ?? ''));
  const blob = values.join(' ').toLowerCase();

  // Honeypot fields filled in
  for (const [key, value] of entries) {
    const normalized = key.toLowerCase().replace(/[\s-]+/g, '_');
    if (HONEYPOT_KEYS.includes(normalized) && String(value).trim()) {
      score += 0.55;
      signals.push(`honeypot:${normalized}`);
      break;
    }
  }

  // Keyword hits
  let keywordHits = 0;
  for (const keyword of SPAM_KEYWORDS) {
    if (blob.includes(keyword)) {
      keywordHits += 1;
      signals.push(`keyword:${keyword}`);
    }
  }
  if (keywordHits > 0) {
    score += Math.min(0.5, 0.18 * keywordHits);
  }

  // Excessive URLs
  const urlMatches = blob.match(/https?:\/\/|www\./g);
  if (urlMatches && urlMatches.length >= 3) {
    score += 0.25;
    signals.push('excessive_urls');
  } else if (urlMatches && urlMatches.length >= 1 && blob.length < 40) {
    score += 0.15;
    signals.push('url_only_content');
  }

  // High link density / gibberish
  const alpha = (blob.match(/[a-z]/g) || []).length;
  const nonAlpha = (blob.match(/[^a-z0-9\s]/g) || []).length;
  if (blob.length > 40 && nonAlpha > alpha * 0.6) {
    score += 0.2;
    signals.push('high_symbol_ratio');
  }

  // Repeated characters (aaaaaaa, !!!!!!)
  if (/(.)\1{6,}/.test(blob)) {
    score += 0.15;
    signals.push('repeated_characters');
  }

  // Empty meaningful content
  const meaningful = values.filter((v) => v.trim().length >= 2);
  if (meaningful.length === 0 && entries.length > 0) {
    score += 0.3;
    signals.push('empty_content');
  }

  // Very long single field (paste spam)
  if (values.some((v) => v.length > 4000)) {
    score += 0.2;
    signals.push('oversized_field');
  }

  score = Math.min(1, Math.round(score * 1000) / 1000);

  return {
    score,
    flagged: score >= threshold,
    signals,
  };
}

export const SPAM_THRESHOLD = DEFAULT_THRESHOLD;
