/* Vice Cover Maker — cover render engine.
   Draws the whole poster on one canvas: a procedural Vice City sunset
   background, photo panels in the chosen layout, a colour grade, and the
   bold caption lettering. No images are borrowed: the sky, sun, skyline
   and palms are all drawn with code. */

'use strict';

/* Colour grades: each one is a sky palette, a sun colour, a photo tint
   and a neon accent used for the grid and caption gradient. */
const VICE_GRADES = {
  sunset: {
    label: 'Sunset',
    sky: ['#2b1055', '#7b2d8b', '#e6497a', '#ff7a3d', '#ffc46b'],
    sun: '#ffd97a',
    sunGlow: 'rgba(255, 170, 80, 0.55)',
    tint: '#ff7a3d',
    tintAlpha: 0.10,
    neon: '#ff5da2',
    caption: ['#fff6d8', '#ffd23e', '#ff5da2'],
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#0d0221', '#3b0a6e', '#a4138f', '#ff2e88', '#00e5ff'],
    sun: '#ff5df2',
    sunGlow: 'rgba(0, 229, 255, 0.45)',
    tint: '#b14bff',
    tintAlpha: 0.14,
    neon: '#00e5ff',
    caption: ['#eafcff', '#00e5ff', '#ff2e88'],
  },
  pink: {
    label: 'Vice Pink',
    sky: ['#3d0a4e', '#8f1d6e', '#e83e8c', '#ff7eb6', '#ffc2dd'],
    sun: '#ffe3f1',
    sunGlow: 'rgba(255, 126, 182, 0.5)',
    tint: '#ff5da2',
    tintAlpha: 0.12,
    neon: '#ff7eb6',
    caption: ['#ffffff', '#ffc2dd', '#e83e8c'],
  },
  golden: {
    label: 'Golden Hour',
    sky: ['#3a1c07', '#8a4b12', '#d9821e', '#ffb347', '#ffe9a8'],
    sun: '#fff3c4',
    sunGlow: 'rgba(255, 179, 71, 0.55)',
    tint: '#ffb347',
    tintAlpha: 0.10,
    neon: '#ffb347',
    caption: ['#fffbe8', '#ffd23e', '#ff8c1a'],
  },
  noir: {
    label: 'Noir',
    sky: ['#05060f', '#141428', '#2c2c4a', '#5a4a6e', '#8f7ba8'],
    sun: '#e8e4f5',
    sunGlow: 'rgba(180, 170, 220, 0.4)',
    tint: '#7a6bb0',
    tintAlpha: 0.16,
    neon: '#b9a8ff',
    caption: ['#ffffff', '#cfc6f5', '#8f7ba8'],
  },
};

/* Layouts: each returns panel rectangles (fractions of width/height)
   plus a small rotation in radians for the outer panels. */
const VICE_LAYOUTS = {
  hero: { label: 'Hero', panels: 1 },
  three: { label: '3-Panel', panels: 3 },
  five: { label: '5-Panel Poster', panels: 5 },
  quad: { label: 'Quad', panels: 4 },
};

/* A tiny deterministic pseudo-random generator so the skyline and palms
   look the same on every render of the same cover. */
