/**
 * Cloudflare Email Routing setup helper for support@vibe-alerts.com
 *
 * Prerequisites:
 * - Cloudflare zone vibe-alerts.com must be Active (nameservers propagated)
 * - CLOUDFLARE_API_TOKEN with Zone:Read, DNS:Edit, Email Routing Edit permissions
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... node scripts/cloudflare-email-routing.mjs
 *
 * Optional env:
 *   CLOUDFLARE_ACCOUNT_ID=326af55e373c10467269b912fda64ff6
 *   CLOUDFLARE_ZONE_ID=959060fd3bc1b40450b4ffc0573c2645
 *   SUPPORT_FORWARD_TO=craftopiamedia@gmail.com
 *   SUPPORT_LOCAL_PART=support
 */

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '326af55e373c10467269b912fda64ff6';
const zoneId = process.env.CLOUDFLARE_ZONE_ID || '959060fd3bc1b40450b4ffc0573c2645';
const forwardTo = process.env.SUPPORT_FORWARD_TO || 'craftopiamedia@gmail.com';
const localPart = process.env.SUPPORT_LOCAL_PART || 'support';
const domain = 'vibe-alerts.com';

if (!token) {
  console.error('Set CLOUDFLARE_API_TOKEN with Email Routing permissions.');
  process.exit(1);
}

async function cf(path, options = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(JSON.stringify(json.errors || json.messages || json, null, 2));
  }
  return json.result;
}

const zone = await cf(`/zones/${zoneId}`);
console.log('ZONE', zone.name, 'status:', zone.status);

if (zone.status !== 'active') {
  console.error(
    `\nZone is "${zone.status}" — Email Routing needs an Active zone.\n` +
      'In Cloudflare: vibe-alerts.com → Overview → "Check nameservers now".\n' +
      'Retry this script after the zone shows Active.'
  );
  process.exit(2);
}

try {
  await cf(`/zones/${zoneId}/email/routing/enable`, { method: 'POST', body: '{}' });
  console.log('EMAIL_ROUTING enabled');
} catch (err) {
  console.log('EMAIL_ROUTING enable skipped or already enabled:', err.message);
}

let destinations = await cf(`/accounts/${accountId}/email/routing/addresses`);
let destination = destinations.find((d) => d.email === forwardTo);

if (!destination) {
  destination = await cf(`/accounts/${accountId}/email/routing/addresses`, {
    method: 'POST',
    body: JSON.stringify({ email: forwardTo }),
  });
  console.log('DESTINATION_CREATED', destination.email, '(verify the Cloudflare email in your inbox)');
} else {
  console.log('DESTINATION_EXISTS', destination.email, 'verified:', Boolean(destination.verified));
}

const customAddress = `${localPart}@${domain}`;
const rules = await cf(`/zones/${zoneId}/email/routing/rules`);
const existing = rules.find(
  (rule) =>
    rule.matchers?.some((m) => m.type === 'literal' && m.value === customAddress) &&
    rule.actions?.some((a) => a.type === 'forward')
);

if (!existing) {
  const rule = await cf(`/zones/${zoneId}/email/routing/rules`, {
    method: 'POST',
    body: JSON.stringify({
      name: `Forward ${customAddress}`,
      enabled: true,
      matchers: [{ type: 'literal', field: 'to', value: customAddress }],
      actions: [{ type: 'forward', value: [forwardTo] }],
    }),
  });
  console.log('RULE_CREATED', rule.matchers?.[0]?.value, '->', forwardTo);
} else {
  console.log('RULE_EXISTS', customAddress);
}

const mx = await cf(`/zones/${zoneId}/email/routing/dns`);
console.log('DNS_SYNC', mx?.length ? `${mx.length} record(s) synced` : 'check MX in dashboard');

console.log('\nDone. Verify by emailing', customAddress, 'after destination verification completes.');
