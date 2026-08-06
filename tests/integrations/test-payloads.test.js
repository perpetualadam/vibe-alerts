import { describe, it, expect } from 'vitest';
import { buildIntegrationTestPayload } from '@/lib/integrations/test-payloads';
import { NATIVE_INTEGRATION_IDS } from '@/lib/integrations/constants';

describe('integration test payloads', () => {
  it('builds a payload for every native platform', () => {
    for (const id of NATIVE_INTEGRATION_IDS) {
      const payload = buildIntegrationTestPayload(id);
      expect(payload._platform).toBe(id);
      expect(payload._vibealerts_test).toBe(true);
    }
  });
});
