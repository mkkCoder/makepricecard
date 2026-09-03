/**
 * FastPriceCard — deployment & commerce config.
 * Update CHECKOUT_URL and LICENSE_VALIDATE_URL before going live.
 */
export const APP_NAME = 'FastPriceCard';
export const APP_URL = 'makefastquote.com/pricelist';
export const WATERMARK_TEXT = `Created with ${APP_URL}`;

/** Gumroad or Lemon Squeezy checkout / product URL */
export const CHECKOUT_URL = 'https://makefastquote.gumroad.com/l/fastpricecard';

/**
 * Optional CORS-friendly license validate endpoint.
 * Lemon Squeezy: POST https://api.lemonsqueezy.com/v1/licenses/validate
 * Body: { license_key: "..." }
 * Leave empty to use local format check only until you wire a real endpoint.
 */
export const LICENSE_VALIDATE_URL = '';

/** One-time purchase: revalidate at most every 30 days */
export const LICENSE_REVALIDATE_MS = 30 * 24 * 60 * 60 * 1000;

export const STORAGE_KEY = 'fastpricecard-v1';
export const LICENSE_KEY = 'fastpricecard-license-v1';

export const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'ILS', symbol: '₪' },
  { code: 'GBP', symbol: '£' },
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
