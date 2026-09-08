import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from '../storage/memory-storage';
import { ScoreboardRepository } from './scoreboard.repository';

describe('ScoreboardRepository', () => {
  let storage: MemoryStorage;
  let repository: ScoreboardRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new ScoreboardRepository(storage);
  });

  it('lần đầu chạy thì bảng điểm rỗng', async () => {
    const board = await repository.load();

    expect(board.totals).toEqual({});
    expect(board.history).toEqual([]);
  });

  it('cộng điểm cho người mới', async () => {
    await repository.recordGame({
      gameId: 'g-1',
      villageName: 'Ác Quỷ',
      playedAt: '2026-09-08T10:00:00.000Z',
      outcome: 'CIVILIANS',
      points: { Minh: 1, Hùng: 0 },
    });

    const board = await repository.load();
    expect(board.totals).toEqual({ Minh: 1, Hùng: 0 });
    expect(board.history).toHaveLength(1);
    expect(board.history[0].villageName).toBe('Ác Quỷ');
  });

  it('cộng dồn qua nhiều ván', async () => {
    await repository.recordGame({
      gameId: 'g-1',
      villageName: 'Ác Quỷ',
      playedAt: '2026-09-08T10:00:00.000Z',
      outcome: 'CIVILIANS',
      points: { Minh: 1 },
    });
    await repository.recordGame({
      gameId: 'g-2',
      villageName: 'Vô Tội',
      playedAt: '2026-09-08T11:00:00.000Z',
      outcome: 'SPIES',
      points: { Minh: 2 },
    });

    const board = await repository.load();
    expect(board.totals['Minh']).toBe(3);
    expect(board.history).toHaveLength(2);
  });

  it('xoá sạch bảng điểm', async () => {
    await repository.recordGame({
      gameId: 'g-1',
      villageName: 'Ác Quỷ',
      playedAt: '2026-09-08T10:00:00.000Z',
      outcome: 'CIVILIANS',
      points: { Minh: 1 },
    });
    await repository.clear();

    const board = await repository.load();
    expect(board.totals).toEqual({});
    expect(board.history).toEqual([]);
  });

  it('dữ liệu hỏng thì bắt đầu lại từ bảng rỗng', async () => {
    await storage.set('scoreboard', '[1,2,3]');

    expect((await repository.load()).totals).toEqual({});
  });

  it('ghi lại cùng một ván nhiều lần chỉ tính điểm một lần', async () => {
    const record = {
      gameId: 'g-1',
      villageName: 'Ác Quỷ',
      playedAt: '2026-09-08T10:00:00.000Z',
      outcome: 'CIVILIANS' as const,
      points: { Minh: 1 },
    };

    await repository.recordGame(record);
    // Mở lại app ở màn kết ván thì đoạn ghi chạy lại. Không được cộng nữa.
    await repository.recordGame(record);

    const board = await repository.load();
    expect(board.totals['Minh']).toBe(1);
    expect(board.history).toHaveLength(1);
  });

  it('bản ghi cũ chưa có gameId thì không chặn ván mới', async () => {
    // Bảng điểm đã lưu từ phiên bản trước, các bản ghi không có gameId.
    await storage.set(
      'scoreboard',
      JSON.stringify({
        totals: { Minh: 5 },
        history: [
          {
            villageName: 'Làng Cũ',
            playedAt: '2026-09-01T10:00:00.000Z',
            outcome: 'SPIES',
            points: { Minh: 5 },
          },
        ],
      }),
    );

    await repository.recordGame({
      gameId: 'g-9',
      villageName: 'Ác Quỷ',
      playedAt: '2026-09-08T10:00:00.000Z',
      outcome: 'CIVILIANS',
      points: { Minh: 1 },
    });

    const board = await repository.load();
    expect(board.totals['Minh']).toBe(6);
    expect(board.history).toHaveLength(2);
  });
});
