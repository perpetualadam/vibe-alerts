/**
 * Website platform integration registry.
 */

/** @type {Map<string, import('./platforms/base').PlatformIntegration>} */
const registry = new Map();

/** @type {Map<string, string>} */
const pluginPaths = new Map();

/**
 * @param {import('./platforms/base').PlatformIntegration} adapter
 * @param {{ pluginPath?: string }} [meta]
 */
export function registerPlatform(adapter, meta = {}) {
  const ctor = /** @type {typeof import('./platforms/base').PlatformIntegration} */ (
    adapter.constructor
  );
  registry.set(ctor.id, adapter);
  if (meta.pluginPath) {
    pluginPaths.set(ctor.id, meta.pluginPath);
  }
}

/** @returns {import('./platforms/base').PlatformIntegration | undefined} */
export function getPlatform(id) {
  return registry.get(id);
}

/** @returns {import('./platforms/base').PlatformIntegration[]} */
export function getAllPlatforms() {
  return Array.from(registry.values());
}

/** @returns {Array<{id:string,label:string,description:string,version:string,setupSteps:string[],pluginPath?:string}>} */
export function getPlatformCatalog() {
  return getAllPlatforms().map((adapter) => {
    const ctor = /** @type {typeof import('./platforms/base').PlatformIntegration} */ (
      adapter.constructor
    );
    return {
      id: ctor.id,
      label: ctor.label,
      description: ctor.description,
      version: ctor.version,
      setupSteps: ctor.setupSteps,
      pluginPath: pluginPaths.get(ctor.id),
    };
  });
}

import { wordpressIntegration } from '@/lib/integrations/platforms/wordpress';
import { wixIntegration } from '@/lib/integrations/platforms/wix';
import { webflowIntegration } from '@/lib/integrations/platforms/webflow';
import { shopifyIntegration } from '@/lib/integrations/platforms/shopify';
import { htmlIntegration } from '@/lib/integrations/platforms/html';

registerPlatform(wordpressIntegration, {
  pluginPath: 'integrations/wordpress/vibe-alerts-connector.php',
});
registerPlatform(wixIntegration, {
  pluginPath: 'integrations/wix/vibe-alerts.web.js',
});
registerPlatform(webflowIntegration);
registerPlatform(shopifyIntegration, {
  pluginPath: 'integrations/shopify/vibe-alerts-contact.liquid',
});
registerPlatform(htmlIntegration, {
  pluginPath: 'integrations/html/vibe-alerts.js',
});
