import { describe, expect, it } from 'vitest';
import { isGuessCorrect, levenshtein, normalizeVi } from './guess-matcher';

describe('normalizeVi', () => {
  it('bỏ dấu tiếng Việt', () => {
    expect(normalizeVi('con mèo')).toBe('con meo');
    expect(normalizeVi('bánh mì')).toBe('banh mi');
  });

  it('xử lý được chữ đ hoa và thường', () => {
    expect(normalizeVi('đường')).toBe('duong');
    expect(normalizeVi('Đà Nẵng')).toBe('da nang');
  });

  it('viết thường và gộp khoảng trắng thừa', () => {
    expect(normalizeVi('  Con   MÈO  ')).toBe('con meo');
  });

  it('bỏ dấu câu', () => {
    expect(normalizeVi('con mèo!!!')).toBe('con meo');
    expect(normalizeVi('bún-bò')).toBe('bunbo');
  });
});

describe('levenshtein', () => {
  it('chuỗi giống hệt thì khoảng cách bằng 0', () => {
    expect(levenshtein('con meo', 'con meo')).toBe(0);
  });

  it('đếm đúng số phép sửa', () => {
    expect(levenshtein('meo', 'mao')).toBe(1);
    expect(levenshtein('meo', 'me')).toBe(1);
    expect(levenshtein('meo', 'meoo')).toBe(1);
    expect(levenshtein('meo', 'cho')).toBe(2);
  });

  it('chuỗi rỗng thì khoảng cách bằng độ dài chuỗi kia', () => {
    expect(levenshtein('', 'meo')).toBe(3);
    expect(levenshtein('meo', '')).toBe(3);
  });
});

describe('isGuessCorrect', () => {
  it('chấp nhận đúng nguyên văn', () => {
    expect(isGuessCorrect('con mèo', 'con mèo')).toBe(true);
  });

  it('chấp nhận thiếu dấu', () => {
    expect(isGuessCorrect('con meo', 'con mèo')).toBe(true);
  });

  it('chấp nhận sai hoa thường và thừa khoảng trắng', () => {
    expect(isGuessCorrect('  Con Mèo ', 'con mèo')).toBe(true);
  });

  it('chấp nhận sai nhẹ một ký tự với từ ngắn', () => {
    expect(isGuessCorrect('con meoo', 'con mèo')).toBe(true);
  });

  it('với đáp án dài hơn 8 ký tự thì chịu được sai hai ký tự', () => {
    expect(isGuessCorrect('banh mi thit nuong', 'bánh mì thịt nướng')).toBe(true);
    expect(isGuessCorrect('banh my thit nuong', 'bánh mì thịt nướng')).toBe(true);
  });

  it('từ chối khi đoán một từ khác hẳn', () => {
    expect(isGuessCorrect('con chó', 'con mèo')).toBe(false);
    expect(isGuessCorrect('xe máy', 'con mèo')).toBe(false);
  });

  it('từ chối chuỗi rỗng', () => {
    expect(isGuessCorrect('', 'con mèo')).toBe(false);
    expect(isGuessCorrect('   ', 'con mèo')).toBe(false);
  });

  it('không nhận nhầm khi đáp án ngắn mà đoán sai hai ký tự', () => {
    expect(isGuessCorrect('cha', 'chó')).toBe(true);
    expect(isGuessCorrect('mua', 'chó')).toBe(false);
  });
});
