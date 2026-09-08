import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';

@Component({
  selector: 'app-home-page',
  template: `
    <div class="screen home lamp">
      <div class="screen__spacer"></div>

      <div class="home__brand">
        <p class="screen__eyebrow">Trò chơi bàn tròn</p>
        <h1 class="home__title">Ai Là Gián Điệp</h1>
        <p class="muted">Một máy, chuyền tay, không cần mạng.</p>
      </div>

      <div class="screen__spacer"></div>

      <div class="screen__actions">
        @if (session.hasGame()) {
          <button type="button" class="btn btn--primary" (click)="continueGame()">
            Chơi tiếp ván đang dở
          </button>
          <button type="button" class="btn btn--ghost" (click)="newGame()">Ván mới</button>
        } @else {
          <button type="button" class="btn btn--primary" (click)="newGame()">Ván mới</button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .home {
        text-align: center;
      }

      .home__brand {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .home__title {
        font-size: 2.75rem;
        color: var(--lamp-500);
      }
    `,
  ],
})
export class HomePage implements OnInit {
  protected readonly session = inject(GameSessionStore);
  private readonly draft = inject(NewGameDraftStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Hỏi máy xem có ván nào đang dở không. Chạy ngầm: trang chủ hiện ngay,
    // dải "Chơi tiếp" xuất hiện sau khi đọc xong.
    void this.session.resume();
  }

  protected newGame(): void {
    this.draft.reset();
    void this.router.navigate(['/nguoi-choi']);
  }

  protected continueGame(): void {
    void this.router.navigate(['/van']);
  }
}
