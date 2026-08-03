import { describe, it, expect } from 'vitest';
import {
  analyzeSpfForEmailRouting,
  buildMergedSpfRecord,
  normalizeSpfIncludes,
  parseSpfIncludes,
} from '@/lib/email/spf';

describe('parseSpfIncludes', () => {
  it('extracts include mechanisms', () => {
    expect(
      parseSpfIncludes('v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all')
    ).toEqual(['_spf.mx.cloudflare.net', 'resend.com']);
  });

  it('returns empty for missing record', () => {
    expect(parseSpfIncludes('')).toEqual([]);
    expect(parseSpfIncludes(null)).toEqual([]);
  });
});

describe('normalizeSpfIncludes', () => {
  it('dedupes and strips include: prefix', () => {
    expect(
      normalizeSpfIncludes(['include:Resend.com', 'resend.com', '_spf.mx.cloudflare.net'])
    ).toEqual(['resend.com', '_spf.mx.cloudflare.net']);
  });
});

describe('buildMergedSpfRecord', () => {
  it('merges Cloudflare Email Routing and Resend by default', () => {
    expect(buildMergedSpfRecord()).toBe(
      'v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all'
    );
  });

  it('allows additional includes without duplicating defaults', () => {
    expect(
      buildMergedSpfRecord({ includes: ['resend.com', '_spf.google.com'] })
    ).toBe(
      'v=spf1 include:_spf.mx.cloudflare.net include:resend.com include:_spf.google.com ~all'
    );
  });
});

describe('analyzeSpfForEmailRouting', () => {
  it('flags missing SPF after Email Routing setup', () => {
    const result = analyzeSpfForEmailRouting(null);
    expect(result.present).toBe(false);
    expect(result.okForInboundAndOutbound).toBe(false);
    expect(result.issues[0]).toMatch(/Missing root SPF/i);
  });

  it('flags Cloudflare-only SPF that breaks Resend outbound', () => {
    const result = analyzeSpfForEmailRouting(
      'v=spf1 include:_spf.mx.cloudflare.net ~all'
    );
    expect(result.hasCloudflareRouting).toBe(true);
    expect(result.hasResend).toBe(false);
    expect(result.okForInboundAndOutbound).toBe(false);
    expect(result.issues.some((i) => i.includes('resend.com'))).toBe(true);
    expect(result.recommended).toContain('include:resend.com');
  });

  it('accepts merged SPF for inbound routing + Resend alerts', () => {
    const result = analyzeSpfForEmailRouting(
      'v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all'
    );
    expect(result.okForInboundAndOutbound).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
