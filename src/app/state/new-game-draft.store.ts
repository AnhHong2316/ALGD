import { Injectable, signal } from '@angular/core';
import { DEFAULT_GAME_CONFIG, GameConfig } from '../core/models';

/**
 * Giữ những gì người dùng đang chọn khi chuẩn bị một ván, sống qua ba màn
 * trang chủ, danh sách người chơi, và cấu hình. Không ghi xuống máy: đây là
 * bản nháp, chỉ khi bấm Bắt đầu nó mới biến thành một ván thật.
 */
@Injectable()
export class NewGameDraftStore {
  readonly villageName = signal('');
  readonly playerNames = signal<string[]>([]);
  readonly config = signal<GameConfig>({ ...DEFAULT_GAME_CONFIG });

  reset(): void {
    this.villageName.set('');
    this.playerNames.set([]);
    this.config.set({ ...DEFAULT_GAME_CONFIG });
  }
}
