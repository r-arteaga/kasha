import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

/** What Kasha uses of a `<pwa-install>` element (@khmyznikov/pwa-install) it put in the page. */
export interface MountedGuide {
  readonly isUnderStandaloneMode: boolean;
  showDialog(forced?: boolean): void;
  /** Takes it out of the page, with its listeners and timers. */
  remove(): void;
}

interface PwaInstallElement extends HTMLElement, MountedGuide {
  updateComplete: Promise<boolean>;
}

/**
 * Loads the install guide (its code is a separate chunk) and puts a `<pwa-install>` in the page. On iOS it shows how to
 * add Kasha to the home screen, which Safari cannot do by itself; on Chromium it uses the browser's own install. Its
 * texts follow the phone's language (Spanish, English and Russian are built in).
 *
 * Once in the page, on Android it opens by itself at the next tap when the browser offers no install of its own, so
 * it is only mounted when she asks for it and taken out again when she leaves Ajustes.
 */
export const INSTALL_GUIDE = new InjectionToken<() => Promise<MountedGuide>>('INSTALL_GUIDE', {
  providedIn: 'root',
  factory: () => {
    const transloco = inject(TranslocoService);
    return async () => {
      await import('@khmyznikov/pwa-install');
      const guide = document.createElement('pwa-install') as PwaInstallElement;
      guide.setAttribute('manifest-url', '/manifest.webmanifest');
      guide.setAttribute('manual-apple', '');
      guide.setAttribute('manual-chrome', '');
      guide.setAttribute('disable-screenshots', '');
      // Says why it is worth it, in the app's language, instead of the component's generic sentence.
      guide.setAttribute('install-description', transloco.translate('settings.installDescription'));
      document.body.appendChild(guide);
      // Its first render waits for its language and platform checks.
      await guide.updateComplete;
      return guide;
    };
  },
});

/** Whether Kasha runs as the installed app (opened from the home screen) rather than in the browser. */
export function runsInstalled(): boolean {
  const standalone = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
  return standalone || (navigator as { standalone?: boolean }).standalone === true;
}

/** The install guide, opened only when she taps "Instalar Kasha" in Ajustes. It never opens by itself. */
@Injectable({ providedIn: 'root' })
export class InstallApp {
  private readonly mount = inject(INSTALL_GUIDE);
  private guide: Promise<MountedGuide> | null = null;

  /** True inside the installed app: there is nothing to install then. */
  readonly installed = signal(runsInstalled());

  async open(): Promise<void> {
    this.guide ??= this.mount();
    const guide = await this.guide;
    if (guide.isUnderStandaloneMode) {
      this.installed.set(true);
      return;
    }
    guide.showDialog(true);
  }

  /** Takes the guide out of the page (when she leaves Ajustes). */
  async release(): Promise<void> {
    const guide = this.guide;
    this.guide = null;
    (await guide?.catch(() => null))?.remove();
  }
}
