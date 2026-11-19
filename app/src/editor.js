// Vice Cover Maker — editor wiring.
// Owns the cover state, the control panel, photo loading (file picker and
// drag-and-drop, all local), panel picking / panning / zooming on the
// canvas, and the PNG export. Also honours screenshot query parameters:
// ?demo=1 loads the built-in photos, ?shot=cover renders one finished
// cover full-frame for a screenshot.

import { drawCover, freshPanels, panelLayout, EXPORT_SIZES } from './cover.js';

const DEMO_PHOTOS = [
  { src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { src: 'samples/pier.jpg', name: 'Pier' },
];

const $ = (id) => document.getElementById(id);

export function createEditor(canvas) {
  const state = {
    layout: 'five',
    grade: 'sunset',
    caption: 'VICE CITY',
    subcaption: 'WELCOME BACK TO THE SUNSHINE STATE',
    captionScale: 1,
    placement: 'bottom',
    photos: [],
    panels: freshPanels('five'),
    selected: 0,
    exportSize: '1080x1080',
  };

  let pickedPhoto = -1;
  let drag = null;

  const ctx = canvas.getContext('2d');

  function exportDims() {
    return EXPORT_SIZES.find((s) => s.id === state.exportSize) || EXPORT_SIZES[0];
  }

  /** Size the preview canvas to the export aspect, capped at 720 px. */
  function sizePreview() {
    const dims = exportDims();
    const scale = Math.min(1, 720 / Math.max(dims.w, dims.h));
    canvas.width = Math.round(dims.w * scale);
    canvas.height = Math.round(dims.h * scale);
  }

  function render() {
    if (document.body.classList.contains('shot')) return;
    sizePreview();
    drawCover(ctx, canvas.width, canvas.height, state);
    syncZoomSlider();
  }

  function renderShot() {
    const dims = exportDims();
    canvas.width = dims.w;
    canvas.height = dims.h;
    const shotState = { ...state, selected: -1 };
    drawCover(ctx, dims.w, dims.h, shotState);
    document.title = 'Vice Cover Maker — exported cover';
  }

  function say(msg) {
    const el = $('status');
    if (el) el.textContent = msg;
  }

  // ---------------------------------------------------------- photo strip

  function rebuildStrip() {
    const strip = $('photoStrip');
    strip.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const thumb = document.createElement('img');
      thumb.src = photo.thumb;
      thumb.alt = photo.name;
      thumb.title = photo.name;
      if (i === pickedPhoto) thumb.classList.add('picked');
      thumb.addEventListener('click', () => {
        pickedPhoto = i;
        rebuildStrip();
        say(`Photo "${photo.name}" picked — now click a panel to place it.`);
      });
      strip.appendChild(thumb);
    });
  }

  function addPhoto(img, name, thumb) {
    state.photos.push({ img, name, thumb });
    pickedPhoto = state.photos.length - 1;
    rebuildStrip();
    render();
  }

  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, thumb: url, name: file.name });
      img.onerror = () => reject(new Error(`Could not read ${file.name}`));
      img.src = url;
    });
  }

  async function addFiles(files) {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) {
      say('That was not an image file.');
      return;
    }
    for (const file of images) {
      try {
        const loaded = await loadImageFile(file);
        addPhoto(loaded.img, loaded.name, loaded.thumb);
      } catch (err) {
        say(err.message);
      }
    }
    say(`${images.length} photo${images.length > 1 ? 's' : ''} loaded. Click one, then click a panel.`);
  }

  function loadDemoPhotos() {
    if (state.photos.length > 0) return Promise.resolve();
    const jobs = DEMO_PHOTOS.map(
      (demo) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ img, thumb: demo.src, name: demo.name });
          img.onerror = () => resolve(null);
          img.src = demo.src;
        }),
    );
    return Promise.all(jobs).then((loaded) => {
      loaded.filter(Boolean).forEach((photo) => addPhoto(photo.img, photo.name, photo.thumb));
      if (state.photos.length === 0) {
        say('Demo photos did not load — add your own photo instead.');
        return;
      }
      // Spread the two demos across the panels: first photo in the centre.
      state.panels.forEach((panel, i) => {
        panel.photo = i === 0 ? 0 : (i + 1) % state.photos.length;
      });
      render();
    });
  }

  // ---------------------------------------------------------- panel picking

  /** Which panel (if any) holds canvas point (px, py), honouring its tilt. */
  function panelAt(px, py) {
    const rects = panelLayout(state.layout, canvas.width, canvas.height);
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const a = (-r.rot * Math.PI) / 180;
      const dx = px - cx;
      const dy = py - cy;
      const lx = dx * Math.cos(a) - dy * Math.sin(a);
      const ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2) return i;
    }
    return -1;
  }

  function canvasPoint(evt) {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((evt.clientX - box.left) / box.width) * canvas.width,
      y: ((evt.clientY - box.top) / box.height) * canvas.height,
    };
  }

  function syncZoomSlider() {
    const slider = $('zoomSlider');
    const edit = state.panels[state.selected];
    if (slider && edit) slider.value = String(Math.round(edit.zoom * 100));
    const hint = $('panelHint');
    if (hint) {
      hint.textContent =
        state.panels[state.selected] && state.panels[state.selected].photo >= 0
          ? `Panel ${state.selected + 1} selected — drag it to reposition the photo, use Zoom to crop closer.`
          : `Panel ${state.selected + 1} selected — pick a photo from the strip, then click the panel to place it.`;
    }
  }

  function selectPanel(i) {
    state.selected = i;
    render();
  }

  canvas.addEventListener('pointerdown', (evt) => {
    const p = canvasPoint(evt);
    const hit = panelAt(p.x, p.y);
    if (hit < 0) return;
    canvas.setPointerCapture(evt.pointerId);
    drag = { panel: hit, startX: p.x, startY: p.y, moved: 0, ox: state.panels[hit].ox, oy: state.panels[hit].oy };
    state.selected = hit;
    render();
  });

  canvas.addEventListener('pointermove', (evt) => {
    if (!drag) return;
    const p = canvasPoint(evt);
    const rects = panelLayout(state.layout, canvas.width, canvas.height);
    const rect = rects[drag.panel];
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
    if (drag.moved < 3) return;
    const edit = state.panels[drag.panel];
    edit.ox = clamp(drag.ox + dx / rect.w, -0.6, 0.6);
    edit.oy = clamp(drag.oy + dy / rect.h, -0.6, 0.6);
    render();
  });

  canvas.addEventListener('pointerup', () => {
    if (!drag) return;
    const wasClick = drag.moved < 3;
    const panel = drag.panel;
    drag = null;
    if (wasClick && pickedPhoto >= 0) {
      state.panels[panel].photo = pickedPhoto;
      state.panels[panel].zoom = 1;
      state.panels[panel].ox = 0;
      state.panels[panel].oy = 0;
      say(`Photo placed in panel ${panel + 1}.`);
    }
    render();
  });

  canvas.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    const edit = state.panels[state.selected];
    if (!edit) return;
    const factor = evt.deltaY < 0 ? 1.08 : 1 / 1.08;
    edit.zoom = clamp(edit.zoom * factor, 1, 2.6);
    render();
  }, { passive: false });

  // ---------------------------------------------------------- controls

  function bindChoices(containerId, attr, apply) {
    const box = $(containerId);
    if (!box) return;
    box.addEventListener('click', (evt) => {
      const btn = evt.target.closest(`[data-${attr}]`);
      if (!btn) return;
      box.querySelectorAll('.choice').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      apply(btn.dataset[attr]);
      render();
    });
  }

  bindChoices('layoutChoices', 'layout', (value) => {
    const old = state.panels;
    state.layout = value;
    state.panels = freshPanels(value);
    old.forEach((edit, i) => {
      if (i < state.panels.length) state.panels[i] = edit;
    });
    state.selected = 0;
  });

  bindChoices('gradeChoices', 'grade', (value) => {
    state.grade = value;
  });

  $('captionInput').addEventListener('input', (evt) => {
    state.caption = evt.target.value;
    render();
  });
  $('subInput').addEventListener('input', (evt) => {
    state.subcaption = evt.target.value;
    render();
  });
  $('placeSelect').addEventListener('change', (evt) => {
    state.placement = evt.target.value;
    render();
  });
  $('sizeSlider').addEventListener('input', (evt) => {
    state.captionScale = Number(evt.target.value) / 100;
    render();
  });
  $('zoomSlider').addEventListener('input', (evt) => {
    const edit = state.panels[state.selected];
    if (!edit) return;
    edit.zoom = Number(evt.target.value) / 100;
    render();
  });
  $('exportSize').addEventListener('change', (evt) => {
    state.exportSize = evt.target.value;
    render();
  });

  $('photoInput').addEventListener('change', (evt) => {
    addFiles(evt.target.files);
    evt.target.value = '';
  });

  $('demoBtn').addEventListener('click', async () => {
    await loadDemoPhotos();
    say('Demo photos loaded — pick a layout and a grade, then export.');
  });

  $('fillAllBtn').addEventListener('click', () => {
    if (state.photos.length === 0) {
      say('Load a photo first — or use the demo photos.');
      return;
    }
    const first = pickedPhoto >= 0 ? pickedPhoto : 0;
    state.panels.forEach((panel) => {
      panel.photo = first;
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
    });
    say('Every panel now shows the same photo — drag each one to crop it differently.');
    render();
  });

  $('resetPanBtn').addEventListener('click', () => {
    const edit = state.panels[state.selected];
    if (!edit) return;
    edit.ox = 0;
    edit.oy = 0;
    edit.zoom = 1;
    render();
  });

  $('clearBtn').addEventListener('click', () => {
    const edit = state.panels[state.selected];
    if (!edit) return;
    edit.photo = -1;
    edit.zoom = 1;
    edit.ox = 0;
    edit.oy = 0;
    render();
  });

  document.addEventListener('dragover', (evt) => evt.preventDefault());
  document.addEventListener('drop', (evt) => {
    evt.preventDefault();
    if (evt.dataTransfer && evt.dataTransfer.files.length > 0) addFiles(evt.dataTransfer.files);
  });

  // ---------------------------------------------------------- export

  /** Render the cover at an export size and return a PNG data URL. */
  function exportPngDataUrl(sizeId) {
    const dims = EXPORT_SIZES.find((s) => s.id === sizeId) || exportDims();
    const off = document.createElement('canvas');
    off.width = dims.w;
    off.height = dims.h;
    drawCover(off.getContext('2d'), dims.w, dims.h, { ...state, selected: -1 });
    return { dataUrl: off.toDataURL('image/png'), w: dims.w, h: dims.h };
  }
  window.__viceExportPng = exportPngDataUrl;

  $('exportBtn').addEventListener('click', () => {
    const dims = exportDims();
    const off = document.createElement('canvas');
    off.width = dims.w;
    off.height = dims.h;
    const offCtx = off.getContext('2d');
    drawCover(offCtx, dims.w, dims.h, { ...state, selected: -1 });
    off.toBlob((blob) => {
      if (!blob) {
        say('Export failed — try again.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vice-cover-${dims.id}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      say(`Exported vice-cover-${dims.id}.png — ${dims.w} × ${dims.h}.`);
    }, 'image/png');
  });

  // ---------------------------------------------------------- screenshot mode

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  async function applyQuery() {
    const params = new URLSearchParams(window.location.search);
    const layout = params.get('layout');
    if (layout && ['five', 'three', 'hero', 'quad'].includes(layout)) {
      state.layout = layout;
      state.panels = freshPanels(layout);
      document.querySelectorAll('#layoutChoices .choice').forEach((c) => c.classList.toggle('active', c.dataset.layout === layout));
    }
    const grade = params.get('grade');
    if (grade && ['sunset', 'neon', 'pink', 'golden', 'noir'].includes(grade)) {
      state.grade = grade;
      document.querySelectorAll('#gradeChoices .choice').forEach((c) => c.classList.toggle('active', c.dataset.grade === grade));
    }
    const size = params.get('size');
    if (size && EXPORT_SIZES.some((s) => s.id === size)) {
      state.exportSize = size;
      $('exportSize').value = size;
    }
    const caption = params.get('caption');
    if (caption) {
      state.caption = caption;
      $('captionInput').value = caption;
    }
    if (params.get('demo') === '1') await loadDemoPhotos();
    if (params.get('shot') === 'cover') {
      document.body.classList.add('shot');
      renderShot();
      window.__viceShotReady = true;
      return true;
    }
    render();
    window.__viceShotReady = true;
    return false;
  }

  return { state, render, applyQuery };
}
