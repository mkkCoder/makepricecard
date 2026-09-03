/**
 * Export PDF / PNG from the live preview card.
 * Gating: watermark / templates enforced in render + state, not by hiding buttons.
 * Client-side checks are bypassable — intentional for zero-backend.
 */

function waitFonts() {
  if (document.fonts?.ready) return document.fonts.ready;
  return Promise.resolve();
}

async function captureNode(node) {
  await waitFonts();
  // Ensure layout settles after format switch
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  });
  return canvas;
}

export async function downloadPng(cardEl, filename = 'price-card.png') {
  if (!cardEl) throw new Error('Preview not ready');
  const canvas = await captureNode(cardEl);
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function downloadPdf(cardEl, format = 'a4', filename = 'price-card.pdf') {
  if (!cardEl) throw new Error('Preview not ready');
  if (typeof html2pdf === 'undefined') {
    // Fallback: PNG via canvas if html2pdf missing
    await downloadPng(cardEl, filename.replace(/\.pdf$/i, '.png'));
    return;
  }

  const isStory = format === 'story';
  const opt = {
    margin: 0,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: {
      unit: 'mm',
      format: isStory ? [108, 192] : 'a4',
      orientation: 'portrait',
    },
    pagebreak: { mode: ['avoid-all'] },
  };

  await html2pdf().set(opt).from(cardEl).save();
}
