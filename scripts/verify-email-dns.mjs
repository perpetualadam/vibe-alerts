#!/usr/bin/env node
/**
 * Verify Cloudflare Email Routing + Resend DNS for a domain.
 *
 * Usage:
 *   node scripts/verify-email-dns.mjs [domain]
 *
 * Exit codes:
 *   0 — inbound + outbound DNS look healthy
 *   1 — misconfiguration detected
 *   2 — DNS lookup failed
 */

import { Resolver } from 'node:dns/promises';
import { evaluateEmailDnsStatus } from '../lib/email/dns-status.js';
import { buildMergedSpfRecord } from '../lib/email/spf.js';

const domain = (process.argv[2] || process.env.EMAIL_DNS_DOMAIN || 'vibe-alerts.com')
  .trim()
  .toLowerCase()
  .replace(/\.$/, '');

const resolver = new Resolver();
resolver.setServers(['1.1.1.1', '8.8.8.8']);

async function resolveSafe(method, name, ...args) {
  try {
    return await resolver[method](name, ...args);
  } catch (err) {
    if (err?.code === 'ENODATA' || err?.code === 'ENOTFOUND') return [];
    throw err;
  }
}

async function hasTxt(name) {
  const records = await resolveSafe('resolveTxt', name);
  return records.some((chunks) => chunks.join('').trim().length > 0);
}

async function main() {
  console.log(`Checking email DNS for ${domain}…\n`);

  let nameservers;
  let mxRecords;
  let txtRecords;
  let hasResendDkim;
  let hasCloudflareRoutingDkim;

  try {
    nameservers = await resolveSafe('resolveNs', domain);
    mxRecords = await resolveSafe('resolveMx', domain);
    const rootTxt = await resolveSafe('resolveTxt', domain);
    txtRecords = rootTxt.map((chunks) => chunks.join(''));
    hasResendDkim =
      (await hasTxt(`resend._domainkey.${domain}`)) ||
      (await hasTxt(`send._domainkey.${domain}`));
    hasCloudflareRoutingDkim = await hasTxt(`cf2024-1._domainkey.${domain}`);
  } catch (err) {
    console.error(`DNS lookup failed: ${err.message}`);
    process.exit(2);
  }

  const status = evaluateEmailDnsStatus({
    nameservers,
    mxRecords,
    txtRecords,
    hasResendDkim,
    hasCloudflareRoutingDkim,
  });

  console.log('Nameservers:', nameservers.join(', ') || '(none)');
  console.log(
    'MX:',
    mxRecords.length
      ? mxRecords.map((r) => `${r.priority} ${r.exchange}`).join(', ')
      : '(none)'
  );
  console.log(
    'SPF:',
    status.spf.present ? `includes ${status.spf.includes.join(', ') || '(none)'}` : '(missing)'
  );
  console.log('Cloudflare Routing DKIM:', hasCloudflareRoutingDkim ? 'present' : 'missing');
  console.log('Resend DKIM:', hasResendDkim ? 'present' : 'missing');
  console.log('');
  console.log(`Inbound ready:  ${status.inboundReady ? 'yes' : 'no'}`);
  console.log(`Outbound ready: ${status.outboundReady ? 'yes' : 'no'}`);
  console.log(`Overall:        ${status.ok ? 'OK' : 'NEEDS FIX'}`);

  if (status.issues.length) {
    console.log('\nIssues:');
    for (const issue of status.issues) console.log(`  - ${issue}`);
  }
  if (status.recommendations.length) {
    console.log('\nRecommendations:');
    for (const tip of status.recommendations) console.log(`  - ${tip}`);
  }

  console.log('\nRecommended root SPF:');
  console.log(`  ${buildMergedSpfRecord()}`);
  console.log('\nSee docs/CLOUDFLARE.md → Email Routing.');

  process.exit(status.ok ? 0 : 1);
}

main();
