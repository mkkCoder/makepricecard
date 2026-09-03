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

async function captureNode(node, { watermark } = { watermark: false }) {
  await waitFonts();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  if (typeof html2canvas === 'undefined') {
    throw new Error('html2canvas missing — hard-refresh the page');
  }

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    onclone: (doc) => {
      const el = doc.getElementById('price-card') || doc.querySelector('.price-card');
      if (!el) return;
      el.classList.remove('is-multipage', 'is-scaled');
      el.style.zoom = '1';
      el.style.transform = 'none';

      // Strip preview watermarks; free exports are stamped on the canvas below
      el.querySelectorAll('.card-watermark, .card-watermark-overlay').forEach((n) => n.remove());
    },
  });

  // Enforce in generation logic (Pro skips this)
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

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
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

  if (imgH <= pageH + 0.5) {
    pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH, undefined, 'FAST');
  } else {
    let heightLeft = imgH;
    let y = 0;
    pdf.addImage(imgData, 'JPEG', 0, y, imgW, imgH, undefined, 'FAST');
    heightLeft -= pageH;
    while (heightLeft > 0.5) {
      y -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, y, imgW, imgH, undefined, 'FAST');
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
