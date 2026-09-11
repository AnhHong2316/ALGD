import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { SettingsRepository, SoundLevel } from '../../data/repositories/settings.repository';
import { NarrationStore } from '../../state/narration.store';

const LEVELS: { value: SoundLevel; title: string; note: string }[] = [
  { value: 'FULL', title: 'Đọc đầy đủ', note: 'Đọc lời dẫn kèm tiếng động.' },
  { value: 'SFX_ONLY', title: 'Chỉ tiếng động', note: 'Không đọc, chỉ báo hiệu bằng tiếng.' },
  { value: 'OFF', title: 'Tắt tiếng', note: 'Im lặng hoàn toàn. Lời dẫn vẫn hiện bằng chữ.' },
];

function readRate(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

@Component({
  selector: 'app-settings-page',
  template: `
    <div class="screen">
      <p class="screen__eyebrow">Cài đặt</p>
      <h1 class="screen__title">Âm thanh</h1>

      <div class="screen__actions">
        @for (level of levels; track level.value) {
          <label class="choice">
            <input
              type="radio"
              name="soundLevel"
              [value]="level.value"
              [checked]="narration.soundLevel() === level.value"
              (change)="chooseLevel(level.value)"
            />
            <span>
              <strong>{{ level.title }}</strong>
              <span class="muted">{{ level.note }}</span>
            </span>
          </label>
        }
      </div>

      <div class="field">
        <label class="field__label" for="rate"> Tốc độ đọc: {{ rateText() }} </label>
        <input
          id="rate"
          class="slider"
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          [value]="rateText()"
          (input)="showRate($event)"
          (change)="commitRate($event)"
        />
      </div>

      <button
        type="button"
        class="btn btn--ghost"
        data-test="preview"
        [disabled]="narration.soundLevel() !== 'FULL'"
        (click)="preview()"
      >
        Nghe thử
      </button>

      <p class="muted">Lời dẫn luôn hiện bằng chữ ở cả ba mức, nên tắt tiếng vẫn chơi đủ.</p>

      <div class="screen__spacer"></div>
    </div>
  `,
  styles: [
    `
      .choice {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        min-height: var(--tap);
        padding: var(--space-3) var(--space-4);
        background: var(--ink-800);
        border: 1px solid var(--ink-600);
        border-radius: var(--radius-md);
        cursor: pointer;
      }

      .choice span {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }

      .slider {
        width: 100%;
        min-height: 44px;
        accent-color: var(--lamp-500);
      }
    `,
  ],
})
export class SettingsPage implements OnInit {
  protected readonly narration = inject(NarrationStore);
  private readonly settings = inject(SettingsRepository);

  protected readonly levels = LEVELS;
  protected readonly rate = signal(1);

  /**
   * Bật strictTemplates nên `[value]` của input chỉ nhận chuỗi. Đổi sẵn ở đây
   * thay vì nhét số vào rồi để Angular báo lỗi lúc biên dịch template.
   */
  protected readonly rateText = computed(() => this.rate().toFixed(1));

  ngOnInit(): void {
    void this.settings.load().then((settings) => this.rate.set(settings.speechRate));
  }

  protected chooseLevel(level: SoundLevel): void {
    void this.narration.setSoundLevel(level);
  }

  /** Chỉ đổi con số đang hiện, chưa ghi xuống máy. */
  protected showRate(event: Event): void {
    this.rate.set(readRate(event));
  }

  /**
   * Ghi xuống máy đúng một lần, lúc người dùng thả tay.
   *
   * Trước đây ghi theo từng bước của sự kiện input. setSpeechRate là đọc-rồi-
   * ghi, nên hai lời gọi sát nhau có thể kết thúc lệch thứ tự và lượt ghi của
   * giá trị cũ đáp sau lượt của giá trị mới — tốc độ lưu trên máy lệch hẳn
   * khỏi con số đang hiện, mà không có dấu hiệu gì.
   */
  protected commitRate(event: Event): void {
    const value = readRate(event);
    this.rate.set(value);
    void this.narration.setSpeechRate(value);
  }

  protected preview(): void {
    void this.narration.preview();
  }
}
