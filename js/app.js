import { CURRENCIES, FORMATS, TEMPLATES } from './config.js';
import { downloadPdf, downloadPng } from './export.js';
import {
  getCachedKey,
  hydrateKeyFromUrl,
  isProFromCache,
  revalidateIfNeeded,
} from './license.js';
import { initPaywall, openPaywall, proPerkList } from './paywall.js';
import { renderPreview } from './preview.js';
import { defaultState, moveItem, normalizeCurrency, uid } from './state.js';
import { exportCsv, exportJson, loadState, saveState } from './storage.js';

let state = loadState() || defaultState();
state.currency = normalizeCurrency(state.currency);
let isPro = false;
let saveTimer = null;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState(state), 120);
}

function refreshPro() {
  isPro = isProFromCache();
  document.documentElement.dataset.pro = isPro ? 'true' : 'false';
  const badge = $('#pro-badge');
  if (badge) badge.hidden = !isPro;

  const hint = $('#license-hint');
  if (hint) {
    if (isPro) {
      const cached = getCachedKey();
      hint.textContent = cached
        ? `Pro active on this device (${cached.slice(0, 4)}…). Auto-saves in this browser.`
        : 'Pro active. Data auto-saves in this browser.';
    } else {
      hint.textContent =
        'Free tier includes the Minimalist template. Data auto-saves in this browser.';
    }
  }

  // Downgrade locked template if license lost
  const tpl = TEMPLATES.find((t) => t.id === state.template);
  if (tpl?.pro && !isPro) {
    state.template = 'minimalist';
    persist();
  }
}

function renderAll() {
  renderEditor();
  renderPreview($('#preview-stage'), state, { isPro });
  syncFormatChrome();
}

function syncFormatChrome() {
  const stage = $('#preview-frame');
  if (!stage) return;
  stage.dataset.format = state.format;
}

function renderEditor() {
  const curSel = $('#currency');
  if (curSel && !curSel.dataset.ready) {
    curSel.innerHTML = CURRENCIES.map(
      (c) =>
        `<option value="${c.code}">${c.symbol} ${c.code} — ${c.name}</option>`
    ).join('');
    curSel.dataset.ready = '1';
  }
  if (curSel) curSel.value = normalizeCurrency(state.currency);

  $('#biz-name').value = state.business.name || '';
  $('#biz-tagline').value = state.business.tagline || '';
  $('#biz-phone').value = state.business.phone || '';
  $('#biz-ig').value = state.business.instagram || '';

  // Templates
  const tplRoot = $('#template-grid');
  if (tplRoot) {
    tplRoot.innerHTML = TEMPLATES.map((t) => {
      const locked = t.pro && !isPro;
      const active = state.template === t.id;
      return `
        <button type="button" class="tpl-chip ${active ? 'active' : ''} ${locked ? 'locked' : ''}"
          data-template="${t.id}" ${locked ? 'data-locked="1"' : ''} aria-pressed="${active}">
          <span class="tpl-swatch swatch-${t.id}" aria-hidden="true"></span>
          <span class="tpl-meta">
            <strong>${t.name}</strong>
            <small>${t.blurb}${locked ? ' · Pro' : ''}</small>
          </span>
          ${locked ? '<span class="lock-icon" aria-hidden="true" title="Pro"></span>' : ''}
        </button>`;
    }).join('');
  }

  // Formats
  const fmtRoot = $('#format-grid');
  if (fmtRoot) {
    fmtRoot.innerHTML = FORMATS.map((f) => {
      const active = state.format === f.id;
      return `
        <button type="button" class="fmt-chip ${active ? 'active' : ''}" data-format="${f.id}" aria-pressed="${active}">
          <strong>${f.name}</strong>
          <small>${f.label}</small>
        </button>`;
    }).join('');
  }

  // Categories
  const catRoot = $('#categories');
  if (catRoot) {
    catRoot.innerHTML = state.categories
      .map((cat, ci) => categoryBlock(cat, ci))
      .join('');
  }

  // Logo UI
  const logoPreview = $('#logo-preview');
  const logoClear = $('#logo-clear');
  const logoName = $('#logo-filename');
  if (logoPreview) {
    if (state.logoDataUrl && isPro) {
      logoPreview.src = state.logoDataUrl;
      logoPreview.hidden = false;
    } else {
      logoPreview.hidden = true;
    }
  }
  if (logoClear) logoClear.hidden = !(state.logoDataUrl && isPro);
  if (logoName) {
    const file = $('#logo-input')?.files?.[0];
    if (state.logoDataUrl && isPro) {
      logoName.textContent = file?.name || 'Logo uploaded';
    } else {
      logoName.textContent = 'No file chosen';
    }
  }
}

