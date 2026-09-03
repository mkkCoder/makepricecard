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

### Custom domain

- Apex: `A` records to GitHub Pages IPs; clear registrar parking records.
- `www`: `CNAME` → `USER.github.io`.
- Wait for SSL before forcing HTTPS-only.

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
css/app.css
css/landing.css
js/…              # Editor modules
robots.txt
sitemap.xml
.nojekyll
```

Open **https://mkkcoder.github.io/makepricecard/** for the landing page, then **Open editor**.
