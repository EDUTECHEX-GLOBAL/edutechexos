// src/app/lib/auth.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

/**
 * Hash a plain‑text password.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
}

/**
 * Compare a plain‑text password with a hashed password.
 */
export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/**
 * Generate a secure random password.
 * Returns a base64‑string of 12 bytes (~16 characters).
 */
export function generateTempPassword(): string {
  const bytes = crypto.randomBytes(12);
  return bytes.toString('base64');
}
