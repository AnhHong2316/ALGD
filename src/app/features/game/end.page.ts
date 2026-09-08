import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Outcome, Role } from '../../core/models';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { GameSessionStore } from '../../state/game-session.store';

const ROLE_LABEL: Record<Role, string> = {
  CIVILIAN: 'Dân làng',
  SPY: 'Gián điệp',
  WHITE: 'Mũ trắng',
};

const OUTCOME_LABEL: Record<Outcome, string> = {
  CIVILIANS: 'Dân làng thắng',
  SPIES: 'Gián điệp lên nắm quyền',
  WHITE: 'Mũ trắng thắng một mình',
};

/**
 * Kết ván.
 *
 * Chỉ đọc bảng điểm, KHÔNG ghi: kho phiên đã ghi từ lúc ván chuyển sang pha
 * ENDED, trước khi màn này được dựng. Ghi thêm lần nữa ở đây là cộng đúp.
 */
@Component({
  selector: 'app-end-page',
  template: `
    <div class="screen lamp end">
      <div>
        <p class="screen__eyebrow">Làng {{ village() }}</p>
        <h1 class="screen__title">{{ headline() }}</h1>
      </div>

      <div class="end__words">
        <div class="end__word">
          <span class="field__label">Dân làng</span>
          <strong>{{ civilianWord() }}</strong>
        </div>
        <div class="end__word">
          <span class="field__label">Gián điệp</span>
          <strong>{{ spyWord() }}</strong>
        </div>
      </div>

      <div class="end__list">
        @for (row of rows(); track row.name) {
          <div class="end__row">
            <span>{{ row.name }}</span>
            <span class="end__role">{{ row.role }}</span>
            <span class="end__point">+{{ row.earned }}</span>
            <span class="muted">{{ row.total }}</span>
          </div>
        }
      </div>

      <div class="screen__spacer"></div>

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" (click)="playAgain()">
          Chơi ván nữa
        </button>
        <button type="button" class="btn btn--ghost" (click)="goHome()">
          Về trang chủ
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .end__words {
        display: flex;
        gap: var(--space-3);
      }

      .end__word {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-4);
        background: var(--ink-800);
        border-radius: var(--radius-md);
        text-align: center;
      }

      .end__word strong {
        font-family: var(--font-display);
        font-size: 1.5rem;
        color: var(--lamp-500);
        word-break: break-word;
      }

      .end__list {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }

      .end__row {
        display: grid;
        grid-template-columns: 1fr auto 3rem 3rem;
        gap: var(--space-3);
        align-items: baseline;
        padding: var(--space-3) var(--space-4);
        background: var(--ink-800);
        border-radius: var(--radius-md);
      }

      .end__role {
        font-size: 0.875rem;
        color: var(--paper-400);
      }

      .end__point {
        text-align: right;
        font-family: var(--font-display);
        color: var(--lamp-500);
      }
    `,
  ],
})
export class EndPage implements OnInit {
  private readonly session = inject(GameSessionStore);
  private readonly scoreboard = inject(ScoreboardRepository);
  private readonly router = inject(Router);

  readonly totals = signal<Record<string, number>>({});

  readonly village = computed(() => this.session.state()?.villageName || 'ta');
  readonly civilianWord = computed(() => this.session.state()?.civilianWord ?? '');
  readonly spyWord = computed(() => this.session.state()?.spyWord ?? '');

  readonly headline = computed(() => {
    const outcome = this.session.state()?.outcome ?? null;
    return outcome === null ? 'Ván đã xong' : OUTCOME_LABEL[outcome];
  });

  /**
   * Điểm ván này, đọc lại từ bản ghi mà kho phiên vừa đẩy vào bảng điểm.
   *
   * Khai báo TRƯỚC `rows` vì `rows` đọc nó. Hiện tại đảo ngược thứ tự vẫn chạy
   * được do `computed` chỉ chạy khi bị đọc, nhưng đó là loại phụ thuộc ngầm dễ
   * gãy khi có người sửa sau này.
   */
  private readonly earned = signal<Record<string, number>>({});

  readonly rows = computed(() => {
    const state = this.session.state();
    if (state === null) return [];

    const earnedThisGame = this.earned();
    return state.players.map((player) => ({
      name: player.name,
      role: ROLE_LABEL[state.assignments[player.id].role],
      earned: earnedThisGame[player.name] ?? 0,
      total: this.totals()[player.name] ?? 0,
    }));
  });

  async ngOnInit(): Promise<void> {
    const state = this.session.state();
    const board = await this.scoreboard.load();

    this.totals.set(board.totals);
    const record = board.history.find((saved) => saved.gameId === state?.id);
    this.earned.set(record?.points ?? {});
  }

  async playAgain(): Promise<void> {
    const state = this.session.state();
    if (state === null) return;

    await this.session.startNew({
      villageName: state.villageName,
      playerNames: state.players.map((player) => player.name),
      config: state.config,
    });
  }

  async goHome(): Promise<void> {
    await this.session.abandon();
    await this.router.navigate(['/']);
  }
}
