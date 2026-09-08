import { Difficulty, WordPair } from '../core/models';
import { Rng, pickIndex } from '../core/engine/rng';

export interface PickPairInput {
  pairs: readonly WordPair[];
  /** Rỗng nghĩa là lấy tất cả chủ đề. */
  topics: readonly string[];
  difficulties: readonly Difficulty[];
  usedPairIds: readonly string[];
  rng: Rng;
}

export interface PickedPair {
  pairId: string;
  civilianWord: string;
  spyWord: string;
  /** Lịch sử đã cập nhật, để nơi gọi ghi lại xuống máy. */
  usedPairIds: string[];
}

function isEligible(
  pair: WordPair,
  topics: readonly string[],
  difficulties: readonly Difficulty[],
): boolean {
  if (pair.hidden) return false;
  if (topics.length > 0 && !topics.includes(pair.topic)) return false;
  return difficulties.includes(pair.difficulty);
}

/**
 * Bốc một cặp từ theo mục 7 của đặc tả.
 *
 * Ba việc, theo đúng thứ tự này:
 * 1. Lọc theo chủ đề và độ khó, bỏ cặp đã ẩn.
 * 2. Ưu tiên cặp chưa dùng. Hết cặp chưa dùng thì xoá lịch sử và bắt đầu
 *    vòng mới, thay vì báo lỗi — người chơi không có lỗi gì ở đây.
 * 3. Tung đồng xu quyết định từ nào làm từ của dân làng. Nhờ vậy chơi lâu
 *    không đoán được vai qua thói quen của app.
 */
export function pickPair(input: PickPairInput): PickedPair {
  const eligible = input.pairs.filter((pair) =>
    isEligible(pair, input.topics, input.difficulties),
  );

  if (eligible.length === 0) {
    throw new Error(
      'pickPair: không còn cặp từ nào hợp lệ với bộ lọc hiện tại. ' +
        'Hãy bật thêm chủ đề hoặc thêm mức độ khó.',
    );
  }

  const eligibleIds = new Set(eligible.map((pair) => pair.id));

  // Chỉ giữ lịch sử của những cặp còn hợp lệ. Cặp bị xoá hoặc bị lọc ra
  // không được phép chiếm chỗ trong lịch sử, nếu không danh sách sẽ phình
  // mãi và điều kiện "đã dùng hết" không bao giờ đúng.
  const relevantHistory = input.usedPairIds.filter((id) => eligibleIds.has(id));
  const used = new Set(relevantHistory);

  const fresh = eligible.filter((pair) => !used.has(pair.id));
  const startingNewCycle = fresh.length === 0;
  const candidates = startingNewCycle ? eligible : fresh;

  const chosen = candidates[pickIndex(input.rng, candidates.length)];
  const civilianFirst = input.rng() < 0.5;

  return {
    pairId: chosen.id,
    civilianWord: civilianFirst ? chosen.wordA : chosen.wordB,
    spyWord: civilianFirst ? chosen.wordB : chosen.wordA,
    usedPairIds: startingNewCycle ? [chosen.id] : [...relevantHistory, chosen.id],
  };
}
