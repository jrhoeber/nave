import * as Crypto from 'expo-crypto';
import { log } from './log';

export const APP_NAME_BLOCKLIST = 'nave';
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;

interface ContextOptions {
  email?: string;
  appName?: string;
}

export function validateLengthAndContext(
  password: string,
  { email, appName = APP_NAME_BLOCKLIST }: ContextOptions = {},
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  const lower = password.toLowerCase();
  const localPart = email?.split('@')[0]?.toLowerCase();
  if (localPart && localPart.length >= 4 && lower.includes(localPart)) {
    return "Password can't contain your email or the app name.";
  }
  if (appName && lower.includes(appName.toLowerCase())) {
    return "Password can't contain your email or the app name.";
  }
  return null;
}

export async function sha1Hex(password: string): Promise<string> {
  const hex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, password);
  return hex.toUpperCase();
}

export async function checkPwned(password: string): Promise<boolean> {
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) {
      log.warn('[pwned] non-OK response', res.status);
      return false;
    }
    const text = await res.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix?.trim().toUpperCase() === suffix && Number(count) > 0) {
        return true;
      }
    }
    return false;
  } catch (err) {
    log.warn('[pwned] check failed; allowing', (err as Error).message);
    return false;
  }
}
