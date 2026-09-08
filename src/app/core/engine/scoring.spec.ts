import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_RULES, GameState, Outcome, Role } from '../models';
import { awardPoints } from './scoring';

/** Dựng một GameState tối giản, chỉ đủ những trường mà awardPoints đọc tới. */
function stateWith(roles: Record<string, Role>, outcome: Outcome | null): GameState {
  const names = Object.keys(roles);
  return {
    id: 'g-1',
    villageName: 'Ác Quỷ',
    config: {
      spyCount: 1,
      hasWhite: true,
      revealSpyToSpy: false,
      topics: [],
      difficulties: ['EASY'],
      timerSeconds: null,
      minRoundsBeforeVote: 3,
    },
    pairId: 'dv-01',
    civilianWord: 'con mèo',
    spyWord: 'con chó',
    players: names.map((name) => ({ id: `p-${name}`, name })),
    assignments: Object.fromEntries(
      names.map((name) => [`p-${name}`, { playerId: `p-${name}`, role: roles[name], word: null }]),
    ),
    dealtCount: names.length,
    round: 3,
    speakingOrder: [],
    speakerIndex: 0,
    // Cố tình để chỉ một người còn sống: điểm phải không phụ thuộc vào đây.
    aliveIds: [`p-${names[0]}`],
    eliminations: [],
    tiedCandidateIds: [],
    revoteUsed: false,
    whiteGuess: null,
    phase: 'ENDED',
    outcome,
  };
}

describe('awardPoints', () => {
  it('dân làng thắng thì mọi dân làng có điểm, kể cả người đã bị loại', () => {
    const state = stateWith(
      { Minh: 'CIVILIAN', Hùng: 'CIVILIAN', Lan: 'SPY', Đức: 'WHITE' },
      'CIVILIANS',
    );

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      Minh: 1,
      Hùng: 1,
      Lan: 0,
      Đức: 0,
    });
  });

  it('gián điệp thắng thì mọi gián điệp có điểm', () => {
    const state = stateWith(
      { Minh: 'CIVILIAN', Hùng: 'SPY', Lan: 'SPY', Đức: 'WHITE' },
      'SPIES',
    );

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      Minh: 0,
      Hùng: 2,
      Lan: 2,
      Đức: 0,
    });
  });

  it('mũ trắng thắng thì chỉ mình mũ trắng có điểm', () => {
    const state = stateWith(
      { Minh: 'CIVILIAN', Hùng: 'CIVILIAN', Lan: 'SPY', Đức: 'WHITE' },
      'WHITE',
    );

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      Minh: 0,
      Hùng: 0,
      Lan: 0,
      Đức: 3,
    });
  });

  it('mọi người đều có mặt trong bảng, kể cả phe thua', () => {
    const state = stateWith({ Minh: 'CIVILIAN', Lan: 'SPY' }, 'SPIES');

    // Phe thua vẫn có khoá với giá trị 0, để họ hiện trên bảng điểm chứ không
    // biến mất chỉ vì thua.
    expect(Object.keys(awardPoints(state, DEFAULT_SCORE_RULES)).sort()).toEqual([
      'Lan',
      'Minh',
    ]);
  });

  it('dùng đúng luật điểm được truyền vào, không dùng mặc định', () => {
    const state = stateWith({ Minh: 'CIVILIAN', Lan: 'SPY' }, 'CIVILIANS');

    expect(awardPoints(state, { civilianWin: 10, spyWin: 20, whiteWin: 30 })).toEqual({
      Minh: 10,
      Lan: 0,
    });
  });

  it('ván chưa kết thúc thì ném lỗi', () => {
    const state = stateWith({ Minh: 'CIVILIAN', Lan: 'SPY' }, null);

    expect(() => awardPoints(state, DEFAULT_SCORE_RULES)).toThrow(/chưa kết thúc/);
  });
});
