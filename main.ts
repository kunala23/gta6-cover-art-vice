/* Vice Cover Maker — entrypoint (Node 22 standard library only).
   Copies the static app and the screenshots into the output directory
   and writes the dossier buildDossier produces from them, so the
   grader can check the entry byte for byte. Outside the grader,
   MAKEFUN_OUTPUT_DIR stands in for /output. */

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(name: string): void {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  if (!existsSync(from)) throw new Error(`main.ts: ${name}/ is missing from the repository`);
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
/* Start clean so a stale file from an earlier run never leaks in. */
for (const name of ['app', 'screenshots']) {
  const target = join(outputDir, name);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}
copyTree('app');
copyTree('screenshots');

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
