/**
 * Plugin registry for notification channels.
 * Register plugins via registerPlugin() — built-ins are loaded from ./plugins.
 */

/** @typedef {import('./providers/base').NotificationProvider} NotificationProvider */

/**
 * @typedef {Object} PluginDescriptor
 * @property {string} id
 * @property {string} version
 * @property {string} label
 * @property {string} description
 * @property {NotificationProvider} provider
 * @property {import('./providers/base').ConfigFieldSchema[]} configSchema
 * @property {string[]} setupGuide
 * @property {string} [platformUnavailableMessage]
 */

/** @type {Map<string, PluginDescriptor>} */
const registry = new Map();

/**
 * Register a notification plugin. Called at module init for built-ins;
 * future third-party plugins call this at startup.
 * @param {PluginDescriptor} plugin
 */
export function registerPlugin(plugin) {
  if (!plugin.id || !plugin.provider) {
    throw new Error('Plugin must have id and provider');
  }
  // Idempotent for Next.js hot reload
  registry.set(plugin.id, plugin);
}

/** @returns {PluginDescriptor | undefined} */
export function getPlugin(id) {
  return registry.get(id);
}

/** @returns {PluginDescriptor[]} */
export function getAllPlugins() {
  return Array.from(registry.values());
}

/** @returns {string[]} */
export function getAllPluginIds() {
  return Array.from(registry.keys());
}

/**
 * Metadata safe to expose to the dashboard client (no provider instances).
 */
export function getPluginCatalog() {
  return getAllPlugins().map((plugin) => ({
    id: plugin.id,
    version: plugin.version,
    label: plugin.label,
    description: plugin.description,
    configSchema: plugin.configSchema,
    setupGuide: plugin.setupGuide,
    platformReady: plugin.provider.isPlatformReady(),
    platformUnavailableMessage: plugin.platformUnavailableMessage ?? null,
  }));
}

/**
 * @param {Record<string, import('./providers/base').ChannelEntry>} channelConfigs
 * @returns {PluginDescriptor[]}
 */
export function getEnabledPlugins(channelConfigs) {
  return getAllPlugins().filter((plugin) => channelConfigs[plugin.id]?.enabled);
}

/**
 * @param {Record<string, import('./providers/base').ChannelEntry>} channelConfigs
 * @returns {NotificationProvider[]}
 */
export function getEnabledProviders(channelConfigs) {
  return getEnabledPlugins(channelConfigs).map((p) => p.provider);
}

/**
 * @param {Record<string, import('./providers/base').ChannelEntry>} channelConfigs
 */
export function isAnyChannelConfigured(channelConfigs) {
  return getAllPlugins().some((plugin) => plugin.provider.isConfigured({
    channelConfigs,
    payload: {},
    userId: '',
    profile: {},
    settings: {},
  }));
}

/**
 * Validate config for a plugin via its provider.
 * @param {string} pluginId
 * @param {Record<string, unknown>} config
 */
export function validatePluginConfig(pluginId, config) {
  const plugin = getPlugin(pluginId);
  if (!plugin) {
    return { valid: false, error: `Unknown channel: ${pluginId}` };
  }
  return plugin.provider.validateConfig(config);
}