function viceSeeded(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function vicePanelRects(layout, width, height) {
  const gap = Math.round(Math.min(width, height) * 0.018);
  const m = Math.round(Math.min(width, height) * 0.028);
  const innerW = width - m * 2;
  const innerH = height - m * 2;
  if (layout === 'hero') {
    return [{ x: m, y: m, w: innerW, h: innerH, rot: 0 }];
  }
  if (layout === 'quad') {
    const w = (innerW - gap) / 2;
    const h = (innerH - gap) / 2;
    return [
      { x: m, y: m, w, h, rot: -0.012 },
      { x: m + w + gap, y: m, w, h, rot: 0.012 },
      { x: m, y: m + h + gap, w, h, rot: 0.012 },
      { x: m + w + gap, y: m + h + gap, w, h, rot: -0.012 },
    ];
  }
  if (layout === 'three') {
    const leftW = Math.round(innerW * 0.56);
    const rightW = innerW - leftW - gap;
    const rightH = (innerH - gap) / 2;
    return [
      { x: m, y: m, w: leftW, h: innerH, rot: 0 },
      { x: m + leftW + gap, y: m, w: rightW, h: rightH, rot: 0.014 },
      { x: m + leftW + gap, y: m + rightH + gap, w: rightW, h: rightH, rot: -0.014 },
    ];
  }
  /* five: one large central portrait panel with four smaller panels
     around it, slightly rotated — the classic multi-panel cover feel. */
  const centreW = Math.round(innerW * 0.42);
  const centreH = Math.round(innerH * 0.80);
  const centreX = m + Math.round((innerW - centreW) / 2);
  const centreY = m + Math.round((innerH - centreH) / 2);
  const sideW = Math.round((innerW - centreW) / 2) - gap;
  const sideH = Math.round((innerH - gap) / 2);
  return [
    { x: centreX, y: centreY, w: centreW, h: centreH, rot: 0 },
    { x: m, y: m, w: sideW, h: sideH, rot: -0.028 },
    { x: m + innerW - sideW, y: m, w: sideW, h: sideH, rot: 0.028 },
    { x: m, y: m + sideH + gap, w: sideW, h: sideH, rot: 0.028 },
    { x: m + innerW - sideW, y: m + sideH + gap, w: sideW, h: sideH, rot: -0.028 },
  ];
}

function viceDrawPalm(ctx, x, y, size, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 0.09;
  ctx.lineCap = 'round';
  /* Curved trunk. */
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(0.12, -0.55, 0.28, -1.0);
  ctx.stroke();
  /* Fronds fanning out from the top of the trunk. */
  const topX = 0.28;
  const topY = -1.0;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = 0.62 - Math.abs(i - 3) * 0.05;
    const ex = topX + Math.cos(a) * len;
    const ey = topY - Math.sin(a) * len * 0.55 - 0.08;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.5, topY - 0.28, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function viceDrawSkyline(ctx, width, horizonY, colour, seed) {
  const rand = viceSeeded(seed);
  ctx.fillStyle = colour;
  let x = 0;
  while (x < width) {
    const bw = width * (0.03 + rand() * 0.05);
    const bh = horizonY * (0.10 + rand() * 0.28);
    ctx.fillRect(x, horizonY - bh, bw, bh);
    /* A rooftop antenna on some towers. */
    if (rand() > 0.6) {
      ctx.fillRect(x + bw / 2 - 1, horizonY - bh - 14, 2, 14);
    }
    x += bw + width * 0.008;
  }
}

function viceDrawBackground(ctx, width, height, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  grade.sky.forEach((colour, i) => {
    sky.addColorStop(i / (grade.sky.length - 1), colour);
  });
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const horizonY = Math.round(height * 0.62);
  const sunR = Math.min(width, height) * 0.16;
  const sunX = width * 0.5;
  const sunY = horizonY - sunR * 0.35;

  /* Sun glow, then the sun disc with retro slats cut across it. */
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.4);
  glow.addColorStop(0, grade.sunGlow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 2.4, sunY - sunR * 2.4, sunR * 4.8, sunR * 4.8);
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grade.sun;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  for (let i = 0; i < 5; i++) {
    const y = sunY + sunR * (0.05 + i * 0.17);
    ctx.fillRect(sunX - sunR, y, sunR * 2, Math.max(2, sunR * 0.045 * (i + 1)));
  }
  ctx.restore();

  /* Distant skyline, then a nearer darker one. */
  viceDrawSkyline(ctx, width, horizonY, 'rgba(30, 8, 50, 0.55)', 7);
  viceDrawSkyline(ctx, width, horizonY + height * 0.02, 'rgba(16, 4, 32, 0.8)', 21);

  /* Neon grid: glowing horizontal streaks below the horizon. */
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = grade.neon;
  ctx.lineWidth = Math.max(1, height * 0.0016);
  ctx.shadowColor = grade.neon;
  ctx.shadowBlur = height * 0.012;
  for (let i = 0; i < 6; i++) {
    const y = horizonY + height * 0.045 + i * height * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  /* Palm silhouettes along the bottom edge. */
  const palmSize = Math.min(width, height) * 0.16;
  const palmY = height * 1.0;
  viceDrawPalm(ctx, width * 0.06, palmY, palmSize, 'rgba(12, 3, 24, 0.9)');
  viceDrawPalm(ctx, width * 0.94, palmY, palmSize * 0.85, 'rgba(12, 3, 24, 0.9)');
  viceDrawPalm(ctx, width * 0.16, palmY + palmSize * 0.08, palmSize * 0.55, 'rgba(12, 3, 24, 0.75)');
  viceDrawPalm(ctx, width * 0.84, palmY + palmSize * 0.08, palmSize * 0.55, 'rgba(12, 3, 24, 0.75)');
}

function viceDrawPanelPhoto(ctx, photo, panel, zoom, panX, panY, grade) {
  if (!photo || !photo.img || !photo.img.naturalWidth) return;
  const img = photo.img;
  ctx.save();
  ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  if (panel.rot) ctx.rotate(panel.rot);
  ctx.translate(-panel.w / 2, -panel.h / 2);
  ctx.beginPath();
  ctx.rect(0, 0, panel.w, panel.h);
  ctx.clip();
  /* Cover fit: scale so the photo fills the panel, then zoom and pan. */
  const base = Math.max(panel.w / img.naturalWidth, panel.h / img.naturalHeight);
  const scale = base * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (panel.w - dw) / 2 + panX * panel.w;
  const dy = (panel.h - dh) / 2 + panY * panel.h;
  ctx.drawImage(img, dx, dy, dw, dh);
  /* Colour grade tint over the photo. */
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = grade.tintAlpha;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, panel.w, panel.h);
  ctx.restore();
}

function viceDrawPanelFrame(ctx, panel, width) {
  ctx.save();
  ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  if (panel.rot) ctx.rotate(panel.rot);
  ctx.translate(-panel.w / 2, -panel.h / 2);
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeRect(0, 0, panel.w, panel.h);
  ctx.lineWidth = Math.max(3, width * 0.005);
  ctx.strokeStyle = 'rgba(10, 2, 20, 0.9)';
  ctx.strokeRect(-Math.max(2, width * 0.002), -Math.max(2, width * 0.002),
    panel.w + Math.max(4, width * 0.004), panel.h + Math.max(4, width * 0.004));
  ctx.restore();
}

function viceDrawCaption(ctx, width, height, state, grade) {
  const text = (state.caption || '').trim();
  const sub = (state.subcaption || '').trim();
  if (!text && !sub) return;
  const size = Math.round(state.captionSize * Math.min(width, height) / 100);
  const placement = state.placement || 'bottom';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  let cx = width / 2;
  let cy = height * 0.86;
  let angle = 0;
  if (placement === 'top') cy = height * 0.12;
  if (placement === 'diagonal') {
    cy = height * 0.52;
    angle = -0.09;
  }

  const drawLine = (line, fontPx, y, fillStops) => {
    ctx.font = `italic 900 ${fontPx}px "Arial Narrow", "Helvetica Neue", Impact, sans-serif`;
    const grad = ctx.createLinearGradient(0, y - fontPx / 2, 0, y + fontPx / 2);
    fillStops.forEach((colour, i) => grad.addColorStop(i / (fillStops.length - 1), colour));
    ctx.save();
    ctx.translate(cx, y);
    if (angle) ctx.rotate(angle);
    ctx.scale(1, 1.08);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = fontPx * 0.18;
    ctx.shadowOffsetY = fontPx * 0.06;
    ctx.lineWidth = Math.max(3, fontPx * 0.11);
    ctx.strokeStyle = '#17082b';
    ctx.strokeText(line, 0, 0);
    ctx.fillStyle = grad;
    ctx.fillText(line, 0, 0);
    ctx.restore();
  };

  if (placement === 'diagonal' && text) {
    /* A dark banner band behind the diagonal caption. */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(12, 2, 24, 0.72)';
    ctx.fillRect(-width * 0.62, -size * 0.72, width * 1.24, size * 1.44);
    ctx.strokeStyle = grade.neon;
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.beginPath();
    ctx.moveTo(-width * 0.62, -size * 0.72);
    ctx.lineTo(width * 0.62, -size * 0.72);
    ctx.moveTo(-width * 0.62, size * 0.72);
    ctx.lineTo(width * 0.62, size * 0.72);
    ctx.stroke();
    ctx.restore();
  }

  if (text) drawLine(text.toUpperCase(), size, cy, grade.caption);
  if (sub) {
    const subSize = Math.round(size * 0.32);
    const subY = placement === 'top' ? cy + size * 0.62 : cy + size * 0.66;
    drawLine(sub.toUpperCase(), subSize, subY, ['#ffffff', '#ffe9f5']);
  }
  ctx.restore();
}

/* The main entry: draw the full cover for `state` onto `canvas`
   at the pixel size width x height. */
function renderViceCover(canvas, state, width, height) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const grade = VICE_GRADES[state.grade] || VICE_GRADES.sunset;
  const layout = VICE_LAYOUTS[state.layout] ? state.layout : 'five';
  viceDrawBackground(ctx, width, height, grade);
  const panels = vicePanelRects(layout, width, height);
  panels.forEach((panel, i) => {
    const slot = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const photo = slot.photo >= 0 ? state.photos[slot.photo] : null;
    if (photo) {
      viceDrawPanelPhoto(ctx, photo, panel, slot.zoom || 1, slot.ox || 0, slot.oy || 0, grade);
    } else {
      /* Empty panel: a dark placeholder with a hint. */
      ctx.save();
      ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
      if (panel.rot) ctx.rotate(panel.rot);
      ctx.fillStyle = 'rgba(10, 2, 22, 0.55)';
      ctx.fillRect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = `600 ${Math.max(12, Math.round(panel.w * 0.055))}px "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD PHOTO', 0, 0);
      ctx.restore();
    }
    viceDrawPanelFrame(ctx, panel, width);
  });
  viceDrawCaption(ctx, width, height, state, grade);
  return true;
}
