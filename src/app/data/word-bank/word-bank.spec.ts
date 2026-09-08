import { describe, expect, it } from 'vitest';
import { describePairProblem } from '../../core/engine/pair-distance';
import { normalizeVi } from '../../core/engine/guess-matcher';
import { PACKAGED_PAIRS, toWordPair } from './index';
import { TOPICS } from './types';

describe('kho từ đóng gói sẵn', () => {
  it('không rỗng', () => {
    expect(PACKAGED_PAIRS.length).toBeGreaterThan(0);
  });

  it('mọi id đều duy nhất', () => {
    const ids = PACKAGED_PAIRS.map((pair) => pair.id);
    const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicated).toEqual([]);
  });

  it('mọi chủ đề đều nằm trong danh sách chính thức', () => {
    for (const pair of PACKAGED_PAIRS) {
      expect(TOPICS).toContain(pair.topic);
    }
  });

  it('không có từ nào rỗng hoặc thừa khoảng trắng ở hai đầu', () => {
    for (const pair of PACKAGED_PAIRS) {
      expect(pair.wordA).toBe(pair.wordA.trim());
      expect(pair.wordB).toBe(pair.wordB.trim());
      expect(pair.wordA.length).toBeGreaterThan(0);
      expect(pair.wordB.length).toBeGreaterThan(0);
    }
  });

  it('hai từ trong mỗi cặp đủ xa nhau để hàm chấm phân biệt được', () => {
    const problems = PACKAGED_PAIRS.map((pair) => ({
      id: pair.id,
      problem: describePairProblem(pair.wordA, pair.wordB),
    })).filter((entry) => entry.problem !== null);

    // In ra id cụ thể để người sửa biết phải đổi cặp nào.
    expect(problems).toEqual([]);
  });

  it('không có hai cặp nào trùng nội dung sau khi chuẩn hoá', () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];

    for (const pair of PACKAGED_PAIRS) {
      const key = [normalizeVi(pair.wordA), normalizeVi(pair.wordB)].sort().join('|');
      const previous = seen.get(key);
      if (previous !== undefined) collisions.push(`${previous} và ${pair.id}`);
      else seen.set(key, pair.id);
    }

    expect(collisions).toEqual([]);
  });

  it('toWordPair gắn đúng cờ mặc định cho cặp gốc', () => {
    const converted = toWordPair(PACKAGED_PAIRS[0]);

    expect(converted.isCustom).toBe(false);
    expect(converted.hidden).toBe(false);
    expect(converted.id).toBe(PACKAGED_PAIRS[0].id);
  });

  it('mỗi chủ đề đã có mặt đều có ít nhất 20 cặp', () => {
    const counts = new Map<string, number>();
    for (const pair of PACKAGED_PAIRS) {
      counts.set(pair.topic, (counts.get(pair.topic) ?? 0) + 1);
    }

    for (const [topic, count] of counts) {
      expect(count, `chủ đề ${topic} chỉ có ${count} cặp`).toBeGreaterThanOrEqual(20);
    }
  });

  it('mỗi chủ đề có đủ cả ba mức độ khó', () => {
    const byTopic = new Map<string, Set<string>>();
    for (const pair of PACKAGED_PAIRS) {
      if (!byTopic.has(pair.topic)) byTopic.set(pair.topic, new Set());
      byTopic.get(pair.topic)!.add(pair.difficulty);
    }

    for (const [topic, levels] of byTopic) {
      expect([...levels].sort(), `chủ đề ${topic}`).toEqual(['EASY', 'HARD', 'MEDIUM']);
    }
  });
});
