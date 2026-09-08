import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from '../storage/memory-storage';
import { PlayersRepository } from './players.repository';

describe('PlayersRepository', () => {
  let storage: MemoryStorage;
  let repository: PlayersRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new PlayersRepository(storage);
  });

  it('lần đầu chạy thì danh sách rỗng', async () => {
    expect(await repository.load()).toEqual([]);
  });

  it('lưu rồi đọc lại đúng danh sách', async () => {
    await repository.save(['Minh', 'Hùng', 'Lan']);

    expect(await repository.load()).toEqual(['Minh', 'Hùng', 'Lan']);
  });

  it('giữ nguyên dấu tiếng Việt', async () => {
    await repository.save(['Nguyễn Đức Mạnh', 'Đỗ Thị Hường']);

    expect(await repository.load()).toEqual(['Nguyễn Đức Mạnh', 'Đỗ Thị Hường']);
  });

  it('dữ liệu hỏng thì trả về danh sách rỗng', async () => {
    await storage.set('players', 'khong-phai-json');

    expect(await repository.load()).toEqual([]);
  });

  it('mảng chứa thứ không phải chuỗi cũng bị coi là hỏng', async () => {
    await storage.set('players', '["Minh", 42]');

    expect(await repository.load()).toEqual([]);
  });

  it('xoá thì về lại rỗng', async () => {
    await repository.save(['Minh']);
    await repository.clear();

    expect(await repository.load()).toEqual([]);
  });
});
