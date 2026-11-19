// Vice Cover Maker — bootstrap.
// Finds the preview canvas, builds the editor, and lets the page settle
// into either the interactive editor or a full-frame cover shot
// (?shot=cover) driven by the query string.

import { createEditor } from './editor.js';

const canvas = document.getElementById('cover');
const editor = createEditor(canvas);

editor.applyQuery().catch((err) => {
  const status = document.getElementById('status');
  if (status) status.textContent = `Could not start the editor: ${err.message}`;
  // The editor still paints its empty state so the page never sits blank.
  editor.render();
});
