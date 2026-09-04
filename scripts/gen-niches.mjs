/**
 * Generate niche SEO landing pages + public data/niches.json + sitemap.xml
 * from src/data/niches.json.
 *
 * Usage: node scripts/gen-niches.mjs
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://fastpricecard.online';
const TODAY = new Date().toISOString().slice(0, 10);

const CURRENCY_SYMBOL = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  ILS: '₪',
  CAD: 'C$',
  AUD: 'A$',
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, max) {
  const s = String(str);
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

function formatPrice(value, code) {
  const cur = CURRENCY_SYMBOL[code] || code || '$';
  const v = String(value ?? '').trim();
  if (!v) return `${cur}—`;
  return `${cur}${v}`;
}

function renderStaticCard(niche) {
  const cur = niche.currency || 'USD';
  const cats = (niche.prefilledItems || [])
    .map((cat) => {
      const items = (cat.items || [])
        .map(
          (item) => `
            <div class="card-item">
              <div class="card-item-top">
                <span class="card-item-name">${escapeHtml(item.name)}</span>
                <span class="card-item-dots" aria-hidden="true"></span>
                <span class="card-item-price">${escapeHtml(formatPrice(item.price, cur))}</span>
              </div>
              ${
                item.description
                  ? `<p class="card-item-desc">${escapeHtml(item.description)}</p>`
                  : ''
              }
            </div>`
        )
        .join('');
      return `
        <section class="card-category">
          <h3 class="card-category-title">${escapeHtml(cat.name)}</h3>
          <div class="card-items">${items}</div>
        </section>`;
    })
    .join('');

  const b = niche.business || {};
  const contact = [];
  if (b.phone) contact.push(`<span>${escapeHtml(b.phone)}</span>`);
  if (b.instagram) {
    contact.push(`<span>@${escapeHtml(String(b.instagram).replace(/^@/, ''))}</span>`);
  }

  return `
    <article class="price-card tpl-minimalist format-a4" id="price-card">
      <div class="card-fit-outer">
        <div class="card-fit-inner">
          <header class="card-header">
            <p class="card-business">${escapeHtml(b.name || 'Your Business')}</p>
            ${b.tagline ? `<p class="card-tagline">${escapeHtml(b.tagline)}</p>` : ''}
            ${
              contact.length
                ? `<div class="card-contact">${contact.join('<span class="dot">·</span>')}</div>`
                : ''
            }
          </header>
          <div class="card-body">${cats}</div>
        </div>
      </div>
      <footer class="card-watermark">Created with fastpricecard.online</footer>
    </article>`;
}

function renderFaqHtml(faq) {
  return (faq || [])
    .map(
      (item) => `
        <details>
          <summary>${escapeHtml(item.question)}</summary>
          <p>${escapeHtml(item.answer)}</p>
        </details>`
    )
    .join('');
}

function renderFaqJsonLd(niche) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (niche.faq || []).map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function renderAppJsonLd(niche, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `FastPriceCard — ${niche.title}`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    url,
    image: `${SITE}/assets/og-image.png`,
    description: niche.metaDescription || niche.description,
    featureList: [
      `${niche.industry} price list template`,
      'Live printable preview',
      'PDF and PNG export',
      'No account required',
    ],
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        name: 'Free',
      },
      {
        '@type': 'Offer',
        price: '10',
        priceCurrency: 'USD',
        name: 'Pro lifetime',
      },
    ],
    isPartOf: {
      '@type': 'WebSite',
      name: 'FastPriceCard',
      url: `${SITE}/`,
    },
  };
}

function nichePageHtml(niche) {
  const url = `${SITE}/${niche.slug}/`;
  const title = truncate(niche.metaTitle || niche.title, 60);
  const description = truncate(niche.metaDescription || niche.description, 155);
  const h1 = escapeHtml(niche.metaTitle || niche.title);
  const editorHref = `../app.html?niche=${encodeURIComponent(niche.slug)}`;
  const statePayload = {
    slug: niche.slug,
    business: niche.business,
    currency: niche.currency || 'USD',
    template: niche.template || 'minimalist',
    format: niche.format || 'a4',
    prefilledItems: niche.prefilledItems,
  };

  const cardHtml = renderStaticCard(niche);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#1c1917" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml" />

    <meta property="og:site_name" content="FastPriceCard" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${SITE}/assets/og-image.png" />
    <meta property="og:image:alt" content="${escapeHtml(niche.title)} preview" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${SITE}/assets/og-image.png" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="preload"
      as="style"
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&amp;family=Outfit:wght@400;500;600;700&amp;display=swap"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&amp;family=Outfit:wght@400;500;600;700&amp;display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="../css/app.css" />
    <link rel="stylesheet" href="../css/landing.css" />
    <link rel="stylesheet" href="../css/niche.css" />

    <script type="application/ld+json">${JSON.stringify(renderAppJsonLd(niche, url))}</script>
    <script type="application/ld+json">${JSON.stringify(renderFaqJsonLd(niche))}</script>
  </head>
  <body class="landing niche-page">
    <header class="lp-nav">
      <a class="brand-mark" href="../">Fast<span>Price</span>Card</a>
      <button
        type="button"
        class="nav-toggle"
        aria-expanded="false"
        aria-controls="primary-nav"
        aria-label="Open menu"
      >
        <span class="hamburger" aria-hidden="true"></span>
      </button>
      <nav class="lp-nav-links" id="primary-nav" aria-label="Primary">
        <a href="../#features">Features</a>
        <a href="../#templates-hub">All templates</a>
        <a href="../#pricing">Pricing</a>
        <a class="btn-primary lp-nav-cta" href="${editorHref}">Customize in editor</a>
      </nav>
    </header>

    <main>
      <section class="lp-hero niche-hero">
        <div class="lp-hero-copy">
          <p class="lp-kicker">${escapeHtml(niche.industry)} · printable template</p>
          <h1>${h1}</h1>
          <p class="lp-lead">${escapeHtml(niche.description)}</p>
          <div class="lp-cta-row">
            <a class="btn-primary" href="${editorHref}">Customize this in the editor</a>
            <a class="btn-ghost lp-cta-ghost" href="../app.html">Start blank</a>
          </div>
        </div>
        <div class="lp-hero-visual">
          <div class="lp-mock-frame niche-preview-frame">
            <div
              class="preview-stage niche-preview-stage"
              id="preview-stage"
              data-format="${escapeHtml(niche.format || 'a4')}"
            >
              ${cardHtml}
            </div>
          </div>
          <p class="lp-mock-caption">
            Pre-filled ${escapeHtml(niche.industry.toLowerCase())} sample — edit every line in the
            free editor.
          </p>
        </div>
      </section>

      <section class="lp-section">
        <p class="lp-kicker">What’s included</p>
        <h2>A ready ${escapeHtml(niche.industry.toLowerCase())} price list you can actually print</h2>
        <p class="lp-section-lead">
          Categories and example prices are already filled so you can see the layout immediately.
          Open the editor to rename services, change currency, and download PDF or PNG.
        </p>
        <div class="lp-feature-grid">
          <article class="lp-feature">
            <h3>Crawlable sample menu</h3>
            <p>
              The preview above is real HTML in the page — search engines see the same
              ${escapeHtml(niche.industry.toLowerCase())} structure you do.
            </p>
          </article>
          <article class="lp-feature">
            <h3>One-click customize</h3>
            <p>
              “Customize this in the editor” loads this niche’s items into FastPriceCard via
              <code>?niche=${escapeHtml(niche.slug)}</code>.
            </p>
          </article>
          <article class="lp-feature">
            <h3>Free PDF &amp; PNG</h3>
            <p>
              Export on the free Minimalist template. Pro removes the watermark and unlocks extra
              palettes.
            </p>
          </article>
          <article class="lp-feature">
            <h3>Private by default</h3>
            <p>No account and no upload — your prices stay in the browser until you export.</p>
          </article>
        </div>
      </section>

      <section class="lp-section" id="faq">
        <p class="lp-kicker">Questions</p>
        <h2>${escapeHtml(niche.industry)} price list FAQ</h2>
        <div class="lp-faq">${renderFaqHtml(niche.faq)}</div>
      </section>

      <section class="lp-final">
        <h2>Edit this ${escapeHtml(niche.industry.toLowerCase())} list in under a minute</h2>
        <p>Preload the sample, swap in your prices, download PDF or PNG.</p>
        <a class="btn-primary" href="${editorHref}">Customize this in the editor</a>
      </section>
    </main>

    <footer class="lp-footer">
      <p>
        <a href="../">Home</a> ·
        <a href="../#templates-hub">All templates</a> ·
        <a href="../app.html">Editor</a> ·
        <a href="../privacy.html">Privacy</a> ·
        <a href="../terms.html">Terms</a> ·
        <a href="../contact.html">Contact</a>
      </p>
    </footer>

    <script type="application/json" id="niche-state">${JSON.stringify(statePayload)}</script>
    <script type="module" src="../js/site-nav.js"></script>
    <script type="module" src="../js/niche-page.js"></script>
  </body>
</html>
`;
}

function buildSitemap(niches) {
  const core = [
    { loc: `${SITE}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE}/app.html`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${SITE}/privacy.html`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${SITE}/terms.html`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${SITE}/contact.html`, priority: '0.3', changefreq: 'yearly' },
  ];

  const nicheUrls = niches.map((n) => ({
    loc: `${SITE}/${n.slug}/`,
    priority: '0.8',
    changefreq: 'weekly',
  }));

  const urls = [...core, ...nicheUrls]
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildHubLinks(niches) {
  return niches
    .map(
      (n) => `          <article class="lp-feature">
            <h3><a href="${escapeHtml(n.slug)}/">${escapeHtml(n.title)}</a></h3>
            <p>${escapeHtml(n.metaDescription || n.description)}</p>
          </article>`
    )
    .join('\n');
}

async function syncIndexHub(niches) {
  const indexPath = path.join(ROOT, 'index.html');
  let html = await readFile(indexPath, 'utf8');
  const block = `      <section class="lp-section" id="templates-hub">
        <p class="lp-kicker">Industry templates</p>
        <h2>Printable price lists by niche</h2>
        <p class="lp-section-lead">
          Start from a pre-filled ${niches.length}-industry sample, then customize names and prices
          in the free editor.
        </p>
        <div class="lp-feature-grid niche-hub-grid">
${buildHubLinks(niches)}
        </div>
      </section>

`;

  const start = '<!-- NICHE_HUB:START -->';
  const end = '<!-- NICHE_HUB:END -->';
  if (html.includes(start) && html.includes(end)) {
    html = html.replace(
      new RegExp(`${start}[\\s\\S]*?${end}`),
      `${start}\n${block}${end}`
    );
  } else {
    // Insert before FAQ section
    html = html.replace(
      /      <section class="lp-section" id="faq">/,
      `${start}\n${block}${end}\n      <section class="lp-section" id="faq">`
    );
  }

  // Ensure nav link to hub
  if (!html.includes('href="#templates-hub"')) {
    html = html.replace(
      '<a href="#use-cases">Use cases</a>',
      '<a href="#use-cases">Use cases</a>\n        <a href="#templates-hub">Templates</a>'
    );
  }

  await writeFile(indexPath, html, 'utf8');
}

async function cleanOldNicheDirs(niches) {
  const slugs = new Set(niches.map((n) => n.slug));
  // Only remove dirs that look like generated niches (contain index.html with niche-page class)
  // Safer: read a manifest. For simplicity, delete known previous slugs from manifest file.
  const manifestPath = path.join(ROOT, 'src', 'data', '.niche-slugs.json');
  let previous = [];
  try {
    previous = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    previous = [];
  }
  for (const slug of previous) {
    if (!slugs.has(slug)) {
      await rm(path.join(ROOT, slug), { recursive: true, force: true });
    }
  }
  await writeFile(manifestPath, JSON.stringify([...slugs], null, 2) + '\n', 'utf8');
}

async function main() {
  const nichesPath = path.join(ROOT, 'src', 'data', 'niches.json');
  const niches = JSON.parse(await readFile(nichesPath, 'utf8'));
  if (!Array.isArray(niches) || niches.length === 0) {
    throw new Error('src/data/niches.json must be a non-empty array');
  }

  await cleanOldNicheDirs(niches);

  const dataDir = path.join(ROOT, 'data');
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    path.join(dataDir, 'niches.json'),
    JSON.stringify(niches, null, 2) + '\n',
    'utf8'
  );

  for (const niche of niches) {
    if (!niche.slug) throw new Error('Niche missing slug');
    const dir = path.join(ROOT, niche.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), nichePageHtml(niche), 'utf8');
  }

  await writeFile(path.join(ROOT, 'sitemap.xml'), buildSitemap(niches), 'utf8');
  await syncIndexHub(niches);

  console.log(`Generated ${niches.length} niche pages, data/niches.json, sitemap.xml, index hub.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
