import { Component, computed, inject, signal } from '@angular/core';
import { GameSessionStore } from '../../state/game-session.store';
import { SecretCard } from './secret-card';

/**
 * Chia bài chuyền tay.
 *
 * Hai bước cho mỗi người, cố ý tách rời: trước hết xác nhận đúng người đang
 * cầm máy, sau đó mới hiện thẻ. Nếu hiện thẻ ngay khi tới lượt thì người vừa
 * chuyền máy đi vẫn còn đang nhìn màn hình.
 */
@Component({
  selector: 'app-deal-page',
  imports: [SecretCard],
  template: `
    <div class="screen lamp deal">
      <p class="screen__eyebrow">
        Người thứ {{ position() }} / {{ total() }}
      </p>

      <!--
        Bước chuyền máy chỉ có mỗi cái tên, nên phải kẹp thêm một khoảng giãn
        ở trên cho nhóm tên + nút nằm giữa màn; không có nó thì mọi thứ dồn
        lên đỉnh, dưới trống hoác.

        Bước lật bài thì KHÔNG: lá bài đã cao gần hết màn, thêm khoảng giãn ở
        trên nữa là đẩy nút tụt lại xuống đáy — đúng cái đang cần chữa.
      -->
      @if (!confirmed()) {
        <div class="screen__spacer"></div>
      }

      <div class="deal__who">
        <p class="deal__lead">Chuyền máy cho</p>
        <h1 class="deal__name">{{ name() }}</h1>
      </div>

      @if (confirmed()) {
        @if (card(); as content) {
          <app-secret-card [content]="content" />
        }
        <div class="screen__actions">
          <button type="button" class="btn btn--primary" (click)="seen()">Tôi đã xem</button>
        </div>
        <div class="screen__spacer"></div>
      } @else {
        <div class="screen__actions">
          <button type="button" class="btn btn--primary" (click)="confirmIdentity()">
            Tôi là {{ name() }}
          </button>
          <p class="muted deal__warn">Chỉ bấm khi máy đã ở trong tay bạn.</p>
        </div>
        <div class="screen__spacer"></div>
      }
    </div>
  `,
  styles: [
    `
      .deal {
        text-align: center;
      }

      .deal__who {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .deal__lead {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.25rem;
        color: var(--paper-400);
      }

      .deal__name {
        font-size: 3rem;
        color: var(--lamp-500);
        word-break: break-word;
      }

      .deal__warn {
        text-align: center;
      }
    `,
  ],
})
export class DealPage {
  private readonly session = inject(GameSessionStore);

  private readonly _confirmed = signal(false);
  readonly confirmed = this._confirmed.asReadonly();

  readonly name = computed(() => this.session.currentDealName() ?? '');
  readonly card = computed(() => this.session.currentCard());
  readonly total = computed(() => this.session.state()?.players.length ?? 0);
  readonly position = computed(() => (this.session.state()?.dealtCount ?? 0) + 1);

  confirmIdentity(): void {
    this._confirmed.set(true);
  }

  async seen(): Promise<void> {
    // Thu thẻ lại TRƯỚC khi đổi người, để không có khoảnh khắc nào thẻ của
    // người trước còn hiện trong lúc tên người sau đã đổi.
    this._confirmed.set(false);
    await this.session.revealNext();
  }
}
