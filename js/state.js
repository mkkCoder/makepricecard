import { CURRENCIES } from './config.js';

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultState() {
  return {
    business: {
      name: 'Studio North',
      tagline: 'Hair · Color · Care',
      phone: '+1 555 0100',
      instagram: 'studionorth',
    },
    currency: 'ILS',
    categories: [
      {
        id: uid('cat'),
        name: 'Haircuts',
        items: [
          {
            id: uid('item'),
            name: 'Classic Cut',
            description: 'Wash, cut & style',
            price: '120',
          },
          {
            id: uid('item'),
            name: 'Beard Trim',
            description: 'Shape & finish',
            price: '45',
          },
        ],
      },
      {
        id: uid('cat'),
        name: 'Color',
        items: [
          {
            id: uid('item'),
            name: 'Full Color',
            description: 'Single process',
            price: '280',
          },
        ],
      },
    ],
    template: 'minimalist',
    format: 'a4',
    logoDataUrl: null,
  };
}

/** Normalize legacy symbol saves (e.g. "₪") to ISO codes. */
export function normalizeCurrency(value) {
  if (!value) return 'ILS';
  const asCode = CURRENCIES.find((c) => c.code === value);
  if (asCode) return asCode.code;
  if (value === '$') return 'USD';
  const matches = CURRENCIES.filter((c) => c.symbol === value);
  if (matches.length === 1) return matches[0].code;
  if (matches.length > 1) return matches[0].code;
  return 'ILS';
}

export function currencySymbol(codeOrSymbol) {
  const code = normalizeCurrency(codeOrSymbol);
  const found = CURRENCIES.find((c) => c.code === code);
  return found?.symbol || codeOrSymbol || '$';
}

export function moveItem(arr, from, to) {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}
