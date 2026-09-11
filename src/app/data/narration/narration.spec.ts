import { describe, expect, it } from 'vitest';
import { NarrationEventType, NARRATION_EVENT_TYPES } from '../../core/models';
import { NARRATION_VI } from './narration.vi';

const ALLOWED_PLACEHOLDERS = ['{village}', '{player}', '{round}'];

describe('kịch bản thoại tiếng Việt', () => {
  it('mọi loại sự kiện đều có ít nhất một câu', () => {
    for (const type of NARRATION_EVENT_TYPES) {
      expect(NARRATION_VI[type].length, `thiếu thoại cho ${type}`).toBeGreaterThan(0);
    }
  });

  it('phần lớn sự kiện có từ hai biến thể trở lên để đỡ nghe lặp', () => {
    const many = NARRATION_EVENT_TYPES.filter((type) => NARRATION_VI[type].length >= 2);

    expect(many.length).toBeGreaterThanOrEqual(NARRATION_EVENT_TYPES.length - 2);
  });

  it('không câu nào chứa chỗ giữ chỗ ngoài ba cái được phép', () => {
    for (const type of NARRATION_EVENT_TYPES) {
      for (const line of NARRATION_VI[type]) {
        for (const found of line.match(/\{[^}]*\}/g) ?? []) {
          expect(ALLOWED_PLACEHOLDERS, `${type}: "${line}"`).toContain(found);
        }
      }
    }
  });

  it('sự kiện không mang tên người thì thoại không được dùng {player}', () => {
    // Engine không đặt player vào payload của mấy loại này, nên câu nào dùng
    // {player} sẽ ra một chỗ trống ngay giữa lời dẫn.
    const withoutPlayer: NarrationEventType[] = [
      'GAME_START',
      'ROUND_START',
      'VOTE_OPEN',
      'NO_ELIMINATION',
      'CIVILIANS_WIN',
      'SPIES_WIN',
    ];

    for (const type of withoutPlayer) {
      for (const line of NARRATION_VI[type]) {
        expect(line, `${type}: "${line}"`).not.toContain('{player}');
      }
    }
  });

  it('không câu nào rỗng hay chỉ có khoảng trắng', () => {
    for (const type of NARRATION_EVENT_TYPES) {
      for (const line of NARRATION_VI[type]) {
        expect(line.trim().length, `${type} có câu rỗng`).toBeGreaterThan(0);
      }
    }
  });

  it('không sự kiện nào có hai biến thể trùng nhau', () => {
    for (const type of NARRATION_EVENT_TYPES) {
      const lines = NARRATION_VI[type];

      expect(new Set(lines).size, `${type} có câu lặp`).toBe(lines.length);
    }
  });

  it('không câu nào dài tới mức đọc lên thành lê thê', () => {
    // Không phải chuyện văn phong — chỉ là trần độ dài để câu nào lỡ viết
    // thành đoạn văn thì lộ ra ngay. Câu dài nhất hiện tại 62 ký tự.
    for (const type of NARRATION_EVENT_TYPES) {
      for (const line of NARRATION_VI[type]) {
        expect(line.length, `${type}: "${line}"`).toBeLessThanOrEqual(100);
      }
    }
  });
});
