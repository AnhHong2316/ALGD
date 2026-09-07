import {
  Assignment,
  DEFAULT_GAME_CONFIG,
  GameConfig,
  GamePhase,
  GameState,
  Player,
  Role,
  WhiteGuess,
} from '../../models';

export const TEST_CIVILIAN_WORD = 'quả thanh long bí mật';
export const TEST_SPY_WORD = 'quả vải thiều bí mật';

export interface MakeStateOptions {
  /** Vai của từng người, theo thứ tự. Người thứ i có id `p{i}` và tên `Người {i}`. */
  roles: Role[];
  /** Chỉ số của những người còn sống. Bỏ trống nghĩa là tất cả còn sống. */
  aliveIndexes?: number[];
  phase?: GamePhase;
  round?: number;
  villageName?: string;
  whiteGuess?: WhiteGuess | null;
  config?: Partial<GameConfig>;
  speakingOrder?: string[];
  speakerIndex?: number;
  tiedCandidateIds?: string[];
  revoteUsed?: boolean;
}

/**
 * Dựng một GameState đủ dùng cho test mà không phải chạy qua createGame.
 * Vai được gán cố định theo thứ tự nên test đọc ra là biết ai là ai.
 */
export function makeState(options: MakeStateOptions): GameState {
  const players: Player[] = options.roles.map((_, index) => ({
    id: `p${index}`,
    name: `Người ${index}`,
  }));

  const assignments: Record<string, Assignment> = {};
  options.roles.forEach((role, index) => {
    assignments[players[index].id] = {
      playerId: players[index].id,
      role,
      word:
        role === 'WHITE'
          ? null
          : role === 'SPY'
            ? TEST_SPY_WORD
            : TEST_CIVILIAN_WORD,
    };
  });

  const aliveIndexes =
    options.aliveIndexes ?? options.roles.map((_, index) => index);

  return {
    id: 'test-game',
    villageName: options.villageName ?? 'Thử Nghiệm',
    config: {
      ...DEFAULT_GAME_CONFIG,
      spyCount: options.roles.filter((role) => role === 'SPY').length,
      hasWhite: options.roles.includes('WHITE'),
      ...options.config,
    },
    pairId: 'test-pair',
    civilianWord: TEST_CIVILIAN_WORD,
    spyWord: TEST_SPY_WORD,
    players,
    assignments,
    dealtCount: players.length,
    round: options.round ?? 1,
    speakingOrder:
      options.speakingOrder ?? aliveIndexes.map((index) => players[index].id),
    speakerIndex: options.speakerIndex ?? 0,
    aliveIds: aliveIndexes.map((index) => players[index].id),
    eliminations: [],
    tiedCandidateIds: options.tiedCandidateIds ?? [],
    revoteUsed: options.revoteUsed ?? false,
    whiteGuess: options.whiteGuess ?? null,
    phase: options.phase ?? 'SPEAKING',
    outcome: null,
  };
}
