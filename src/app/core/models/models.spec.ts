import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_CONFIG,
  DEFAULT_SCORE_RULES,
  GamePhase,
  GameState,
} from './index';

describe('models', () => {
  it('điểm mặc định đúng như đặc tả mục 3.8', () => {
    expect(DEFAULT_SCORE_RULES).toEqual({
      civilianWin: 1,
      spyWin: 2,
      whiteWin: 3,
    });
  });

  it('cấu hình mặc định tắt mũ trắng, tắt Bật mí, vote từ vòng 3', () => {
    expect(DEFAULT_GAME_CONFIG.hasWhite).toBe(false);
    expect(DEFAULT_GAME_CONFIG.revealSpyToSpy).toBe(false);
    expect(DEFAULT_GAME_CONFIG.minRoundsBeforeVote).toBe(3);
    expect(DEFAULT_GAME_CONFIG.spyCount).toBe(1);
  });

  it('dựng được một GameState đầy đủ trường', () => {
    const state: GameState = {
      id: 'g1',
      villageName: 'Ác Quỷ',
      config: DEFAULT_GAME_CONFIG,
      pairId: 'p1',
      civilianWord: 'con mèo',
      spyWord: 'con chó',
      players: [{ id: 'a', name: 'An' }],
      assignments: {
        a: { playerId: 'a', role: 'CIVILIAN', word: 'con mèo' },
      },
      dealtCount: 0,
      round: 1,
      speakingOrder: [],
      speakerIndex: 0,
      aliveIds: ['a'],
      eliminations: [],
      tiedCandidateIds: [],
      revoteUsed: false,
      whiteGuess: null,
      phase: 'DEALING',
      outcome: null,
    };

    expect(state.phase).toBe('DEALING');
    expect(state.assignments['a'].role).toBe('CIVILIAN');
  });

  it('hằng mặc định bị đóng băng nên không sửa trộm được', () => {
    expect(() => {
      (DEFAULT_GAME_CONFIG.topics as string[]).push('Động vật');
    }).toThrow();

    expect(() => {
      (DEFAULT_GAME_CONFIG as { spyCount: number }).spyCount = 99;
    }).toThrow();
  });

  it('không tồn tại pha SETUP', () => {
    // @ts-expect-error 'SETUP' đã được bỏ khỏi GamePhase một cách có chủ đích
    const phase: GamePhase = 'SETUP';
    expect(phase).toBe('SETUP');
  });
});
