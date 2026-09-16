import { Component, input, signal } from '@angular/core';
import { CardContent } from '../../core/models';

/**
 * Thẻ nhấn-giữ-để-xem.
 *
 * Component này CHỈ nhận CardContent. Nó không nhận GameState, không đọc
 * assignments, và không có đường nào để biết người cầm máy là vai gì. Đó là
 * chủ đích: thứ nó không biết thì nó không thể làm lộ.
 *
 * Mở ra có hoạt hình 180ms, đóng lại TỨC THÌ. Đóng có hoạt hình nghĩa là
 * trong lúc mờ dần chữ vẫn đọc được, mà thả tay rồi từ bí mật còn nằm trên
 * màn hình một phần tư giây là quá đủ cho người ngồi cạnh.
 */
@Component({
  selector: 'app-secret-card',
  template: `
    <div
      class="secret-card"
      [class.secret-card--open]="revealed()"
      (pointerdown)="hold()"
      (pointerup)="release()"
      (pointerleave)="release()"
      (pointercancel)="release()"
      (contextmenu)="$event.preventDefault()"
    >
      <div class="secret-card__card">
        @if (revealed()) {
          <div class="secret-card__face">
            <p class="secret-card__role">{{ content().roleLabel }}</p>
            <p class="secret-card__word">{{ content().word }}</p>
            <p class="secret-card__note">{{ content().note }}</p>
          </div>
        } @else {
          <div class="secret-card__cover">
            <p class="secret-card__hint">Nhấn giữ để xem</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      /* Khung ngoài: viền mảnh, bên trong là một đường chấm, sau lưng là quầng
         đèn hắt ra. Ba lớp này chỉ để trang trí, thẻ thật nằm ở lớp trong. */
      .secret-card {
        position: relative;
        display: grid;
        place-items: center;
        padding: var(--space-5);
        border: 1px solid rgba(138, 147, 166, 0.3);
        border-radius: var(--radius-md);
        touch-action: none;
        cursor: pointer;
      }

      /* Đường chấm bên trong khung. */
      .secret-card::before {
        content: '';
        position: absolute;
        inset: 6px;
        border: 1px dotted rgba(138, 147, 166, 0.45);
        border-radius: calc(var(--radius-md) - 4px);
        pointer-events: none;
        z-index: 2;
      }

      /* Quầng đèn hắt sau thẻ. Dùng inset 0 rồi phóng chính cái gradient,
         KHÔNG dùng inset âm: phần thò ra bên phải và bên dưới sẽ nới rộng
         vùng cuộn của cả trang và đẻ ra thanh cuộn ngang. Đúng cái bẫy mà
         lớp .lamp đã vấp. */
      .secret-card::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(
          ellipse 130% 105% at 50% 50%,
          rgba(242, 166, 90, 0.2),
          transparent 62%
        );
        pointer-events: none;
        z-index: 0;
      }

      /* Thẻ thật: khổ dọc, vân da cũ, viền da bò sáng. */
      .secret-card__card {
        position: relative;
        z-index: 1;
        display: grid;
        place-items: center;
        width: 15rem;
        max-width: 100%;
        aspect-ratio: 5 / 7;
        padding: var(--space-4);
        border: 2px solid rgba(185, 155, 106, 0.55);
        border-radius: 10px;
        background:
          radial-gradient(ellipse at 30% 22%, rgba(255, 235, 200, 0.1), transparent 55%),
          radial-gradient(ellipse at 75% 82%, rgba(0, 0, 0, 0.28), transparent 60%),
          linear-gradient(160deg, #6b5a44 0%, #4e4132 45%, #3b3226 100%);
        box-shadow:
          inset 0 0 0 1px rgba(0, 0, 0, 0.35),
          0 8px 20px rgba(0, 0, 0, 0.45);
      }

      .secret-card--open .secret-card__card {
        border-color: var(--lamp-500);
        /* Chỉ hoạt hình lúc mở. Lúc đóng, khối này biến mất ngay lập tức vì
           template thay hẳn nội dung chứ không làm mờ dần. */
        animation: card-open 180ms ease-out;
      }

      @keyframes card-open {
        from {
          opacity: 0.2;
          transform: scale(0.97);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .secret-card__cover,
      .secret-card__face {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        text-align: center;
      }

      .secret-card__hint {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.125rem;
        color: rgba(237, 231, 222, 0.72);
        letter-spacing: 0.04em;
      }

      /* Khung rộng cố định: hai nhãn vai dài khác nhau, nếu để khung co giãn
         theo chữ thì người ngồi cạnh liếc thấy bề rộng là đoán ra vai.
         Nay thẻ đã có bề rộng cố định nên chuyện đó không còn xảy ra được
         nữa, nhưng giữ lại vì nó không tốn gì mà bỏ đi thì mất một lớp chắn. */
      .secret-card__role {
        margin: 0;
        width: 100%;
        min-height: 1.5rem;
        text-align: center;
        font-size: 0.9375rem;
        letter-spacing: 0.06em;
        color: var(--lamp-500);
      }

      /* Thẻ hẹp hơn trước nên chữ phải chịu xuống một nấc, và phải cho phép
         ngắt dòng — từ dài mà tràn ra ngoài thẻ thì lộ cho cả bàn thấy. */
      .secret-card__word {
        margin: 0;
        font-family: var(--font-display);
        font-size: 2rem;
        line-height: 1.15;
        overflow-wrap: anywhere;
      }

      .secret-card__note {
        margin: 0;
        min-height: 1.25rem;
        color: var(--paper-400);
        font-size: 0.9375rem;
      }
    `,
  ],
})
export class SecretCard {
  readonly content = input.required<CardContent>();

  private readonly _revealed = signal(false);
  readonly revealed = this._revealed.asReadonly();

  hold(): void {
    this._revealed.set(true);
  }

  release(): void {
    this._revealed.set(false);
  }
}
