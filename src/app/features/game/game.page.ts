import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { DealPage } from './deal.page';
import { EndPage } from './end.page';
import { RevealPage } from './reveal.page';
import { SpeakingPage } from './speaking.page';
import { TiePage } from './tie.page';
import { VotePage } from './vote.page';
import { WhiteGuessPage } from './white-guess.page';

/**
 * Vỏ của mọi màn trong ván. Chọn màn theo `phase` chứ không theo địa chỉ URL,
 * vì ván được khôi phục từ máy phải rơi đúng vào bước đang dở — nếu điều
 * hướng bằng URL thì địa chỉ và trạng thái sẽ lệch nhau ngay lần đầu mở lại.
 */
@Component({
  selector: 'app-game-page',
  imports: [
    DealPage,
    SpeakingPage,
    VotePage,
    TiePage,
    RevealPage,
    WhiteGuessPage,
    EndPage,
  ],
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
        @case ('SPEAKING') {
          <app-speaking-page />
        }
        @case ('VOTING') {
          <app-vote-page />
        }
        @case ('TIE_BREAK') {
          <app-tie-page />
        }
        @case ('REVEAL') {
          <app-reveal-page />
        }
        @case ('WHITE_GUESS') {
          <app-white-guess-page />
        }
        @case ('ENDED') {
          <app-end-page />
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
