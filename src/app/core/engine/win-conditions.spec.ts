import { describe, expect, it } from 'vitest';
import { makeState } from './testing/make-state';
import { countAlive, evaluateOutcome } from './win-conditions';

describe('countAlive', () => {
  it('đếm đúng số người sống theo từng vai', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 2, 3],
    });

    expect(countAlive(state)).toEqual({ civilians: 1, spies: 1, whites: 1 });
  });
});

describe('evaluateOutcome', () => {
  it('ván vẫn tiếp tục khi dân làng còn áp đảo', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'],
      aliveIndexes: [0, 1, 2, 3],
    });

    expect(evaluateOutcome(state)).toBeNull();
  });

  it('gián điệp thắng khi số gián điệp bằng số người còn lại', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY'],
      aliveIndexes: [0, 2],
    });

    expect(evaluateOutcome(state)).toBe('SPIES');
  });

  it('gián điệp thắng khi mũ trắng còn sống nhưng gián điệp đã đủ đông', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [1, 2],
    });

    expect(evaluateOutcome(state)).toBe('SPIES');
  });

  it('dân làng thắng khi hết cả gián điệp lẫn mũ trắng', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 1],
    });

    expect(evaluateOutcome(state)).toBe('CIVILIANS');
  });

  it('ván CHƯA kết thúc khi hết gián điệp mà mũ trắng còn sống', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 1, 3],
    });

    expect(evaluateOutcome(state)).toBeNull();
  });

  it('mũ trắng thắng khi đoán đúng, đè lên mọi điều kiện khác', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 1],
      whiteGuess: { text: 'con mèo', correct: true },
    });

    expect(evaluateOutcome(state)).toBe('WHITE');
  });

  it('mũ trắng đoán sai thì không thắng', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 1],
      whiteGuess: { text: 'con chó', correct: false },
    });

    expect(evaluateOutcome(state)).toBe('CIVILIANS');
  });

  it('mũ trắng thắng khi sống sót một mình', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [3],
    });

    expect(evaluateOutcome(state)).toBe('WHITE');
  });

  it('mọi trạng thái còn đúng một người sống đều kết thúc ván', () => {
    const roles = ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'] as const;
    for (let index = 0; index < roles.length; index++) {
      const state = makeState({ roles: [...roles], aliveIndexes: [index] });
      expect(evaluateOutcome(state)).not.toBeNull();
    }
  });
});
