/**
 * FastPriceCard — deployment & commerce config (Lemon Squeezy).
 * Replace CHECKOUT_URL with your real Lemon Squeezy buy/checkout link before going live.
 */
export const APP_NAME = 'FastPriceCard';
export const APP_URL = 'fastpricecard.online';
export const WATERMARK_TEXT = `Created with ${APP_URL}`;

/** Lemon Squeezy product buy URL (Share → Buy link, or checkout/buy/{variant_id}) */
export const CHECKOUT_URL =
  'https://tik-tak.lemonsqueezy.com/checkout/buy/4c7b1992-c3e0-4c4d-ad17-98724dcea690';

/**
 * Lemon Squeezy License API — validate (no store API key required).
 * Docs: https://docs.lemonsqueezy.com/api/license-api/validate-license-key
 * Browser CORS may block this; fail-open uses a previously verified cached key.
 */
export const LICENSE_VALIDATE_URL =
  'https://api.lemonsqueezy.com/v1/licenses/validate';

/** Optional: hard-check that a validated key belongs to your product */
export const LEMON_SQUEEZY_STORE_ID = '';
export const LEMON_SQUEEZY_PRODUCT_ID = '';

/** One-time purchase: revalidate at most every 30 days */
export const LICENSE_REVALIDATE_MS = 30 * 24 * 60 * 60 * 1000;

export const STORAGE_KEY = 'fastpricecard-v1';
export const LICENSE_KEY = 'fastpricecard-license-v1';

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
];

export const TEMPLATES = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    blurb: 'Clean black & white',
    pro: false,
  },
  {
    id: 'cafe',
    name: 'Warm Café',
    blurb: 'Espresso & cream',
    pro: true,
  },
  {
    id: 'luxury',
    name: 'Luxury Gold',
    blurb: 'Dark & gold accents',
    pro: true,
  },
  {
    id: 'pastel',
    name: 'Pastel Beauty',
    blurb: 'Soft blush tones',
    pro: true,
  },
  {
    id: 'neon',
    name: 'Neon Modern',
    blurb: 'Electric night look',
    pro: true,
  },
];

export const FORMATS = [
  { id: 'a4', name: 'A4 Print', ratio: '210/297', label: 'Portrait print' },
  { id: 'story', name: '9:16 Story', ratio: '9/16', label: 'Social / wallpaper' },
];
