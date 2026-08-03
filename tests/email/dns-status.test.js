import { describe, it, expect } from 'vitest';
import {
  analyzeNameservers,
  evaluateEmailDnsStatus,
  isCloudflareEmailRoutingMx,
  summarizeMxRecords,
} from '@/lib/email/dns-status';

describe('isCloudflareEmailRoutingMx', () => {
  it('detects Cloudflare routing MX hosts', () => {
    expect(isCloudflareEmailRoutingMx('route1.mx.cloudflare.net')).toBe(true);
    expect(isCloudflareEmailRoutingMx('amir.mx.cloudflare.net.')).toBe(true);
    expect(isCloudflareEmailRoutingMx('aspmx.l.google.com')).toBe(false);
  });
});

describe('summarizeMxRecords', () => {
  it('reports missing MX', () => {
    expect(summarizeMxRecords([]).usingCloudflareRouting).toBe(false);
  });

  it('detects Cloudflare routing exchanges', () => {
    const summary = summarizeMxRecords([
      { priority: 13, exchange: 'amir.mx.cloudflare.net' },
      { priority: 24, exchange: 'isaac.mx.cloudflare.net' },
    ]);
    expect(summary.usingCloudflareRouting).toBe(true);
    expect(summary.cloudflareMxCount).toBe(2);
  });
});

describe('analyzeNameservers', () => {
  it('flags mixed Cloudflare + name.com nameservers', () => {
    const result = analyzeNameservers([
      'coraline.ns.cloudflare.com',
      'ns4lrt.name.com',
    ]);
    expect(result.healthy).toBe(false);
    expect(result.issues[0]).toMatch(/Mixed nameservers/i);
  });

  it('accepts a full Cloudflare NS pair', () => {
    const result = analyzeNameservers([
      'coraline.ns.cloudflare.com',
      'doug.ns.cloudflare.com',
    ]);
    expect(result.healthy).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

describe('evaluateEmailDnsStatus', () => {
  it('reproduces the current vibe-alerts.com failure mode', () => {
    const status = evaluateEmailDnsStatus({
      nameservers: ['coraline.ns.cloudflare.com', 'ns4lrt.name.com'],
      mxRecords: [],
      txtRecords: [],
      hasResendDkim: false,
      hasCloudflareRoutingDkim: false,
    });

    expect(status.ok).toBe(false);
    expect(status.inboundReady).toBe(false);
    expect(status.outboundReady).toBe(false);
    expect(status.issues.some((i) => /Mixed nameservers/i.test(i))).toBe(true);
    expect(status.issues.some((i) => /No MX records/i.test(i))).toBe(true);
    expect(status.recommendations.some((r) => r.includes('include:resend.com'))).toBe(true);
  });

  it('passes when Email Routing and Resend DNS are both healthy', () => {
    const status = evaluateEmailDnsStatus({
      nameservers: ['a.ns.cloudflare.com', 'b.ns.cloudflare.com'],
      mxRecords: [
        { priority: 10, exchange: 'route1.mx.cloudflare.net' },
        { priority: 20, exchange: 'route2.mx.cloudflare.net' },
      ],
      txtRecords: ['v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all'],
      hasResendDkim: true,
      hasCloudflareRoutingDkim: true,
    });

    expect(status.ok).toBe(true);
    expect(status.inboundReady).toBe(true);
    expect(status.outboundReady).toBe(true);
    expect(status.issues).toEqual([]);
  });

  it('flags Email Routing SPF overwrite that drops Resend', () => {
    const status = evaluateEmailDnsStatus({
      nameservers: ['a.ns.cloudflare.com', 'b.ns.cloudflare.com'],
      mxRecords: [{ priority: 10, exchange: 'route1.mx.cloudflare.net' }],
      txtRecords: ['v=spf1 include:_spf.mx.cloudflare.net ~all'],
      hasResendDkim: true,
      hasCloudflareRoutingDkim: true,
    });

    expect(status.inboundReady).toBe(true);
    expect(status.outboundReady).toBe(false);
    expect(status.issues.some((i) => i.includes('resend.com'))).toBe(true);
  });
});