function categoryBlock(cat, ci) {
  const items = cat.items
    .map((item, ii) => itemRow(cat.id, item, ii, cat.items.length))
    .join('');

  return `
    <section class="cat-block" data-cat-id="${cat.id}">
      <div class="cat-head">
        <input class="cat-name" data-cat-field="name" data-ci="${ci}" value="${escapeAttr(cat.name)}" placeholder="Category name" />
        <div class="cat-actions">
          <button type="button" class="icon-btn" data-cat-up="${ci}" title="Move category up" ${ci === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="icon-btn" data-cat-down="${ci}" title="Move category down" ${ci === state.categories.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="icon-btn danger" data-cat-remove="${ci}" title="Remove category">✕</button>
        </div>
      </div>
      <div class="item-list">${items}</div>
      <button type="button" class="btn-ghost" data-add-item="${ci}">+ Add item</button>
    </section>`;
}

function itemRow(catId, item, ii, total) {
  return `
    <div class="item-row" data-item-id="${item.id}">
      <div class="item-fields">
        <input data-item="name" data-item-id="${item.id}" value="${escapeAttr(item.name)}" placeholder="Item name" />
        <input data-item="description" data-item-id="${item.id}" value="${escapeAttr(item.description || '')}" placeholder="Short description" />
        <input data-item="price" data-item-id="${item.id}" value="${escapeAttr(item.price)}" placeholder="Price" inputmode="decimal" />
      </div>
      <div class="item-actions">
        <button type="button" class="icon-btn" data-item-up="${item.id}" title="Move up" ${ii === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="icon-btn" data-item-down="${item.id}" title="Move down" ${ii === total - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="icon-btn danger" data-item-remove="${item.id}" title="Remove">✕</button>
      </div>
    </div>`;
}

function escapeAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function findItem(itemId) {
  for (const cat of state.categories) {
    const idx = cat.items.findIndex((i) => i.id === itemId);
    if (idx >= 0) return { cat, idx, item: cat.items[idx] };
  }
  return null;
}

