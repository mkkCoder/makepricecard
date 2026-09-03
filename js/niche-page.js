import { renderPreview } from './preview.js';
import { nicheToState } from './niche-utils.js';

/**
 * Progressive enhancement: replace static niche card with live preview engine.
 */
function boot() {
  const raw = document.getElementById('niche-state');
  const stage = document.getElementById('preview-stage');
  if (!raw || !stage) return;

  let payload;
  try {
    payload = JSON.parse(raw.textContent || '{}');
  } catch {
    return;
  }

  const state = nicheToState(payload);
  renderPreview(stage, state, { isPro: false });
}

boot();
