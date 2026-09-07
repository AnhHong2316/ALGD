import { Difficulty } from './word-pair';

export interface GameConfig {
  spyCount: number;
  hasWhite: boolean;
  /** Chế độ Bật mí: mỗi người được cho biết vai của mình. */
  revealSpyToSpy: boolean;
  /** Rỗng nghĩa là lấy tất cả chủ đề đang bật. */
  topics: string[];
  difficulties: Difficulty[];
  /** null nghĩa là tắt đồng hồ. */
  timerSeconds: number | null;
  minRoundsBeforeVote: number;
}

export interface ScoreRules {
  civilianWin: number;
  spyWin: number;
  whiteWin: number;
}

export const DEFAULT_SCORE_RULES: ScoreRules = {
  civilianWin: 1,
  spyWin: 2,
  whiteWin: 3,
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
  spyCount: 1,
  hasWhite: false,
  revealSpyToSpy: false,
  topics: [],
  difficulties: ['EASY', 'MEDIUM', 'HARD'],
  timerSeconds: 30,
  minRoundsBeforeVote: 3,
};
