# Vice Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/kunala23/gta6-cover-art-vice/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/kunala23/gta6-cover-art-vice/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Cover Maker** turns your photo and a caption into cover art in the
style of GTA 6's posters — the multi-panel cover look, bold gradient
lettering, and a Vice City sunset or neon colour grade — and exports it as
a PNG to share. It runs offline in a desktop browser from its own static
files: your photos are read on your own machine and never uploaded
anywhere. No Rockstar artwork, logos, or fonts are used; the sunset,
skyline, and palm trees are all drawn in code.

## What it does

- **Four layouts** — a 5-panel poster (one big centre portrait with four
  smaller tilted panels around it), 3-panel, single hero, and quad 2×2.
- **Five colour grades** — Sunset, Neon Nights, Vice Pink, Golden Hour,
  and Noir — each a different sky palette, sun, and photo tint.
- **Any photo, any panel** — add your own photos (file picker or
  drag-and-drop), click a photo then a panel to place it, or fill every
  panel with one photo. Drag on the canvas to pan a photo inside its
  panel, scroll or use the Zoom slider to crop closer.
- **Editable caption** — big bold italic lettering with a dark outline
  and gradient fill, plus a sub-caption line, three placements (bottom,
  top, diagonal), and an adjustable size.
- **One-click demo** — "Load demo photos" fills the cover with the two
  built-in sample photos, so the app works with no photo of your own.
- **Fast export** — PNG download in 1080 × 1080, 1080 × 1350, or
  1920 × 1080, straight from the canvas.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The flow is four
steps: load a photo (or the demo photos) → pick a layout and a grade →
edit the caption → export a PNG.

## How it is built

Plain static files, no libraries and no network requests: `app/index.html`
plus `app/style.css` and three small ES modules under `app/src/` —
`cover.js` (the render engine: procedural sunset background, panel
layouts, grades, lettering), `editor.js` (photo loading, panel
assignment, pan/zoom, export, and the `?demo=1` / `?shot=cover`
screenshot modes), and `main.js` (bootstrap). `main.ts` at the repository
root copies `app/` and `screenshots/` into the output directory and
writes `dossier.json` with the vendored make.fun library.

## Screenshots

- `screenshots/1-cover.jpg` — the exported 1080 × 1080 cover
  (5-panel poster, Sunset grade).
- `screenshots/2-editor.jpg` — the editor in a browser with a demo
  photo loaded.
- `screenshots/3-cover-tall.jpg` — the exported 1080 × 1350 cover
  (3-panel, Neon Nights).
- `screenshots/4-cover-wide.jpg` — the exported 1920 × 1080 cover
  (quad, Golden Hour).

---

<sub>Entered on [make.fun](https://make.fun/r/t1ajmem7?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
