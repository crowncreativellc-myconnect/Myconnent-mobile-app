// ─── Contact Hashing ─────────────────────────────────────────────────────────
// On-device SHA-256 of normalized phone/email so we can silently bridge two
// testers who share an unregistered contact without ever storing raw values.
// Both users must produce byte-identical output for the same input, so:
//   1. Normalization is deterministic (lowercase, punctuation-stripped).
//   2. The pepper is app-wide (same across every install) — a per-device or
//      per-user salt would defeat cross-user matching, which is the whole
//      point. The pepper is rainbow-table friction only, NOT a security
//      boundary; phone numbers are enumerable.
// ─────────────────────────────────────────────────────────────────────────────

import * as Crypto from 'expo-crypto';

export type ContactHashType = 'email' | 'phone';

const PEPPER = process.env.EXPO_PUBLIC_CONTACT_HASH_PEPPER ?? 'mykonnect-beta-v1';

export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

// Beta assumption: bare 10-digit numbers are US and get +1 prepended. Anything
// already starting with + is left as-is (digits only). Under 7 digits → null.
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D+/g, '');
  if (digits.length < 7) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export async function hashContact(value: string, type: ContactHashType): Promise<string> {
  const normalized = type === 'email' ? normalizeEmail(value) : normalizePhone(value);
  if (!normalized) throw new Error(`hashContact: invalid ${type} "${value}"`);
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${PEPPER}:${type}:${normalized}`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

export interface HashedContactRow {
  hash: string;
  hash_type: ContactHashType;
}

// Batch-hash a mix of emails and phones, deduplicating by hash. Skips invalid
// entries silently — callers pass in a raw contact dump.
export async function hashContactBatch(inputs: {
  emails: string[];
  phones: string[];
}): Promise<HashedContactRow[]> {
  const results: HashedContactRow[] = [];
  const seen = new Set<string>();

  for (const email of inputs.emails) {
    const normalized = normalizeEmail(email);
    if (!normalized) continue;
    const hash = await hashContact(normalized, 'email');
    const key = `email:${hash}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ hash, hash_type: 'email' });
  }

  for (const phone of inputs.phones) {
    const normalized = normalizePhone(phone);
    if (!normalized) continue;
    const hash = await hashContact(normalized, 'phone');
    const key = `phone:${hash}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ hash, hash_type: 'phone' });
  }

  return results;
}
