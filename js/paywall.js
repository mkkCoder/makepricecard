import { APP_NAME, CHECKOUT_URL, TEMPLATES } from './config.js';
import { openCheckout, validateAndStore } from './license.js';

let dialog;
let onUnlocked = () => {};

export function initPaywall({ onUnlock }) {
  onUnlocked = onUnlock;
  dialog = document.getElementById('paywall-modal');
  if (!dialog) return;

  dialog.querySelector('[data-close-paywall]')?.addEventListener('click', closePaywall);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closePaywall();
  });
  dialog.querySelector('[data-checkout]')?.addEventListener('click', (e) => {
    e.preventDefault();
    openCheckout();
  });

  const form = dialog.querySelector('#license-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = dialog.querySelector('#license-key');
    const status = dialog.querySelector('#license-status');
    const btn = dialog.querySelector('[data-activate]');
    status.textContent = 'Checking…';
    status.className = 'license-status';
    btn.disabled = true;
    const result = await validateAndStore(input.value);
    btn.disabled = false;
    if (result.ok) {
      status.textContent = result.offline
        ? 'Activated offline from a previously verified key.'
        : 'License activated. Pro unlocked.';
      status.className = 'license-status ok';
      onUnlocked();
      setTimeout(closePaywall, 600);
    } else {
      status.textContent = result.error || 'Activation failed.';
      status.className = 'license-status err';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog?.open) closePaywall();
  });
}

export function openPaywall(reason = 'pro') {
  if (!dialog) return;
  const reasons = {
    template: 'Unlock premium templates',
    logo: 'Add your logo with Pro',
    watermark: 'Remove the watermark',
    pro: `Unlock ${APP_NAME} Pro`,
  };
  const title = dialog.querySelector('[data-paywall-title]');
  if (title) title.textContent = reasons[reason] || reasons.pro;
  const checkout = dialog.querySelector('[data-checkout]');
  if (checkout) checkout.href = CHECKOUT_URL;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

export function closePaywall() {
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

export function proPerkList() {
  const locked = TEMPLATES.filter((t) => t.pro).map((t) => t.name);
  return [
    'Remove watermark on preview & exports',
    `Unlock templates: ${locked.join(', ')}`,
    'Upload a custom logo',
    'Lifetime license — one payment',
  ];
}
