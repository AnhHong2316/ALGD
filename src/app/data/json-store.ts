import { StoragePort } from './storage/storage-port';

/**
 * Đọc ghi một giá trị có kiểu dưới dạng JSON, qua một StoragePort.
 *
 * Nguyên tắc: đọc KHÔNG BAO GIỜ được ném lỗi. Ván đang dở được ghi lại sau
 * mỗi thay đổi state, nên nếu app bị đóng giữa lúc ghi thì khoá đó sẽ chứa
 * JSON cụt. Nếu lần đọc sau ném lỗi thì app không mở lên được nữa, và người
 * dùng không có cách nào tự sửa ngoài gỡ cài đặt. Thà mất một ván đang dở
 * còn hơn hỏng cả app.
 *
 * `isValid` bảo vệ chống một chuyện âm thầm hơn: JSON hợp lệ nhưng sai hình
 * dạng, chẳng hạn khi cấu trúc dữ liệu đổi giữa hai phiên bản app.
 */
export class JsonStore<T> {
  constructor(
    private readonly storage: StoragePort,
    private readonly key: string,
    private readonly isValid: (value: unknown) => value is T,
    private readonly makeDefault: () => T,
  ) {}

  async read(): Promise<T> {
    const raw = await this.storage.get(this.key);
    if (raw === null) return this.makeDefault();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      await this.storage.remove(this.key);
      return this.makeDefault();
    }

    if (!this.isValid(parsed)) {
      await this.storage.remove(this.key);
      return this.makeDefault();
    }

    return parsed;
  }

  async write(value: T): Promise<void> {
    await this.storage.set(this.key, JSON.stringify(value));
  }

  async clear(): Promise<void> {
    await this.storage.remove(this.key);
  }
}
