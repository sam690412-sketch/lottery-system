import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export function lotteryPwa(root: string, outDir: string): Plugin {
  return {
    name: 'lottery-pwa',
    apply: 'build',
    closeBundle() {
      const assetPaths = readdirSync(resolve(outDir, 'assets'))
        .filter(name => /\.(js|css|png|svg|webp|woff2)$/.test(name))
        .map(name => '/assets/' + name);
      const precache = [
        '/index.html', '/manifest.webmanifest', '/pwa/offline.html',
        '/pwa/brand.svg', '/pwa/icon-192.png', '/pwa/icon-512.png',
        '/pwa/icon-maskable-512.png', '/pwa/apple-touch-icon.png',
        ...assetPaths,
      ].sort();
      const template = readFileSync(resolve(root, 'pwa/worker.js'), 'utf8');
      const hash = createHash('sha256').update(template).update(process.env.PWA_RELEASE_TAG ?? '');
      for (const path of precache) {
        hash.update(path).update(readFileSync(resolve(outDir, '.' + path)));
      }
      const release = hash.digest('hex').slice(0, 16);
      writeFileSync(resolve(outDir, 'sw.js'),
        'const RELEASE = ' + JSON.stringify(release) + ';\n' +
        'const PRECACHE = ' + JSON.stringify(precache) + ';\n' + template);
    },
  };
}
