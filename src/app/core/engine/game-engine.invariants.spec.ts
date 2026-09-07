import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_CONFIG,
  GameConfig,
  GameState,
  NarrationEvent,
  Player,
} from '../models';
import {
  advanceSpeaker,
  continueAfterReveal,
  createGame,
  resolveTie,
  revealNextPlayer,
  submitVotes,
  submitWhiteGuess,
} from './game-engine';
import { createSeededRng, Rng } from './rng';

const CIVILIAN_WORD = 'quả thanh long bí mật';
const SPY_WORD = 'quả vải thiều bí mật';

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    name: `Người ${index}`,
  }));
}

function startGame(playerCount: number, config: Partial<GameConfig>, seed: number) {
  const rng = createSeededRng(seed);
  const result = createGame({
    gameId: 'g',
    villageName: 'Ác Quỷ',
    players: makePlayers(playerCount),
    config: { ...DEFAULT_GAME_CONFIG, ...config },
    pair: { id: 'pair', civilianWord: CIVILIAN_WORD, spyWord: SPY_WORD },
    rng,
  });
  return { result, rng };
}

interface PlayOptions {
  /** Chọn người bị loại trong số ứng viên. Mặc định lấy người đầu danh sách. */
  chooseTarget?: (candidates: string[], state: GameState) => string;
  /** Chọn cách xử khi hoà phiếu. */
  tieChoice?: 'REVOTE' | 'NO_ELIMINATION';
  /** Mũ trắng đoán đúng hay sai. */
  whiteGuessesRight?: boolean;
  /**
   * Ép hoà cho `forceTieCount` lượt vote đầu tiên, sau đó vote dứt khoát.
   *
   * Cố tình KHÔNG có tuỳ chọn "hoà mãi mãi". Nếu cả bàn quyết định hoà ở mọi
   * lượt vote thì không ai bị loại và ván không bao giờ kết thúc — nhưng đó là
   * lựa chọn của người chơi chứ không phải lỗi của engine, và luật cho phép
   * "không loại ai" một cách có chủ đích. Engine chỉ có nghĩa vụ kết thúc khi
   * các lượt vote rốt cuộc có phân định.
   */
  forceTieCount?: number;
  /**
   * Luôn ép hoà khi chỉ còn đúng 2 người sống, để chạm vào nhánh bốc ngẫu
   * nhiên. Khác với forceTieCount, tuỳ chọn này không phụ thuộc vào việc đã
   * bỏ bao nhiêu lượt phiếu trước đó.
   */
  tieAtTwoAlive?: boolean;
}

/**
 * Chơi tự động tới khi ván kết thúc, thu lại mọi sự kiện dẫn chuyện.
 * Có bộ đếm chặn để test thất bại rõ ràng thay vì treo mãi nếu engine lặp.
 */
function playToEnd(
  state: GameState,
  rng: Rng,
  options: PlayOptions = {},
): { state: GameState; events: NarrationEvent[] } {
  const chooseTarget =
    options.chooseTarget ?? ((candidates: string[]) => candidates[0]);
  let current = state;
  const events: NarrationEvent[] = [];
  let steps = 0;
  let votesCast = 0;

  while (current.phase !== 'ENDED') {
    if (++steps > 1000) {
      throw new Error(
        `Ván không kết thúc sau 1000 bước. Pha hiện tại: ${current.phase}, ` +
          `còn sống: ${current.aliveIds.length}`,
      );
    }

    switch (current.phase) {
      case 'DEALING': {
        const step = revealNextPlayer(current, rng);
        current = step.state;
        events.push(...step.events);
        break;
      }
      case 'SPEAKING': {
        const step = advanceSpeaker(current, rng);
        current = step.state;
        events.push(...step.events);
        break;
      }
      case 'VOTING': {
        const candidates =
          current.tiedCandidateIds.length > 0
            ? current.tiedCandidateIds
            : current.aliveIds;

        const tally: Record<string, number> = {};
        const shouldTie =
          candidates.length >= 2 &&
          ((options.tieAtTwoAlive === true && current.aliveIds.length === 2) ||
            votesCast < (options.forceTieCount ?? 0));
        votesCast++;

        if (shouldTie) {
          tally[candidates[0]] = 1;
          tally[candidates[1]] = 1;
        } else {
          tally[chooseTarget([...candidates], current)] = 1;
        }

        const step = submitVotes(current, tally, rng);
        current = step.state;
        events.push(...step.events);
        break;
      }
      case 'TIE_BREAK': {
        const step = resolveTie(current, options.tieChoice ?? 'NO_ELIMINATION', rng);
        current = step.state;
        events.push(...step.events);
        break;
      }
      case 'WHITE_GUESS': {
        const guess = options.whiteGuessesRight ? CIVILIAN_WORD : 'hoàn toàn sai';
        const step = submitWhiteGuess(current, guess);
        current = step.state;
        events.push(...step.events);
        break;
      }
      case 'REVEAL': {
        const step = continueAfterReveal(current, rng);
        current = step.state;
        events.push(...step.events);
        break;
      }
    }
  }

  return { state: current, events };
}

