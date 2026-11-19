// Vice Cover Maker — cover render engine.
// Draws the whole cover on one canvas: a procedural Vice City sunset
// (sky gradient, striped sun, skyline, palms, neon grid), photo panels in
// the chosen layout with a colour grade, and big bold caption lettering.
// Pure canvas 2d, no assets, no network. Deterministic: the same state
// always paints the same pixels.

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: '1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: '1080 × 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: '1920 × 1080' },
];

export const LAYOUTS = {
  five: { label: '5-panel poster', panels: 5 },
  three: { label: '3-panel', panels: 3 },
  hero: { label: 'Hero', panels: 1 },
  quad: { label: 'Quad 2×2', panels: 4 },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    sky: ['#2b1055', '#7b2f8b', '#ff2e88', '#ff7a3d', '#ffd166'],
    sun: '#ffedb0',
    sunGlow: 'rgba(255, 150, 60, 0.55)',
    skyline: '#1c0b33',
    sea: '#3d1160',
    streak: '#ff9a3d',
    tint: 'rgba(255, 110, 60, 0.14)',
    caption: ['#fff3b0', '#ff9a3d', '#ff2e88'],
    accent: '#2de2ff',
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#07032b', '#2a0a5e', '#a4139c', '#ff2e88', '#2de2ff'],
    sun: '#ffe9fb',
    sunGlow: 'rgba(255, 46, 136, 0.6)',
    skyline: '#0d0333',
    sea: '#12084a',
    streak: '#2de2ff',
    tint: 'rgba(255, 46, 200, 0.16)',
    caption: ['#d9fbff', '#2de2ff', '#ff2e88'],
    accent: '#ffd166',
  },
  pink: {
    label: 'Vice Pink',
    sky: ['#3d0a4d', '#8f1d6e', '#e83e8c', '#ff7ab8', '#ffc2dd'],
    sun: '#fff0f6',
    sunGlow: 'rgba(232, 62, 140, 0.55)',
    skyline: '#2a0733',
    sea: '#57104d',
    streak: '#ff7ab8',
    tint: 'rgba(232, 62, 140, 0.15)',
    caption: ['#ffffff', '#ffb3d9', '#e83e8c'],
    accent: '#ffd166',
  },
  golden: {
    label: 'Golden Hour',
    sky: ['#33150a', '#7a3a10', '#e07b1f', '#ffb347', '#ffe9a8'],
    sun: '#fff8dc',
    sunGlow: 'rgba(255, 179, 71, 0.6)',
    skyline: '#241005',
    sea: '#5c2a0c',
    streak: '#ffd166',
    tint: 'rgba(255, 170, 40, 0.14)',
    caption: ['#fffbe8', '#ffd166', '#ff7a3d'],
    accent: '#ff2e88',
  },
  noir: {
    label: 'Noir',
    sky: ['#050505', '#1a1a22', '#3a3a48', '#6e6e80', '#c9c9d6'],
    sun: '#f2f2f5',
    sunGlow: 'rgba(220, 220, 235, 0.4)',
    skyline: '#000000',
    sea: '#101014',
    streak: '#e8e8f0',
    tint: 'rgba(120, 120, 160, 0.18)',
    caption: ['#ffffff', '#d8d8e2', '#8f8fa3'],
    accent: '#ff2e88',
  },
};

/** Small deterministic generator so the skyline and palms never change. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panel rectangles for a layout, as fractions of the cover, with a tilt. */
export function panelLayout(layout, w, h) {
  const f = (x, y, pw, ph, rot) => ({ x: x * w, y: y * h, w: pw * w, h: ph * h, rot });
  if (layout === 'three') {
    return [
      f(0.04, 0.07, 0.29, 0.64, -2),
      f(0.355, 0.03, 0.29, 0.69, 0),
      f(0.67, 0.07, 0.29, 0.64, 2),
    ];
  }
  if (layout === 'hero') return [f(0.08, 0.04, 0.84, 0.70, -1)];
  if (layout === 'quad') {
    return [
      f(0.05, 0.05, 0.43, 0.33, -2),
      f(0.52, 0.05, 0.43, 0.33, 2),
      f(0.05, 0.41, 0.43, 0.33, 2),
      f(0.52, 0.41, 0.43, 0.33, -2),
    ];
  }
  // five: one big centre portrait, four small panels around it.
  return [
    f(0.30, 0.05, 0.40, 0.62, 0),
    f(0.04, 0.07, 0.24, 0.28, -3),
    f(0.72, 0.07, 0.24, 0.28, 3),
    f(0.05, 0.52, 0.23, 0.20, 2),
    f(0.72, 0.52, 0.23, 0.20, -2),
  ];
}

