import { beforeEach, describe, expect, it } from 'vitest';
import { JsonStore } from './json-store';
import { MemoryStorage } from './storage/memory-storage';

interface Profile {
  name: string;
  age: number;
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate['name'] === 'string' && typeof candidate['age'] === 'number';
}

describe('JsonStore', () => {
  let storage: MemoryStorage;
  let store: JsonStore<Profile>;

  beforeEach(() => {
    storage = new MemoryStorage();
    store = new JsonStore(storage, 'profile', isProfile, () => ({
      name: 'chưa đặt',
      age: 0,
    }));
  });

  it('chưa ghi gì thì đọc ra giá trị mặc định', async () => {
    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });
  });

  it('ghi rồi đọc lại đúng giá trị', async () => {
    await store.write({ name: 'Minh', age: 30 });
    expect(await store.read()).toEqual({ name: 'Minh', age: 30 });
  });

  it('giữ nguyên dấu tiếng Việt qua một vòng ghi đọc', async () => {
    await store.write({ name: 'Nguyễn Đình Khoa', age: 7 });
    expect((await store.read()).name).toBe('Nguyễn Đình Khoa');
  });

  it('JSON hỏng thì rơi về mặc định thay vì ném lỗi', async () => {
    await storage.set('profile', '{"name": "Minh", "age":');

    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });
  });

  it('JSON hợp lệ nhưng sai hình dạng thì cũng rơi về mặc định', async () => {
    await storage.set('profile', '{"name": "Minh"}');

    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });
  });

  it('JSON là mảng hoặc số thì cũng rơi về mặc định', async () => {
    await storage.set('profile', '[1,2,3]');
    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });

    await storage.set('profile', '42');
    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });
  });

  it('dữ liệu hỏng được dọn đi để lần đọc sau không phải phân tích lại', async () => {
    await storage.set('profile', 'khong-phai-json');
    await store.read();

    expect(await storage.get('profile')).toBeNull();
  });

  it('mỗi lần đọc mặc định cho ra một đối tượng riêng', async () => {
    const first = await store.read();
    first.name = 'bị sửa';

    expect((await store.read()).name).toBe('chưa đặt');
  });

  it('clear đưa về lại mặc định', async () => {
    await store.write({ name: 'Minh', age: 30 });
    await store.clear();

    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });
  });
});
