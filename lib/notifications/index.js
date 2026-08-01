/**
 * Public notification module API.
 * All channel access goes through the plugin registry.
 */

export {
  registerPlugin,
  getPlugin,
  getAllPlugins,
  getAllPluginIds,
  getPluginCatalog,
  getEnabledPlugins,
  getEnabledProviders,
  isAnyChannelConfigured,
  validatePluginConfig,
} from '@/lib/notifications/registry';

export {
  TelegramProvider,
  EmailProvider,
  WhatsAppProvider,
  SlackProvider,
  TeamsProvider,
} from '@/lib/notifications/providers';

// Register built-in plugins on module load
import '@/lib/notifications/plugins';
