/**
 * Website platform integration registry.
 */

/** @type {Map<string, import('./platforms/base').PlatformIntegration>} */
const registry = new Map();

/** @type {Map<string, string>} */
const pluginPaths = new Map();

/** Preferred catalog order for native integrations */
const CATALOG_ORDER = [
  'wix',
  'squarespace',
  'webflow',
  'jotform',
  'typeform',
  'gravity_forms',
  'elementor_forms',
  'contact_form_7',
  'wpforms',
  'fluent_forms',
  'wordpress',
  'shopify',
  'google_forms',
  'html',
];

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
  const all = Array.from(registry.values());
  return all.sort((a, b) => {
    const ai = CATALOG_ORDER.indexOf(a.id);
    const bi = CATALOG_ORDER.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

/** @returns {Array<{id:string,label:string,description:string,version:string,setupSteps:string[],pluginPath?:string,supportsTest:boolean,category:string}>} */
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
      supportsTest: true,
      category: categorizePlatform(ctor.id),
    };
  });
}

/**
 * @param {string} id
 */
function categorizePlatform(id) {
  if (
    ['contact_form_7', 'wpforms', 'gravity_forms', 'elementor_forms', 'fluent_forms', 'wordpress'].includes(
      id
    )
  ) {
    return 'wordpress';
  }
  if (['typeform', 'jotform', 'google_forms'].includes(id)) {
    return 'forms';
  }
  if (['wix', 'squarespace', 'webflow', 'shopify'].includes(id)) {
    return 'website';
  }
  return 'custom';
}

import { wordpressIntegration } from '@/lib/integrations/platforms/wordpress';
import { wixIntegration } from '@/lib/integrations/platforms/wix';
import { webflowIntegration } from '@/lib/integrations/platforms/webflow';
import { shopifyIntegration } from '@/lib/integrations/platforms/shopify';
import { htmlIntegration } from '@/lib/integrations/platforms/html';
import { squarespaceIntegration } from '@/lib/integrations/platforms/squarespace';
import { typeformIntegration } from '@/lib/integrations/platforms/typeform';
import { googleFormsIntegration } from '@/lib/integrations/platforms/google-forms';
import { jotformIntegration } from '@/lib/integrations/platforms/jotform';
import {
  contactForm7Integration,
  wpformsIntegration,
  gravityFormsIntegration,
  elementorFormsIntegration,
  fluentFormsIntegration,
} from '@/lib/integrations/platforms/wp-form-adapters';

// Specific WP form adapters first so auto-detect prefers them over the umbrella
registerPlatform(contactForm7Integration, {
  pluginPath: 'integrations/wordpress/vibealerts',
});
registerPlatform(wpformsIntegration, {
  pluginPath: 'integrations/wordpress/vibealerts',
});
registerPlatform(gravityFormsIntegration, {
  pluginPath: 'integrations/wordpress/vibealerts',
});
registerPlatform(elementorFormsIntegration, {
  pluginPath: 'integrations/wordpress/vibealerts',
});
registerPlatform(fluentFormsIntegration, {
  pluginPath: 'integrations/wordpress/vibealerts',
});
registerPlatform(wordpressIntegration, {
  pluginPath: 'integrations/wordpress/vibealerts',
});
registerPlatform(wixIntegration, {
  pluginPath: 'integrations/wix/vibe-alerts.web.js',
});
registerPlatform(webflowIntegration, {
  pluginPath: 'integrations/webflow/README.md',
});
registerPlatform(shopifyIntegration, {
  pluginPath: 'integrations/shopify/vibe-alerts-contact.liquid',
});
registerPlatform(htmlIntegration, {
  pluginPath: 'integrations/html/vibe-alerts.js',
});
registerPlatform(squarespaceIntegration, {
  pluginPath: 'integrations/squarespace/vibe-alerts.js',
});
registerPlatform(typeformIntegration, {
  pluginPath: 'integrations/typeform/README.md',
});
registerPlatform(jotformIntegration, {
  pluginPath: 'integrations/jotform/README.md',
});
registerPlatform(googleFormsIntegration, {
  pluginPath: 'integrations/google-forms/vibe-alerts.gs',
});
