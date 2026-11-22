import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiInput, TuiLabel, TuiNotification, TuiTextfield } from '@taiga-ui/core';
import { TuiTextarea } from '@taiga-ui/kit';
import { Library } from '../../library/library';
import { SettingsButton } from '../shared/settings-button';

/** How long the delete button waits for the second tap. */
const CONFIRM_MS = 4000;

/** Writes a new lesson (`lesson/new`) or edits one (`lesson/:id/edit`). */
@Component({
  selector: 'k-lesson-edit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SettingsButton,
    TranslocoDirective,
    TuiButton,
    TuiInput,
    TuiLabel,
    TuiNotification,
    TuiTextarea,
    TuiTextfield,
  ],
  templateUrl: './lesson-edit-page.html',
  styleUrl: './lesson-edit-page.css',
})
export class LessonEditPage {
  private readonly library = inject(Library);
  private readonly router = inject(Router);

  /** Route parameter `:id`; missing for a new lesson. */
  readonly id = input<string>();

  protected readonly lesson = computed(() => {
    const id = this.id();
    return id ? this.library.lesson(id) : null;
  });
  protected readonly kashaCount = computed(() => {
    const id = this.id();
    return id ? this.library.kashasOf(id).length : 0;
  });
  protected readonly back = computed(() => (this.id() ? ['/lesson', this.id()] : ['/']));

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true }),
    text: new FormControl('', { nonNullable: true }),
  });
  private readonly text = toSignal(this.form.controls.text.valueChanges, { initialValue: '' });
  protected readonly canSave = computed(() => this.text().trim() !== '');
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly confirmingDelete = signal(false);
  private confirmTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Fill the form once the lesson is in memory (the library loads it from the phone at start).
    effect(() => {
      const lesson = this.lesson();
      if (lesson && untracked(() => this.form.pristine)) {
        this.form.setValue({ title: lesson.title, text: lesson.text });
      }
    });
  }

  protected async save(): Promise<void> {
    if (this.saving() || !this.canSave()) return;
    this.saving.set(true);
    this.failed.set(false);
    try {
      const { title, text } = this.form.getRawValue();
      const lesson = await this.library.saveLesson({ id: this.lesson()?.id, title, text });
      await this.router.navigate(['/lesson', lesson.id], { replaceUrl: true });
    } catch (error) {
      console.error('Could not save the lesson', error);
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  /** First tap asks, second tap (within a few seconds) deletes. */
  protected async remove(): Promise<void> {
    const lesson = this.lesson();
    if (!lesson) return;
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      clearTimeout(this.confirmTimer);
      this.confirmTimer = setTimeout(() => this.confirmingDelete.set(false), CONFIRM_MS);
      return;
    }
    clearTimeout(this.confirmTimer);
    try {
      await this.library.deleteLesson(lesson.id);
      await this.router.navigate(['/'], { replaceUrl: true });
    } catch (error) {
      console.error('Could not delete the lesson', error);
      this.confirmingDelete.set(false);
      this.failed.set(true);
    }
  }
}