describe('bất biến: ván luôn kết thúc', () => {
  it('đội hình 4 người có mũ trắng: mọi thứ tự loại người đều kết thúc', () => {
    const ids = ['p0', 'p1', 'p2', 'p3'];
    const orders: string[][] = [];
    for (const a of ids)
      for (const b of ids)
        for (const c of ids)
          for (const d of ids)
            if (new Set([a, b, c, d]).size === 4) orders.push([a, b, c, d]);

    expect(orders).toHaveLength(24);

    for (const order of orders) {
      for (const whiteGuessesRight of [false, true]) {
        const { result, rng } = startGame(4, { spyCount: 1, hasWhite: true }, 1);
        let cursor = 0;

        const ended = playToEnd(result.state, rng, {
          whiteGuessesRight,
          chooseTarget: (candidates) => {
            while (cursor < order.length && !candidates.includes(order[cursor])) {
              cursor++;
            }
            return cursor < order.length ? order[cursor++] : candidates[0];
          },
        });

        expect(ended.state.phase).toBe('ENDED');
        expect(['CIVILIANS', 'SPIES', 'WHITE']).toContain(ended.state.outcome);
      }
    }
  });

  it('mọi sĩ số và cấu hình hợp lệ đều kết thúc', () => {
    for (let players = 4; players <= 12; players++) {
      for (const hasWhite of [false, true]) {
        for (let spyCount = 1; spyCount <= 3; spyCount++) {
          const contested = hasWhite ? players - 1 : players;
          if (spyCount > Math.ceil(contested / 2) - 1) continue;

          for (let seed = 0; seed < 3; seed++) {
            const { result, rng } = startGame(
              players,
              { spyCount, hasWhite },
              seed,
            );
            const ended = playToEnd(result.state, rng);
            expect(ended.state.phase).toBe('ENDED');
            expect(ended.state.outcome).not.toBeNull();
          }
        }
      }
    }
  });

  it('một chuỗi hoà dài rồi vote dứt khoát thì vẫn kết thúc', () => {
    for (const tieChoice of ['REVOTE', 'NO_ELIMINATION'] as const) {
      for (let players = 4; players <= 7; players++) {
        const { result, rng } = startGame(
          players,
          { spyCount: 1, hasWhite: true },
          players,
        );
        const ended = playToEnd(result.state, rng, {
          forceTieCount: 8,
          tieChoice,
        });

        expect(ended.state.phase).toBe('ENDED');
        expect(ended.state.outcome).not.toBeNull();
      }
    }
  });

  it('chuỗi hoà không làm hỏng trạng thái: không ai chết, vòng vẫn tăng', () => {
    const { result, rng } = startGame(6, { spyCount: 1, hasWhite: true }, 3);

    // Chơi tới lượt vote đầu tiên rồi ép hoà và chọn không loại ai.
    let current = result.state;
    for (let i = 0; i < 6; i++) current = revealNextPlayer(current, rng).state;
    while (current.phase === 'SPEAKING') {
      current = advanceSpeaker(current, rng).state;
    }
    expect(current.phase).toBe('VOTING');

    const roundBeforeTie = current.round;
    const tied = submitVotes(current, { p0: 1, p1: 1 }, rng).state;
    expect(tied.phase).toBe('TIE_BREAK');

    const after = resolveTie(tied, 'NO_ELIMINATION', rng).state;
    expect(after.aliveIds).toHaveLength(6);
    expect(after.eliminations).toHaveLength(0);
    expect(after.round).toBe(roundBeforeTie + 1);
    expect(after.phase).toBe('SPEAKING');
    expect(after.revoteUsed).toBe(false);
    expect(after.tiedCandidateIds).toEqual([]);
  });

  it('kết quả cuối cùng luôn nhất quán với trạng thái người sống', () => {
    for (let seed = 0; seed < 25; seed++) {
      const { result, rng } = startGame(5, { spyCount: 1, hasWhite: true }, seed);
      const ended = playToEnd(result.state, rng);
      const { state } = ended;

      const roleOf = (id: string) => state.assignments[id].role;
      const aliveSpies = state.aliveIds.filter((id) => roleOf(id) === 'SPY').length;
      const aliveWhites = state.aliveIds.filter((id) => roleOf(id) === 'WHITE').length;
      const aliveCivilians = state.aliveIds.filter(
        (id) => roleOf(id) === 'CIVILIAN',
      ).length;

      expect(state.outcome).not.toBeNull();

      if (state.outcome === 'CIVILIANS') {
        expect(aliveSpies).toBe(0);
        expect(aliveWhites).toBe(0);
      } else if (state.outcome === 'SPIES') {
        expect(aliveSpies).toBeGreaterThanOrEqual(aliveCivilians + aliveWhites);
      } else {
        // Mũ trắng thắng: hoặc đoán trúng từ, hoặc là người sống sót cuối cùng.
        const guessedRight = state.whiteGuess?.correct === true;
        const lastOneStanding =
          aliveWhites === 1 && aliveCivilians === 0 && aliveSpies === 0;
        expect(guessedRight || lastOneStanding).toBe(true);
      }
    }
  });

  it('hoà ở đúng nước cờ hai người cuối vẫn kết thúc, không treo', () => {
    let reachedRandomTieBreak = 0;

    for (let seed = 0; seed < 30; seed++) {
      const { result, rng } = startGame(4, { spyCount: 1, hasWhite: true }, seed);
      const ended = playToEnd(result.state, rng, { tieAtTwoAlive: true });

      expect(ended.state.phase).toBe('ENDED');
      expect(ended.state.outcome).not.toBeNull();

      if (ended.state.eliminations.some((e) => e.byRandomTieBreak)) {
        reachedRandomTieBreak++;
      }
    }

    // Khẳng định nhánh bốc ngẫu nhiên thật sự được chạm tới. Không có dòng này
    // thì test vẫn xanh kể cả khi nó chưa bao giờ đi tới nước cờ hai người,
    // tức là chỉ lặp lại điều mà các test khác đã phủ.
    expect(reachedRandomTieBreak).toBeGreaterThan(0);
  });
});

