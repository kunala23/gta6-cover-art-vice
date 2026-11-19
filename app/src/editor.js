/* Vice Cover Maker — editor wiring.
   Owns the app state, the photo strip, panel selection, pan/zoom,
   the live preview and the PNG export. All photos are read locally
   with FileReader / Image objects and never uploaded anywhere. */

'use strict';

const ViceEditor = {
  state: {
    layout: 'five',
    grade: 'sunset',
    caption: 'VICE CITY',
    subcaption: 'Welcome to Vice City',
    captionSize: 11,
    placement: 'bottom',
    photos: [],
    panels: [],
  },
  selectedPanel: 0,
  dragging: null,
  coverFrame: false,
  exportSize: { w: 1080, h: 1080 },

  init() {
    this.resetPanels();
    this.bindControls();
    this.bindCanvas();
    this.bindDrop();
    this.applyAutoParams();
    this.renderPreview();
  },

  /* Keep one slot per panel of the current layout, carrying over any
     photo assignments the old layout already had. */
  resetPanels() {
    const count = (VICE_LAYOUTS[this.state.layout] || VICE_LAYOUTS.five).panels;
    const old = this.state.panels;
    this.state.panels = [];
    for (let i = 0; i < count; i++) {
      this.state.panels.push(old[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 });
    }
    if (this.selectedPanel >= count) this.selectedPanel = 0;
  },

  /* --- controls ---------------------------------------------------- */

  bindControls() {
    const $ = (id) => document.getElementById(id);

    $('photoInput').addEventListener('change', (e) => {
      this.loadFiles(e.target.files);
      e.target.value = '';
    });
    $('demoBtn').addEventListener('click', () => this.loadDemoPhotos());
    $('fillAllBtn').addEventListener('click', () => this.fillAllPanels());

    $('layoutRow').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-layout]');
      if (!btn) return;
      this.state.layout = btn.dataset.layout;
      this.resetPanels();
      this.markActive('layoutRow', 'data-layout', this.state.layout);
      this.renderPreview();
    });
    $('gradeRow').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-grade]');
      if (!btn) return;
      this.state.grade = btn.dataset.grade;
      this.markActive('gradeRow', 'data-grade', this.state.grade);
      this.renderPreview();
    });

    $('captionInput').addEventListener('input', (e) => {
      this.state.caption = e.target.value;
      this.renderPreview();
    });
    $('subInput').addEventListener('input', (e) => {
      this.state.subcaption = e.target.value;
      this.renderPreview();
    });
    $('sizeInput').addEventListener('input', (e) => {
      this.state.captionSize = parseFloat(e.target.value);
      this.renderPreview();
    });
    $('placementInput').addEventListener('change', (e) => {
      this.state.placement = e.target.value;
      this.renderPreview();
    });

    $('zoomInput').addEventListener('input', (e) => {
      const slot = this.state.panels[this.selectedPanel];
      if (!slot) return;
      slot.zoom = parseFloat(e.target.value);
      this.renderPreview();
    });
    $('resetPanBtn').addEventListener('click', () => {
      const slot = this.state.panels[this.selectedPanel];
      if (!slot) return;
      slot.ox = 0;
      slot.oy = 0;
      slot.zoom = 1;
      $('zoomInput').value = '1';
      this.renderPreview();
    });
    $('clearPanelBtn').addEventListener('click', () => {
      const slot = this.state.panels[this.selectedPanel];
      if (!slot) return;
      slot.photo = -1;
      slot.ox = 0;
      slot.oy = 0;
      slot.zoom = 1;
      this.renderPreview();
    });

    $('sizeSelect').addEventListener('change', (e) => {
      const [w, h] = e.target.value.split('x').map(Number);
      this.exportSize = { w, h };
      this.renderPreview();
    });
    $('exportBtn').addEventListener('click', () => this.exportPng());
  },

  markActive(rowId, attr, value) {
    document.querySelectorAll(`#${rowId} button`).forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute(attr) === value);
    });
  },

  /* --- photos ------------------------------------------------------ */

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load image: ' + src));
      img.src = src;
    });
  },

  addPhoto(img, name) {
    this.state.photos.push({ img, name: name || `Photo ${this.state.photos.length + 1}` });
    this.refreshStrip();
  },

  loadFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    let loaded = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        this.loadImage(reader.result)
          .then((img) => {
            this.addPhoto(img, file.name);
            loaded++;
            if (loaded === files.length) this.afterPhotosLoaded();
          })
          .catch(() => { loaded++; });
      };
      reader.readAsDataURL(file);
    });
  },

  async loadDemoPhotos() {
    const status = document.getElementById('photoStatus');
    status.textContent = 'Loading demo photos…';
    try {
      const [a, b] = await Promise.all([
        this.loadImage('samples/boulevard.jpg'),
        this.loadImage('samples/pier.jpg'),
      ]);
      this.addPhoto(a, 'Boulevard (demo)');
      this.addPhoto(b, 'Pier (demo)');
      this.afterPhotosLoaded();
    } catch (err) {
      status.textContent = 'Demo photos could not be loaded.';
    }
  },

  afterPhotosLoaded() {
    const status = document.getElementById('photoStatus');
    status.textContent = `${this.state.photos.length} photo(s) loaded. Click a photo, then a panel — or Fill all panels.`;
    /* First load: fill the panels so the cover is visible at once. */
    if (this.state.panels.every((s) => s.photo < 0)) this.fillAllPanels();
    this.renderPreview();
  },

  fillAllPanels() {
    if (!this.state.photos.length) {
      document.getElementById('photoStatus').textContent = 'Load a photo first.';
      return;
    }
    this.state.panels.forEach((slot, i) => {
      slot.photo = i % this.state.photos.length;
      slot.zoom = 1;
      slot.ox = 0;
      slot.oy = 0;
    });
    this.renderPreview();
  },

  refreshStrip() {
    const strip = document.getElementById('photoStrip');
    strip.innerHTML = '';
    this.state.photos.forEach((photo, i) => {
      const thumb = document.createElement('img');
      thumb.src = photo.img.src;
      thumb.alt = photo.name;
      thumb.title = photo.name;
      thumb.addEventListener('click', () => {
        const slot = this.state.panels[this.selectedPanel];
        if (!slot) return;
        slot.photo = i;
        slot.zoom = 1;
        slot.ox = 0;
        slot.oy = 0;
        document.getElementById('zoomInput').value = '1';
        this.renderPreview();
      });
      strip.appendChild(thumb);
    });
  },

  /* --- canvas: preview, selection, pan, zoom ----------------------- */

  previewSize() {
    if (this.coverFrame) return { w: this.exportSize.w, h: this.exportSize.h };
    const { w, h } = this.exportSize;
    const long = 900;
    if (w >= h) return { w: long, h: Math.round((long * h) / w) };
    return { w: Math.round((long * w) / h), h: long };
  },

  renderPreview() {
    const canvas = document.getElementById('coverCanvas');
    const { w, h } = this.previewSize();
    renderViceCover(canvas, this.state, w, h);
    this.updatePanelStatus();
  },

  updatePanelStatus() {
    const slot = this.state.panels[this.selectedPanel];
    const el = document.getElementById('panelStatus');
    if (!slot) {
      el.textContent = 'No panel selected.';
      return;
    }
    const name = slot.photo >= 0 ? this.state.photos[slot.photo].name : 'empty';
    el.textContent = `Panel ${this.selectedPanel + 1} of ${this.state.panels.length}: ${name}. Drag on the cover to move it.`;
  },

  panelAt(clientX, clientY) {
    const canvas = document.getElementById('coverCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const panels = vicePanelRects(this.state.layout, canvas.width, canvas.height);
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
    }
    return -1;
  },

  bindCanvas() {
    const canvas = document.getElementById('coverCanvas');
    canvas.addEventListener('pointerdown', (e) => {
      const i = this.panelAt(e.clientX, e.clientY);
      if (i < 0) return;
      this.selectedPanel = i;
      const slot = this.state.panels[i];
      document.getElementById('zoomInput').value = String(slot.zoom || 1);
      this.dragging = { x: e.clientX, y: e.clientY, ox: slot.ox || 0, oy: slot.oy || 0 };
      canvas.classList.add('dragging');
      canvas.setPointerCapture(e.pointerId);
      this.renderPreview();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const rect = canvas.getBoundingClientRect();
      const slot = this.state.panels[this.selectedPanel];
      if (!slot) return;
      const scaleX = canvas.width / rect.width;
      const panels = vicePanelRects(this.state.layout, canvas.width, canvas.height);
      const p = panels[this.selectedPanel];
      slot.ox = this.dragging.ox + ((e.clientX - this.dragging.x) * scaleX) / p.w;
      slot.oy = this.dragging.oy + ((e.clientY - this.dragging.y) * scaleX) / p.h;
      slot.ox = Math.max(-0.6, Math.min(0.6, slot.ox));
      slot.oy = Math.max(-0.6, Math.min(0.6, slot.oy));
      this.renderPreview();
    });
    const endDrag = () => {
      this.dragging = null;
      canvas.classList.remove('dragging');
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const slot = this.state.panels[this.selectedPanel];
      if (!slot) return;
      const next = (slot.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.93);
      slot.zoom = Math.max(1, Math.min(3, next));
      document.getElementById('zoomInput').value = String(slot.zoom);
      this.renderPreview();
    }, { passive: false });
  },

  bindDrop() {
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length) this.loadFiles(e.dataTransfer.files);
    });
  },

  /* --- export ------------------------------------------------------ */

  exportPng() {
    const { w, h } = this.exportSize;
    const off = document.createElement('canvas');
    renderViceCover(off, this.state, w, h);
    const status = document.getElementById('exportStatus');
    status.textContent = 'Rendering PNG…';
    off.toBlob((blob) => {
      if (!blob) {
        status.textContent = 'Export failed — please try again.';
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-cover-${w}x${h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      status.textContent = `Exported vice-cover-${w}x${h}.png (${Math.round(blob.size / 1024)} KiB).`;
    }, 'image/png');
  },

  /* --- screenshot / auto mode ---------------------------------------
     Query parameters the app honours (used to take its own screenshots):
     ?auto=1 loads the demo photos and applies layout, grade, size,
     caption, subcaption and placement; frame=cover hides the editor
     chrome and shows the finished cover full-frame. */
  applyAutoParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auto') !== '1') return;
    const layout = params.get('layout');
    if (layout && VICE_LAYOUTS[layout]) {
      this.state.layout = layout;
      this.markActive('layoutRow', 'data-layout', layout);
      this.resetPanels();
    }
    const grade = params.get('grade');
    if (grade && VICE_GRADES[grade]) {
      this.state.grade = grade;
      this.markActive('gradeRow', 'data-grade', grade);
    }
    const size = params.get('size');
    if (size) {
      const [w, h] = size.split('x').map(Number);
      if (w > 0 && h > 0) {
        this.exportSize = { w, h };
        document.getElementById('sizeSelect').value = size;
      }
    }
    if (params.get('caption') !== null) {
      this.state.caption = params.get('caption');
      document.getElementById('captionInput').value = this.state.caption;
    }
    if (params.get('subcaption') !== null) {
      this.state.subcaption = params.get('subcaption');
      document.getElementById('subInput').value = this.state.subcaption;
    }
    if (params.get('placement')) {
      this.state.placement = params.get('placement');
      document.getElementById('placementInput').value = this.state.placement;
    }
    if (params.get('frame') === 'cover') {
      this.coverFrame = true;
      document.body.classList.add('cover-frame');
    }
    this.loadDemoPhotos();
  },
};
