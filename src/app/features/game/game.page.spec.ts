import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { GamePage } from './game.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

/** Trang giữ chỗ cho tuyến gốc, chỉ tồn tại trong test này. Router.navigate()
 *  trả về promise bị từ chối khi không khớp tuyến nào, nên phải có đích thật. */
@Component({ template: '' })
class StubHomePage {}

/** Một kho lưu trữ duy nhất dùng chung cho cả bài test, để mô phỏng "cùng một
 *  cái máy" qua các lần app khởi động lại. */
function configure(storage: MemoryStorage) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [GamePage],
    providers: [
      provideRouter([{ path: '', component: StubHomePage }]),
      { provide: STORAGE_PORT, useValue: storage },
      WordBankRepository,
      ActiveGameRepository,
      GameSessionStore,
      NewGameDraftStore,
    ],
  });
}

describe('GamePage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('khôi phục giữa lúc chia bài thì rơi đúng vào người đang tới lượt', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    // Chia cho hai người rồi coi như app bị đóng.
    const first = TestBed.inject(GameSessionStore);
    await first.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });
    await first.revealNext();
    await first.revealNext();

    // App khởi động lại: bộ nhớ trống, đọc lại từ máy — đúng như khi người
    // chơi bấm F5 rồi bấm "Chơi tiếp ván đang dở" ở trang chủ.
    configure(storage);
    const session = TestBed.inject(GameSessionStore);
    await session.resume();

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const text = html.textContent ?? '';

    // Phải là màn chia bài, KHÔNG được nhảy tới màn chia bài xong.
    expect(html.querySelector('app-deal-page')).not.toBeNull();
    expect(text).not.toContain('Chia bài xong');
    // Và đúng người thứ ba, không quay về đầu.
    expect(text).toContain('Lan');
    expect(text).toContain('3 / 4');
  });

  it('chia xong hết thì hiện màn sau chia bài', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const session = TestBed.inject(GameSessionStore);
    await session.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await session.revealNext();
    }

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('app-deal-page')).toBeNull();
    expect(html.textContent ?? '').toContain('Chia bài xong');
  });

  it('không có ván nào và cũng chưa nhập tên thì quay về trang chủ', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toBe('/');
  });
});
