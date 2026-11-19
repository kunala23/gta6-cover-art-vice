// Vice Cover Maker — the program that hands this entry in.
//
// It runs under Node 22 with the standard library only. It takes the app/
// static files and the screenshots/ renders that sit beside this file,
// copies them into the output directory, and writes dossier.json there
// with the vendored make.fun library, so the scorer can rebuild the same
// dossier byte for byte. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The run is deterministic: the same repository always writes the same
// bytes, so the grader's two runs agree.

import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

/** Caps from the bounty gate: only text_max_bytes shapes the dossier bytes. */
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function repoRoot() {
  return fileURLToPath(new URL('.', import.meta.url));
}

function outputDir() {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

/** Copy one tree, replacing any earlier copy so stale files never linger. */
function replaceTree(from, to) {
  if (existsSync(to)) rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function main() {
  const root = repoRoot();
  const out = outputDir();
  mkdirSync(out, { recursive: true });

  replaceTree(join(root, 'app'), join(out, 'app'));
  if (existsSync(join(root, 'screenshots'))) {
    replaceTree(join(root, 'screenshots'), join(out, 'screenshots'));
  } else {
    mkdirSync(join(out, 'screenshots'), { recursive: true });
  }

  const dossier = buildDossier(out, DOSSIER_CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`vice-cover-maker: wrote ${join(out, 'dossier.json')} (${dossier.length} bytes)`);
  console.log(`vice-cover-maker: app/ ${statSync(join(out, 'app')).isDirectory() ? 'copied' : 'missing'}`);
}

main();
