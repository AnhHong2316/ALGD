import { GameConfig } from './game-config';
import { Player } from './player';
import { GamePhase, Outcome, Role } from './role';

export interface Assignment {
  playerId: string;
  role: Role;
  /** null khi là mũ trắng. */
  word: string | null;
}

export interface Elimination {
  round: number;
  playerId: string;
  role: Role;
  /** true khi bị loại do bốc ngẫu nhiên ở nước cờ 2 người cuối. */
  byRandomTieBreak: boolean;
}

export interface WhiteGuess {
  text: string;
  correct: boolean;
}

export interface GameState {
  id: string;
  /** Rỗng thì tầng dẫn chuyện hiển thị "ta". */
  villageName: string;
  config: GameConfig;
  pairId: string;
  civilianWord: string;
  spyWord: string;
  players: Player[];
  assignments: Record<string, Assignment>;
  dealtCount: number;
  /** Số thứ tự vòng đang diễn ra, bắt đầu từ 1. */
  round: number;
  speakingOrder: string[];
  speakerIndex: number;
  aliveIds: string[];
  eliminations: Elimination[];
  /** Chỉ có giá trị ở pha TIE_BREAK và ở lượt bỏ phiếu lại. */
  tiedCandidateIds: string[];
  revoteUsed: boolean;
  whiteGuess: WhiteGuess | null;
  phase: GamePhase;
  outcome: Outcome | null;
}
