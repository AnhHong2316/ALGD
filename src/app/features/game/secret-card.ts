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
  `,
  styles: [
    `
      .secret-card {
        display: grid;
        place-items: center;
        min-height: 13rem;
        padding: var(--space-5);
        background: var(--ink-800);
        border: 1px solid var(--ink-600);
        border-radius: var(--radius-lg);
        touch-action: none;
        cursor: pointer;
      }

      .secret-card--open {
        background: var(--ink-700);
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
        color: var(--paper-400);
        letter-spacing: 0.04em;
      }

      /* Khung rộng cố định: hai nhãn vai dài khác nhau, nếu để khung co giãn
         theo chữ thì người ngồi cạnh liếc thấy bề rộng là đoán ra vai. */
      .secret-card__role {
        margin: 0;
        width: 12rem;
        min-height: 1.5rem;
        text-align: center;
        font-size: 0.9375rem;
        letter-spacing: 0.06em;
        color: var(--lamp-500);
      }

      .secret-card__word {
        margin: 0;
        font-family: var(--font-display);
        font-size: 2.25rem;
        line-height: 1.1;
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
