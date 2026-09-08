import { GameState } from '../../core/models';
import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';

function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate['id'] === 'string' &&
    typeof candidate['villageName'] === 'string' &&
    typeof candidate['civilianWord'] === 'string' &&
    typeof candidate['spyWord'] === 'string' &&
    typeof candidate['phase'] === 'string' &&
    typeof candidate['round'] === 'number' &&
    typeof candidate['dealtCount'] === 'number' &&
    Array.isArray(candidate['players']) &&
    Array.isArray(candidate['aliveIds']) &&
    Array.isArray(candidate['speakingOrder']) &&
    Array.isArray(candidate['eliminations']) &&
    typeof candidate['assignments'] === 'object' &&
    candidate['assignments'] !== null
  );
}

/**
 * Ván đang dở, để mở lại app còn chơi tiếp.
 *
 * `load` trả về null cho cả ba trường hợp: chưa từng lưu, dữ liệu hỏng, và
 * ván đã kết thúc. Người gọi chỉ cần hỏi một câu "có ván nào để tiếp không".
 */
export class ActiveGameRepository {
  private readonly store: JsonStore<GameState | null>;

  constructor(storage: StoragePort) {
    this.store = new JsonStore<GameState | null>(
      storage,
      'activeGame',
      (value): value is GameState | null => value === null || isGameState(value),
      () => null,
    );
  }

  async load(): Promise<GameState | null> {
    const state = await this.store.read();
    if (state === null) return null;
    return state.phase === 'ENDED' ? null : state;
  }

  save(state: GameState): Promise<void> {
    return this.store.write(state);
  }

  clear(): Promise<void> {
    return this.store.clear();
  }
}
