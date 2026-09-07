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

  it('ghi nhận cách ép hạt giống: NaN và Infinity đều thành 0', () => {
    const zero = createSeededRng(0);
    const expected = [zero(), zero(), zero()];

    const nan = createSeededRng(NaN);
    const infinite = createSeededRng(Infinity);

    expect([nan(), nan(), nan()]).toEqual(expected);
    expect([infinite(), infinite(), infinite()]).toEqual(expected);
  });

  it('ghi nhận cách ép hạt giống: số thập phân bị cắt phần lẻ', () => {
    const whole = createSeededRng(7);
    const fractional = createSeededRng(7.9);

    expect([fractional(), fractional()]).toEqual([whole(), whole()]);
  });

  it('ghi nhận cách ép hạt giống: số âm quấn theo bù hai', () => {
    const negative = createSeededRng(-1);
    const wrapped = createSeededRng(4294967295);

    expect([negative(), negative()]).toEqual([wrapped(), wrapped()]);
  });

  it('pickIndex từ chối độ dài âm, không nguyên, hoặc NaN', () => {
    const rng = createSeededRng(3);

    expect(() => pickIndex(rng, -1)).toThrow();
    expect(() => pickIndex(rng, 2.5)).toThrow();
    expect(() => pickIndex(rng, NaN)).toThrow();
  });

  it('pickIndex với độ dài 1 luôn trả về 0', () => {
    const rng = createSeededRng(3);

    for (let i = 0; i < 50; i++) {
      expect(pickIndex(rng, 1)).toBe(0);
    }
  });

  it('shuffle chạy được trên mảng đã đóng băng', () => {
    const rng = createSeededRng(8);
    const frozen = Object.freeze(['a', 'b', 'c', 'd']);

    const output = shuffle(rng, frozen);

    expect([...output].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(frozen).toEqual(['a', 'b', 'c', 'd']);
  });

  it('shuffle xử lý được mảng rỗng và mảng một phần tử', () => {
    const rng = createSeededRng(8);

    expect(shuffle(rng, [])).toEqual([]);
    expect(shuffle(rng, ['a'])).toEqual(['a']);
  });
});
