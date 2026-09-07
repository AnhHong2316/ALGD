export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;

/**
 * Suy trực tiếp từ ràng buộc soDan > soGianDiep.
 * Mũ trắng không thuộc phe nào nên bị trừ ra khỏi số người tranh chấp.
 */
export function maxSpyCount(playerCount: number, hasWhite: boolean): number {
  const contested = hasWhite ? playerCount - 1 : playerCount;
  return Math.max(0, Math.ceil(contested / 2) - 1);
}

/** Giá trị app điền sẵn cho cân bằng, luôn kẹp lại trong mức hợp lệ. */
export function suggestedSpyCount(playerCount: number, hasWhite: boolean): number {
  const base = playerCount <= 6 ? 1 : playerCount <= 10 ? 2 : 3;
  return Math.max(1, Math.min(base, maxSpyCount(playerCount, hasWhite)));
}

export function civilianCount(
  playerCount: number,
  spyCount: number,
  hasWhite: boolean,
): number {
  return playerCount - spyCount - (hasWhite ? 1 : 0);
}

export type TeamValidation = { valid: true } | { valid: false; reason: string };

export function validateTeam(
  playerCount: number,
  spyCount: number,
  hasWhite: boolean,
): TeamValidation {
  if (playerCount < MIN_PLAYERS) {
    return { valid: false, reason: `Cần ít nhất ${MIN_PLAYERS} người chơi` };
  }
  if (playerCount > MAX_PLAYERS) {
    return { valid: false, reason: `Tối đa ${MAX_PLAYERS} người chơi` };
  }
  if (spyCount < 1) {
    return { valid: false, reason: 'Cần ít nhất 1 gián điệp' };
  }

  const max = maxSpyCount(playerCount, hasWhite);
  if (spyCount > max) {
    const whitePart = hasWhite ? ' và 1 mũ trắng' : '';
    return {
      valid: false,
      reason:
        `Dân làng phải nhiều hơn gián điệp. ` +
        `Với ${playerCount} người${whitePart}, tối đa ${max} gián điệp`,
    };
  }

  return { valid: true };
}
