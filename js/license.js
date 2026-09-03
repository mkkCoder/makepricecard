/**
 * Client-side license gating (Lemon Squeezy).
 * Access checks are bypassable by determined users — intentional tradeoff for zero-backend.
 */
import {
  CHECKOUT_URL,
  LEMON_SQUEEZY_PRODUCT_ID,
  LEMON_SQUEEZY_STORE_ID,
  LICENSE_REVALIDATE_MS,
  LICENSE_VALIDATE_URL,
} from './config.js';
import { clearLicense, loadLicense, saveLicense } from './storage.js';

/** Lenient paste cleanup: strip zero-width chars; keep UUID hyphens */
export function normalizeKey(raw) {
  return String(raw || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .trim();
}

function looksLikeKey(key) {
  const k = key.toUpperCase();
  // Demo keys, Lemon Squeezy UUIDs, or long alphanumeric keys
  return (
    /^FPC-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(key) ||
    /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(key) ||
    /^[A-Z0-9]{8,}(-[A-Z0-9]+)*$/i.test(k)
  );
}

function isDemoKey(key) {
  return /^FPC-/i.test(key);
}

async function lemonValidate(key) {
  // License API examples use form-encoded body
  const body = new URLSearchParams({ license_key: key });
  const res = await fetch(LICENSE_VALIDATE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    return { ok: false, error: 'License could not be verified. Try again later.' };
  }
  const data = await res.json();
  if (data?.valid !== true) {
    return {
      ok: false,
      error: data?.error || 'This license key is not active.',
    };
  }

  const storeId = data?.meta?.store_id != null ? String(data.meta.store_id) : '';
  const productId = data?.meta?.product_id != null ? String(data.meta.product_id) : '';
  if (LEMON_SQUEEZY_STORE_ID && storeId && storeId !== String(LEMON_SQUEEZY_STORE_ID)) {
    return { ok: false, error: 'This license key is not for this product.' };
  }
  if (LEMON_SQUEEZY_PRODUCT_ID && productId && productId !== String(LEMON_SQUEEZY_PRODUCT_ID)) {
    return { ok: false, error: 'This license key is not for this product.' };
  }

  return { ok: true, data };
}

export function isProFromCache() {
  const rec = loadLicense();
  if (!rec?.valid || !rec?.key) return false;
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

  // Local demo keys (dev only) — skip remote Lemon Squeezy call
  if (isDemoKey(key)) {
    saveLicense({ key, valid: true, verifiedAt: Date.now(), provider: 'demo' });
    return { ok: true };
  }

  if (LICENSE_VALIDATE_URL) {
    try {
      const result = await lemonValidate(key);
      if (!result.ok) return result;
    } catch {
      const prev = loadLicense();
      if (prev?.valid && normalizeKey(prev.key) === key) {
        return { ok: true, offline: true };
      }
      return {
        ok: false,
        error: 'Could not reach Lemon Squeezy. Try again when online.',
      };
    }
  }

  saveLicense({
    key,
    valid: true,
    verifiedAt: Date.now(),
    provider: 'lemonsqueezy',
  });
  return { ok: true };
}

export async function revalidateIfNeeded() {
  const rec = loadLicense();
  if (!rec?.valid || !rec.key) return false;
  if (isDemoKey(rec.key) || !LICENSE_VALIDATE_URL) return true;

  const age = Date.now() - (rec.verifiedAt || 0);
  if (age < LICENSE_REVALIDATE_MS) return true;

  try {
    const result = await lemonValidate(rec.key);
    if (result.ok) {
      saveLicense({ ...rec, verifiedAt: Date.now(), valid: true });
      return true;
    }
    // Invalid remotely — drop Pro
    clearLicense();
    return false;
  } catch {
    return true; // fail-open for previously verified one-time license
  }
}

export function openCheckout() {
  window.open(CHECKOUT_URL, '_blank', 'noopener,noreferrer');
}

/** Hydrate ?key= / ?license_key= from Lemon Squeezy success redirect */
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
