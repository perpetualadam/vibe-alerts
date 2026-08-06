/**
 * WhatsApp Business Platform (Meta Cloud API) — public module surface.
 */

export {
  WhatsAppProviderService,
  connectWhatsAppAccount,
  disconnectWhatsAppAccount,
  getWhatsAppStatus,
  isWhatsAppPlatformReady,
  normalizeWhatsAppConnectInput,
  resolveWhatsAppCredentials,
  sendWhatsAppAlert,
  sendWhatsAppTestMessage,
} from '@/lib/whatsapp/service';

export {
  getWhatsAppConnectionPublic,
  getWhatsAppCredentials,
  markWhatsAppMessageSuccess,
  toPublicWhatsAppConnection,
} from '@/lib/whatsapp/db';

export {
  getWhatsAppGraphVersion,
  sendWhatsAppTextMessage,
  verifyWhatsAppCredentials,
  whatsappGraphRequest,
} from '@/lib/whatsapp/client';
