import { Component, computed, inject, signal } from '@angular/core';
import { VoteTally } from '../../core/engine/vote-resolver';
import { GameSessionStore } from '../../state/game-session.store';

/**
 * Nhập phiếu.
 *
 * Quản trò đếm tay rồi gõ số vào, app không bỏ phiếu hộ ai. Engine từ chối
 * bảng phiếu sai luật bằng cách ném lỗi, nên màn này chặn từ trước.
 *
 * Ở lượt bỏ phiếu lại, danh sách ứng viên rút lại còn những người đang hoà,
 * nhưng TRẦN tổng phiếu vẫn là toàn bộ người còn sống, vì tất cả họ đều bỏ
 * phiếu lại chứ không chỉ hai người đang hoà.
 */
@Component({
  selector: 'app-vote-page',
  template: `
    <div class="screen vote">
      <div>
        <p class="screen__eyebrow">Vòng {{ round() }}</p>
        <h1 class="screen__title">Ai là gián điệp?</h1>
      </div>

      @if (isRevote()) {
        <p class="muted">Bỏ phiếu lại giữa {{ candidates().length }} người đang hoà.</p>
      }

      <div class="vote__list">
        @for (person of candidates(); track person.id) {
          <div class="vote__row">
            <span class="vote__name">{{ person.name }}</span>
            <div class="vote__counter">
              <button type="button" class="vote__step" (click)="add(person.id, -1)">−</button>
              <span class="vote__count">{{ votesFor(person.id) }}</span>
              <button type="button" class="vote__step" (click)="add(person.id, 1)">+</button>
            </div>
          </div>
        }
      </div>

      <p class="muted">Tổng phiếu: {{ total() }} / {{ voterCount() }}</p>

      <div class="screen__spacer"></div>

      @if (tooMany()) {
        <p class="warning">Tổng phiếu đang nhiều hơn số người còn sống.</p>
      }

      <div class="screen__actions">
        <button
          type="button"
          class="btn btn--primary"
          [disabled]="!canSubmit()"
          (click)="submit()"
        >
          Chốt phiếu
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .vote__list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .vote__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        background: var(--ink-800);
        border-radius: var(--radius-md);
      }

      .vote__name {
        font-size: 1.125rem;
        word-break: break-word;
      }

      .vote__counter {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }

      .vote__step {
        width: var(--tap);
        height: var(--tap);
        background: var(--ink-700);
        border: 1px solid var(--ink-600);
        border-radius: var(--radius-md);
        color: var(--paper-100);
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
      }

      .vote__count {
        min-width: 1.5rem;
        text-align: center;
        font-family: var(--font-display);
        font-size: 1.5rem;
        color: var(--lamp-500);
      }
    `,
  ],
})
export class VotePage {
  private readonly session = inject(GameSessionStore);

  private readonly tally = signal<VoteTally>({});

  readonly candidates = computed(() => this.session.voteCandidates());
  readonly round = computed(() => this.session.state()?.round ?? 1);
  readonly isRevote = computed(
    () => (this.session.state()?.tiedCandidateIds.length ?? 0) > 0,
  );

  /** Trần tổng phiếu: mọi người còn sống đều bỏ phiếu, kể cả ở lượt bỏ lại. */
  readonly voterCount = computed(() => this.session.alivePlayers().length);

  readonly total = computed(() =>
    Object.values(this.tally()).reduce((sum, votes) => sum + votes, 0),
  );

  readonly tooMany = computed(() => this.total() > this.voterCount());
  readonly canSubmit = computed(() => this.total() >= 1 && !this.tooMany());

  votesFor(playerId: string): number {
    return this.tally()[playerId] ?? 0;
  }

  add(playerId: string, delta: number): void {
    this.tally.update((current) => ({
      ...current,
      [playerId]: Math.max(0, (current[playerId] ?? 0) + delta),
    }));
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    await this.session.vote(this.tally());
  }
}
