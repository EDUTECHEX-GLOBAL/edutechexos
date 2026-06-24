/**
 * End-to-end encryption for DM channels.
 *
 * Algorithm: ECDH P-256 key agreement → HKDF-SHA-256 → AES-GCM-256
 *
 * Each user generates an ECDH keypair once and stores the private key in
 * localStorage. The public key is published to the server so conversation
 * partners can derive the same shared AES key independently — without the
 * server ever seeing plaintext DM content.
 *
 * Encrypted messages have the form: "ENC:<base64iv>.<base64ciphertext>"
 * Plain (legacy / channel) messages are left unchanged.
 */

const STORAGE_PRIVATE_KEY = 'edutechex_dm_private_key';
const STORAGE_PUBLIC_KEY  = 'edutechex_dm_public_key';
const ENC_PREFIX = 'ENC:';

const API_BASE =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com')
    : 'https://edutechexos-backend.onrender.com';

// ── Key generation & persistence ──────────────────────────────────────────────

export async function generateKeyPair(): Promise<{ publicKeyJwk: JsonWebKey; privateKeyJwk: JsonWebKey }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
  const publicKeyJwk  = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { publicKeyJwk, privateKeyJwk };
}

/** Returns existing keypair from localStorage, or generates + persists a new one. */
export async function getOrCreateKeyPair(): Promise<{ publicKeyJwk: JsonWebKey; privateKeyJwk: JsonWebKey }> {
  if (typeof window === 'undefined') throw new Error('dmCrypto requires a browser context');

  const storedPub  = localStorage.getItem(STORAGE_PUBLIC_KEY);
  const storedPriv = localStorage.getItem(STORAGE_PRIVATE_KEY);

  if (storedPub && storedPriv) {
    try {
      return { publicKeyJwk: JSON.parse(storedPub), privateKeyJwk: JSON.parse(storedPriv) };
    } catch {
      /* corrupted — regenerate */
    }
  }

  const { publicKeyJwk, privateKeyJwk } = await generateKeyPair();
  localStorage.setItem(STORAGE_PUBLIC_KEY,  JSON.stringify(publicKeyJwk));
  localStorage.setItem(STORAGE_PRIVATE_KEY, JSON.stringify(privateKeyJwk));
  return { publicKeyJwk, privateKeyJwk };
}

// ── Key import helpers ─────────────────────────────────────────────────────────

function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
}

function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  );
}

// ── Shared-key derivation (ECDH → HKDF → AES-GCM) ────────────────────────────

const sharedKeyCache = new Map<string, CryptoKey>();

async function deriveSharedKey(myPrivateJwk: JsonWebKey, theirPublicJwk: JsonWebKey, cacheKey: string): Promise<CryptoKey> {
  if (sharedKeyCache.has(cacheKey)) return sharedKeyCache.get(cacheKey)!;

  const myPrivate   = await importPrivateKey(myPrivateJwk);
  const theirPublic = await importPublicKey(theirPublicJwk);

  // ECDH → raw shared secret
  const rawEcdh = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublic },
    myPrivate,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  // HKDF → AES-GCM-256 key (deterministic, both sides derive the same key)
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      // Empty salt + fixed info keeps derivation deterministic across browsers
      salt: new Uint8Array(32),
      info: new TextEncoder().encode('edutechexos-dm-v1'),
    },
    rawEcdh,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  sharedKeyCache.set(cacheKey, aesKey);
  return aesKey;
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  // Ensure the backing buffer is a plain ArrayBuffer (required by Web Crypto API types)
  return new Uint8Array(bytes.buffer.slice(0) as ArrayBuffer);
}

export async function encryptDMMessage(
  plaintext: string,
  myPrivateJwk: JsonWebKey,
  theirPublicJwk: JsonWebKey,
  cacheKey: string
): Promise<string> {
  const sharedKey = await deriveSharedKey(myPrivateJwk, theirPublicJwk, cacheKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    new TextEncoder().encode(plaintext)
  );
  return `${ENC_PREFIX}${toBase64(iv.buffer as ArrayBuffer)}.${toBase64(ciphertext)}`;
}

export async function decryptDMMessage(
  encrypted: string,
  myPrivateJwk: JsonWebKey,
  theirPublicJwk: JsonWebKey,
  cacheKey: string
): Promise<string> {
  if (!encrypted.startsWith(ENC_PREFIX)) return encrypted; // legacy plaintext
  const payload = encrypted.slice(ENC_PREFIX.length);
  const dotIdx = payload.indexOf('.');
  if (dotIdx === -1) return '[Encrypted message]';

  const iv         = fromBase64(payload.slice(0, dotIdx));
  const ciphertext = fromBase64(payload.slice(dotIdx + 1));

  try {
    const sharedKey = await deriveSharedKey(myPrivateJwk, theirPublicJwk, cacheKey);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, ciphertext);
    return new TextDecoder().decode(plain);
  } catch {
    return '[Encrypted message — key unavailable]';
  }
}

export function isEncrypted(text: string): boolean {
  return typeof text === 'string' && text.startsWith(ENC_PREFIX);
}

// ── Server key registry ───────────────────────────────────────────────────────

const publicKeyCache = new Map<string, JsonWebKey>();

export async function publishPublicKey(publicKeyJwk: JsonWebKey, token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ publicKey: JSON.stringify(publicKeyJwk) }),
    });
  } catch {
    /* non-fatal — will retry on next login */
  }
}

// Cache emails that returned 404 so we don't hammer the API on every render
const noKeyCache = new Set<string>();

export async function fetchPartnerPublicKey(partnerEmail: string, token: string): Promise<JsonWebKey | null> {
  if (publicKeyCache.has(partnerEmail)) return publicKeyCache.get(partnerEmail)!;
  if (noKeyCache.has(partnerEmail)) return null; // already confirmed no key — stop retrying
  try {
    const res = await fetch(`${API_BASE}/api/keys/${encodeURIComponent(partnerEmail)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      noKeyCache.add(partnerEmail); // don't retry until page reload
      return null;
    }
    const data = await res.json();
    if (!data.success || !data.publicKey) { noKeyCache.add(partnerEmail); return null; }
    const jwk: JsonWebKey = JSON.parse(data.publicKey);
    publicKeyCache.set(partnerEmail, jwk);
    return jwk;
  } catch {
    return null;
  }
}

/** Derive a stable cache key from two emails (order-independent). */
export function dmCacheKey(emailA: string, emailB: string): string {
  return [emailA.toLowerCase(), emailB.toLowerCase()].sort().join('::');
}
