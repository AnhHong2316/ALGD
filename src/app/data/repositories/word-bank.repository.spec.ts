import { beforeEach, describe, expect, it } from 'vitest';
import { WordPair } from '../../core/models';
import { PACKAGED_PAIRS } from '../word-bank';
import { MemoryStorage } from '../storage/memory-storage';
import { WordBankRepository } from './word-bank.repository';

function customPair(id: string, wordA: string, wordB: string): WordPair {
  return {
    id,
    wordA,
    wordB,
    topic: 'Động vật',
    difficulty: 'EASY',
    isCustom: true,
    hidden: false,
  };
}

describe('WordBankRepository', () => {
  let storage: MemoryStorage;
  let repository: WordBankRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new WordBankRepository(storage);
  });

  it('lần đầu chạy thì danh sách khả dụng đúng bằng kho đóng gói', async () => {
    const available = await repository.loadAvailablePairs();

    expect(available).toHaveLength(PACKAGED_PAIRS.length);
    expect(available.every((pair) => !pair.isCustom)).toBe(true);
    expect(available.every((pair) => !pair.hidden)).toBe(true);
  });

  it('cặp tự thêm xuất hiện trong danh sách khả dụng', async () => {
    await repository.addCustomPair(customPair('tu-1', 'xe tăng', 'máy bay ném bom'));

    const available = await repository.loadAvailablePairs();
    expect(available.some((pair) => pair.id === 'tu-1')).toBe(true);
    expect(available).toHaveLength(PACKAGED_PAIRS.length + 1);
  });

  it('từ chối cặp tự thêm có hai từ quá giống nhau', async () => {
    await expect(
      repository.addCustomPair(customPair('tu-2', 'con bò', 'con bó')),
    ).rejects.toThrow(/quá giống nhau/);

    expect(await repository.loadCustomPairs()).toEqual([]);
  });

  it('từ chối cặp tự thêm trùng id với cặp đã có', async () => {
    await repository.addCustomPair(customPair('tu-3', 'cái ô', 'áo mưa'));

    await expect(
      repository.addCustomPair(customPair('tu-3', 'con dao', 'cái kéo')),
    ).rejects.toThrow(/đã tồn tại/);
  });

  it('xoá được cặp tự thêm', async () => {
    await repository.addCustomPair(customPair('tu-4', 'cái ô', 'áo mưa'));
    await repository.removeCustomPair('tu-4');

    expect(await repository.loadCustomPairs()).toEqual([]);
  });

  it('ẩn cặp gốc thì nó biến khỏi danh sách khả dụng', async () => {
    const target = PACKAGED_PAIRS[0].id;
    await repository.hidePair(target);

    const available = await repository.loadAvailablePairs();
    expect(available.some((pair) => pair.id === target)).toBe(false);
    expect(available).toHaveLength(PACKAGED_PAIRS.length - 1);
  });

  it('hiện lại cặp gốc đã ẩn', async () => {
    const target = PACKAGED_PAIRS[0].id;
    await repository.hidePair(target);
    await repository.unhidePair(target);

    const available = await repository.loadAvailablePairs();
    expect(available.some((pair) => pair.id === target)).toBe(true);
  });

  it('ẩn cùng một cặp hai lần không tạo bản ghi trùng', async () => {
    const target = PACKAGED_PAIRS[0].id;
    await repository.hidePair(target);
    await repository.hidePair(target);

    expect(await repository.loadHiddenIds()).toEqual([target]);
  });

  it('lưu và đọc lại lịch sử cặp đã dùng', async () => {
    await repository.saveUsedPairIds(['a', 'b']);

    expect(await repository.loadUsedPairIds()).toEqual(['a', 'b']);
  });

  it('lịch sử hỏng thì coi như chưa dùng cặp nào', async () => {
    await storage.set('usedPairIds', '{"khong":"phai-mang"}');

    expect(await repository.loadUsedPairIds()).toEqual([]);
  });

  it('danh sách cặp tự thêm hỏng thì bỏ qua, kho gốc vẫn dùng được', async () => {
    await storage.set('customPairs', 'hong');

    const available = await repository.loadAvailablePairs();
    expect(available).toHaveLength(PACKAGED_PAIRS.length);
  });
});
