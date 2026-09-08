import { describe, expect, it } from 'vitest';
import { describePairProblem, isPairFarEnough } from './pair-distance';

describe('isPairFarEnough', () => {
  it('từ chối cặp trùng khít sau khi bỏ dấu', () => {
    expect(isPairFarEnough('bò', 'bó')).toBe(false);
    expect(isPairFarEnough('chó', 'cho')).toBe(false);
  });

  it('từ chối cặp chỉ cách nhau một ký tự', () => {
    expect(isPairFarEnough('mèo', 'heo')).toBe(false);
    expect(isPairFarEnough('cá', 'gà')).toBe(false);
  });

  it('chấp nhận cặp cách nhau từ hai ký tự trở lên', () => {
    expect(isPairFarEnough('bút bi', 'bút chì')).toBe(true);
    expect(isPairFarEnough('xe máy', 'xe đạp')).toBe(true);
    expect(isPairFarEnough('con chó', 'con mèo')).toBe(true);
  });

  it('với từ dài thì đòi khoảng cách lớn hơn, vì ngưỡng chấm cũng lớn hơn', () => {
    // 'bánh mì thịt nướng' dài hơn 8 ký tự nên ngưỡng chấm là 2,
    // vậy hai từ phải cách nhau ít nhất 3.
    expect(isPairFarEnough('bánh mì thịt nướng', 'bánh mì thịt nương')).toBe(false);
    expect(isPairFarEnough('bánh mì thịt nướng', 'bánh mì chả cá')).toBe(true);
  });

  it('từ chối khi một trong hai từ rỗng sau khi chuẩn hoá', () => {
    expect(isPairFarEnough('', 'con mèo')).toBe(false);
    expect(isPairFarEnough('!!!', 'con mèo')).toBe(false);
  });

  it('đối xứng: đổi chỗ hai từ không đổi kết quả', () => {
    expect(isPairFarEnough('mèo', 'heo')).toBe(isPairFarEnough('heo', 'mèo'));
    expect(isPairFarEnough('xe máy', 'xe đạp')).toBe(isPairFarEnough('xe đạp', 'xe máy'));
  });
});

describe('describePairProblem', () => {
  it('cặp hợp lệ thì không có vấn đề gì', () => {
    expect(describePairProblem('xe máy', 'xe đạp')).toBeNull();
  });

  it('nêu rõ lý do khi hai từ quá gần nhau', () => {
    const problem = describePairProblem('mèo', 'heo');

    expect(problem).not.toBeNull();
    expect(problem).toContain('meo');
    expect(problem).toContain('heo');
  });

  it('nêu rõ lý do khi một từ rỗng', () => {
    expect(describePairProblem('   ', 'con mèo')).toContain('rỗng');
  });
});
