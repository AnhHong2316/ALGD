import { describe, expect, it } from 'vitest';
import { createSeededRng, pickIndex, shuffle } from './rng';

describe('rng', () => {
  it('cùng hạt giống thì cho cùng dãy số', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const seriesA = [a(), a(), a(), a(), a()];
    const seriesB = [b(), b(), b(), b(), b()];
    expect(seriesA).toEqual(seriesB);
  });

  it('khác hạt giống thì cho dãy khác', () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it('luôn trả về số trong nửa khoảng [0, 1)', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 500; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('pickIndex luôn nằm trong khoảng hợp lệ', () => {
    const rng = createSeededRng(3);
    for (let i = 0; i < 200; i++) {
      const index = pickIndex(rng, 5);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(5);
    }
  });

  it('pickIndex báo lỗi khi độ dài không hợp lệ', () => {
    const rng = createSeededRng(3);
    expect(() => pickIndex(rng, 0)).toThrow();
  });

  it('shuffle giữ nguyên tập phần tử và không sửa mảng gốc', () => {
    const rng = createSeededRng(99);
    const input = ['a', 'b', 'c', 'd', 'e'];
    const output = shuffle(rng, input);

    expect(input).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect([...output].sort()).toEqual([...input].sort());
  });

  it('shuffle có xáo thật chứ không trả về nguyên thứ tự cũ', () => {
    const rng = createSeededRng(12345);
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const shuffledOnce = shuffle(rng, input);
    expect(shuffledOnce).not.toEqual(input);
  });
});
