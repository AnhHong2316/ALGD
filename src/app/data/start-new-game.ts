import { EngineResult, createGame } from '../core/engine/game-engine';
import { Rng } from '../core/engine/rng';
import { GameConfig, Player } from '../core/models';
import { pickPair } from './pair-picker';
import { WordBankRepository } from './repositories/word-bank.repository';

export interface StartNewGameInput {
  wordBank: WordBankRepository;
  gameId: string;
  villageName: string;
  playerNames: string[];
  config: GameConfig;
  rng: Rng;
}

/**
 * Tên trùng nhau được thêm hậu tố: Minh, Minh 2, Minh 3. Cần thiết vì bảng
 * điểm khoá theo tên, và vì màn chia bài gọi tên từng người khi chuyền máy —
 * hai người cùng tên thì không biết máy đang tới lượt ai.
 */
function dedupeNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();

  return names.map((name) => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name} ${count}`;
  });
}

/**
 * Chọn cặp từ rồi dựng ván.
 *
 * Thứ tự quan trọng: đội hình được engine kiểm TRƯỚC khi lịch sử cặp từ được
 * ghi xuống máy. Nếu ghi trước rồi mới phát hiện đội hình sai, cặp từ đó coi
 * như bị đốt oan mà ván lại không diễn ra.
 */
export async function startNewGame(
  input: StartNewGameInput,
): Promise<{ result: EngineResult }> {
  const [pairs, usedPairIds] = await Promise.all([
    input.wordBank.loadAvailablePairs(),
    input.wordBank.loadUsedPairIds(),
  ]);

  const picked = pickPair({
    pairs,
    topics: input.config.topics,
    difficulties: input.config.difficulties,
    usedPairIds,
    rng: input.rng,
  });

  const players: Player[] = dedupeNames(input.playerNames).map((name, index) => ({
    id: `p${index}`,
    name,
  }));

  const result = createGame({
    gameId: input.gameId,
    villageName: input.villageName,
    players,
    config: input.config,
    pair: {
      id: picked.pairId,
      civilianWord: picked.civilianWord,
      spyWord: picked.spyWord,
    },
    rng: input.rng,
  });

  await input.wordBank.saveUsedPairIds(picked.usedPairIds);

  return { result };
}
