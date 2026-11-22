import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  type OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiNotification } from '@taiga-ui/core';

/** A sheet from the bottom that asks for one name: a new folder, or a folder's new name. */
@Component({
  selector: 'k-name-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TuiButton, TuiNotification],
  templateUrl: './name-sheet.html',
  styleUrl: './sheet.css',
})
export class NameSheet implements OnInit {
  readonly heading = input.required<string>();
  readonly placeholder = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly initial = input('');
  readonly busy = input(false);
  readonly failed = input(false);
  readonly named = output<string>();
  readonly closed = output<void>();

  protected readonly name = signal('');
  protected readonly canConfirm = computed(() => !this.busy() && this.name().trim() !== '');
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  constructor() {
    afterNextRender(() => this.field().nativeElement.focus());
  }

  ngOnInit(): void {
    this.name.set(this.initial());
  }

  protected edit(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected confirm(): void {
    if (this.canConfirm()) this.named.emit(this.name().trim());
  }
}
