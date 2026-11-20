import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { AppLanguage } from '../../settings/app-language';
import { AppTheme, type ThemeMode } from '../../settings/app-theme';
import { InstallApp } from '../../settings/install-app';
import { APP_LANGS, LANG_NAMES } from '../../settings/translations';

interface ThemeOption {
  mode: ThemeMode;
  icon: string;
  label: string;
  hint?: string;
}

@Component({
  selector: 'k-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, TuiButton, TuiIcon],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage {
  protected readonly theme = inject(AppTheme);
  protected readonly language = inject(AppLanguage);
  protected readonly install = inject(InstallApp);

  constructor() {
    // The guide only lives while Ajustes is open: once in the page it could open by itself on Android.
    inject(DestroyRef).onDestroy(() => void this.install.release());
  }

  protected readonly themes: readonly ThemeOption[] = [
    { mode: 'system', icon: '@tui.sun-moon', label: 'settings.themeSystem', hint: 'settings.themeSystemHint' },
    { mode: 'light', icon: '@tui.sun', label: 'settings.themeLight' },
    { mode: 'dark', icon: '@tui.moon', label: 'settings.themeDark' },
  ];
  protected readonly langs = APP_LANGS;
  protected readonly langNames = LANG_NAMES;

  protected openInstall(): void {
    this.install.open().catch((error: unknown) => console.error('Could not open the install guide', error));
  }
}
