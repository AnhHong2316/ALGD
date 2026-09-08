/**
 * Cổng lưu trữ khoá-giá trị dạng chuỗi. Cố tình nhỏ hết mức: mọi thứ phức
 * tạp hơn nằm ở tầng trên, còn tầng này chỉ để đổi giữa bộ nhớ tạm khi test
 * và Capacitor Preferences khi chạy thật.
 *
 * Bất đồng bộ vì Preferences bất đồng bộ. Bản trong bộ nhớ cũng phải bất
 * đồng bộ theo, nếu không test sẽ chạy đúng ở chỗ mà máy thật chạy sai.
 */
export interface StoragePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
