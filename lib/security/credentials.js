/**
 * Application-layer encryption for per-tenant provider credentials.
 * Uses AES-256-GCM with CREDENTIALS_ENCRYPTION_KEY from process.env.
 * Never hardcode keys — generate with: openssl rand -hex 32
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * @returns {Buffer}
 */
function getEncryptionKey() {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      'CREDENTIALS_ENCRYPTION_KEY is not configured. Generate with: openssl rand -hex 32'
    );
  }

  let key;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    try {
      key = Buffer.from(raw, 'base64');
    } catch {
      throw new Error('CREDENTIALS_ENCRYPTION_KEY must be 32-byte hex (64 chars) or base64');
    }
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `CREDENTIALS_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length})`
    );
  }

  return key;
}

/** Whether credential encryption is available on this deployment. */
export function isCredentialEncryptionReady() {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt a plaintext secret for durable storage.
 * @param {string} plaintext
 * @returns {string} `iv:tag:ciphertext` (each segment base64)
 */
export function encryptCredential(plaintext) {
  if (typeof plaintext !== 'string' || !plaintext) {
    throw new Error('Cannot encrypt empty credential');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a value produced by encryptCredential.
 * @param {string} payload
 * @returns {string}
 */
export function decryptCredential(payload) {
  if (typeof payload !== 'string' || !payload.includes(':')) {
    throw new Error('Invalid encrypted credential payload');
  }

  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted credential format');
  }

  const [ivB64, tagB64, dataB64] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
