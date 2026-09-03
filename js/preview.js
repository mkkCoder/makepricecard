import { WATERMARK_TEXT } from './config.js';
import { currencySymbol } from './state.js';

const TEMPLATE_CLASS = {
  minimalist: 'tpl-minimalist',
  cafe: 'tpl-cafe',
  luxury: 'tpl-luxury',
  pastel: 'tpl-pastel',
  neon: 'tpl-neon',
};

export function renderPreview(root, state, { isPro }) {
  if (!root) return;

  const tpl = TEMPLATE_CLASS[state.template] || TEMPLATE_CLASS.minimalist;
  const formatClass = state.format === 'story' ? 'format-story' : 'format-a4';
  const showWatermark = !isPro;
  const cur = currencySymbol(state.currency);

  const logo =
    isPro && state.logoDataUrl
      ? `<img class="card-logo" src="${escapeAttr(state.logoDataUrl)}" alt="" />`
      : '';

  const cats = (state.categories || [])
    .map((cat) => {
      const items = (cat.items || [])
        .map((item) => {
          const price = formatPrice(item.price, cur);
          return `
            <div class="card-item">
              <div class="card-item-top">
                <span class="card-item-name">${escapeHtml(item.name || 'Untitled')}</span>
                <span class="card-item-dots" aria-hidden="true"></span>
                <span class="card-item-price">${escapeHtml(price)}</span>
              </div>
              ${
                item.description
                  ? `<p class="card-item-desc">${escapeHtml(item.description)}</p>`
                  : ''
              }
            </div>`;
        })
        .join('');

      return `
        <section class="card-category">
          <h3 class="card-category-title">${escapeHtml(cat.name || 'Category')}</h3>
          <div class="card-items">${items}</div>
        </section>`;
    })
    .join('');

  const contactBits = [];
  if (state.business.phone) {
    contactBits.push(`<span>${escapeHtml(state.business.phone)}</span>`);
  }
  if (state.business.instagram) {
    contactBits.push(
      `<span>@${escapeHtml(state.business.instagram.replace(/^@/, ''))}</span>`
    );
  }

  root.innerHTML = `
    <article class="price-card ${tpl} ${formatClass}" id="price-card">
      <header class="card-header">
        ${logo}
        <h1 class="card-business">${escapeHtml(state.business.name || 'Your Business')}</h1>
        ${
          state.business.tagline
            ? `<p class="card-tagline">${escapeHtml(state.business.tagline)}</p>`
            : ''
        }
        ${
          contactBits.length
            ? `<div class="card-contact">${contactBits.join('<span class="dot">·</span>')}</div>`
            : ''
        }
      </header>
      <div class="card-body">${cats || '<p class="card-empty">Add categories and items</p>'}</div>
      ${
        showWatermark
          ? `<footer class="card-watermark">${escapeHtml(WATERMARK_TEXT)}</footer>`
          : ''
      }
    </article>
  `;
}

function formatPrice(value, cur) {
  const v = String(value ?? '').trim();
  if (!v) return `${cur}—`;
  return `${cur}${v}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}
