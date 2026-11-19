[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/kunala23/gta6-cover-art-vice/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/kunala23/gta6-cover-art-vice/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice Cover Maker

Turn your own photos and a caption into cover art in the style of GTA 6 posters — the multi-panel poster look, bold caption lettering, and a Vice City sunset or neon colour grade — exported as a PNG to share. It runs offline in a desktop browser from its own static files: your photos never leave your machine.

## How it works

1. **Load photos** — add your own images, drag and drop them onto the page, or hit *Load demo photos* to try it with the two built-in sample photos.
2. **Pick a layout and grade** — 5-panel poster, 3-panel, single hero, or quad; five colour grades: Sunset, Neon Nights, Vice Pink, Golden Hour, Noir.
3. **Crop and position each panel** — click a panel to select it, drag inside it to pan the photo, scroll or use the zoom slider to zoom. One photo can fill every panel, or each panel can hold a different photo.
4. **Edit the caption** — big bold italic lettering with a gradient fill and dark outline, plus a sub-caption line, adjustable size, and bottom, top, or diagonal-banner placement.
5. **Export PNG** — one click downloads the cover at 1080×1080, 1080×1350, or 1920×1080.

The sunset background — gradient sky, slatted sun, skyline, palm silhouettes, neon grid — is drawn entirely with code. No Rockstar logo, artwork, character, or font is used anywhere; the lettering uses heavy system font stacks only.

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests, no install.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` into the output directory and writes `out/dossier.json`.

## Entry

Built for the make.fun bounty [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) by [@steady-raven-37](https://make.fun/bounty/gta6-cover-art-01). MIT licensed.

Optional: earn referral rewards, a second way to make money — https://make.fun/r/t1ajmem7
