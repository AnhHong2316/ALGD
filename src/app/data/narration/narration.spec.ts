import { describe, expect, it } from 'vitest';
import { NarrationEventType } from '../../core/models';
import { NARRATION_VI } from './narration.vi';

const ALL_TYPES: NarrationEventType[] = [
  'GAME_START',
  'PASS_DEVICE',
  'ROUND_START',
  'SPEAKER_TURN',
  'TIME_ALMOST_UP',
  'VOTE_OPEN',
  'VOTE_TIE',
  'NO_ELIMINATION',
  'RANDOM_TIE_BREAK',
  'CIVILIAN_KILLED',
  'SPY_CAUGHT',
  'WHITE_REVEALED',
  'WHITE_GUESS_CORRECT',
  'WHITE_GUESS_WRONG',
  'CIVILIANS_WIN',
  'SPIES_WIN',
  'WHITE_WIN',
];

const ALLOWED_PLACEHOLDERS = ['{village}', '{player}', '{round}'];

describe('kịch bản thoại tiếng Việt', () => {
  it('mọi loại sự kiện đều có ít nhất một câu', () => {
    for (const type of ALL_TYPES) {
      expect(NARRATION_VI[type].length, `thiếu thoại cho ${type}`).toBeGreaterThan(0);
    }
  });

  it('phần lớn sự kiện có từ hai biến thể trở lên để đỡ nghe lặp', () => {
    const many = ALL_TYPES.filter((type) => NARRATION_VI[type].length >= 2);

    expect(many.length).toBeGreaterThanOrEqual(ALL_TYPES.length - 2);
  });

  it('không câu nào chứa chỗ giữ chỗ ngoài ba cái được phép', () => {
    for (const type of ALL_TYPES) {
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
    for (const type of ALL_TYPES) {
      for (const line of NARRATION_VI[type]) {
        expect(line.trim().length, `${type} có câu rỗng`).toBeGreaterThan(0);
      }
    }
  });
});