describe('bất biến: không rò rỉ từ bí mật', () => {
  it('không sự kiện dẫn chuyện nào chứa từ của dân làng hay của gián điệp', () => {
    for (let players = 4; players <= 8; players++) {
      for (const hasWhite of [false, true]) {
        for (const revealSpyToSpy of [false, true]) {
          for (const whiteGuessesRight of [false, true]) {
            const { result, rng } = startGame(
              players,
              { spyCount: 1, hasWhite, revealSpyToSpy },
              players,
            );
            const ended = playToEnd(result.state, rng, { whiteGuessesRight });

            const serialized = JSON.stringify([
              ...result.events,
              ...ended.events,
            ]);

            expect(serialized).not.toContain(CIVILIAN_WORD);
            expect(serialized).not.toContain(SPY_WORD);
            expect(serialized).not.toContain('thanh long');
            expect(serialized).not.toContain('vải thiều');
          }
        }
      }
    }
  });

  it('payload sự kiện chỉ chứa đúng ba khoá được phép', () => {
    const allowed = new Set(['village', 'player', 'round']);
    const { result, rng } = startGame(6, { spyCount: 2, hasWhite: true }, 42);
    const ended = playToEnd(result.state, rng);

    for (const event of [...result.events, ...ended.events]) {
      for (const key of Object.keys(event.payload)) {
        expect(allowed.has(key)).toBe(true);
      }
    }
  });
});
