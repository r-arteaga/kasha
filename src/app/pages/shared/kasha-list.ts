import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Kasha } from '../../library/lesson';
import { Library } from '../../library/library';
import { languageLabel } from '../../reading/tts/voices';
import { AppLanguage } from '../../settings/app-language';

/** Kashas as rows: title, language, the folder they are in (when asked) and the day they were made. */
@Component({
  selector: 'k-kasha-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <ul class="list">
      @for (row of rows(); track row.id) {
        <li>
          <a class="row" [routerLink]="['/kasha', row.id]">
            <span class="row-body">
              <span class="row-title">{{ row.title }}</span>
              <span class="row-meta">
                <span>{{ row.language }}</span>
                @if (row.lesson) {
                  <span aria-hidden="true">·</span>
                  <span class="row-lesson">{{ row.lesson }}</span>
                }
                <span aria-hidden="true">·</span>
                <span>{{ row.date }}</span>
              </span>
            </span>
          </a>
        </li>
      }
    </ul>
  `,
  styleUrl: './list.css',
})
export class KashaList {
  private readonly library = inject(Library);
  private readonly appLanguage = inject(AppLanguage);

  readonly kashas = input.required<Kasha[]>();
  /** Off inside a folder, where every row is in that same folder. */
  readonly showLesson = input(true);

  protected readonly rows = computed(() => {
    const lang = this.appLanguage.lang();
    const date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' });
    return this.kashas().map((kasha) => ({
      id: kasha.id,
      title: kasha.title,
      language: languageLabel(kasha.locale.split('-')[0], lang),
      lesson:
        this.showLesson() && kasha.lessonId ? (this.library.lesson(kasha.lessonId)?.title ?? null) : null,
      date: date.format(kasha.createdAt),
    }));
  });
}
