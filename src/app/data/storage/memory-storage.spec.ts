import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from './memory-storage';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('khoá chưa từng ghi thì trả về null', async () => {
    expect(await storage.get('chua-co')).toBeNull();
  });

  it('ghi rồi đọc lại được đúng giá trị', async () => {
    await storage.set('ten', 'Minh');
    expect(await storage.get('ten')).toBe('Minh');
  });

  it('ghi đè lên giá trị cũ', async () => {
    await storage.set('ten', 'Minh');
    await storage.set('ten', 'Hùng');
    expect(await storage.get('ten')).toBe('Hùng');
  });

  it('xoá rồi thì đọc lại ra null', async () => {
    await storage.set('ten', 'Minh');
    await storage.remove('ten');
    expect(await storage.get('ten')).toBeNull();
  });

  it('xoá khoá không tồn tại thì không báo lỗi', async () => {
    await expect(storage.remove('chua-co')).resolves.toBeUndefined();
  });

  it('giữ được chuỗi rỗng, phân biệt với chưa từng ghi', async () => {
    await storage.set('rong', '');
    expect(await storage.get('rong')).toBe('');
  });

  it('các khoá độc lập với nhau', async () => {
    await storage.set('a', '1');
    await storage.set('b', '2');
    await storage.remove('a');

    expect(await storage.get('a')).toBeNull();
    expect(await storage.get('b')).toBe('2');
  });
});
