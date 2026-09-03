# FastPriceCard

Printable price list & menu generator. Runs entirely in the browser — no backend, no database, no session server. Host on GitHub Pages.

## Working assumptions

| Decision | Choice |
|---|---|
| Routing / base path | Relative URLs — works on apex or `/repo/` project Pages |
| Billing | One-time $19 lifetime Pro unlock |
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

## Commerce setup

Edit `js/config.js`:

1. Set `CHECKOUT_URL` to your Gumroad or Lemon Squeezy product link.
2. Optionally set `LICENSE_VALIDATE_URL` to a CORS-friendly validate endpoint.
   - Until set, any key matching `FPC-XXXX-XXXX` or a long alphanumeric key activates Pro **locally** (demo / soft gate).
3. Client-side gating is bypassable by determined users — intentional for zero-backend.

### Post-purchase key handoff

- Prefer checkout success URL with `?key=YOUR_LICENSE_KEY` — the app stores it and cleans the query.
- Or paste the key in the paywall modal.

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
