import { STORAGE_KEY, LICENSE_KEY } from './config.js';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('localStorage save failed (quota?)', err);
  }
}

export function loadLicense() {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLicense(record) {
  localStorage.setItem(LICENSE_KEY, JSON.stringify(record));
}

export function clearLicense() {
  localStorage.removeItem(LICENSE_KEY);
}

export function exportJson(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, 'fastpricecard-data.json');
}

export function exportCsv(state) {
  const rows = [['Category', 'Item', 'Description', 'Price', 'Currency']];
  for (const cat of state.categories) {
    for (const item of cat.items) {
      rows.push([
        cat.name,
        item.name,
        item.description || '',
        String(item.price ?? ''),
        state.currency,
      ]);
    }
  }
  const csv = rows
    .map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), 'fastpricecard-data.csv');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
