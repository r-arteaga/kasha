import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';

/**
 * The gear that opens Ajustes, at the right end of a screen's top bar. Svet wants it on every screen ("En todas las
 * pantallas quiero el botón de ajustes"); Ajustes brings her back to the screen she came from.
 */
@Component({
  selector: 'k-settings-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, TuiButton],
  template: `
    <a
      *transloco="let t"
      tuiIconButton
      appearance="flat"
      size="m"
      iconStart="@tui.settings"
      routerLink="/settings"
    >
      {{ t('lessons.settings') }}
    </a>
  `,
  styles: `
    :host {
      display: block;
      flex: none;
      margin-inline: auto -0.5rem;
    }
  `,
})
export class SettingsButton {}
