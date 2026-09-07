import { GameState, ScoreRules } from '../models';

/**
 * Trả về điểm cộng của từng người trong ván này.
 * Mọi người chơi đều có mặt trong kết quả, người thua nhận 0, để màn kết ván
 * hiển thị được đủ danh sách mà không phải tự bù chỗ trống.
 */
export function awardPoints(
  state: GameState,
  rules: ScoreRules,
): Record<string, number> {
  const points: Record<string, number> = {};

  for (const player of state.players) {
    const role = state.assignments[player.id].role;

    if (state.outcome === 'CIVILIANS' && role === 'CIVILIAN') {
      points[player.id] = rules.civilianWin;
    } else if (state.outcome === 'SPIES' && role === 'SPY') {
      points[player.id] = rules.spyWin;
    } else if (state.outcome === 'WHITE' && role === 'WHITE') {
      points[player.id] = rules.whiteWin;
    } else {
      points[player.id] = 0;
    }
  }

  return points;
}
