import { describe, expect, it } from 'vitest';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  civilianCount,
  maxSpyCount,
  suggestedSpyCount,
  validateTeam,
} from './team-rules';

/** Chép nguyên bảng ở mục 3.3 của đặc tả. */
const SPEC_TABLE = [
  { players: 4, suggested: 1, maxNoWhite: 1, maxWithWhite: 1 },
  { players: 5, suggested: 1, maxNoWhite: 2, maxWithWhite: 1 },
  { players: 6, suggested: 1, maxNoWhite: 2, maxWithWhite: 2 },
  { players: 7, suggested: 2, maxNoWhite: 3, maxWithWhite: 2 },
  { players: 8, suggested: 2, maxNoWhite: 3, maxWithWhite: 3 },
  { players: 9, suggested: 2, maxNoWhite: 4, maxWithWhite: 3 },
  { players: 10, suggested: 2, maxNoWhite: 4, maxWithWhite: 4 },
  { players: 11, suggested: 3, maxNoWhite: 5, maxWithWhite: 4 },
  { players: 12, suggested: 3, maxNoWhite: 5, maxWithWhite: 5 },
];

describe('team-rules', () => {
  it('giới hạn sĩ số đúng đặc tả', () => {
    expect(MIN_PLAYERS).toBe(4);
    expect(MAX_PLAYERS).toBe(12);
  });

  it.each(SPEC_TABLE)(
    '$players người: số gián điệp tối đa khớp bảng đặc tả',
    ({ players, maxNoWhite, maxWithWhite }) => {
      expect(maxSpyCount(players, false)).toBe(maxNoWhite);
      expect(maxSpyCount(players, true)).toBe(maxWithWhite);
    },
  );

  it.each(SPEC_TABLE)(
    '$players người: số gián điệp gợi ý khớp bảng đặc tả',
    ({ players, suggested }) => {
      expect(suggestedSpyCount(players, false)).toBe(suggested);
    },
  );

  it('mức tối đa luôn thoả ràng buộc dân làng nhiều hơn gián điệp', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      for (const hasWhite of [false, true]) {
        const max = maxSpyCount(players, hasWhite);
        expect(civilianCount(players, max, hasWhite)).toBeGreaterThan(max);
        expect(civilianCount(players, max + 1, hasWhite)).toBeLessThanOrEqual(max + 1);
      }
    }
  });

  it('đội hình nhỏ nhất có mũ trắng là 2 dân + 1 gián điệp + 1 mũ trắng', () => {
    expect(validateTeam(4, 1, true)).toEqual({ valid: true });
    expect(civilianCount(4, 1, true)).toBe(2);
  });

  it('chặn khi dưới 4 người', () => {
    const result = validateTeam(3, 1, false);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.reason).toContain('4 người');
  });

  it('chặn khi trên 12 người', () => {
    const result = validateTeam(13, 1, false);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.reason).toContain('12 người');
  });

  it('chặn khi không có gián điệp nào', () => {
    const result = validateTeam(6, 0, false);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.reason).toContain('gián điệp');
  });

  it('chặn khi gián điệp không ít hơn dân làng, và nêu rõ mức tối đa', () => {
    const result = validateTeam(6, 3, false);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.reason).toContain('tối đa 2 gián điệp');
  });

  it('gợi ý không bao giờ vượt mức tối đa khi bật mũ trắng', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const suggested = suggestedSpyCount(players, true);
      expect(suggested).toBeGreaterThanOrEqual(1);
      expect(suggested).toBeLessThanOrEqual(maxSpyCount(players, true));
    }
  });
});