/** A fresh per-panel edit state for a layout: no photo yet, no zoom, centred. */
export function freshPanels(layout) {
  return panelLayout(layout, 1, 1).map(() => ({ photo: -1, zoom: 1, ox: 0, oy: 0 }));
}

function drawSkyline(ctx, w, h, grade, rng) {
  const base = h * 0.62;
  ctx.fillStyle = grade.skyline;
  let x = -w * 0.02;
  while (x < w * 1.02) {
    const bw = w * (0.04 + rng() * 0.07);
    const bh = h * (0.05 + rng() * 0.11);
    ctx.fillRect(x, base - bh, bw, bh + h * 0.06);
    if (rng() > 0.6) {
      // A rooftop antenna on some towers.
      ctx.fillRect(x + bw / 2 - 1, base - bh - h * 0.03, 2, h * 0.03);
    }
    x += bw + w * 0.008;
  }
}

function drawPalm(ctx, x, y, s, lean, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a gentle curve rising from the ground.
  ctx.lineWidth = Math.max(3, s * 0.045);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.5, s * 0.02, -s * 0.95);
  ctx.stroke();
  // Fronds fanning out from the crown.
  const cx = s * 0.02;
  const cy = -s * 0.95;
  ctx.lineWidth = Math.max(2, s * 0.03);
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 26) * (Math.PI / 180);
    const len = s * (0.34 + (i % 2) * 0.08);
    const ex = cx + Math.cos(a) * len;
    const ey = cy + Math.sin(a) * len * 0.55 + s * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.6, cy - s * 0.06, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackground(ctx, w, h, grade) {
  const horizon = h * 0.62;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon + 2);

  // Low sun with a soft glow and retro slits across its lower half.
  // Sized from the shorter side so it stays a disc on wide covers, and
  // set low enough that its lower arc peeks out below the centre panel.
  const sunR = Math.min(w, h) * 0.13;
  const sunX = w * 0.5;
  const sunY = horizon - sunR * 0.35;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.2);
  glow.addColorStop(0, grade.sunGlow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 3.2, sunY - sunR * 3.2, sunR * 6.4, sunR * 6.4);
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grade.sun;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  ctx.fillStyle = grade.sky[2];
  let slitY = sunY + sunR * 0.1;
  let slitH = Math.max(2, sunR * 0.045);
  while (slitY < sunY + sunR) {
    ctx.fillRect(sunX - sunR, slitY, sunR * 2, slitH);
    slitY += slitH * 2.6;
    slitH *= 1.25;
  }
  ctx.restore();

  drawSkyline(ctx, w, h, grade, mulberry32(20261119));

  // Water / street band under the horizon with neon reflection streaks.
  const sea = ctx.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, grade.sea);
  sea.addColorStop(1, '#0a0616');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h - horizon);
  const rng = mulberry32(77);
  ctx.fillStyle = grade.streak;
  for (let i = 0; i < 26; i++) {
    const y = horizon + h * 0.02 + rng() * (h * 0.34);
    const len = w * (0.04 + rng() * 0.22);
    const x = rng() * w;
    ctx.globalAlpha = 0.12 + rng() * 0.3;
    ctx.fillRect(x, y, len, Math.max(1.5, h * 0.0022));
  }
  ctx.globalAlpha = 1;

  // Faint neon perspective grid on the lower band.
  ctx.strokeStyle = grade.accent;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = Math.max(1, w * 0.0012);
  const vpX = w * 0.5;
  const vpY = horizon;
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(vpX + i * w * 0.06, vpY);
    ctx.lineTo(vpX + i * w * 0.22, h);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const y = horizon + (h - horizon) * ((i + 1) / 6) ** 1.7;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Palm silhouettes along the bottom edge, in front of the grid.
  drawPalm(ctx, w * 0.03, h * 1.0, h * 0.30, -0.08, grade.skyline);
  drawPalm(ctx, w * 0.97, h * 1.0, h * 0.26, 0.10, grade.skyline);
  drawPalm(ctx, w * 0.13, h * 1.01, h * 0.20, 0.05, grade.skyline);

  // Gentle vignette so the panels and caption sit on the scene.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,4,20,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Cover-fit draw of one photo inside a panel, with zoom and pan offsets. */
