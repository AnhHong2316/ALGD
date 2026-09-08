import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';
import { Inject, Injectable } from '@angular/core';
import { STORAGE_PORT } from '../storage/storage.token';

function isNameList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Danh sách tên người chơi hay dùng, để lần sau khỏi gõ lại.
 * Chỉ lưu tên: id người chơi được sinh mới ở mỗi ván.
 */
@Injectable()
export class PlayersRepository {
  private readonly store: JsonStore<string[]>;

  constructor(@Inject(STORAGE_PORT) storage: StoragePort) {
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
