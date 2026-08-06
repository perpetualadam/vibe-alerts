/**
 * Back-compat re-exports. Prefer NotificationService from ./service.js.
 *
 * Webhook → NotificationService → Enabled Providers
 */

export {
  NotificationService,
  notificationService,
  deliverNotifications,
  processPendingRetries,
} from '@/lib/notifications/service';
