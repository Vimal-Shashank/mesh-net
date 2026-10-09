import { EncryptedPayload } from '../types';

/**
 * Web Crypto API utilities for meshnet AES-256-GCM End-to-End Encryption
 */

// Memory cache of derived crypto keys per password to avoid re-deriving on every message
const keyCache = new Map<string, CryptoKey>();

/**
 * Derives an AES-GCM 256-bit key from a raw passphrase and salt using PBKDF2
 */
export async function deriveKeyFromPassword(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const cacheKey = `${passphrase}:${Array.from(salt).join(',')}`;
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(passphrase);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(cacheKey, derivedKey);
  return derivedKey;
}

/**
 * Encrypts plaintext string using AES-256-GCM with a shared room password
 */
export async function encryptText(plaintext: string, passphrase: string): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random 16-byte salt and 12-byte IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromPassword(passphrase, salt);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return {
    ciphertext: bufferToBase64(new Uint8Array(encryptedBuffer)),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    algo: 'AES-256-GCM',
  };
}

/**
 * Decrypts AES-256-GCM payload using a shared room password
 */
export async function decryptText(payload: EncryptedPayload, passphrase: string): Promise<string> {
  try {
    const ciphertext = base64ToBuffer(payload.ciphertext);
    const iv = base64ToBuffer(payload.iv);
    const salt = base64ToBuffer(payload.salt);

    const key = await deriveKeyFromPassword(passphrase, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    throw new Error('Decryption failed: Incorrect password or corrupted payload.');
  }
}

/**
 * Generates an ECDH key pair for Direct Messaging (DM) end-to-end encryption
 */
export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export a public key to Base64 string for sharing with peers
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', key);
  return bufferToBase64(new Uint8Array(exported));
}

/**
 * Import a peer's public key from Base64 string
 */
export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(spkiBase64);
  return window.crypto.subtle.importKey(
    'spki',
    buffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

/**
 * Computes SHA-256 fingerprint hex string of a public key or string
 */
export async function getFingerprint(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
}

// Helper utilities for Base64 conversion
export function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a random peer ID in format mesh-XXXXXX
 */
export function generatePeerId(): string {
  const chars = '0123456789abcdef';
  let result = 'mesh-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a deterministic hex color based on nickname for peer tags
 */
export function getNickColor(nick: string): string {
  let hash = 0;
  for (let i = 0; i < nick.length; i++) {
    hash = nick.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#38bdf8', // sky-400
    '#4ade80', // green-400
    '#facc15', // yellow-400
    '#f87171', // red-400
    '#c084fc', // purple-400
    '#fb923c', // orange-400
    '#2dd4bf', // teal-400
    '#f472b6', // pink-400
    '#a3e635', // lime-400
    '#818cf8', // indigo-400
  ];
  return colors[Math.abs(hash) % colors.length];
}
