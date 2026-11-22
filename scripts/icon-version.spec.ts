import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ICON_FILES, ICON_REFERENCES, iconVersion, stampIcons } from './icon-version.mts';

const ADDRESS = /(?<=["'=(\s])(?:favicon\.ico|icons\/[\w-]+\.png)(\?v=[^"'\s)]*)?/g;

describe('icon addresses', () => {
  it('carry the version of the icons the app ships, so a phone never keeps showing an old one', () => {
    const version = iconVersion();
    for (const file of ICON_REFERENCES) {
      const addresses = [...readFileSync(file, 'utf8').matchAll(ADDRESS)];
      expect(addresses.length, `${file} names no icon`).toBeGreaterThan(0);
      for (const [address, query] of addresses) {
        expect(query, `${file}: ${address} (run "npm run icons:stamp")`).toBe(`?v=${version}`);
      }
    }
  });
});

describe('stampIcons', () => {
  it('puts the version on every icon address, replacing an older one', () => {
    const html = '<link rel="icon" href="favicon.ico?v=old" /><link rel="apple-touch-icon" href="icons/apple-touch-icon.png?v=0a1b2c3d" />';

    expect(stampIcons(html, 'feedbeef')).toBe(
      '<link rel="icon" href="favicon.ico?v=feedbeef" /><link rel="apple-touch-icon" href="icons/apple-touch-icon.png?v=feedbeef" />',
    );
  });

  it('leaves other addresses alone', () => {
    const text = '"assets/taiga-ui/icons/eye.svg" "assets/other/icons/eye.png" "notfavicon.ico" "logo.svg" "styles.css"';

    expect(stampIcons(text, 'feedbeef')).toBe(text);
  });
});

describe('iconVersion', () => {
  let root = '';
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('changes when any icon changes, and only then', () => {
    root = mkdtempSync(join(tmpdir(), 'kasha-icons-'));
    for (const file of ICON_FILES) {
      mkdirSync(join(root, dirname(file)), { recursive: true });
      copyFileSync(file, join(root, file));
    }
    expect(iconVersion(root)).toBe(iconVersion());

    const changed = join(root, ICON_FILES.at(-1)!);
    writeFileSync(changed, Buffer.concat([readFileSync(changed), Buffer.from([0])]));

    expect(iconVersion(root)).not.toBe(iconVersion());
  });
});
