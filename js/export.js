/**
 * Export PDF / PNG from the live preview card.
 * Canvas-first PDF is more reliable than html2pdf pagebreak modes on CSS cards.
 */

function waitFonts() {
  if (document.fonts?.ready) return document.fonts.ready;
  return Promise.resolve();
}

function JsPDF() {
  // html2pdf.bundle and some CDNs expose this differently
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  if (typeof window.jsPDF === 'function') return window.jsPDF;
  return null;
}

async function captureNode(node) {
  await waitFonts();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // Temporarily neutralize zoom/scale quirks for capture
  const prevZoom = node.style.zoom;
  const scaled = node.classList.contains('is-scaled');
  if (scaled) node.style.zoom = '1';

  try {
    return await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      height: Math.ceil(node.scrollHeight),
      windowHeight: Math.ceil(node.scrollHeight),
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    if (scaled) node.style.zoom = prevZoom;
  }
}

export async function downloadPng(cardEl, filename = 'price-card.png') {
  if (!cardEl) throw new Error('Preview not ready');
  if (typeof html2canvas === 'undefined') throw new Error('html2canvas missing');
  const canvas = await captureNode(cardEl);
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function downloadPdf(cardEl, format = 'a4', filename = 'price-card.pdf') {
  if (!cardEl) throw new Error('Preview not ready');
  if (typeof html2canvas === 'undefined') throw new Error('html2canvas missing');

  const PDF = JsPDF();
  if (!PDF) {
    // Last resort: try html2pdf helper if jsPDF isn't global
    if (typeof html2pdf !== 'undefined') {
      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
          jsPDF: {
            unit: 'mm',
            format: format === 'story' ? [108, 192] : 'a4',
            orientation: 'portrait',
          },
        })
        .from(cardEl)
        .save();
      return;
    }
    throw new Error('PDF engine missing');
  }

  const canvas = await captureNode(cardEl);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const isStory = format === 'story';
  const pdf = new PDF({
    unit: 'mm',
    format: isStory ? [108, 192] : 'a4',
    orientation: 'portrait',
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * pageW) / canvas.width;

  // Single page if it fits (or story); otherwise tile across A4 pages
  if (imgH <= pageH + 0.5) {
    pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
  } else {
    let heightLeft = imgH;
    let y = 0;
    pdf.addImage(imgData, 'JPEG', 0, y, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0.5) {
      y -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, y, imgW, imgH);
      heightLeft -= pageH;
    }
  }

  pdf.save(filename);
}
