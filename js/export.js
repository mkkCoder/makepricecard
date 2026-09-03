/**
 * Export PDF / PNG from the live preview card.
 * Free exports are watermarked in the generation pipeline (not only by hiding UI).
 * Pro: no watermark. Client-side checks remain bypassable — intentional for zero-backend.
 */
import { WATERMARK_TEXT } from './config.js';

function waitFonts() {
  if (document.fonts?.ready) return document.fonts.ready;
  return Promise.resolve();
}

function JsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  if (typeof window.jsPDF === 'function') return window.jsPDF;
  return null;
}

/** Stamp diagonal + footer watermark onto a canvas (free tier). */
export function stampWatermark(canvas, text = WATERMARK_TEXT) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.save();

  // Diagonal tile
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#14201c';
  const fontSize = Math.max(22, Math.round(w * 0.045));
  ctx.font = `700 ${fontSize}px Outfit, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-28 * Math.PI) / 180);
  const label = String(text || 'FastPriceCard').toUpperCase();
  const stepY = fontSize * 4.2;
  const stepX = ctx.measureText(label).width + fontSize * 3;
  for (let y = -h; y < h; y += stepY) {
    for (let x = -w; x < w; x += stepX) {
      ctx.fillText(label, x, y);
    }
  }
  ctx.restore();

  // Footer bar
  const barH = Math.max(28, Math.round(h * 0.035));
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, h - barH, w, barH);
  ctx.fillStyle = '#333333';
  ctx.font = `600 ${Math.max(14, Math.round(barH * 0.45))}px Outfit, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h - barH / 2);
  ctx.restore();
}

/** Solid fallbacks — html2canvas often drops CSS gradients. */
const TEMPLATE_EXPORT_BG = {
  'tpl-minimalist': '#fafafa',
  'tpl-cafe': '#f1e2c9',
  'tpl-luxury': '#12100c',
  'tpl-pastel': '#f5eef2',
  'tpl-neon': '#0b0f1a',
};

function exportBackgroundFor(el) {
  if (!el?.classList) return '#ffffff';
  for (const [cls, color] of Object.entries(TEMPLATE_EXPORT_BG)) {
    if (el.classList.contains(cls)) return color;
  }
  return '#ffffff';
}

/** Paint capture onto an opaque template fill (fixes transparent / dropped gradients). */
function compositeOnBackground(source, fill) {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d');
  if (!ctx) return source;
  ctx.fillStyle = fill || '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  return out;
}

function flattenCloneCard(original, el) {
  el.classList.remove('is-multipage', 'is-scaled');
  el.style.zoom = '1';
  el.style.transform = 'none';
  el.style.opacity = '1';

  const bg = exportBackgroundFor(original) || exportBackgroundFor(el);
  el.style.setProperty('background', bg, 'important');
  el.style.setProperty('background-image', 'none', 'important');
  el.style.setProperty('background-color', bg, 'important');

  // Keep live text colors so dark templates stay readable
  try {
    const rootColor = getComputedStyle(original).color;
    if (rootColor) el.style.setProperty('color', rootColor, 'important');
  } catch {
    /* ignore */
  }

  el.querySelectorAll('.card-fit-outer, .card-fit-inner, .card-header, .card-body').forEach((n) => {
    n.style.setProperty('background', 'transparent', 'important');
    n.style.setProperty('background-image', 'none', 'important');
    n.style.opacity = '1';
    n.style.transform = 'none';
  });

  el.querySelectorAll('.card-watermark, .card-watermark-overlay').forEach((n) => n.remove());
}

async function captureNode(node, { watermark } = { watermark: false }) {
  await waitFonts();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  if (typeof html2canvas === 'undefined') {
    throw new Error('html2canvas missing — hard-refresh the page');
  }

  const fill = exportBackgroundFor(node);
  const prevCss = node.style.cssText;
  // Mutate live node too — more reliable than onclone alone for html2canvas
  node.style.setProperty('background', fill, 'important');
  node.style.setProperty('background-image', 'none', 'important');
  node.style.setProperty('background-color', fill, 'important');

  let raw;
  try {
    raw = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: fill,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc, clonedNode) => {
        const el =
          (clonedNode?.id === 'price-card' ? clonedNode : null) ||
          clonedNode?.closest?.('#price-card') ||
          clonedDoc.getElementById('price-card') ||
          clonedDoc.querySelector('.price-card');
        if (!el) return;
        flattenCloneCard(node, el);
      },
    });
  } finally {
    node.style.cssText = prevCss;
  }

  // Always composite so PDF/PNG share the same opaque background
  const canvas = compositeOnBackground(raw, fill);

  if (watermark) {
    stampWatermark(canvas, WATERMARK_TEXT);
  }

  return canvas;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not create image blob'))),
      type,
      quality
    );
  });
}

/** Call at the start of a click handler (preserves user gesture). */
export async function pickSaveTarget(filename, mime) {
  if (typeof window.showSaveFilePicker !== 'function') return null;
  const ext = filename.includes('.') ? '.' + filename.split('.').pop() : '';
  try {
    return await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: filename,
          accept: { [mime]: ext ? [ext] : [] },
        },
      ],
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      const cancel = new Error('cancelled');
      cancel.code = 'cancelled';
      throw cancel;
    }
    return null;
  }
}

export async function writeBlob(blob, filename, handle) {
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { method: 'picker' };
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 4000);
  return { method: 'anchor', url };
}

export async function makePngBlob(cardEl, { isPro = false } = {}) {
  if (!cardEl) throw new Error('Preview not ready');
  const canvas = await captureNode(cardEl, { watermark: !isPro });
  return canvasToBlob(canvas, 'image/png');
}

export async function makePdfBlob(cardEl, format = 'a4', { isPro = false } = {}) {
  if (!cardEl) throw new Error('Preview not ready');
  const PDF = JsPDF();
  if (!PDF) throw new Error('jsPDF missing — hard-refresh the page');

  const canvas = await captureNode(cardEl, { watermark: !isPro });
  if (!canvas.width || !canvas.height) throw new Error('Empty capture');

  // PNG preserves dark template colors better than JPEG
  const imgData = canvas.toDataURL('image/png');
  const fill = exportBackgroundFor(cardEl);
  const isStory = format === 'story';
  const pdf = new PDF({
    unit: 'mm',
    format: isStory ? [108, 192] : 'a4',
    orientation: 'portrait',
    compress: true,
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * pageW) / canvas.width;

  const paintPage = (y) => {
    const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fill);
    if (hex) {
      pdf.setFillColor(parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16));
    } else {
      pdf.setFillColor(255, 255, 255);
    }
    pdf.rect(0, 0, pageW, pageH, 'F');
    pdf.addImage(imgData, 'PNG', 0, y, imgW, imgH, undefined, 'FAST');
  };

  if (imgH <= pageH + 0.5) {
    paintPage(0);
  } else {
    let heightLeft = imgH;
    let y = 0;
    paintPage(y);
    heightLeft -= pageH;
    while (heightLeft > 0.5) {
      y -= pageH;
      pdf.addPage();
      paintPage(y);
      heightLeft -= pageH;
    }
  }

  return pdf.output('blob');
}

export async function downloadPng(cardEl, filename = 'price-card.png', opts) {
  const blob = await makePngBlob(cardEl, opts);
  return writeBlob(blob, filename, null);
}

export async function downloadPdf(cardEl, format = 'a4', filename = 'price-card.pdf', opts) {
  const blob = await makePdfBlob(cardEl, format, opts);
  return writeBlob(blob, filename, null);
}
