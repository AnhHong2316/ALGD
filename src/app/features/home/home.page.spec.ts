import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { HomePage } from './home.page';

function setup() {
  TestBed.configureTestingModule({
    imports: [HomePage],
    providers: [
      provideRouter([]),
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      GameSessionStore,
      NewGameDraftStore,
    ],
  });
  return TestBed.createComponent(HomePage);
}

describe('HomePage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('hiện tên trò chơi', async () => {
    const fixture = setup();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ai Là Gián Điệp');
  });

  it('có nút bắt đầu ván mới', async () => {
    const fixture = setup();
    await fixture.whenStable();

    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
    expect(buttons.some((b) => b.textContent?.includes('Ván mới'))).toBe(true);
  });

  it('không có ván dở thì không mời chơi tiếp', async () => {
    const fixture = setup();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Chơi tiếp');
  });

  it('có ván dở thì mời chơi tiếp', async () => {
    const fixture = setup();
    const store = TestBed.inject(GameSessionStore);

    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: ['Minh', 'Hùng', 'Lan', 'Đức'],
      config: TestBed.inject(NewGameDraftStore).config(),
    });

    // Giả lập app vừa khởi động lại: xoá state trong bộ nhớ rồi đọc lại từ
    // máy. Gọi thẳng resume() thay vì dựa vào ngOnInit, vì ngOnInit chạy
    // ngầm không chờ được, dễ làm test chập chờn.
    store.clearInMemory();
    await store.resume();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Chơi tiếp');
  });
});
