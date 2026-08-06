import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WIZARD_STEPS,
  WIZARD_CHECKLIST,
  WIZARD_PLATFORMS,
  getWizardPlatform,
  toIntegrationId,
} from '@/lib/setup-wizard/platforms';

describe('Integration Wizard platforms', () => {
  it('includes the required platform choices', () => {
    const ids = WIZARD_PLATFORMS.map((p) => p.id);
    expect(ids).toEqual([
      'wordpress',
      'shopify',
      'google_forms',
      'wix',
      'squarespace',
      'webflow',
      'custom',
    ]);
  });

  it('maps Custom to the html integration id', () => {
    expect(toIntegrationId('custom')).toBe('html');
    expect(getWizardPlatform('custom')?.integrationId).toBe('html');
  });

  it('has tailored steps for each platform', () => {
    for (const platform of WIZARD_PLATFORMS) {
      expect(platform.steps.length).toBeGreaterThan(1);
      expect(platform.blurb.length).toBeGreaterThan(10);
    }
  });

  it('defines a five-step progress checklist', () => {
    expect(WIZARD_CHECKLIST.map((s) => s.id)).toEqual([
      'platform',
      'credentials',
      'instructions',
      'test',
      'complete',
    ]);
    expect(DEFAULT_WIZARD_STEPS).toMatchObject({
      platform: false,
      credentials: false,
      instructions: false,
      test: false,
      complete: false,
    });
  });
});
