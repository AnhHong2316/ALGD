import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SoundLevel } from '../data/repositories/settings.repository';
import { NarrationStore } from '../state/narration.store';

const SOUND_LABEL: Record<SoundLevel, string> = {
  FULL: 'Đọc đầy đủ',
  SFX_ONLY: 'Chỉ tiếng động',
  OFF: 'Tắt tiếng',
};

const SOUND_ICON: Record<SoundLevel, string> = {
  FULL: '🔊',
  SFX_ONLY: '🔈',
  OFF: '🔇',
};

/**
 * Thanh trên cùng, có mặt trên mọi màn.
 *
 * Nút loa phải luôn ở đúng một chỗ để tắt gấp được giữa ván mà không phải đi
 * tìm. Đó là lý do nó nằm ở vỏ ứng dụng chứ không nằm trong màn Cài đặt.
 */
@Component({
  selector: 'app-bar',
  imports: [RouterLink],
  template: `
    <header class="bar">
      <a class="bar__home" routerLink="/">Ai Là Gián Điệp</a>

      <div class="bar__tools">
        <button
          type="button"
          class="bar__btn"
          data-test="sound"
          [attr.aria-label]="'Âm thanh: ' + label()"
          (click)="cycle()"
        >
          {{ icon() }}
        </button>

        <a class="bar__btn" routerLink="/cai-dat" aria-label="Cài đặt">⚙</a>
      </div>
    </header>
  `,
  styles: [
    `
      .bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-2) var(--space-4);
        background: var(--ink-800);
        border-bottom: 1px solid var(--ink-700);
      }

      .bar__home {
        color: var(--paper-400);
        font-size: 0.8125rem;
        letter-spacing: 0.04em;
        text-decoration: none;
      }

      .bar__tools {
        display: flex;
        gap: var(--space-2);
      }

      /* 44px là ngưỡng bấm trúng khi không nhìn kỹ. Thanh này mỏng nên không
         dùng --tap 56px, nhưng không được nhỏ hơn 44. */
      .bar__btn {
        display: grid;
        place-items: center;
        min-width: 44px;
        min-height: 44px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: var(--radius-md);
        color: var(--lamp-400);
        font-size: 1.125rem;
        text-decoration: none;
        cursor: pointer;
      }

      .bar__btn:active {
        background: var(--ink-700);
      }
    `,
  ],
})
export class AppBar {
  private readonly narration = inject(NarrationStore);

  readonly label = computed(() => SOUND_LABEL[this.narration.soundLevel()]);
  readonly icon = computed(() => SOUND_ICON[this.narration.soundLevel()]);

  protected cycle(): void {
    void this.narration.cycleSoundLevel();
  }
}
