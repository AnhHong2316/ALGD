import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../core/models';
import { createSeededRng } from '../core/engine/rng';
import { WordBankRepository } from './repositories/word-bank.repository';
import { startNewGame } from './start-new-game';
import { MemoryStorage } from './storage/memory-storage';

describe('startNewGame', () => {
  let storage: MemoryStorage;
  let wordBank: WordBankRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    wordBank = new WordBankRepository(storage);
  });

  const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

  it('dựng được một ván đầy đủ với cặp từ thật', async () => {
    const { result } = await startNewGame({
      wordBank,
      gameId: 'g1',
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      rng: createSeededRng(1),
    });

    expect(result.state.phase).toBe('DEALING');
    expect(result.state.players).toHaveLength(4);
    expect(result.state.civilianWord.length).toBeGreaterThan(0);
    expect(result.state.spyWord.length).toBeGreaterThan(0);
    expect(result.state.civilianWord).not.toBe(result.state.spyWord);
    expect(result.state.villageName).toBe('Ác Quỷ');
  });

  it('sinh id người chơi duy nhất và giữ nguyên tên', async () => {
    const { result } = await startNewGame({
      wordBank,
      gameId: 'g1',
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      rng: createSeededRng(1),
    });

    const ids = result.state.players.map((player) => player.id);
    expect(new Set(ids).size).toBe(4);
    expect(result.state.players.map((player) => player.name)).toEqual(NAMES);
  });

  it('khử trùng tên bằng hậu tố', async () => {
    const { result } = await startNewGame({
      wordBank,
      gameId: 'g1',
      villageName: '',
      playerNames: ['Minh', 'Minh', 'Lan', 'Minh'],
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      rng: createSeededRng(1),
    });

    expect(result.state.players.map((player) => player.name)).toEqual([
      'Minh',
      'Minh 2',
      'Lan',
      'Minh 3',
    ]);
  });

  it('ghi lại lịch sử cặp đã dùng để ván sau không lặp', async () => {
    const first = await startNewGame({
      wordBank,
      gameId: 'g1',
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      rng: createSeededRng(1),
    });

    expect(await wordBank.loadUsedPairIds()).toEqual([first.result.state.pairId]);
  });

  it('hai ván liên tiếp không dùng lại cùng một cặp', async () => {
    const seen = new Set<string>();

    for (let round = 0; round < 5; round++) {
      const { result } = await startNewGame({
        wordBank,
        gameId: `g${round}`,
        villageName: '',
        playerNames: NAMES,
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
        rng: createSeededRng(round + 1),
      });
      expect(seen.has(result.state.pairId)).toBe(false);
      seen.add(result.state.pairId);
    }
  });

  it('đội hình không hợp lệ thì báo lỗi và KHÔNG ghi lịch sử cặp từ', async () => {
    await expect(
      startNewGame({
        wordBank,
        gameId: 'g1',
        villageName: '',
        playerNames: ['Minh', 'Hùng', 'Lan'],
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
        rng: createSeededRng(1),
      }),
    ).rejects.toThrow(/ít nhất 4 người/);

    expect(await wordBank.loadUsedPairIds()).toEqual([]);
  });

  it('bộ lọc không còn cặp nào thì báo lỗi rõ ràng', async () => {
    await expect(
      startNewGame({
        wordBank,
        gameId: 'g1',
        villageName: '',
        playerNames: NAMES,
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, topics: ['Không Có Thật'] },
        rng: createSeededRng(1),
      }),
    ).rejects.toThrow(/không còn cặp từ nào/);
  });
});
