/**
 * Public notification module API.
 *
 * Architecture:
 *   Webhook → NotificationService → Enabled Providers
 *
 * Providers implement the common interface: send(), test(), healthCheck().
 * Built-ins: Telegram, Discord, Email (Resend), Teams, WhatsApp, Slack.
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
  NotificationService,
  notificationService,
  deliverNotifications,
  processPendingRetries,
} from '@/lib/notifications/service';

export {
  TelegramProvider,
  EmailProvider,
  WhatsAppProvider,
  SlackProvider,
  TeamsProvider,
  DiscordProvider,
  NotificationProvider,
  DEFAULT_TEST_PAYLOAD,
} from '@/lib/notifications/providers';

// Register built-in plugins on module load
import '@/lib/notifications/plugins';
