# The French Gig — website

A simple static site for the band **The French Gig**. No build step, no framework, no dependencies. Just open `index.html` in a browser.

## Files

```
.
├── index.html              ← the page (all content + structure)
├── styles/main.css         ← all styling (theme tokens at the top)
├── scripts/main.js         ← mobile nav, lightbox, footer year
├── assets/                 ← logo, hero background, gallery photos
│   ├── logo.svg
│   ├── hero-bg.svg
│   ├── band-1.svg
│   ├── band-2.svg
│   ├── band-3.svg
│   └── band-4.svg
└── .claude/                ← local dev helper (optional)
    ├── serve.ps1           ← tiny PowerShell static server
    └── launch.json
```

## Preview locally

**Easiest:** double-click `index.html`. Your browser will load everything correctly.

**Or run the bundled local server** (Windows PowerShell, no installs needed):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1
```

Then open <http://localhost:8080/>.

## How to edit

### Swap the logo and photos

Drop your real files into `assets/` using these exact names — the page will pick them up automatically:

| File                | Used as                 | Recommended |
|---------------------|-------------------------|-------------|
| `logo.png`          | header + hero + favicon | transparent PNG, ≥ 512×512 |
| `hero-bg.jpg`       | hero background         | landscape, ≥ 1920×1080 |
| `band-1..4.jpg`     | photo gallery           | landscape, ≥ 1200×900 |

If you keep PNG/JPG names, also update the `<img src="...">` and the CSS `--hero-bg` URL in `styles/main.css` (search for `hero-bg.svg`).

### Change the text

All copy lives in `index.html`. Look for these spots:

- **Tagline:** search for `Live music, French flair`
- **About paragraphs:** the `<section id="about">` block
- **Booking email:** search for `booking@thefrenchgig.com` (replace in two spots — the `mailto:` href and the visible text)
- **Social links:** search for `aria-label="Instagram"` etc. and replace the `href="#"` placeholders with your real URLs

### YouTube videos — auto-updating

The Videos section auto-updates at every page load: it fetches the channel's RSS feed via a public CORS proxy and swaps the 3 iframes to the 3 most recent uploads, using each video's real YouTube title as the caption.

- Channel ID lives in `scripts/main.js` as `YT_CHANNEL_ID` — change it if the channel ever moves.
- The hardcoded iframes in `index.html` are the **fallback**: if the proxy is unreachable or the fetch fails, those stay visible. So whenever you upload, also consider updating those fallbacks (or just trust the live fetch).
- The proxy in use is `https://corsproxy.io/?url=` — third-party. If it ever disappears, swap to another (`https://api.allorigins.win/raw?url=`, `https://api.codetabs.com/v1/proxy?quest=`) by editing `PROXY` in `scripts/main.js`. For a more durable setup, deploy a tiny Cloudflare Worker that fetches the RSS server-side and returns it with CORS headers.

### Re-theme

Open `styles/main.css` and edit the `:root` block at the top — `--bg`, `--accent`, `--accent-2`, `--font-display`, etc. Every color and font references those tokens.

## Deploy (free options)

All three accept a drag-and-drop of this folder:

- **Netlify Drop** — <https://app.netlify.com/drop>
- **Cloudflare Pages** — <https://pages.cloudflare.com/>
- **GitHub Pages** — push the folder to a repo, enable Pages in repo settings

The site is fully static — no server, database, or build needed.

## What's intentionally left out

- No backend / contact form (a `mailto:` link covers booking; add Formspree or Netlify Forms later if you want a form)
- No mailing list signup
- No tour-dates / events calendar
- No CMS — edit HTML directly
