import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon, TuiNotification } from '@taiga-ui/core';
import { kashaCountKey, previewOf } from '../../library/lesson';
import { Library } from '../../library/library';
import { AppLanguage } from '../../settings/app-language';

/** Home: her lessons, like a list of notes, most recently changed first. */
@Component({
  selector: 'k-lessons-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, TuiButton, TuiIcon, TuiNotification],
  templateUrl: './lessons-page.html',
  styleUrl: './lessons-page.css',
})
export class LessonsPage {
  private readonly library = inject(Library);
  private readonly appLanguage = inject(AppLanguage);

  protected readonly state = this.library.state;
  protected readonly rows = computed(() => {
    const date = new Intl.DateTimeFormat(this.appLanguage.lang(), { day: 'numeric', month: 'short' });
    return this.library.lessons().map((lesson) => {
      const count = this.library.kashasOf(lesson.id).length;
      return {
        id: lesson.id,
        title: lesson.title,
        preview: previewOf(lesson),
        count,
        countKey: `lessons.${kashaCountKey(count)}`,
        date: date.format(lesson.updatedAt),
      };
    });
  });
}
