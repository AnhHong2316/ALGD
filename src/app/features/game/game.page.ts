import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { DealPage } from './deal.page';

/**
 * Vỏ của mọi màn trong ván. Chọn màn theo `phase` chứ không theo địa chỉ URL,
 * vì ván được khôi phục từ máy phải rơi đúng vào bước đang dở — nếu điều
 * hướng bằng URL thì địa chỉ và trạng thái sẽ lệch nhau ngay lần đầu mở lại.
 */
@Component({
  selector: 'app-game-page',
  imports: [DealPage],
  template: `
    @let state = session.state();
    @if (state === null) {
      <div class="screen">
        <div class="screen__spacer"></div>
        <p class="muted">Đang mở ván…</p>
        <div class="screen__spacer"></div>
      </div>
    } @else {
      @switch (state.phase) {
        @case ('DEALING') {
          <app-deal-page />
        }
        @default {
          <div class="screen">
            <div class="screen__spacer"></div>
            <h1 class="screen__title">Chia bài xong</h1>
            <p class="muted">
              Vòng nói, vote và kết ván nằm ở bản kế hoạch tiếp theo.
            </p>
            <div class="screen__spacer"></div>
          </div>
        }
      }
    }
  `,
})
export class GamePage implements OnInit {
  protected readonly session = inject(GameSessionStore);
  private readonly draft = inject(NewGameDraftStore);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    if (this.session.hasGame()) return;

    const names = this.draft.playerNames();
    if (names.length === 0) {
      await this.router.navigate(['/']);
      return;
    }

    await this.session.startNew({
      villageName: this.draft.villageName(),
      playerNames: names,
      config: this.draft.config(),
    });
  }
}
