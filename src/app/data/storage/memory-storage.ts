import { StoragePort } from './storage-port';

/** Bản cài dùng cho test. Không có gì bền vững, mỗi thể hiện một bản đồ riêng. */
export class MemoryStorage implements StoragePort {
  private readonly entries = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.entries.has(key) ? this.entries.get(key)! : null;
  }

  async set(key: string, value: string): Promise<void> {
    this.entries.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.entries.delete(key);
  }
}
