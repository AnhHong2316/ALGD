import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';

function isNameList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Danh sách tên người chơi hay dùng, để lần sau khỏi gõ lại.
 * Chỉ lưu tên: id người chơi được sinh mới ở mỗi ván.
 */
export class PlayersRepository {
  private readonly store: JsonStore<string[]>;

  constructor(storage: StoragePort) {
    this.store = new JsonStore(storage, 'players', isNameList, () => []);
  }

  load(): Promise<string[]> {
    return this.store.read();
  }

  save(names: string[]): Promise<void> {
    return this.store.write(names);
  }

  clear(): Promise<void> {
    return this.store.clear();
  }
}
