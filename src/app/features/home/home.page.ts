import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';

@Component({
  selector: 'app-home-page',
  template: `
    <div class="screen home">
      <div class="screen__spacer"></div>

      <!--
        Ảnh nền đã vẽ sẵn tên trò chơi, nên để chữ hiện nữa là thành hai tiêu
        đề chồng nhau. Ẩn khỏi mắt chứ KHÔNG xoá: trình đọc màn hình vẫn phải
        đọc được tên app, mà ảnh thì nó không đọc hộ được.
      -->
      <div class="home__brand sr-only">
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
      /*
       * Ảnh nền đặt ở :host chứ không ở .screen, vì .screen bị kẹp
       * max-width 32rem và căn giữa — để nền ở đó thì trên màn rộng ảnh chỉ
       * phủ đúng cái cột giữa, hai bên trơ nền đen.
       *
       * Lớp phủ tối ở dưới không phải để cho đẹp: nút "Ván mới" nằm đè lên
       * vùng bàn gỗ sáng màu của ảnh, không có lớp này thì mép nút lẫn vào
       * nền. Nó nằm trước url() nên được vẽ đè lên trên ảnh.
       */
      :host {
        background-image: linear-gradient(
            to bottom,
            rgba(11, 14, 20, 0) 40%,
            rgba(11, 14, 20, 0.55) 70%,
            rgba(11, 14, 20, 0.92) 100%
          ),
          url('/background.webp');
        background-repeat: no-repeat;
        background-position: center, center top;
        background-size: cover, cover;
      }

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
