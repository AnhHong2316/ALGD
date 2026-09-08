import { describe, expect, it } from 'vitest';
import { WordPair } from '../core/models';
import { createSeededRng } from '../core/engine/rng';
import { pickPair } from './pair-picker';

function pair(id: string, overrides: Partial<WordPair> = {}): WordPair {
  return {
    id,
    wordA: `${id}-a`,
    wordB: `${id}-b`,
    topic: 'Động vật',
    difficulty: 'EASY',
    isCustom: false,
    hidden: false,
    ...overrides,
  };
}

const THREE = [pair('p1'), pair('p2'), pair('p3')];

describe('pickPair', () => {
  it('bốc được một cặp từ kho', () => {
    const picked = pickPair({
      pairs: THREE,
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: [],
      rng: createSeededRng(1),
    });

    expect(['p1', 'p2', 'p3']).toContain(picked.pairId);
    expect([picked.civilianWord, picked.spyWord].sort()).toEqual(
      [`${picked.pairId}-a`, `${picked.pairId}-b`].sort(),
    );
  });

  it('bỏ qua cặp đã ẩn', () => {
    const picked = pickPair({
      pairs: [pair('p1', { hidden: true }), pair('p2')],
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: [],
      rng: createSeededRng(1),
    });

    expect(picked.pairId).toBe('p2');
  });

  it('lọc theo chủ đề', () => {
    const picked = pickPair({
      pairs: [pair('p1'), pair('p2', { topic: 'Thể thao' })],
      topics: ['Thể thao'],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: [],
      rng: createSeededRng(1),
    });

    expect(picked.pairId).toBe('p2');
  });

  it('danh sách chủ đề rỗng nghĩa là lấy tất cả', () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      ids.add(
        pickPair({
          pairs: [pair('p1'), pair('p2', { topic: 'Thể thao' })],
          topics: [],
          difficulties: ['EASY', 'MEDIUM', 'HARD'],
          usedPairIds: [],
          rng: createSeededRng(seed),
        }).pairId,
      );
    }

    expect(ids).toEqual(new Set(['p1', 'p2']));
  });

  it('lọc theo độ khó', () => {
    const picked = pickPair({
      pairs: [pair('p1'), pair('p2', { difficulty: 'HARD' })],
      topics: [],
      difficulties: ['HARD'],
      usedPairIds: [],
      rng: createSeededRng(1),
    });

    expect(picked.pairId).toBe('p2');
  });

  it('ưu tiên cặp chưa dùng', () => {
    const picked = pickPair({
      pairs: THREE,
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: ['p1', 'p2'],
      rng: createSeededRng(1),
    });

    expect(picked.pairId).toBe('p3');
  });

  it('ghi cặp vừa bốc vào lịch sử', () => {
    const picked = pickPair({
      pairs: THREE,
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: ['p1'],
      rng: createSeededRng(1),
    });

    expect(picked.usedPairIds).toContain('p1');
    expect(picked.usedPairIds).toContain(picked.pairId);
  });

  it('dùng hết kho thì xoá lịch sử và bắt đầu vòng mới', () => {
    const picked = pickPair({
      pairs: THREE,
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: ['p1', 'p2', 'p3'],
      rng: createSeededRng(1),
    });

    expect(['p1', 'p2', 'p3']).toContain(picked.pairId);
    // Lịch sử được làm mới, chỉ còn đúng cặp vừa bốc.
    expect(picked.usedPairIds).toEqual([picked.pairId]);
  });

  it('lịch sử chỉ giữ cặp còn hợp lệ, không phình vô hạn', () => {
    const picked = pickPair({
      pairs: THREE,
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: ['p1', 'da-999-khong-con-ton-tai'],
      rng: createSeededRng(1),
    });

    expect(picked.usedPairIds).not.toContain('da-999-khong-con-ton-tai');
  });

  it('quét hết kho thì mỗi cặp ra đúng một lần trước khi lặp lại', () => {
    let used: string[] = [];
    const seen: string[] = [];

    for (let round = 0; round < 3; round++) {
      const picked = pickPair({
        pairs: THREE,
        topics: [],
        difficulties: ['EASY', 'MEDIUM', 'HARD'],
        usedPairIds: used,
        rng: createSeededRng(round + 1),
      });
      seen.push(picked.pairId);
      used = picked.usedPairIds;
    }

    expect([...seen].sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('hoán đổi vai hai từ giữa các ván', () => {
    const civilianWords = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      civilianWords.add(
        pickPair({
          pairs: [pair('p1')],
          topics: [],
          difficulties: ['EASY', 'MEDIUM', 'HARD'],
          usedPairIds: [],
          rng: createSeededRng(seed),
        }).civilianWord,
      );
    }

    expect(civilianWords).toEqual(new Set(['p1-a', 'p1-b']));
  });

  it('báo lỗi rõ ràng khi bộ lọc không còn cặp nào', () => {
    expect(() =>
      pickPair({
        pairs: THREE,
        topics: ['Giao thông'],
        difficulties: ['EASY', 'MEDIUM', 'HARD'],
        usedPairIds: [],
        rng: createSeededRng(1),
      }),
    ).toThrow(/không còn cặp từ nào/);
  });

  it('báo lỗi khi kho rỗng hoàn toàn', () => {
    expect(() =>
      pickPair({
        pairs: [],
        topics: [],
        difficulties: ['EASY', 'MEDIUM', 'HARD'],
        usedPairIds: [],
        rng: createSeededRng(1),
      }),
    ).toThrow(/không còn cặp từ nào/);
  });
});
