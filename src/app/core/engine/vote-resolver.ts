export type VoteTally = Record<string, number>;

/** Danh sách những người cùng đứng đầu về số phiếu. Rỗng khi không ai có phiếu. */
export function findVoteLeaders(tally: VoteTally): string[] {
  const scored = Object.entries(tally).filter(([, votes]) => votes > 0);
  if (scored.length === 0) return [];

  const highest = Math.max(...scored.map(([, votes]) => votes));
  return scored.filter(([, votes]) => votes === highest).map(([id]) => id);
}

/**
 * candidateIds là những người được phép nhận phiếu.
 * voterCount là số người đang bỏ phiếu, thường là số người còn sống.
 * Ở lượt bỏ phiếu lại thì hai con số này khác nhau.
 */
export function isTallyValid(
  tally: VoteTally,
  candidateIds: readonly string[],
  voterCount: number,
): boolean {
  const entries = Object.entries(tally);

  if (entries.some(([id]) => !candidateIds.includes(id))) return false;
  if (entries.some(([, votes]) => !Number.isInteger(votes) || votes < 0)) return false;

  const total = entries.reduce((sum, [, votes]) => sum + votes, 0);
  return total >= 1 && total <= voterCount;
}
