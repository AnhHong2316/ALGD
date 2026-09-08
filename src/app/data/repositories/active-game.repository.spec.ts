import { beforeEach, describe, expect, it } from 'vitest';
import { makeState } from '../../core/engine/testing/make-state';
import { MemoryStorage } from '../storage/memory-storage';
import { ActiveGameRepository } from './active-game.repository';

describe('ActiveGameRepository', () => {
  let storage: MemoryStorage;
  let repository: ActiveGameRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new ActiveGameRepository(storage);
  });

  it('chưa có ván nào thì trả về null', async () => {
    expect(await repository.load()).toBeNull();
  });

  it('lưu rồi khôi phục lại được nguyên vẹn', async () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 1, 3],
      round: 4,
      villageName: 'Ác Quỷ',
    });

    await repository.save(state);
    const restored = await repository.load();

    expect(restored).toEqual(state);
  });

  it('ván đã kết thúc thì không được coi là ván đang dở', async () => {
    const state = {
      ...makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'SPY'] }),
      phase: 'ENDED' as const,
      outcome: 'CIVILIANS' as const,
    };

    await repository.save(state);

    expect(await repository.load()).toBeNull();
  });

  it('xoá thì không còn ván đang dở', async () => {
    await repository.save(makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'SPY'] }));
    await repository.clear();

    expect(await repository.load()).toBeNull();
  });

  it('state ghi dở dang thì bỏ qua, không làm sập app', async () => {
    await storage.set('activeGame', '{"id":"g1","phase":');

    expect(await repository.load()).toBeNull();
  });

  it('state thiếu trường bắt buộc cũng bị bỏ qua', async () => {
    await storage.set('activeGame', '{"id":"g1"}');

    expect(await repository.load()).toBeNull();
  });
});
