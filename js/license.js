/**
 * Client-side license gating.
 * Access checks are bypassable by determined users — intentional tradeoff for zero-backend.
 */
import {
  CHECKOUT_URL,
  LICENSE_REVALIDATE_MS,
  LICENSE_VALIDATE_URL,
} from './config.js';
import { clearLicense, loadLicense, saveLicense } from './storage.js';

/** Lenient paste cleanup: strip spaces and common separators noise */
export function normalizeKey(raw) {
  return String(raw || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toUpperCase()
    .trim();
}

function looksLikeKey(key) {
  // Accept common Gumroad/LS-ish keys OR FPC-XXXX-XXXX demo format
  return (
    /^FPC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key) ||
    /^[A-Z0-9]{8,}(-[A-Z0-9]+)*$/.test(key)
  );
}

export function isProFromCache() {
  const rec = loadLicense();
  if (!rec?.valid || !rec?.key) return false;
  const age = Date.now() - (rec.verifiedAt || 0);
  // Fail-open only for previously verified keys within / past grace of revalidate window
  if (age <= LICENSE_REVALIDATE_MS) return true;
  // Stale but still fail-open for one-time lifetime until next online check
  return true;
}

export function getCachedKey() {
  return loadLicense()?.key || '';
}

export async function validateAndStore(rawKey) {
  const key = normalizeKey(rawKey);
  if (!key || !looksLikeKey(key)) {
    return { ok: false, error: 'That key does not look valid. Check and try again.' };
  }

  if (LICENSE_VALIDATE_URL) {
    try {
      const res = await fetch(LICENSE_VALIDATE_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: key }),
      });
      if (!res.ok) {
        return { ok: false, error: 'License could not be verified. Try again later.' };
      }
      const data = await res.json();
      const valid = data?.valid === true || data?.activated === true || data?.meta?.valid === true;
      if (!valid) {
        return { ok: false, error: 'This license key is not active.' };
      }
    } catch {
      // Network fail: grant only if this exact key was verified before
      const prev = loadLicense();
      if (prev?.valid && normalizeKey(prev.key) === key) {
        return { ok: true, offline: true };
      }
      return {
        ok: false,
        error: 'Could not reach the license server. Try again when online.',
      };
    }
  }

  saveLicense({
    key,
    valid: true,
    verifiedAt: Date.now(),
  });
  return { ok: true };
}

export async function revalidateIfNeeded() {
  const rec = loadLicense();
  if (!rec?.valid || !rec.key) return false;
  if (!LICENSE_VALIDATE_URL) return true;
  const age = Date.now() - (rec.verifiedAt || 0);
  if (age < LICENSE_REVALIDATE_MS) return true;

  try {
    const res = await fetch(LICENSE_VALIDATE_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: rec.key }),
    });
    if (!res.ok) return true; // fail-open for known key
    const data = await res.json();
    const valid = data?.valid === true || data?.meta?.valid === true;
    if (valid) {
      saveLicense({ ...rec, verifiedAt: Date.now(), valid: true });
      return true;
    }
    clearLicense();
    return false;
  } catch {
    return true; // fail-open for previously verified one-time license
  }
}

export function openCheckout() {
  window.open(CHECKOUT_URL, '_blank', 'noopener,noreferrer');
}

/** Hydrate ?key= from post-purchase redirect */
export async function hydrateKeyFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('key') || params.get('license_key');
  if (!key) return false;
  const result = await validateAndStore(key);
  const url = new URL(window.location.href);
  url.searchParams.delete('key');
  url.searchParams.delete('license_key');
  window.history.replaceState({}, '', url.pathname + url.hash);
  return result.ok;
}
