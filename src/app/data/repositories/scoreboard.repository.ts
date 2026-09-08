import { Outcome } from '../../core/models';
import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';
import { Inject, Injectable } from '@angular/core';
import { STORAGE_PORT } from '../storage/storage.token';

export interface GameRecord {
  villageName: string;
  /** Chuỗi ISO. Truyền vào từ ngoài để tầng này vẫn thuần. */
  playedAt: string;
  outcome: Outcome;
  /** Điểm cộng của ván này, khoá là tên người chơi. */
  points: Record<string, number>;
}

export interface Scoreboard {
  /** Điểm tích luỹ, khoá là tên người chơi. */
  totals: Record<string, number>;
  history: GameRecord[];
}

function emptyScoreboard(): Scoreboard {
  return { totals: {}, history: [] };
}

function isScoreboard(value: unknown): value is Scoreboard {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;

  const totals = candidate['totals'];
  const history = candidate['history'];

  if (typeof totals !== 'object' || totals === null || Array.isArray(totals)) return false;
  if (!Object.values(totals).every((point) => typeof point === 'number')) return false;

  return Array.isArray(history);
}

/**
 * Điểm được khoá theo TÊN người chơi chứ không phải id, vì id chỉ sống trong
 * một ván còn bảng điểm phải cộng dồn qua nhiều ván. Hệ quả: đổi tên là mất
 * điểm cũ, chấp nhận được cho một app chơi tại chỗ.
 */
@Injectable()
export class ScoreboardRepository {
  private readonly store: JsonStore<Scoreboard>;

  constructor(@Inject(STORAGE_PORT) storage: StoragePort) {
    this.store = new JsonStore(storage, 'scoreboard', isScoreboard, emptyScoreboard);
  }

  load(): Promise<Scoreboard> {
    return this.store.read();
  }

  async recordGame(record: GameRecord): Promise<void> {
    const board = await this.load();

    const totals = { ...board.totals };
    for (const [name, points] of Object.entries(record.points)) {
      totals[name] = (totals[name] ?? 0) + points;
    }

    await this.store.write({ totals, history: [...board.history, record] });
  }

  clear(): Promise<void> {
    return this.store.clear();
  }
}
