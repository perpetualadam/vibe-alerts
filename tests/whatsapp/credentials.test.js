import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  decryptCredential,
  encryptCredential,
  isCredentialEncryptionReady,
} from '@/lib/security/credentials';

describe('credential encryption', () => {
  const previous = process.env.CREDENTIALS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    else process.env.CREDENTIALS_ENCRYPTION_KEY = previous;
  });

  it('reports ready when a 32-byte hex key is set', () => {
    expect(isCredentialEncryptionReady()).toBe(true);
  });

  it('round-trips secrets with AES-256-GCM', () => {
    const secret = 'EAAtestWhatsAppAccessTokenValue1234567890';
    const encrypted = encryptCredential(secret);
    expect(encrypted).not.toContain(secret);
    expect(encrypted.split(':')).toHaveLength(3);
    expect(decryptCredential(encrypted)).toBe(secret);
  });

  it('produces unique ciphertext per encryption', () => {
    const secret = 'same-token';
    expect(encryptCredential(secret)).not.toBe(encryptCredential(secret));
  });

  it('rejects missing encryption key', () => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    expect(isCredentialEncryptionReady()).toBe(false);
    expect(() => encryptCredential('x')).toThrow(/CREDENTIALS_ENCRYPTION_KEY/);
  });
});
