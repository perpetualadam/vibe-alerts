import { describe, it, expect, beforeEach } from 'vitest';
import { buildPageMetadata, buildSitemapEntries, buildRobotsConfig } from '@/lib/seo/metadata';
import { getSiteUrl, absoluteUrl } from '@/lib/seo/site';

describe('SEO metadata', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://vibe-alerts.com';
  });

  it('builds homepage metadata with canonical and Open Graph', () => {
    const meta = buildPageMetadata();
    expect(meta.title).toContain('VibeAlerts');
    expect(meta.description).toContain('Telegram');
    expect(meta.alternates.canonical).toBe('https://vibe-alerts.com/');
    expect(meta.openGraph.url).toBe('https://vibe-alerts.com/');
    expect(meta.openGraph.images[0].url).toContain('opengraph-image');
    expect(meta.robots.index).toBe(true);
  });

  it('sets noIndex for private pages', () => {
    const meta = buildPageMetadata({ title: 'Dashboard', path: '/dashboard', noIndex: true });
    expect(meta.robots.index).toBe(false);
    expect(meta.alternates.canonical).toBe('https://vibe-alerts.com/dashboard');
  });

  it('builds sitemap with public marketing and legal pages', () => {
    const entries = buildSitemapEntries();
    expect(entries.length).toBeGreaterThanOrEqual(6);
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain('https://vibe-alerts.com/');
    expect(urls).toContain('https://vibe-alerts.com/pricing');
    expect(urls).toContain('https://vibe-alerts.com/contact');
    expect(urls).toContain('https://vibe-alerts.com/terms');
    expect(urls).toContain('https://vibe-alerts.com/privacy');
    expect(urls).toContain('https://vibe-alerts.com/refunds');
  });

  it('builds robots.txt config blocking private routes', () => {
    const robots = buildRobotsConfig();
    expect(robots.sitemap).toBe('https://vibe-alerts.com/sitemap.xml');
    expect(robots.rules.disallow).toContain('/dashboard');
    expect(robots.rules.disallow).toContain('/api/');
    expect(robots.host).toBe('https://vibe-alerts.com');
  });

  it('omits robots host on localhost', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    const robots = buildRobotsConfig();
    expect(robots.host).toBeUndefined();
  });

  it('absoluteUrl joins paths correctly', () => {
    expect(absoluteUrl('/login')).toBe('https://vibe-alerts.com/login');
    expect(getSiteUrl()).toBe('https://vibe-alerts.com');
  });
});
