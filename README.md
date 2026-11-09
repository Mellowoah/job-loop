# Yo Upgrade Preview

Private preview build of the upgraded Yo yo-yo game (PixiJS trial).

This is **not** the live site. The live game remains at https://yoyo.grok.me/.

Files served at the site root:
- `index.html` — game shell
- `vendor/pixi.min.js` — PixiJS v8
- `src/` — view, grid, scoring, progression, UI
- `art/png/` — ceramic plates, backgrounds, yo-yo, hand, particles
- `favicon.svg`
- `manifest.webmanifest`

Do not publish `ab/`, `ab_key.txt`, or zip archives to this site.

To update the preview: replace the runtime files above, commit, and push to `main`. Also push the same bytes to `Mellowoah/job-loop` branch `yo-upgrade-preview`. If auto-deploy does not fire, trigger a manual deploy on the Render static site with clearCache.
