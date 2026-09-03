import { WATERMARK_TEXT } from './config.js';
import { currencySymbol } from './state.js';

const TEMPLATE_CLASS = {
  minimalist: 'tpl-minimalist',
  cafe: 'tpl-cafe',
  luxury: 'tpl-luxury',
  pastel: 'tpl-pastel',
  neon: 'tpl-neon',
};

const MIN_DENSITY = 0.58;

function contentOverflows(card) {
  const outer = card.querySelector('.card-fit-outer');
  const body = card.querySelector('.card-body');
  const header = card.querySelector('.card-header');
  if (!outer || !body) return false;
  const headerH = header ? header.offsetHeight : 0;
  // body.scrollHeight includes clipped item list; outer is the available frame
  return headerH + body.scrollHeight > outer.clientHeight + 2;
}

/**
 * Shrink typography/spacing so content fits the fixed frame.
 * A4 that still overflows → multi-page (grows height; PDF paginates).
 * Story that still overflows → uniform scale of the content block.
 */
export function fitCardToFrame(card) {
  if (!card) return { density: 1, multipage: false, scaled: false };

  card.classList.remove('is-multipage', 'is-scaled');
  card.style.removeProperty('--card-density');
  card.style.removeProperty('--card-scale');

  const outer = card.querySelector('.card-fit-outer');
  const body = card.querySelector('.card-body');
  const header = card.querySelector('.card-header');
  if (!outer || !body) return { density: 1, multipage: false, scaled: false };

  card.style.setProperty('--card-density', '1');
  void card.offsetHeight;

  if (!contentOverflows(card)) {
    return { density: 1, multipage: false, scaled: false };
  }

  let lo = MIN_DENSITY;
  let hi = 1;
  let best = MIN_DENSITY;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    card.style.setProperty('--card-density', String(mid));
    void card.offsetHeight;
    if (contentOverflows(card)) {
      hi = mid;
    } else {
      best = mid;
      lo = mid;
    }
  }
  card.style.setProperty('--card-density', String(best));
  void card.offsetHeight;

  if (!contentOverflows(card)) {
    return { density: best, multipage: false, scaled: false };
  }

  if (card.classList.contains('format-a4')) {
    card.classList.add('is-multipage');
    card.style.setProperty('--card-density', String(Math.max(best, 0.78)));
    const pageH = Math.round(card.offsetWidth * (297 / 210));
    card.style.setProperty('--page-h', `${pageH}px`);
    return { density: Math.max(best, 0.78), multipage: true, scaled: false };
  }

  // Story: scale header+body as one unit into the frame
  card.style.setProperty('--card-density', String(best));
  void card.offsetHeight;
  const headerH = header ? header.offsetHeight : 0;
  const needed = headerH + body.scrollHeight;
  const available = outer.clientHeight;
  if (needed > 0 && available > 0) {
    const scale = Math.min(1, (available - 2) / needed);
    card.classList.add('is-scaled');
    card.style.setProperty('--card-scale', String(Math.max(0.42, scale)));
    return { density: best, multipage: false, scaled: true };
  }

  return { density: best, multipage: false, scaled: false };
}

function updateFitNote(result) {
  const note = document.getElementById('fit-note');
  if (!note) return;
  if (result.multipage) {
    note.textContent = 'Long list → multi-page A4 (PDF will paginate).';
    note.hidden = false;
  } else if (result.scaled || result.density < 0.92) {
    note.textContent = 'Layout compacted to fit the frame.';
    note.hidden = false;
  } else {
    note.hidden = true;
    note.textContent = '';
  }
}

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
      <div class="card-fit-outer">
        <div class="card-fit-inner">
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
        </div>
      </div>
      ${
        showWatermark
          ? `<div class="card-watermark-overlay" aria-hidden="true"><span>${escapeHtml(
              WATERMARK_TEXT
            )}</span></div>
      <footer class="card-watermark">${escapeHtml(WATERMARK_TEXT)}</footer>`
          : ''
      }
    </article>
  `;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const card = root.querySelector('#price-card');
      updateFitNote(fitCardToFrame(card));
    });
  });
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
