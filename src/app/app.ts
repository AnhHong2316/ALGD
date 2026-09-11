import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppBar } from './shell/app-bar';
import { NarrationStrip } from './shell/narration-strip';
import { NarrationStore } from './state/narration.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppBar, NarrationStrip],
  template: `
    <app-bar />
    <app-narration-strip />

    @if (narration.showVoiceNotice()) {
      <div class="notice" role="region" aria-label="Thông báo về giọng đọc">
        <p class="notice__text">
          Máy này chưa có giọng đọc tiếng Việt nên phần dẫn chuyện sẽ chỉ hiện
          bằng chữ. Ván vẫn chơi bình thường.
        </p>
        <button type="button" class="btn btn--ghost" (click)="dismiss()">
          Không nhắc lại
        </button>
      </div>
    }

    <router-outlet />
  `,
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly narration = inject(NarrationStore);

  ngOnInit(): void {
    // Chạy ngầm: giao diện hiện ngay, mức âm lượng đã lưu được áp vào sau khi
    // đọc xong từ máy.
    void this.narration.init();
  }

  protected dismiss(): void {
    void this.narration.dismissVoiceNotice();
  }
}
