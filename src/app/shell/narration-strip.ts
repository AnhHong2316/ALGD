import { Component, inject } from '@angular/core';
import { NarrationStore } from '../state/narration.store';

/**
 * Dải chữ dẫn chuyện.
 *
 * Chữ hiện ở MỌI mức âm lượng, kể cả khi tắt tiếng hoàn toàn. Đây là đường
 * chính để người chơi biết chuyện gì vừa xảy ra; giọng đọc chỉ là thứ tăng
 * thêm. Máy không có giọng tiếng Việt thì ván vẫn chơi đủ nhờ dải này.
 */
@Component({
  selector: 'app-narration-strip',
  template: `
    @if (line() !== '') {
      <p class="strip__line" role="status">{{ line() }}</p>
    }
  `,
  styles: [
    `
      .strip__line {
        margin: 0;
        padding: var(--space-3) var(--space-4);
        background: var(--lamp-glow);
        border-bottom: 1px solid var(--ink-700);
        color: var(--lamp-400);
        font-size: 0.9375rem;
        font-style: italic;
        line-height: 1.35;
        text-align: center;
      }
    `,
  ],
})
export class NarrationStrip {
  private readonly narration = inject(NarrationStore);
  readonly line = this.narration.line;
}
