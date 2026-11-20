import { TestBed } from '@angular/core/testing';
import { INSTALL_GUIDE, InstallApp, type MountedGuide } from './install-app';

function fakeGuide(): MountedGuide & { shown: boolean[]; removed: boolean } {
  return {
    shown: [],
    removed: false,
    isUnderStandaloneMode: false,
    showDialog(forced?: boolean) {
      this.shown.push(!!forced);
    },
    remove() {
      this.removed = true;
    },
  };
}

function installApp(mount: () => Promise<MountedGuide>): InstallApp {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: INSTALL_GUIDE, useValue: mount }] });
  return TestBed.inject(InstallApp);
}

describe('InstallApp', () => {
  // On Android the guide opens by itself at the next tap once it is in the page, so it must not be there until asked.
  it('loads nothing until she asks for the guide', () => {
    const mount = vi.fn(() => Promise.resolve(fakeGuide()));
    installApp(mount);

    expect(mount).not.toHaveBeenCalled();
  });

  it('opens the guide when she taps "Instalar Kasha", reusing it if she taps again', async () => {
    const guide = fakeGuide();
    const mount = vi.fn(() => Promise.resolve(guide));
    const app = installApp(mount);

    await app.open();
    await app.open();

    expect(mount).toHaveBeenCalledTimes(1);
    expect(guide.shown).toEqual([true, true]);
  });

  it('takes the guide out of the page when she leaves Ajustes, so nothing can open it later', async () => {
    const first = fakeGuide();
    const second = fakeGuide();
    const mount = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const app = installApp(mount);

    await app.open();
    await app.release();
    await app.open();

    expect(first.removed).toBe(true);
    expect(second.shown).toEqual([true]);
  });

  it('knows when it runs as the installed app', async () => {
    const guide = { ...fakeGuide(), isUnderStandaloneMode: true };
    const app = installApp(() => Promise.resolve(guide));

    await app.open();

    expect(app.installed()).toBe(true);
  });
});
