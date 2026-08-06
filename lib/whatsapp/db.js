/**
 * Persistence helpers for per-tenant WhatsApp Business connections.
 * Always use the service-role admin client — RLS has no user policies.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { decryptCredential, encryptCredential } from '@/lib/security/credentials';

/**
 * @typedef {Object} WhatsAppConnectionPublic
 * @property {boolean} connected
 * @property {string|null} wabaId
 * @property {string|null} phoneNumberId
 * @property {string|null} displayPhoneNumber
 * @property {string|null} verifiedName
 * @property {string|null} connectedAt
 * @property {string|null} lastSuccessfulMessageAt
 * @property {string|null} disconnectedAt
 */

/**
 * @typedef {Object} WhatsAppConnectionSecrets
 * @property {string} accessToken
 * @property {string} phoneNumberId
 * @property {string} wabaId
 * @property {boolean} connected
 */

const PUBLIC_SELECT =
  'user_id, waba_id, phone_number_id, connected, display_phone_number, verified_name, connected_at, last_successful_message_at, disconnected_at';

/**
 * @param {Record<string, unknown>|null} row
 * @returns {WhatsAppConnectionPublic}
 */
export function toPublicWhatsAppConnection(row) {
  if (!row) {
    return {
      connected: false,
      wabaId: null,
      phoneNumberId: null,
      displayPhoneNumber: null,
      verifiedName: null,
      connectedAt: null,
      lastSuccessfulMessageAt: null,
      disconnectedAt: null,
    };
  }

  return {
    connected: Boolean(row.connected),
    wabaId: row.waba_id ? String(row.waba_id) : null,
    phoneNumberId: row.phone_number_id ? String(row.phone_number_id) : null,
    displayPhoneNumber: row.display_phone_number ? String(row.display_phone_number) : null,
    verifiedName: row.verified_name ? String(row.verified_name) : null,
    connectedAt: row.connected_at ? String(row.connected_at) : null,
    lastSuccessfulMessageAt: row.last_successful_message_at
      ? String(row.last_successful_message_at)
      : null,
    disconnectedAt: row.disconnected_at ? String(row.disconnected_at) : null,
  };
}

/**
 * @param {string} userId
 * @returns {Promise<WhatsAppConnectionPublic>}
 */
export async function getWhatsAppConnectionPublic(userId) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('whatsapp_connections')
    .select(PUBLIC_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return toPublicWhatsAppConnection(data);
}

/**
 * Load decrypted credentials for sending. Returns null when not connected.
 * @param {string} userId
 * @returns {Promise<WhatsAppConnectionSecrets|null>}
 */
export async function getWhatsAppCredentials(userId) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('whatsapp_connections')
    .select('waba_id, phone_number_id, access_token_encrypted, connected')
    .eq('user_id', userId)
    .eq('connected', true)
    .maybeSingle();

  if (error) throw error;
  if (!data?.access_token_encrypted) return null;

  return {
    accessToken: decryptCredential(data.access_token_encrypted),
    phoneNumberId: String(data.phone_number_id),
    wabaId: String(data.waba_id),
    connected: true,
  };
}

/**
 * Upsert a verified WhatsApp Business connection for a tenant.
 * @param {Object} params
 */
export async function upsertWhatsAppConnection({
  userId,
  wabaId,
  phoneNumberId,
  accessToken,
  displayPhoneNumber = null,
  verifiedName = null,
}) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const row = {
    user_id: userId,
    waba_id: wabaId,
    phone_number_id: phoneNumberId,
    access_token_encrypted: encryptCredential(accessToken),
    connected: true,
    display_phone_number: displayPhoneNumber,
    verified_name: verifiedName,
    connected_at: now,
    disconnected_at: null,
  };

  const { data, error } = await supabase
    .from('whatsapp_connections')
    .upsert(row, { onConflict: 'user_id' })
    .select(PUBLIC_SELECT)
    .single();

  if (error) throw error;
  return toPublicWhatsAppConnection(data);
}

/**
 * Soft-disconnect: clear secrets and mark disconnected.
 * @param {string} userId
 */
export async function disconnectWhatsAppConnection(userId) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('whatsapp_connections')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    return toPublicWhatsAppConnection(null);
  }

  // Overwrite encrypted token with a short random ciphertext so plaintext is unrecoverable
  // from this row, then mark disconnected.
  const { data, error } = await supabase
    .from('whatsapp_connections')
    .update({
      access_token_encrypted: encryptCredential(`revoked:${userId}:${now}`),
      connected: false,
      disconnected_at: now,
      waba_id: '',
      phone_number_id: '',
      display_phone_number: null,
      verified_name: null,
    })
    .eq('user_id', userId)
    .select(PUBLIC_SELECT)
    .single();

  if (error) throw error;
  return toPublicWhatsAppConnection(data);
}

/**
 * @param {string} userId
 */
export async function markWhatsAppMessageSuccess(userId) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('whatsapp_connections')
    .update({ last_successful_message_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('connected', true);

  if (error) throw error;
}
