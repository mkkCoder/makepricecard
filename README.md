# FastPriceCard

Printable price list & menu generator. Runs entirely in the browser — no backend, no database, no session server. Host on GitHub Pages.

## Working assumptions

| Decision | Choice |
|---|---|
| Routing / base path | Relative URLs — works on apex or `/repo/` project Pages |
| Billing | One-time $10 lifetime Pro unlock |
| Paywall boundary | Free: Minimalist template + watermarked exports. Pro: all templates, logo, no watermark |
| Stack | Vanilla ES modules + local CSS (html2canvas / html2pdf via CDN) |
| Free data export | JSON + CSV always available (no license) |

## Local preview

Any static server from the repo root:

```bash
npx --yes serve .
```

Open the printed URL (ES modules need `http://`, not `file://`).

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Settings → Pages → Source: **Deploy from a branch** → `main` / root (or `/docs` if you move files).
3. Add `.nojekyll` is already present so underscore paths are fine.
4. If the site is at `https://USER.github.io/REPO/`, relative asset paths already work.

### Custom domain (`fastpricecard.online`)

`CNAME` in the repo root is set to `fastpricecard.online`.

1. At your registrar, point DNS:
   - **Apex** `fastpricecard.online` → GitHub Pages `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (or ALIAS/ANAME to `mkkcoder.github.io` if your DNS host supports it).
   - Optional **www** → `CNAME` to `mkkcoder.github.io`.
2. GitHub → repo **Settings → Pages → Custom domain** → `fastpricecard.online` → enable **Enforce HTTPS** after the certificate is ready.
3. Clear any registrar parking/`www` parking records that conflict.

## Commerce setup (Lemon Squeezy)

Edit `js/config.js`:

1. Set `CHECKOUT_URL` to your Lemon Squeezy **Buy** link (Share on the product/variant).
2. Keep `LICENSE_VALIDATE_URL` as `https://api.lemonsqueezy.com/v1/licenses/validate` (License API; no store API key).
3. Optionally set `LEMON_SQUEEZY_STORE_ID` and `LEMON_SQUEEZY_PRODUCT_ID` so keys from other products are rejected.
4. In Lemon Squeezy, enable **license keys** on the product/variant.
5. Optional: set the thank-you / redirect URL to `…/app.html?key={license_key}` if Lemon Squeezy provides that placeholder for your flow.
6. Client-side gating is bypassable — intentional for zero-backend. Browser CORS may block validate; previously verified keys fail-open offline.

Demo keys matching `FPC-XXXX-XXXX` unlock Pro locally without calling Lemon Squeezy (dev only).

## Pro features

- Remove watermark on preview + PDF/PNG
- Templates: Warm Café, Luxury Gold, Pastel Beauty, Neon Modern
- Custom logo upload

## Health metric

Track: **export attempts ÷ successful license activations** (via privacy-friendly analytics of your choice).

## Project layout

```
index.html        # Landing / marketing
app.html          # Editor
{slug}/index.html # Generated niche SEO pages (via npm run gen:niches)
src/data/niches.json
data/niches.json  # Public copy for ?niche= preload
scripts/gen-niches.mjs
css/…
js/…
robots.txt
sitemap.xml
.nojekyll
```

### Niche pages

Edit `src/data/niches.json`, then run:

```bash
npm run gen:niches
```

Or `npm run build` / `npm run dev` (dev regenerates niches first). This writes `/{slug}/index.html`, syncs `data/niches.json` + `sitemap.xml`, and refreshes the home-page template hub.

Live site: **https://fastpricecard.online/** (GitHub Pages fallback: `https://mkkcoder.github.io/makepricecard/`).

## SEO / Search Console (manual)

After deploying these static SEO assets:

1. Confirm `https://fastpricecard.online/robots.txt` and `/sitemap.xml` return **200**.
2. In [Google Search Console](https://search.google.com/search-console): add the **URL-prefix** property `https://fastpricecard.online/` (or Domain property for the whole apex).
3. Verify ownership (HTML file upload, DNS TXT, or Google Analytics — pick one).
4. Submit sitemap: `https://fastpricecard.online/sitemap.xml`.
5. Request indexing for `/`, `/app.html`, and a few niche URLs (e.g. `/salon-price-list/`, `/cafe-menu/`).
6. Optional: set preferred domain / HTTPS already enforced in GitHub Pages settings.
7. Share a link once and use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) / [Twitter Card Validator](https://cards-dev.twitter.com/validator) to refresh `og:image` cache.
8. After niche edits: run `npm run gen:niches`, commit generated `/{slug}/` pages + `sitemap.xml`, then redeploy.
