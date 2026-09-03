/**
 * Export PDF / PNG from the live preview card.
 * html2canvas 1.4 cannot parse CSS color-mix() / color() — keep card CSS simple.
 * Downloads use Blob + optional showSaveFilePicker so browsers don't swallow post-await clicks.
 */

function waitFonts() {
  if (document.fonts?.ready) return document.fonts.ready;
  return Promise.resolve();
}

function JsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  if (typeof window.jsPDF === 'function') return window.jsPDF;
  return null;
}

async function captureNode(node) {
  await waitFonts();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  if (typeof html2canvas === 'undefined') {
    throw new Error('html2canvas missing — hard-refresh the page');
  }

  return html2canvas(node, {
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
      const wm = el.querySelector('.card-watermark');
      if (wm) {
        wm.style.background = '#f0f0f0';
        wm.style.backgroundImage = 'none';
        wm.style.opacity = '1';
      }
    },
  });
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

export async function makePngBlob(cardEl) {
  if (!cardEl) throw new Error('Preview not ready');
  const canvas = await captureNode(cardEl);
  return canvasToBlob(canvas, 'image/png');
}

export async function makePdfBlob(cardEl, format = 'a4') {
  if (!cardEl) throw new Error('Preview not ready');
  const PDF = JsPDF();
  if (!PDF) throw new Error('jsPDF missing — hard-refresh the page');

  const canvas = await captureNode(cardEl);
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

/** Back-compat helpers */
export async function downloadPng(cardEl, filename = 'price-card.png') {
  const blob = await makePngBlob(cardEl);
  return writeBlob(blob, filename, null);
}

export async function downloadPdf(cardEl, format = 'a4', filename = 'price-card.pdf') {
  const blob = await makePdfBlob(cardEl, format);
  return writeBlob(blob, filename, null);
}
