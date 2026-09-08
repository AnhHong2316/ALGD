import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameSessionStore } from '../../state/game-session.store';

/**
 * Mũ trắng đoán từ của dân làng. Chỉ đúng một lượt trong cả ván.
 *
 * Không chấm từ ở đây. Engine đã có phép chấm có sai số (bỏ dấu, viết thường,
 * cho lệch 1–2 ký tự); viết lại ở tầng giao diện là tạo ra hai luật khác nhau
 * cho cùng một việc.
 */
@Component({
  selector: 'app-white-guess-page',
  imports: [FormsModule],
  template: `
    <div class="screen guess">
      <div>
        <p class="screen__eyebrow">Mũ trắng lộ diện</p>
        <h1 class="screen__title">{{ name() }} đoán từ của dân làng</h1>
      </div>

      <p class="muted">Đoán trúng thì thắng cả làng. Chỉ có một lượt.</p>

      <div class="field">
        <label class="field__label" for="guess">Từ của dân làng là</label>
        <input
          id="guess"
          class="input"
          type="text"
          autocomplete="off"
          placeholder="gõ từ vào đây"
          [ngModel]="text()"
          (ngModelChange)="text.set($event)"
        />
      </div>

      <div class="screen__spacer"></div>

      <div class="screen__actions">
        <button
          type="button"
          class="btn btn--primary"
          [disabled]="!canSubmit()"
          (click)="submit()"
        >
          Chốt câu trả lời
        </button>
      </div>
    </div>
  `,
})
export class WhiteGuessPage {
  private readonly session = inject(GameSessionStore);

  readonly text = signal('');
  readonly name = computed(() => this.session.lastEliminatedName() ?? '');

  /** Chặn lần bấm thứ hai trước khi engine kịp đổi pha. */
  private sent = false;

  readonly canSubmit = computed(() => this.text().trim().length > 0);

  async submit(): Promise<void> {
    if (!this.canSubmit() || this.sent) return;
    this.sent = true;
    await this.session.guessCivilianWord(this.text().trim());
  }
}
