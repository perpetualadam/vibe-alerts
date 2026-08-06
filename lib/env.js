/**
 * Environment variable validation.
 * Import this module early in server-side code to fail fast on missing config.
 * Client components must only use NEXT_PUBLIC_* variables.
 */

const SERVER_REQUIRED = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'TELEGRAM_BOT_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

const PRODUCTION_REQUIRED = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

const PUBLIC_REQUIRED = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

let validated = false;

export function validateEnv() {
  if (validated) return;

  const missing = [];

  for (const key of PUBLIC_REQUIRED) {
    if (!process.env[key]) missing.push(key);
  }

  // Only validate server vars when running on server
  if (typeof window === 'undefined') {
    for (const key of SERVER_REQUIRED) {
      if (!process.env[key]) missing.push(key);
    }
    if (process.env.NODE_ENV === 'production') {
      for (const key of PRODUCTION_REQUIRED) {
        if (!process.env[key]) missing.push(key);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. See .env.example`
    );
  }

  validated = true;
}

export function getEnv() {
  validateEnv();
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    webhookTimestampTolerance: parseInt(
      process.env.WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS || '300',
      10
    ),
    webhookMaxPayloadBytes: parseInt(
      process.env.WEBHOOK_MAX_PAYLOAD_BYTES || '65536',
      10
    ),
    upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

/** Optional provider credentials — channels degrade gracefully if unset */
export function getOptionalEnv() {
  return {
    resendApiKey: process.env.RESEND_API_KEY,
    resendFromEmail: process.env.RESEND_FROM_EMAIL,
    /** @deprecated Prefer per-tenant WhatsApp connections; kept as platform fallback */
    whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    /** @deprecated Prefer per-tenant WhatsApp connections; kept as platform fallback */
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    credentialsEncryptionKey: process.env.CREDENTIALS_ENCRYPTION_KEY,
    whatsappGraphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0',
  };
}

export function getWebhookUrl(token) {
  const { appUrl } = getEnv();
  return `${appUrl}/api/v1/webhook/${token}`;
}
