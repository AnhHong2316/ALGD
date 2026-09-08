import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { GameSessionStore } from '../../state/game-session.store';

/**
 * Vòng nói.
 *
 * Đồng hồ chỉ để nhắc, hết giờ KHÔNG tự chuyển người: ngoài đời người ta hay
 * nói nốt câu dở, và cắt ngang giữa câu khó chịu hơn là chạy quá vài giây.
 */
@Component({
  selector: 'app-speaking-page',
  template: `
    <div class="screen lamp speaking">
      <p class="screen__eyebrow">Vòng {{ round() }}</p>

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

      <div class="screen__spacer"></div>

      @if (roundsLeft() > 0) {
        <p class="muted">Còn {{ roundsLeft() }} vòng nữa mới được vote.</p>
      }

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" (click)="done()">Xong lượt</button>
      </div>
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

    const seconds = this.session.state()?.config.timerSeconds ?? null;
    this._secondsLeft.set(seconds);
    if (seconds === null) return;

    this.handle = setInterval(() => {
      const left = this._secondsLeft();
      if (left === null || left <= 0) {
        this.stopClock();
        return;
      }
      this._secondsLeft.set(left - 1);
    }, 1000);
  }

  private stopClock(): void {
    if (this.handle !== null) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }
}
