import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { GameSessionStore } from '../../state/game-session.store';
import { NarrationStore } from '../../state/narration.store';

/** Bắt đầu nhắc và gõ tick khi còn ngần này giây. */
const ALMOST_UP_AT = 5;

/**
 * Vòng nói.
 *
 * Đồng hồ chỉ để nhắc, hết giờ KHÔNG tự chuyển người: ngoài đời người ta hay
 * nói nốt câu dở, và cắt ngang giữa câu khó chịu hơn là chạy quá vài giây.
 *
 * Đây là chỗ DUY NHẤT trong hệ thống mà lời dẫn được bắn ra từ bên ngoài
 * engine: engine là một máy trạng thái thuần, không biết gì về đồng hồ treo
 * tường, nên TIME_ALMOST_UP không có đường nào khác để phát ra ngoài đồng hồ
 * của màn hình này. Đừng "sửa cho nhất quán" bằng cách dời nó vào engine.
 */
@Component({
  selector: 'app-speaking-page',
  template: `
    <div class="screen lamp speaking">
      <p class="screen__eyebrow">Vòng {{ round() }}</p>

      <div class="screen__spacer"></div>

      <div class="speaking__who">
        <p class="speaking__lead">Tới lượt</p>
        <h1 class="speaking__name">{{ name() }}</h1>
      </div>

      @if (secondsLeft() !== null) {
        <p class="speaking__clock" [class.speaking__clock--out]="secondsLeft() === 0">
          @if (secondsLeft() === 0) {
            Hết giờ
          } @else {
            {{ secondsLeft() }}
          }
        </p>
      }

      <div class="speaking__order">
        @for (person of order(); track $index) {
          <span class="speaking__chip" [class.speaking__chip--on]="$index === index()">
            {{ person }}
          </span>
        }
      </div>

      @if (roundsLeft() > 0) {
        <p class="muted">Còn {{ roundsLeft() }} vòng nữa mới được vote.</p>
      }

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" (click)="done()">Xong lượt</button>
      </div>

      <div class="screen__spacer"></div>
    </div>
  `,
  styles: [
    `
      .speaking {
        text-align: center;
      }

      .speaking__who {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .speaking__lead {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.25rem;
        color: var(--paper-400);
      }

      .speaking__name {
        font-size: 2.75rem;
        color: var(--lamp-500);
        word-break: break-word;
      }

      .speaking__clock {
        margin: 0;
        font-family: var(--font-display);
        font-size: 3.5rem;
        line-height: 1;
        color: var(--paper-100);
      }

      .speaking__clock--out {
        font-size: 2rem;
        color: var(--blood-500);
      }

      .speaking__order {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        justify-content: center;
      }

      .speaking__chip {
        padding: var(--space-1) var(--space-3);
        border-radius: 999px;
        background: var(--ink-800);
        color: var(--paper-400);
        font-size: 0.875rem;
      }

      .speaking__chip--on {
        background: var(--lamp-glow);
        color: var(--lamp-400);
      }
    `,
  ],
})
export class SpeakingPage {
  private readonly session = inject(GameSessionStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly narration = inject(NarrationStore);

  /** Mỗi lượt chỉ nhắc một lần, dù đồng hồ chạy qua mốc 5 giây nhiều nhịp. */
  private warned = false;

  readonly name = computed(() => this.session.currentSpeakerName() ?? '');
  readonly order = computed(() => this.session.speakingNames());
  readonly index = computed(() => this.session.state()?.speakerIndex ?? 0);
  readonly round = computed(() => this.session.state()?.round ?? 1);
  readonly roundsLeft = computed(() => this.session.roundsLeftBeforeVote());

  /** null nghĩa là ván này tắt đồng hồ. */
  private readonly _secondsLeft = signal<number | null>(null);
  readonly secondsLeft = this._secondsLeft.asReadonly();

  private handle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.restartClock();
    // setInterval không tự dừng khi component biến mất.
    this.destroyRef.onDestroy(() => this.stopClock());
  }

  async done(): Promise<void> {
    await this.session.nextSpeaker();
    this.restartClock();
  }

  private restartClock(): void {
    this.stopClock();
    this.warned = false;

    const seconds = this.session.state()?.config.timerSeconds ?? null;
    this._secondsLeft.set(seconds);
    if (seconds === null) return;

    this.handle = setInterval(() => {
      const left = this._secondsLeft();
      if (left === null || left <= 0) {
        this.stopClock();
        return;
      }

      const next = left - 1;
      this._secondsLeft.set(next);

      if (next > 0 && next <= ALMOST_UP_AT) {
        // Tiếng tick gõ từng giây, còn lời nhắc chỉ đọc đúng một lần. Đọc lại
        // mỗi giây thì vừa ồn vừa ghi đè lời dẫn của pha đang diễn ra.
        this.narration.tick();
        if (!this.warned) {
          this.warned = true;
          this.narration.raise({ type: 'TIME_ALMOST_UP', payload: {} });
        }
      }
    }, 1000);
  }

  private stopClock(): void {
    if (this.handle !== null) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }
}
