import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../core/models';
import { ActiveGameRepository } from '../data/repositories/active-game.repository';
import { WordBankRepository } from '../data/repositories/word-bank.repository';
import { MemoryStorage } from '../data/storage/memory-storage';
import { STORAGE_PORT } from '../data/storage/storage.token';
import { GameSessionStore } from './game-session.store';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

describe('GameSessionStore', () => {
  let storage: MemoryStorage;
  let store: GameSessionStore;

  beforeEach(() => {
    TestBed.resetTestingModule();
    storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_PORT, useValue: storage },
        WordBankRepository,
        ActiveGameRepository,
        GameSessionStore,
      ],
    });
    store = TestBed.inject(GameSessionStore);
  });

  it('chưa bắt đầu thì chưa có ván nào', () => {
    expect(store.state()).toBeNull();
    expect(store.hasGame()).toBe(false);
  });

  it('bắt đầu ván mới thì có state ở pha chia bài', async () => {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    const state = store.state();
    expect(state?.phase).toBe('DEALING');
    expect(state?.players).toHaveLength(4);
    expect(store.hasGame()).toBe(true);
  });

  it('ghi ván xuống máy ngay khi bắt đầu', async () => {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    const saved = await new ActiveGameRepository(storage).load();
    expect(saved?.id).toBe(store.state()?.id);
  });

  it('chuyền máy làm tăng số người đã xem', async () => {
    await store.startNew({
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    expect(store.state()?.dealtCount).toBe(0);
    await store.revealNext();
    expect(store.state()?.dealtCount).toBe(1);
  });

  it('người cuối xem xong thì sang pha nói', async () => {
    await store.startNew({
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    for (let i = 0; i < 4; i++) await store.revealNext();

    expect(store.state()?.phase).toBe('SPEAKING');
  });

  it('mỗi bước đều được ghi lại xuống máy', async () => {
    await store.startNew({
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });
    await store.revealNext();

    const saved = await new ActiveGameRepository(storage).load();
    expect(saved?.dealtCount).toBe(1);
  });

  it('khôi phục được ván đang dở', async () => {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });
    await store.revealNext();
    const before = store.state();

    // Giả lập app vừa khởi động lại: xoá state trong bộ nhớ, đọc lại từ máy.
    store.clearInMemory();
    expect(store.state()).toBeNull();
    await store.resume();

    expect(store.state()).toEqual(before);
  });

  it('không có ván dở thì khôi phục ra null', async () => {
    await store.resume();

    expect(store.state()).toBeNull();
  });

  it('bỏ ván thì xoá cả trong bộ nhớ lẫn trên máy', async () => {
    await store.startNew({
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });
    await store.abandon();

    expect(store.state()).toBeNull();
    expect(await new ActiveGameRepository(storage).load()).toBeNull();
  });

  it('đội hình sai thì ném lỗi và không tạo ván', async () => {
    await expect(
      store.startNew({
        villageName: '',
        playerNames: ['Minh', 'Hùng', 'Lan'],
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      }),
    ).rejects.toThrow(/ít nhất 4 người/);

    expect(store.state()).toBeNull();
  });

  it('gọi chuyền máy khi chưa có ván thì ném lỗi', async () => {
    await expect(store.revealNext()).rejects.toThrow(/chưa có ván/);
  });

  it('thẻ của người đang tới lượt lấy được qua store', async () => {
    await store.startNew({
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    const card = store.currentCard();
    expect(card).not.toBeNull();
    expect(typeof card?.word === 'string' || card?.word === null).toBe(true);
    expect(store.currentDealName()).toBe('Minh');
  });
});
