import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_RULES } from '../models';
import { awardPoints } from './scoring';
import { makeState } from './testing/make-state';

describe('awardPoints', () => {
  it('dân làng thắng: mỗi dân làng được 1 điểm, kể cả người đã bị loại', () => {
    const state = {
      ...makeState({
        roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
        aliveIndexes: [0],
      }),
      outcome: 'CIVILIANS' as const,
    };

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      p0: 1,
      p1: 1,
      p2: 0,
      p3: 0,
    });
  });

  it('gián điệp thắng: mỗi gián điệp được 2 điểm', () => {
    const state = {
      ...makeState({
        roles: ['CIVILIAN', 'SPY', 'SPY'],
        aliveIndexes: [1, 2],
      }),
      outcome: 'SPIES' as const,
    };

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      p0: 0,
      p1: 2,
      p2: 2,
    });
  });

  it('mũ trắng thắng: chỉ mình mũ trắng được điểm', () => {
    const state = {
      ...makeState({
        roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
        aliveIndexes: [3],
      }),
      outcome: 'WHITE' as const,
    };

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 3,
    });
  });

  it('mũ trắng không được điểm khi dân làng thắng', () => {
    const state = {
      ...makeState({
        roles: ['CIVILIAN', 'SPY', 'WHITE'],
        aliveIndexes: [0],
      }),
      outcome: 'CIVILIANS' as const,
    };

    expect(awardPoints(state, DEFAULT_SCORE_RULES)['p2']).toBe(0);
  });

  it('ván chưa kết thúc thì không ai được điểm', () => {
    const state = makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'SPY'] });

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      p0: 0,
      p1: 0,
      p2: 0,
    });
  });

  it('tôn trọng bảng điểm tuỳ chỉnh', () => {
    const state = {
      ...makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'SPY'], aliveIndexes: [2] }),
      outcome: 'SPIES' as const,
    };

    const points = awardPoints(state, { civilianWin: 5, spyWin: 7, whiteWin: 9 });
    expect(points['p2']).toBe(7);
  });
});
