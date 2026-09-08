import { Component, computed, inject } from '@angular/core';
import { Role } from '../../core/models';
import { GameSessionStore } from '../../state/game-session.store';

const ROLE_LABEL: Record<Role, string> = {
  CIVILIAN: 'Dân làng',
  SPY: 'Gián điệp',
  WHITE: 'Mũ trắng',
};

/**
 * Lật vai người vừa bị loại.
 *
 * Nói rõ hai ca đặc biệt vì cả hai đều dễ gây cãi nhau ngoài đời: bị loại do
 * bốc ngẫu nhiên chứ không phải do bị vote, và mũ trắng vừa đoán sai.
 */
@Component({
  selector: 'app-reveal-page',
  template: `
    <div class="screen lamp reveal">
      <p class="screen__eyebrow">Vòng {{ round() }}</p>

      @if (last(); as elimination) {
        <div class="reveal__who">
          <h1 class="reveal__name">{{ name() }}</h1>
          <p class="reveal__role" [class.reveal__role--spy]="elimination.role === 'SPY'">
            {{ label() }}
          </p>
        </div>

        @if (elimination.byRandomTieBreak) {
          <p class="muted">Bốc ngẫu nhiên để phân định, vì chỉ còn hai người.</p>
        }
      }

      @if (wrongGuess(); as guess) {
        <p class="warning">Mũ trắng đoán "{{ guess }}" — không trúng.</p>
      }

      <div class="screen__spacer"></div>

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" (click)="next()">Tiếp tục</button>
      </div>
    </div>
  `,
  styles: [
    `
      .reveal {
        text-align: center;
      }

      .reveal__who {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .reveal__name {
        font-size: 2.75rem;
        word-break: break-word;
      }

      .reveal__role {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.5rem;
        letter-spacing: 0.06em;
        color: var(--lamp-500);
      }

      .reveal__role--spy {
        color: var(--blood-500);
      }
    `,
  ],
})
export class RevealPage {
  private readonly session = inject(GameSessionStore);

  readonly round = computed(() => this.session.state()?.round ?? 1);
  readonly name = computed(() => this.session.lastEliminatedName() ?? '');

  readonly last = computed(() => {
    const state = this.session.state();
    if (state === null || state.eliminations.length === 0) return null;
    return state.eliminations[state.eliminations.length - 1];
  });

  readonly label = computed(() => {
    const elimination = this.last();
    return elimination === null ? '' : ROLE_LABEL[elimination.role];
  });

  /** Chỉ có giá trị khi mũ trắng vừa đoán và đoán trượt. */
  readonly wrongGuess = computed(() => {
    const guess = this.session.state()?.whiteGuess ?? null;
    return guess === null || guess.correct ? null : guess.text;
  });

  next(): Promise<void> {
    return this.session.afterReveal();
  }
}
