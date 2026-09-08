import { GameState, Role, ScoreRules } from '../models';

/** Phe thắng nào thì vai nào được điểm. Mũ trắng đứng riêng, không theo phe nào. */
const WINNING_ROLE: Record<string, Role> = {
  CIVILIANS: 'CIVILIAN',
  SPIES: 'SPY',
  WHITE: 'WHITE',
};

/**
 * Điểm cộng của một ván, khoá theo TÊN người chơi.
 *
 * Khoá theo tên chứ không theo id vì bảng điểm cộng dồn qua nhiều ván, mà id
 * chỉ sống trong đúng một ván. Tên đã được khử trùng lặp từ lúc lập danh sách
 * nên không có hai người cùng tên trong một ván.
 *
 * Duyệt `players` chứ không duyệt `aliveIds`: người bị loại giữa chừng vẫn
 * được điểm nếu phe của họ thắng.
 *
 * Người thua vẫn có mặt trong bảng với 0 điểm, để họ hiện trên bảng điểm tích
 * luỹ thay vì biến mất.
 */
export function awardPoints(state: GameState, rules: ScoreRules): Record<string, number> {
  if (state.outcome === null) {
    throw new Error('awardPoints: ván chưa kết thúc, chưa tính điểm được');
  }

  const winningRole = WINNING_ROLE[state.outcome];
  const reward: Record<string, number> = {
    CIVILIAN: rules.civilianWin,
    SPY: rules.spyWin,
    WHITE: rules.whiteWin,
  };

  const points: Record<string, number> = {};
  for (const player of state.players) {
    const role = state.assignments[player.id].role;
    points[player.name] = role === winningRole ? reward[role] : 0;
  }

  return points;
}
