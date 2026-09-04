const MQ = window.matchMedia('(max-width: 768px)');

function focusables(root) {
  return [...root.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(
    (el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true'
  );
}

function initSiteNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#primary-nav');
  if (!toggle || !nav) return;

  let backdrop = document.querySelector('.nav-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    backdrop.hidden = true;
    nav.after(backdrop);
  }

  const setOpen = (open) => {
    const isMobile = MQ.matches;
    const next = Boolean(open && isMobile);
    toggle.setAttribute('aria-expanded', String(next));
    toggle.setAttribute('aria-label', next ? 'Close menu' : 'Open menu');
    nav.dataset.open = next ? 'true' : 'false';
    backdrop.dataset.open = next ? 'true' : 'false';
    backdrop.hidden = !next;
    document.body.classList.toggle('nav-locked', next);
    if (next) {
      const items = focusables(nav);
      (items[0] || nav).focus();
    }
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  backdrop.addEventListener('click', () => setOpen(false));

  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key !== 'Tab' || toggle.getAttribute('aria-expanded') !== 'true' || !MQ.matches) return;
    const items = [toggle, ...focusables(nav)];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  const onMq = () => {
    if (!MQ.matches) setOpen(false);
  };
  MQ.addEventListener?.('change', onMq);
  MQ.addListener?.(onMq);
}

initSiteNav();
