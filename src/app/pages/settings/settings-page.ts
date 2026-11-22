import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { DefaultVoice, type VoiceGender } from '../../reading/tts/default-voice';
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
  imports: [TranslocoDirective, TuiButton, TuiIcon],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage {
  protected readonly theme = inject(AppTheme);
  protected readonly language = inject(AppLanguage);
  protected readonly install = inject(InstallApp);
  protected readonly voice = inject(DefaultVoice);

  private readonly location = inject(Location);
  private readonly router = inject(Router);

  constructor() {
    // The guide only lives while Ajustes is open: once in the page it could open by itself on Android.
    inject(DestroyRef).onDestroy(() => void this.install.release());
  }

  /** Back to the screen she opened Ajustes from; home when Ajustes was the first screen (a link, a reload). */
  protected back(): void {
    const navigationId = (this.location.getState() as { navigationId?: number } | null)?.navigationId ?? 1;
    if (navigationId > 1) this.location.back();
    else void this.router.navigate(['/']);
  }

  protected readonly themes: readonly ThemeOption[] = [
    { mode: 'system', icon: '@tui.sun-moon', label: 'settings.themeSystem', hint: 'settings.themeSystemHint' },
    { mode: 'light', icon: '@tui.sun', label: 'settings.themeLight' },
    { mode: 'dark', icon: '@tui.moon', label: 'settings.themeDark' },
  ];
  protected readonly genders: readonly { gender: VoiceGender; label: string }[] = [
    { gender: 'Female', label: 'settings.voiceFemale' },
    { gender: 'Male', label: 'settings.voiceMale' },
  ];
  protected readonly langs = APP_LANGS;
  protected readonly langNames = LANG_NAMES;

  protected openInstall(): void {
    this.install.open().catch((error: unknown) => console.error('Could not open the install guide', error));
  }
}
