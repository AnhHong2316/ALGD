import { Preferences } from '@capacitor/preferences';
import { StoragePort } from './storage-port';

/**
 * Bản cài dùng trên máy thật. Trên web, plugin tự lùi về localStorage nên
 * chạy được cả khi mở bằng trình duyệt lúc phát triển.
 *
 * Không có test đơn vị: file này chỉ chuyển tiếp lời gọi, còn mọi luật đều
 * nằm ở JsonStore và các repository phía trên, vốn được test qua MemoryStorage.
 */
export class PreferencesStorage implements StoragePort {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }

  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
