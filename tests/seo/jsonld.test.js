import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildFAQSchema,
  buildHowToSchema,
  buildHomePageSchemas,
  getMarketingFaqs,
  getHowToSteps,
  buildOrganizationSchema,
} from '@/lib/seo/jsonld';

describe('AEO JSON-LD schemas', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://vibe-alerts.com';
  });

  it('builds valid FAQPage schema', () => {
    const faqs = [
      { question: 'What is VibeAlerts?', answer: 'A form-to-Telegram webhook service.' },
    ];
    const schema = buildFAQSchema(faqs);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(1);
    expect(schema.mainEntity[0].name).toBe('What is VibeAlerts?');
    expect(schema.mainEntity[0].acceptedAnswer.text).toContain('Telegram');
  });

  it('builds valid HowTo schema', () => {
    const schema = buildHowToSchema(getHowToSteps());
    expect(schema['@type']).toBe('HowTo');
    expect(schema.step).toHaveLength(3);
    expect(schema.step[0].position).toBe(1);
  });

  it('includes organization with logo URL and support contact', () => {
    const org = buildOrganizationSchema();
    expect(org['@type']).toBe('Organization');
    expect(org.logo).toBe('https://vibe-alerts.com/opengraph-image');
    expect(org.contactPoint.email).toContain('@');
    expect(org.contactPoint.url).toBe('https://vibe-alerts.com/contact');
  });

  it('builds homepage schema graph with FAQ and HowTo', () => {
    const schemas = buildHomePageSchemas();
    expect(schemas).toHaveLength(5);
    const types = schemas.map((s) => s['@type']);
    expect(types).toContain('FAQPage');
    expect(types).toContain('HowTo');
    expect(types).toContain('SoftwareApplication');
  });

  it('provides at least 5 marketing FAQs for AEO', () => {
    expect(getMarketingFaqs().length).toBeGreaterThanOrEqual(5);
    for (const faq of getMarketingFaqs()) {
      expect(faq.question.length).toBeGreaterThan(10);
      expect(faq.answer.length).toBeGreaterThan(40);
    }
  });
});
