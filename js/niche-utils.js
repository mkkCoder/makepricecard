import { uid } from './state.js';

/**
 * Convert a niches.json entry (or embedded niche-state payload) into editor state.
 */
export function nicheToState(niche) {
  const business = niche.business || {};
  const categories = (niche.prefilledItems || niche.categories || []).map((cat) => ({
    id: uid('cat'),
    name: cat.name || 'Category',
    items: (cat.items || []).map((item) => ({
      id: uid('item'),
      name: item.name || '',
      description: item.description || '',
      price: String(item.price ?? ''),
    })),
  }));

  return {
    business: {
      name: business.name || '',
      tagline: business.tagline || '',
      phone: business.phone || '',
      instagram: business.instagram || '',
    },
    currency: niche.currency || 'USD',
    categories:
      categories.length > 0
        ? categories
        : [
            {
              id: uid('cat'),
              name: 'Services',
              items: [{ id: uid('item'), name: '', description: '', price: '' }],
            },
          ],
    template: niche.template || 'minimalist',
    format: niche.format || 'a4',
    logoDataUrl: null,
  };
}

export async function fetchNicheBySlug(slug) {
  if (!slug) return null;
  const res = await fetch(new URL('data/niches.json', window.location.href));
  if (!res.ok) return null;
  const niches = await res.json();
  return niches.find((n) => n.slug === slug) || null;
}
