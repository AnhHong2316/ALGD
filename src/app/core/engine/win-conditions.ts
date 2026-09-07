import { GameState, Outcome } from '../models';

export interface AliveCounts {
  civilians: number;
  spies: number;
  whites: number;
}

export function countAlive(state: GameState): AliveCounts {
  const counts: AliveCounts = { civilians: 0, spies: 0, whites: 0 };

  for (const playerId of state.aliveIds) {
    const role = state.assignments[playerId].role;
    if (role === 'SPY') counts.spies++;
    else if (role === 'WHITE') counts.whites++;
    else counts.civilians++;
  }

  return counts;
}

/**
 * Mục 3.5 của đặc tả. Thứ tự kiểm tra là một phần của luật, không đổi được.
 * Trả về null nghĩa là ván còn tiếp tục.
 */
export function evaluateOutcome(state: GameState): Outcome | null {
  // 1. Mũ trắng đoán đúng thì thắng ngay, đè lên mọi điều kiện khác.
  if (state.whiteGuess?.correct) return 'WHITE';

  const { civilians, spies, whites } = countAlive(state);

  // 2. Mũ trắng sống sót một mình. Điều kiện này bịt nhánh treo với đúng
  //    một người còn sống mà không phải dân làng cũng không phải gián điệp.
  if (whites === 1 && civilians === 0 && spies === 0) return 'WHITE';

  // 3. Gián điệp đủ đông để áp đảo phần còn lại.
  if (spies >= civilians + whites) return 'SPIES';

  // 4. Sạch bóng gián điệp lẫn mũ trắng.
  if (spies === 0 && whites === 0) return 'CIVILIANS';

  return null;
}
