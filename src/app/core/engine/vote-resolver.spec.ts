import { describe, expect, it } from 'vitest';
import { findVoteLeaders, isTallyValid } from './vote-resolver';

describe('findVoteLeaders', () => {
  it('trả về đúng một người khi có người dẫn rõ ràng', () => {
    expect(findVoteLeaders({ a: 3, b: 1, c: 0 })).toEqual(['a']);
  });

  it('trả về mọi người đồng hạng nhất khi hoà', () => {
    expect(findVoteLeaders({ a: 2, b: 2, c: 1 }).sort()).toEqual(['a', 'b']);
  });

  it('trả về cả ba khi hoà ba người', () => {
    expect(findVoteLeaders({ a: 2, b: 2, c: 2 }).sort()).toEqual(['a', 'b', 'c']);
  });

  it('bỏ qua người không có phiếu nào', () => {
    expect(findVoteLeaders({ a: 1, b: 0 })).toEqual(['a']);
  });

  it('trả về mảng rỗng khi không ai có phiếu', () => {
    expect(findVoteLeaders({ a: 0, b: 0 })).toEqual([]);
  });
});

describe('isTallyValid', () => {
  const candidates = ['a', 'b', 'c'];

  it('chấp nhận bảng phiếu bình thường', () => {
    expect(isTallyValid({ a: 2, b: 1 }, candidates, 3)).toBe(true);
  });

  it('từ chối khi có phiếu cho người không phải ứng viên', () => {
    expect(isTallyValid({ a: 1, z: 1 }, candidates, 3)).toBe(false);
  });

  it('từ chối khi tổng phiếu vượt số người bỏ phiếu', () => {
    expect(isTallyValid({ a: 3, b: 2 }, candidates, 4)).toBe(false);
  });

  it('từ chối khi không có phiếu nào', () => {
    expect(isTallyValid({ a: 0, b: 0 }, candidates, 3)).toBe(false);
    expect(isTallyValid({}, candidates, 3)).toBe(false);
  });

  it('từ chối phiếu âm hoặc không phải số nguyên', () => {
    expect(isTallyValid({ a: -1, b: 2 }, candidates, 3)).toBe(false);
    expect(isTallyValid({ a: 1.5 }, candidates, 3)).toBe(false);
  });

  it('chấp nhận lượt bỏ phiếu lại: ít ứng viên hơn số người bỏ phiếu', () => {
    expect(isTallyValid({ a: 3, b: 2 }, ['a', 'b'], 5)).toBe(true);
  });
});
