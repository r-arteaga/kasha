// Puts a version on every icon address (favicon.ico?v=1a2b3c4d), taken from the icons' own bytes.
//
// Phones keep their own copy of a site's icon (iOS shows it in Control Center while the app plays) and do not
// look for a new one at the same address. A new icon gets a new version, so it gets a new address and every phone
// fetches it. `npm run build` stamps the addresses first (prebuild), so a deploy can never ship an old address;
// a test fails when the committed files are out of date. Run on its own with:  npm run icons:stamp
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Every icon a phone or browser may keep a copy of. */
export const ICON_FILES: readonly string[] = [
  'public/favicon.ico',
  'public/icons/apple-touch-icon.png',
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
  'public/icons/maskable-192.png',
  'public/icons/maskable-512.png',
];

/** The files that name the icons by address. */
export const ICON_REFERENCES: readonly string[] = [
  'src/index.html',
  'public/manifest.webmanifest',
  'src/app/shared/app-icons.ts',
];

// An address starts right after a quote, "=", "(" or a space (href="favicon.ico", "icons/icon-192.png"), so
// "assets/.../icons/x.png" or "notfavicon.ico" are left alone; whatever version it carried is replaced.
const ADDRESS = /(?<=["'=(\s])(favicon\.ico|icons\/[\w-]+\.png)(?:\?v=[^"'\s)]*)?/g;

/** Eight hex digits of the icons' hash: the same icons always give the same version. */
export function iconVersion(root = '.'): string {
  const hash = createHash('sha256');
  for (const file of ICON_FILES) hash.update(readFileSync(join(root, file)));
  return hash.digest('hex').slice(0, 8);
}

/** Puts `?v=<version>` on every icon address in the text, replacing an older version. */
export function stampIcons(text: string, version: string): string {
  return text.replace(ADDRESS, `$1?v=${version}`);
}

function main(): void {
  const version = iconVersion();
  for (const file of ICON_REFERENCES) {
    const before = readFileSync(file, 'utf8');
    const after = stampIcons(before, version);
    if (after !== before) {
      writeFileSync(file, after);
      console.log(`icons: ${file} now uses version ${version}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
