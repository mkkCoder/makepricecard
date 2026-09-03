/**
 * Export PDF / PNG from the live preview card.
 * html2canvas 1.4 cannot parse CSS color-mix() / color() — keep card CSS simple.
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
    throw new Error('html2canvas missing');
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
      // Preview-only classes that confuse capture
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

export async function downloadPng(cardEl, filename = 'price-card.png') {
  if (!cardEl) throw new Error('Preview not ready');
  const canvas = await captureNode(cardEl);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadPdf(cardEl, format = 'a4', filename = 'price-card.pdf') {
  if (!cardEl) throw new Error('Preview not ready');

  const PDF = JsPDF();
  if (!PDF) throw new Error('jsPDF missing — hard-refresh the page');

  const canvas = await captureNode(cardEl);
  if (!canvas.width || !canvas.height) {
    throw new Error('Empty capture');
  }

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

  pdf.save(filename);
}
