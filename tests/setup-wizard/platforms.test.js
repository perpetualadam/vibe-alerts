import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WIZARD_STEPS,
  WIZARD_CHECKLIST,
  WIZARD_PLATFORMS,
  getWizardPlatform,
  toIntegrationId,
} from '@/lib/setup-wizard/platforms';
import { NATIVE_INTEGRATION_IDS } from '@/lib/integrations/constants';

describe('Integration Wizard platforms', () => {
  it('includes every native Prompt 14 platform', () => {
    const ids = WIZARD_PLATFORMS.map((p) => p.id);
    for (const id of NATIVE_INTEGRATION_IDS) {
      expect(ids).toContain(id);
      expect(getWizardPlatform(id)?.native).toBe(true);
      expect(toIntegrationId(id)).toBe(id);
    }
  });

  it('maps Custom to the html integration id', () => {
    expect(toIntegrationId('custom')).toBe('html');
    expect(getWizardPlatform('custom')?.integrationId).toBe('html');
  });

  it('has tailored steps and Send Test guidance for each native platform', () => {
    for (const platform of WIZARD_PLATFORMS.filter((p) => p.native)) {
      expect(platform.steps.length).toBeGreaterThan(1);
      expect(platform.blurb.length).toBeGreaterThan(10);
      const blob = JSON.stringify(platform.steps).toLowerCase();
      expect(blob.includes('test')).toBe(true);
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
