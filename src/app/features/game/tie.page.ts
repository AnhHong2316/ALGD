import { Component, computed, inject } from '@angular/core';
import { GameSessionStore } from '../../state/game-session.store';

/**
 * Hoà phiếu.
 *
 * Không có nhánh cho ca chỉ còn 2 người sống: ở trạng thái đó engine bốc ngẫu
 * nhiên ngay trong submitVotes và không bao giờ đưa ván vào pha này.
 */
@Component({
  selector: 'app-tie-page',
  template: `
    <div class="screen tie">
      <div>
        <p class="screen__eyebrow">Vòng {{ round() }}</p>
        <h1 class="screen__title">Hoà phiếu rồi</h1>
      </div>

      <p class="tie__names">{{ names() }}</p>
      <p class="muted">Cùng số phiếu cao nhất. Làng chọn cách xử.</p>

      <div class="screen__spacer"></div>

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" (click)="revote()">
          Bỏ phiếu lại giữa họ
        </button>
        <button type="button" class="btn btn--ghost" (click)="skip()">
          Vòng này không loại ai
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .tie {
        text-align: center;
      }

      .tie__names {
        margin: 0;
        font-family: var(--font-display);
        font-size: 2rem;
        color: var(--lamp-500);
        word-break: break-word;
      }
    `,
  ],
})
export class TiePage {
  private readonly session = inject(GameSessionStore);

  readonly round = computed(() => this.session.state()?.round ?? 1);
  readonly names = computed(() =>
    this.session
      .voteCandidates()
      .map((person) => person.name)
      .join('  •  '),
  );

  revote(): Promise<void> {
    return this.session.breakTie('REVOTE');
  }

  skip(): Promise<void> {
    return this.session.breakTie('NO_ELIMINATION');
  }
}
