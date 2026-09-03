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
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
    // Capture full multipage height (not just the clipped viewport)
    height: node.scrollHeight,
    windowHeight: node.scrollHeight,
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
    await downloadPng(cardEl, filename.replace(/\.pdf$/i, '.png'));
    return;
  }

  const isStory = format === 'story';
  const multipage = cardEl.classList.contains('is-multipage');

  const opt = {
    margin: 0,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      height: cardEl.scrollHeight,
      windowHeight: cardEl.scrollHeight,
    },
    jsPDF: {
      unit: 'mm',
      format: isStory ? [108, 192] : 'a4',
      orientation: 'portrait',
    },
    // Single-frame cards: keep one page. Long A4: allow natural page breaks.
    pagebreak: multipage
      ? { mode: ['css', 'legacy'], avoid: ['.card-header', '.card-item', '.card-watermark'] }
      : { mode: ['avoid-all'] },
  };

  await html2pdf().set(opt).from(cardEl).save();
}
