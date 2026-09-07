export type Role = 'CIVILIAN' | 'SPY' | 'WHITE';

export type Outcome = 'CIVILIANS' | 'SPIES' | 'WHITE';

/**
 * Không có 'SETUP': trước khi bấm Bắt đầu thì chưa tồn tại GameState nào,
 * nên đó là trạng thái của màn hình chứ không phải của ván.
 */
export type GamePhase =
  | 'DEALING'
  | 'SPEAKING'
  | 'VOTING'
  | 'TIE_BREAK'
  | 'REVEAL'
  | 'WHITE_GUESS'
  | 'ENDED';