function drawPhotoPanel(ctx, rect, img, edit, grade, selected) {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate((rect.rot * Math.PI) / 180);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = rect.w * 0.05;
  ctx.shadowOffsetY = rect.w * 0.015;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, rect.w, rect.h);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.rect(0, 0, rect.w, rect.h);
  ctx.clip();

  if (img) {
    const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
    const scale = base * edit.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (rect.w - dw) / 2 + edit.ox * rect.w;
    const dy = (rect.h - dh) / 2 + edit.oy * rect.h;
    ctx.drawImage(img, dx, dy, dw, dh);
    // Grade tint over the photo only.
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = grade.tint;
    ctx.fillRect(0, 0, rect.w, rect.h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    // Empty panel: a dashed placeholder so the layout reads even with no photo.
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, 0, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = Math.max(1.5, rect.w * 0.006);
    ctx.setLineDash([rect.w * 0.03, rect.w * 0.02]);
    ctx.strokeRect(rect.w * 0.04, rect.h * 0.04, rect.w * 0.92, rect.h * 0.92);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.max(12, rect.w * 0.055)}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ ADD PHOTO', rect.w / 2, rect.h / 2);
  }

  // Crisp white frame, then the selected-panel highlight.
  ctx.lineWidth = Math.max(2, rect.w * 0.012);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(0, 0, rect.w, rect.h);
  if (selected) {
    ctx.lineWidth = Math.max(3, rect.w * 0.014);
    ctx.strokeStyle = grade.accent;
    ctx.setLineDash([rect.w * 0.05, rect.w * 0.03]);
    ctx.strokeRect(-rect.w * 0.02, -rect.h * 0.02, rect.w * 1.04, rect.h * 1.04);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawCaption(ctx, w, h, state, grade) {
  const text = (state.caption || 'VICE CITY').toUpperCase();
  const sub = (state.subcaption || '').trim();
  // Sized from the shorter side so the caption (and its sub-caption) fit
  // on wide covers as well as square and tall ones.
  const baseSize = Math.min(w, h) * 0.115 * (state.captionScale || 1);
  const family = '"Arial Narrow", "Helvetica Neue", Impact, "Segoe UI", sans-serif';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try {
    ctx.letterSpacing = `${Math.round(baseSize * 0.03)}px`;
  } catch {
    // Older canvas builds ignore letterSpacing; the caption still draws.
  }

  // Shrink the caption until it fits the cover width.
  let size = baseSize;
  ctx.font = `italic 900 ${size}px ${family}`;
  const maxW = w * 0.94;
  while (size > w * 0.05 && ctx.measureText(text).width > maxW) {
    size *= 0.92;
    ctx.font = `italic 900 ${size}px ${family}`;
  }

  const cx = w / 2;
  let cy = h * 0.87;
  if (state.placement === 'top') cy = h * 0.085;
  if (state.placement === 'diagonal') {
    cy = h * 0.84;
    ctx.translate(cx, cy);
    ctx.rotate((-7 * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  const fill = ctx.createLinearGradient(0, cy - size * 0.55, 0, cy + size * 0.55);
  grade.caption.forEach((c, i) => fill.addColorStop(i / (grade.caption.length - 1), c));
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.10;
  ctx.strokeStyle = '#170a2e';
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = fill;
  ctx.fillText(text, cx, cy);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (sub) {
    const subSize = Math.max(11, Math.min(w, h) * 0.026);
    ctx.font = `700 ${subSize}px "Segoe UI", system-ui, sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.22)}px`;
    } catch {
      // No letter spacing on this build; keep the plain sub-caption.
    }
    const subY = cy + size * 0.62;
    ctx.lineWidth = subSize * 0.22;
    ctx.strokeStyle = 'rgba(10,4,24,0.9)';
    ctx.strokeText(sub, cx, subY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, cx, subY);
  }
  ctx.restore();
}

/**
 * Paint the full cover for `state` onto `ctx` at `w` × `h`.
 * state: { layout, grade, caption, subcaption, captionScale, placement,
 *          photos: [{img}], panels: [{photo, zoom, ox, oy}], selected }
 */
export function drawCover(ctx, w, h, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, grade);
  const rects = panelLayout(state.layout || 'five', w, h);
  rects.forEach((rect, i) => {
    const edit = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const photo = edit.photo >= 0 ? state.photos[edit.photo] : null;
    drawPhotoPanel(ctx, rect, photo ? photo.img : null, edit, grade, state.selected === i);
  });
  drawCaption(ctx, w, h, state, grade);
  // Thin bright frame around the whole cover.
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeRect(w * 0.012, h * 0.012, w * 0.976, h * 0.976);
  ctx.restore();
}
