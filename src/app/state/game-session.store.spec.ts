import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../core/models';
import { ActiveGameRepository } from '../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../data/repositories/settings.repository';
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
        ScoreboardRepository,
        SettingsRepository,
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

  /** Chia bài cho hết người để ván bước vào pha nói. */
  async function dealAll(): Promise<void> {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, minRoundsBeforeVote: 1 },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await store.revealNext();
    }
  }

  it('chia xong thì có người nói đầu tiên', async () => {
    await dealAll();

    expect(store.state()?.phase).toBe('SPEAKING');
    expect(store.currentSpeakerName()).not.toBeNull();
    expect(NAMES).toContain(store.currentSpeakerName());
  });

  it('xong lượt thì sang người kế', async () => {
    await dealAll();
    const first = store.currentSpeakerName();

    await store.nextSpeaker();

    expect(store.currentSpeakerName()).not.toBe(first);
  });

  it('hết người nói và đủ số vòng thì mở pha vote', async () => {
    await dealAll();
    for (let i = 0; i < NAMES.length; i++) {
      await store.nextSpeaker();
    }

    expect(store.state()?.phase).toBe('VOTING');
  });

  it('vote tập trung vào một người thì người đó bị loại', async () => {
    await dealAll();
    for (let i = 0; i < NAMES.length; i++) {
      await store.nextSpeaker();
    }
    const target = store.state()!.aliveIds[0];

    await store.vote({ [target]: 3 });

    expect(store.state()?.aliveIds).not.toContain(target);
    expect(store.lastEliminatedName()).toBe(
      store.state()!.players.find((p) => p.id === target)!.name,
    );
  });

  it('còn bao nhiêu vòng nữa mới được vote', async () => {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, minRoundsBeforeVote: 3 },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await store.revealNext();
    }

    // Đang ở vòng 1, cần tới hết vòng 3 mới mở vote.
    expect(store.roundsLeftBeforeVote()).toBe(2);
  });

  it('người còn sống là tập con của toàn bộ người chơi', async () => {
    await dealAll();

    expect(store.alivePlayers()).toHaveLength(NAMES.length);
    expect(store.alivePlayers().map((p) => p.name).sort()).toEqual([...NAMES].sort());
  });

  it('chưa có ván thì các dẫn xuất trong ván đều rỗng', () => {
    expect(store.currentSpeakerName()).toBeNull();
    expect(store.lastEliminatedName()).toBeNull();
    expect(store.alivePlayers()).toEqual([]);
    expect(store.roundsLeftBeforeVote()).toBe(0);
  });

  it('ván kết thúc thì tự ghi vào bảng điểm', async () => {
    // Đội hình 4 người, 1 gián điệp, không mũ trắng, vote mở ngay từ vòng 1.
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: {
        ...DEFAULT_GAME_CONFIG,
        spyCount: 1,
        hasWhite: false,
        minRoundsBeforeVote: 1,
      },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await store.revealNext();
    }
    for (let i = 0; i < NAMES.length; i++) {
      await store.nextSpeaker();
    }

    // Loại đúng gián điệp: hết gián điệp, không có mũ trắng, dân làng thắng.
    const state = store.state()!;
    const spyId = state.aliveIds.find((id) => state.assignments[id].role === 'SPY')!;
    await store.vote({ [spyId]: 3 });
    await store.afterReveal();

    expect(store.state()?.phase).toBe('ENDED');
    expect(store.state()?.outcome).toBe('CIVILIANS');

    const board = await TestBed.inject(ScoreboardRepository).load();
    expect(board.history).toHaveLength(1);
    expect(board.history[0].gameId).toBe(state.id);
    // Ba dân làng mỗi người 1 điểm, gián điệp 0.
    expect(Object.values(board.totals).filter((point) => point === 1)).toHaveLength(3);
  });

  it('hai ván mở trong cùng một mili giây vẫn có id khác nhau', async () => {
    // Bảng điểm bỏ qua ván đã ghi dựa theo id. Nên hai ván trùng id nghĩa là
    // ván thứ hai mất sạch điểm mà không có lỗi nào báo ra — đúng kiểu hỏng
    // âm thầm khó lần nhất. Bấm "Chơi ván nữa" là đi thẳng vào đường này.
    const frozen = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    try {
      const input = {
        villageName: 'Ác Quỷ',
        playerNames: NAMES,
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      };

      await store.startNew(input);
      const first = store.state()!.id;
      await store.startNew(input);
      const second = store.state()!.id;

      expect(second).not.toBe(first);
    } finally {
      frozen.mockRestore();
    }
  });

  it('ván đã kết thúc thì không còn là ván đang dở, và điểm không cộng thêm', async () => {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: {
        ...DEFAULT_GAME_CONFIG,
        spyCount: 1,
        hasWhite: false,
        minRoundsBeforeVote: 1,
      },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await store.revealNext();
    }
    for (let i = 0; i < NAMES.length; i++) {
      await store.nextSpeaker();
    }
    const state = store.state()!;
    const spyId = state.aliveIds.find((id) => state.assignments[id].role === 'SPY')!;
    await store.vote({ [spyId]: 3 });
    await store.afterReveal();

    const before = await TestBed.inject(ScoreboardRepository).load();

    // Người chơi tắt app ở màn kết ván rồi mở lại.
    store.clearInMemory();
    await store.resume();

    // Kho ván đang dở cố ý bỏ qua ván đã kết thúc, nên mở lại app sau khi
    // chơi xong là về trang chủ chứ không quay lại màn kết ván. Kết quả ván
    // đã nằm vĩnh viễn trong bảng điểm rồi.
    expect(store.hasGame()).toBe(false);

    const after = await TestBed.inject(ScoreboardRepository).load();
    expect(after.totals).toEqual(before.totals);
    expect(after.history).toHaveLength(1);
  });
});
