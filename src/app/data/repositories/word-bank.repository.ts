import { describePairProblem } from '../../core/engine/pair-distance';
import { WordPair } from '../../core/models';
import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';
import { PACKAGED_PAIRS, toWordPair } from '../word-bank';

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isWordPair(value: unknown): value is WordPair {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['id'] === 'string' &&
    typeof candidate['wordA'] === 'string' &&
    typeof candidate['wordB'] === 'string' &&
    typeof candidate['topic'] === 'string' &&
    typeof candidate['difficulty'] === 'string' &&
    typeof candidate['isCustom'] === 'boolean' &&
    typeof candidate['hidden'] === 'boolean'
  );
}

function isWordPairList(value: unknown): value is WordPair[] {
  return Array.isArray(value) && value.every(isWordPair);
}

/**
 * Gom ba mẩu dữ liệu quanh kho từ: cặp người dùng tự thêm, id các cặp gốc bị
 * ẩn, và lịch sử cặp đã dùng. Chúng luôn được đọc cùng nhau khi dựng danh
 * sách cặp khả dụng, nên để chung một chỗ.
 *
 * Cặp gốc chỉ được ẩn chứ không xoá, để người dùng lỡ tay còn hiện lại được.
 * Cặp tự thêm thì xoá thật.
 */
export class WordBankRepository {
  private readonly customPairs: JsonStore<WordPair[]>;
  private readonly hiddenIds: JsonStore<string[]>;
  private readonly usedPairIds: JsonStore<string[]>;

  constructor(storage: StoragePort) {
    this.customPairs = new JsonStore(storage, 'customPairs', isWordPairList, () => []);
    this.hiddenIds = new JsonStore(storage, 'hiddenPairIds', isStringList, () => []);
    this.usedPairIds = new JsonStore(storage, 'usedPairIds', isStringList, () => []);
  }

  loadCustomPairs(): Promise<WordPair[]> {
    return this.customPairs.read();
  }

  loadHiddenIds(): Promise<string[]> {
    return this.hiddenIds.read();
  }

  loadUsedPairIds(): Promise<string[]> {
    return this.usedPairIds.read();
  }

  saveUsedPairIds(ids: string[]): Promise<void> {
    return this.usedPairIds.write(ids);
  }

  /** Kho gốc cộng cặp tự thêm, đã bỏ đi những cặp bị ẩn. */
  async loadAvailablePairs(): Promise<WordPair[]> {
    const [custom, hidden] = await Promise.all([
      this.loadCustomPairs(),
      this.loadHiddenIds(),
    ]);

    const hiddenSet = new Set(hidden);
    return [...PACKAGED_PAIRS.map(toWordPair), ...custom].filter(
      (pair) => !hiddenSet.has(pair.id),
    );
  }

  async addCustomPair(pair: WordPair): Promise<void> {
    const problem = describePairProblem(pair.wordA, pair.wordB);
    if (problem !== null) throw new Error(problem);

    const existing = await this.loadCustomPairs();
    const takenByPackaged = PACKAGED_PAIRS.some((item) => item.id === pair.id);
    if (takenByPackaged || existing.some((item) => item.id === pair.id)) {
      throw new Error(`Cặp từ có mã "${pair.id}" đã tồn tại.`);
    }

    await this.customPairs.write([...existing, { ...pair, isCustom: true }]);
  }

  async removeCustomPair(id: string): Promise<void> {
    const existing = await this.loadCustomPairs();
    await this.customPairs.write(existing.filter((pair) => pair.id !== id));
  }

  async hidePair(id: string): Promise<void> {
    const hidden = await this.loadHiddenIds();
    if (hidden.includes(id)) return;
    await this.hiddenIds.write([...hidden, id]);
  }

  async unhidePair(id: string): Promise<void> {
    const hidden = await this.loadHiddenIds();
    await this.hiddenIds.write(hidden.filter((item) => item !== id));
  }
}
