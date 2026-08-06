#!/usr/bin/env node
/**
 * Package integrations/wordpress/vibealerts into an installable WordPress zip.
 * Usage: node scripts/package-wordpress-plugin.mjs
 */

import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pluginDir = path.join(root, 'integrations/wordpress/vibealerts');
const distDir = path.join(root, 'integrations/wordpress/dist');
const zipPath = path.join(distDir, 'vibealerts.zip');

await mkdir(distDir, { recursive: true });
await rm(zipPath, { force: true });

// Prefer system zip for portable archives WordPress accepts.
try {
  execFileSync(
    'zip',
    ['-r', zipPath, 'vibealerts', '-x', '*.DS_Store', '*__MACOSX*'],
    {
      cwd: path.join(root, 'integrations/wordpress'),
      stdio: 'inherit',
    }
  );
} catch {
  // Fallback: stream a minimal zip via Python (available on most agents)
  execFileSync(
    'python3',
    [
      '-c',
      `
import pathlib, zipfile
root = pathlib.Path(${JSON.stringify(pluginDir)})
out = pathlib.Path(${JSON.stringify(zipPath)})
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:
    for path in root.rglob('*'):
        if path.is_file() and path.name != '.DS_Store':
            zf.write(path, pathlib.Path('vibealerts') / path.relative_to(root))
print('Wrote', out)
`,
    ],
    { stdio: 'inherit' }
  );
}

console.log(`WordPress plugin package ready: ${path.relative(root, zipPath)}`);