function bindEditor() {
  const panel = $('#editor-panel');

  panel.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'biz-name') state.business.name = t.value;
    else if (t.id === 'biz-tagline') state.business.tagline = t.value;
    else if (t.id === 'biz-phone') state.business.phone = t.value;
    else if (t.id === 'biz-ig') state.business.instagram = t.value.replace(/^@/, '');
    else if (t.id === 'currency') state.currency = normalizeCurrency(t.value);
    else if (t.matches('[data-cat-field="name"]')) {
      const ci = Number(t.dataset.ci);
      state.categories[ci].name = t.value;
    } else if (t.matches('[data-item]')) {
      const found = findItem(t.dataset.itemId);
      if (found) found.item[t.dataset.item] = t.value;
    } else return;

    persist();
    renderPreview($('#preview-stage'), state, { isPro });
  });

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.template) {
      const meta = TEMPLATES.find((t) => t.id === btn.dataset.template);
      if (meta?.pro && !isPro) {
        openPaywall('template');
        return;
      }
      state.template = meta.id;
      persist();
      renderAll();
      return;
    }

    if (btn.dataset.format) {
      state.format = btn.dataset.format;
      persist();
      renderAll();
      return;
    }

    if (btn.id === 'add-category') {
      state.categories.push({
        id: uid('cat'),
        name: 'New category',
        items: [{ id: uid('item'), name: '', description: '', price: '' }],
      });
      persist();
      renderAll();
      return;
    }

    if (btn.dataset.addItem != null) {
      const ci = Number(btn.dataset.addItem);
      state.categories[ci].items.push({
        id: uid('item'),
        name: '',
        description: '',
        price: '',
      });
      persist();
      renderAll();
      return;
    }

    if (btn.dataset.catRemove != null) {
      const ci = Number(btn.dataset.catRemove);
      state.categories.splice(ci, 1);
      persist();
      renderAll();
      return;
    }

    if (btn.dataset.catUp != null) {
      const ci = Number(btn.dataset.catUp);
      state.categories = moveItem(state.categories, ci, ci - 1);
      persist();
      renderAll();
      return;
    }

    if (btn.dataset.catDown != null) {
      const ci = Number(btn.dataset.catDown);
      state.categories = moveItem(state.categories, ci, ci + 1);
      persist();
      renderAll();
      return;
    }

    if (btn.dataset.itemRemove) {
      const found = findItem(btn.dataset.itemRemove);
      if (found) {
        found.cat.items.splice(found.idx, 1);
        persist();
        renderAll();
      }
      return;
    }

    if (btn.dataset.itemUp) {
      const found = findItem(btn.dataset.itemUp);
      if (found) {
        found.cat.items = moveItem(found.cat.items, found.idx, found.idx - 1);
        persist();
        renderAll();
      }
      return;
    }

    if (btn.dataset.itemDown) {
      const found = findItem(btn.dataset.itemDown);
      if (found) {
        found.cat.items = moveItem(found.cat.items, found.idx, found.idx + 1);
        persist();
        renderAll();
      }
      return;
    }
  });

  $('#logo-pick')?.addEventListener('click', () => {
    if (!isPro) {
      openPaywall('logo');
      return;
    }
    $('#logo-input')?.click();
  });

  $('#logo-input')?.addEventListener('change', async (e) => {
    if (!isPro) {
      e.target.value = '';
      openPaywall('logo');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFile(file);
    state.logoDataUrl = dataUrl;
    persist();
    renderAll();
  });

  $('#logo-clear')?.addEventListener('click', () => {
    state.logoDataUrl = null;
    const input = $('#logo-input');
    if (input) input.value = '';
    persist();
    renderAll();
  });

  $('#btn-remove-watermark')?.addEventListener('click', () => {
    if (isPro) return;
    openPaywall('watermark');
  });

  $('#btn-export-json')?.addEventListener('click', () => exportJson(state));
  $('#btn-export-csv')?.addEventListener('click', () => exportCsv(state));

  $('#btn-pdf')?.addEventListener('click', async () => {
    const card = $('#price-card');
    const btn = $('#btn-pdf');
    btn.disabled = true;
    try {
      await downloadPdf(card, state.format);
    } catch (err) {
      console.error(err);
      alert('PDF export failed. Try PNG instead.');
    } finally {
      btn.disabled = false;
    }
  });

  $('#btn-png')?.addEventListener('click', async () => {
    const card = $('#price-card');
    const btn = $('#btn-png');
    btn.disabled = true;
    try {
      await downloadPng(card);
    } catch (err) {
      console.error(err);
      alert('PNG export failed.');
    } finally {
      btn.disabled = false;
    }
  });
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fillPaywallPerks() {
  const list = $('#perk-list');
  if (!list) return;
  list.innerHTML = proPerkList().map((p) => `<li>${p}</li>`).join('');
}

async function boot() {
  initPaywall({
    onUnlock: () => {
      refreshPro();
      renderAll();
    },
  });
  fillPaywallPerks();

  await hydrateKeyFromUrl();
  await revalidateIfNeeded();
  refreshPro();

  bindEditor();
  renderAll();

  // Debounced save on page hide
  window.addEventListener('pagehide', () => saveState(state));
}

boot();
