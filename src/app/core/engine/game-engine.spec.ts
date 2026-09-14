import { describe, expect, it } from 'vitest';
import { CardContent, DEFAULT_GAME_CONFIG, GameConfig, Player, Role } from '../models';
import {
  advanceSpeaker,
  buildCard,
  continueAfterReveal,
  createGame,
  NewGameInput,
  resolveTie,
  revealNextPlayer,
  submitVotes,
  submitWhiteGuess,
} from './game-engine';
import { createSeededRng, shuffle } from './rng';
import { makeState, TEST_CIVILIAN_WORD } from './testing/make-state';

const PAIR = { id: 'pair-1', civilianWord: 'con mèo', spyWord: 'con chó' };

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    name: `Người ${index}`,
  }));
}

function makeInput(overrides: Partial<NewGameInput> = {}): NewGameInput {
  return {
    gameId: 'g1',
    villageName: 'Ác Quỷ',
    players: makePlayers(6),
    pair: PAIR,
    rng: createSeededRng(2026),
    ...overrides,
    // Đặt sau cùng để cấu hình truyền vào luôn được trộn với mặc định,
    // thay vì thay thế nguyên khối.
    config: { ...DEFAULT_GAME_CONFIG, ...overrides.config },
  };
}

function nameOfPlayer(
  state: { players: Player[] },
  playerId: string,
): string {
  return state.players.find((player) => player.id === playerId)!.name;
}

describe('createGame', () => {
  it('phát đúng số lượng từng vai', () => {
    const { state } = createGame(
      makeInput({ config: { ...DEFAULT_GAME_CONFIG, spyCount: 2, hasWhite: true } }),
    );

    const roles = Object.values(state.assignments).map((a) => a.role);
    expect(roles.filter((r) => r === 'SPY')).toHaveLength(2);
    expect(roles.filter((r) => r === 'WHITE')).toHaveLength(1);
    expect(roles.filter((r) => r === 'CIVILIAN')).toHaveLength(3);
  });

  it('phát từ đúng theo vai, mũ trắng không có từ', () => {
    const { state } = createGame(
      makeInput({ config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, hasWhite: true } }),
    );

    for (const assignment of Object.values(state.assignments)) {
      if (assignment.role === 'WHITE') expect(assignment.word).toBeNull();
      else if (assignment.role === 'SPY') expect(assignment.word).toBe('con chó');
      else expect(assignment.word).toBe('con mèo');
    }
  });

  it('bắt đầu ở pha chia bài, vòng 1, mọi người còn sống', () => {
    const { state } = createGame(makeInput());

    expect(state.phase).toBe('DEALING');
    expect(state.round).toBe(1);
    expect(state.dealtCount).toBe(0);
    expect(state.aliveIds).toHaveLength(6);
    expect(state.outcome).toBeNull();
  });

  it('phát sự kiện mở ván và sự kiện chuyền máy cho người đầu tiên', () => {
    const { events } = createGame(makeInput());

    expect(events[0]).toEqual({
      type: 'GAME_START',
      payload: { village: 'Ác Quỷ' },
    });
    expect(events[1]).toEqual({
      type: 'PASS_DEVICE',
      payload: { player: 'Người 0' },
    });
  });

  it('cùng hạt giống thì chia vai giống hệt nhau', () => {
    const first = createGame(makeInput({ rng: createSeededRng(7) }));
    const second = createGame(makeInput({ rng: createSeededRng(7) }));

    expect(first.state.assignments).toEqual(second.state.assignments);
  });

  it('không phải lúc nào người đầu danh sách cũng nhận cùng một vai', () => {
    const roles = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const { state } = createGame(makeInput({ rng: createSeededRng(seed) }));
      roles.add(state.assignments['p0'].role);
    }
    expect(roles.size).toBeGreaterThan(1);
  });

  it('từ chối đội hình không hợp lệ', () => {
    expect(() =>
      createGame(
        makeInput({
          players: makePlayers(6),
          config: { ...DEFAULT_GAME_CONFIG, spyCount: 3 },
        }),
      ),
    ).toThrow(/tối đa 2 gián điệp/);
  });

  it('từ chối khi dưới 4 người', () => {
    expect(() => createGame(makeInput({ players: makePlayers(3) }))).toThrow(
      /ít nhất 4 người/,
    );
  });
});

describe('buildCard', () => {
  function cardsByRole(revealSpyToSpy: boolean) {
    const { state } = createGame(
      makeInput({
        rng: createSeededRng(5),
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, hasWhite: true, revealSpyToSpy },
      }),
    );

    const find = (role: string) =>
      Object.values(state.assignments).find((a) => a.role === role)!.playerId;

    return {
      civilian: buildCard(state, find('CIVILIAN')),
      spy: buildCard(state, find('SPY')),
      white: buildCard(state, find('WHITE')),
    };
  }

  it('Bật mí tắt: thẻ dân làng và thẻ gián điệp chỉ khác đúng cái từ', () => {
    const { civilian, spy } = cardsByRole(false);

    expect(civilian).toEqual({ roleLabel: null, word: 'con mèo', note: null });
    expect(spy).toEqual({ roleLabel: null, word: 'con chó', note: null });

    // So sánh toàn bộ dữ liệu dựng thẻ sau khi trung hoà trường từ:
    // mọi trường còn lại phải trùng khớp tuyệt đối.
    const withoutWord = (card: CardContent): CardContent => ({ ...card, word: null });
    expect(withoutWord(civilian)).toEqual(withoutWord(spy));
  });

  it('Bật mí bật: cả hai vai đều được ghi nhãn, bố cục vẫn giống nhau', () => {
    const { civilian, spy } = cardsByRole(true);

    expect(civilian).toEqual({
      roleLabel: 'Bạn là DÂN LÀNG',
      word: 'con mèo',
      note: null,
    });
    expect(spy).toEqual({
      roleLabel: 'Bạn là GIÁN ĐIỆP',
      word: 'con chó',
      note: null,
    });

    // Cùng hình dạng: cùng tập trường, cùng trường nào có giá trị và trường nào null.
    const shape = (card: CardContent) =>
      Object.fromEntries(
        Object.entries(card).map(([key, value]) => [key, value === null]),
      );
    expect(shape(civilian)).toEqual(shape(spy));
  });

  it('mũ trắng luôn biết mình là mũ trắng, ở cả hai chế độ', () => {
    const expected = {
      roleLabel: 'Bạn là MŨ TRẮNG',
      word: null,
      note: 'Bạn không có từ nào',
    };

    expect(cardsByRole(false).white).toEqual(expected);
    expect(cardsByRole(true).white).toEqual(expected);
  });

  it('báo lỗi khi hỏi thẻ của người không tồn tại', () => {
    const { state } = createGame(makeInput());
    expect(() => buildCard(state, 'khong-co-ai')).toThrow();
  });
});

describe('revealNextPlayer', () => {
  it('chuyền máy lần lượt theo đúng thứ tự danh sách', () => {
    const rng = createSeededRng(11);
    let result = createGame(makeInput({ players: makePlayers(4), rng }));

    result = revealNextPlayer(result.state, rng);
    expect(result.state.dealtCount).toBe(1);
    expect(result.events).toEqual([
      { type: 'PASS_DEVICE', payload: { player: 'Người 1' } },
    ]);

    result = revealNextPlayer(result.state, rng);
    expect(result.events).toEqual([
      { type: 'PASS_DEVICE', payload: { player: 'Người 2' } },
    ]);
  });

  it('người cuối cùng xem xong thì tự mở vòng nói đầu tiên', () => {
    const rng = createSeededRng(11);
    let result = createGame(makeInput({ players: makePlayers(4), rng }));

    for (let i = 0; i < 4; i++) {
      result = revealNextPlayer(result.state, rng);
    }

    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.round).toBe(1);
    expect(result.state.speakingOrder).toHaveLength(4);
    expect([...result.state.speakingOrder].sort()).toEqual([
      'p0',
      'p1',
      'p2',
      'p3',
    ]);
    expect(result.state.speakerIndex).toBe(0);

    expect(result.events.map((event) => event.type)).toEqual([
      'ROUND_START',
      'SPEAKER_TURN',
    ]);
  });

  it('thứ tự nói không phải lúc nào cũng trùng thứ tự danh sách', () => {
    const orders = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const rng = createSeededRng(seed);
      let result = createGame(makeInput({ players: makePlayers(5), rng }));
      for (let i = 0; i < 5; i++) result = revealNextPlayer(result.state, rng);
      orders.add(result.state.speakingOrder.join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('báo lỗi khi gọi ngoài pha chia bài', () => {
    const rng = createSeededRng(11);
    let result = createGame(makeInput({ players: makePlayers(4), rng }));
    for (let i = 0; i < 4; i++) result = revealNextPlayer(result.state, rng);

    expect(() => revealNextPlayer(result.state, rng)).toThrow(/chia bài/);
  });
});

describe('mũ trắng hiếm khi phải nói đầu', () => {
  const COUNT = 4;
  const CONFIG = { ...DEFAULT_GAME_CONFIG, spyCount: 1, hasWhite: true };

  /**
   * Chia hết bài với một hạt giống, đồng thời tính sẵn HAI thứ tự mà
   * `startFirstRound` bốc được từ chính dãy số đó.
   *
   * Có cả hai lượt bốc thì bài kiểm mới nói được "dùng đúng lượt thứ hai",
   * thay vì chỉ nói "người đầu không phải mũ trắng" — mệnh đề yếu hơn nhiều,
   * và một bản cài sai vẫn thoả mãn được nó.
   */
  function play(seed: number) {
    const ids = makePlayers(COUNT).map((player) => player.id);

    // Dãy số dùng cho việc dò: cho createGame ăn đúng phần đầu như ván thật,
    // nên hai lượt xáo tiếp theo chính là hai lượt startFirstRound sẽ bốc.
    const probe = createSeededRng(seed);
    createGame(makeInput({ players: makePlayers(COUNT), config: CONFIG, rng: probe }));
    const draw1 = shuffle(probe, ids);
    const draw2 = shuffle(probe, ids);

    // Ván thật: một nguồn ngẫu nhiên duy nhất xuyên suốt, giống hệt store.
    const rng = createSeededRng(seed);
    let result = createGame(
      makeInput({ players: makePlayers(COUNT), config: CONFIG, rng }),
    );
    for (let i = 0; i < COUNT; i++) result = revealNextPlayer(result.state, rng);

    const whiteId = Object.values(result.state.assignments).find(
      (assignment) => assignment.role === 'WHITE',
    )!.playerId;

    return { order: result.state.speakingOrder, draw1, draw2, whiteId };
  }

  function findSeed(wanted: (played: ReturnType<typeof play>) => boolean): number {
    for (let seed = 0; seed < 5000; seed++) {
      if (wanted(play(seed))) return seed;
    }
    throw new Error('không tìm được hạt giống thoả điều kiện');
  }

  it('lượt bốc đầu đưa mũ trắng lên đầu thì bốc lại và dùng lượt thứ hai', () => {
    const seed = findSeed(
      (p) => p.draw1[0] === p.whiteId && p.draw2[0] !== p.whiteId,
    );
    const { order, draw2, whiteId } = play(seed);

    expect(order).toEqual(draw2);
    expect(order[0]).not.toBe(whiteId);
  });

  it('bốc lại vẫn trúng mũ trắng thì chịu, không bốc mãi', () => {
    const seed = findSeed(
      (p) => p.draw1[0] === p.whiteId && p.draw2[0] === p.whiteId,
    );
    const { order, draw2, whiteId } = play(seed);

    // Chốt chặn quan trọng nhất của cả nhóm này. Không có nó thì một bản cài
    // "bốc lại cho tới khi nào được" vẫn xanh, mà bản đó ăn số ngẫu nhiên
    // không biết trước bao nhiêu lần — thứ rng.ts đã dặn là phải tránh.
    expect(order).toEqual(draw2);
    expect(order[0]).toBe(whiteId);
  });

  it('mũ trắng không đứng đầu thì không bốc lại', () => {
    const seed = findSeed((p) => p.draw1[0] !== p.whiteId);
    const { order, draw1 } = play(seed);

    expect(order).toEqual(draw1);
  });
});

describe('advanceSpeaker', () => {
  /** Chia bài xong xuôi cho `count` người, trả về state ở pha nói vòng 1. */
  function dealt(count: number, seed: number, config?: Partial<GameConfig>) {
    const rng = createSeededRng(seed);
    let result = createGame(
      makeInput({
        players: makePlayers(count),
        rng,
        config: { ...DEFAULT_GAME_CONFIG, ...config },
      }),
    );
    for (let i = 0; i < count; i++) result = revealNextPlayer(result.state, rng);
    return { state: result.state, rng };
  }

  it('đi qua từng người trong vòng và báo tên người kế tiếp', () => {
    const { state, rng } = dealt(4, 21);

    const result = advanceSpeaker(state, rng);
    expect(result.state.speakerIndex).toBe(1);
    expect(result.events).toEqual([
      {
        type: 'SPEAKER_TURN',
        payload: { player: nameOfPlayer(state, state.speakingOrder[1]) },
      },
    ]);
  });

  it('hết vòng mà chưa đủ số vòng tối thiểu thì sang vòng tiếp theo', () => {
    let { state, rng } = dealt(4, 21);

    for (let i = 0; i < 4; i++) state = advanceSpeaker(state, rng).state;

    expect(state.round).toBe(2);
    expect(state.phase).toBe('SPEAKING');
    expect(state.speakerIndex).toBe(0);
  });

  it('vote mở đúng ở cuối vòng 3 với thiết lập mặc định', () => {
    let { state, rng } = dealt(4, 21);

    // Vòng 1 và vòng 2 trôi qua, vẫn ở pha nói.
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < 4; i++) state = advanceSpeaker(state, rng).state;
      expect(state.phase).toBe('SPEAKING');
    }
    expect(state.round).toBe(3);

    // Ba người đầu của vòng 3 nói xong, vẫn chưa mở vote.
    for (let i = 0; i < 3; i++) state = advanceSpeaker(state, rng).state;
    expect(state.phase).toBe('SPEAKING');

    // Người thứ tư nói xong thì vote mở ngay.
    const opened = advanceSpeaker(state, rng);
    expect(opened.state.phase).toBe('VOTING');
    expect(opened.state.round).toBe(3);
    expect(opened.events).toEqual([
      { type: 'VOTE_OPEN', payload: { village: 'Ác Quỷ', round: 3 } },
    ]);
  });

  it('tôn trọng thiết lập số vòng tối thiểu khác mặc định', () => {
    let { state, rng } = dealt(4, 21, { minRoundsBeforeVote: 1 });

    for (let i = 0; i < 4; i++) state = advanceSpeaker(state, rng).state;

    expect(state.phase).toBe('VOTING');
    expect(state.round).toBe(1);
  });

  it('sang vòng mới vẫn giữ nguyên thứ tự nói của ván', () => {
    for (let seed = 0; seed < 25; seed++) {
      let { state, rng } = dealt(5, seed);
      const before = state.speakingOrder.join(',');

      for (let i = 0; i < 5; i++) state = advanceSpeaker(state, rng).state;

      expect(state.round).toBe(2);
      expect(state.speakingOrder.join(',')).toBe(before);
      expect(state.speakerIndex).toBe(0);
    }
  });

  it('mở vote thì xoá sạch dấu vết lượt vote trước', () => {
    let { state, rng } = dealt(4, 21, { minRoundsBeforeVote: 1 });
    state = { ...state, tiedCandidateIds: ['p0'], revoteUsed: true };

    for (let i = 0; i < 4; i++) state = advanceSpeaker(state, rng).state;

    expect(state.tiedCandidateIds).toEqual([]);
    expect(state.revoteUsed).toBe(false);
  });

  it('báo lỗi khi gọi ngoài pha nói', () => {
    const { state, rng } = dealt(4, 21);
    const voting = { ...state, phase: 'VOTING' as const };
    expect(() => advanceSpeaker(voting, rng)).toThrow(/pha nói/);
  });
});

describe('submitVotes', () => {
  /** Dựng nhanh một state đang ở pha vote, dùng makeState cho gọn. */
  function voting(roles: Role[], aliveIndexes: number[]) {
    return makeState({ roles, aliveIndexes, phase: 'VOTING', round: 3 });
  }

  it('loại người nhiều phiếu nhất và chuyển sang pha lộ danh tính', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]);
    const result = submitVotes(state, { p0: 3, p3: 1 }, createSeededRng(1));

    expect(result.state.aliveIds).toEqual(['p1', 'p2', 'p3']);
    expect(result.state.phase).toBe('REVEAL');
    expect(result.state.eliminations).toEqual([
      { round: 3, playerId: 'p0', role: 'CIVILIAN', byRandomTieBreak: false },
    ]);
    expect(result.events).toEqual([
      { type: 'CIVILIAN_KILLED', payload: { player: 'Người 0', village: 'Thử Nghiệm' } },
    ]);
  });

  it('bắt được gián điệp thì phát sự kiện riêng', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]);
    const result = submitVotes(state, { p3: 3 }, createSeededRng(1));

    expect(result.events[0].type).toBe('SPY_CAUGHT');
  });

  it('loại mũ trắng thì chuyển thẳng sang pha đoán từ', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [0, 1, 2, 3]);
    const result = submitVotes(state, { p3: 3 }, createSeededRng(1));

    expect(result.state.phase).toBe('WHITE_GUESS');
    expect(result.events[0].type).toBe('WHITE_REVEALED');
  });

  it('hoà phiếu thì chuyển sang pha xử hoà và ghi lại danh sách hoà', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]);
    const result = submitVotes(state, { p0: 2, p3: 2 }, createSeededRng(1));

    expect(result.state.phase).toBe('TIE_BREAK');
    expect([...result.state.tiedCandidateIds].sort()).toEqual(['p0', 'p3']);
    expect(result.state.aliveIds).toHaveLength(4);
    expect(result.events[0].type).toBe('VOTE_TIE');
  });

  it('bỏ phiếu lại mà vẫn hoà thì không loại ai và sang vòng mới', () => {
    const state = {
      ...voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]),
      tiedCandidateIds: ['p0', 'p3'],
      revoteUsed: true,
    };
    const result = submitVotes(state, { p0: 2, p3: 2 }, createSeededRng(1));

    expect(result.state.aliveIds).toHaveLength(4);
    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.round).toBe(4);
    expect(result.events[0].type).toBe('NO_ELIMINATION');
  });

  it('chỉ còn 2 người sống mà hoà thì bốc ngẫu nhiên, không treo ván', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [0, 3]);
    const result = submitVotes(state, { p0: 1, p3: 1 }, createSeededRng(4));

    expect(result.state.aliveIds).toHaveLength(1);
    expect(result.state.eliminations[0].byRandomTieBreak).toBe(true);
    expect(result.events[0].type).toBe('RANDOM_TIE_BREAK');
  });

  it('bốc ngẫu nhiên ở 2 người cuối không thiên vị một phía', () => {
    const eliminated = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const state = voting(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [0, 3]);
      const result = submitVotes(state, { p0: 1, p3: 1 }, createSeededRng(seed));
      eliminated.add(result.state.eliminations[0].playerId);
    }
    expect(eliminated).toEqual(new Set(['p0', 'p3']));
  });

  it('từ chối bảng phiếu không hợp lệ', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]);

    expect(() => submitVotes(state, { p0: 5 }, createSeededRng(1))).toThrow(
      /không hợp lệ/,
    );
    expect(() => submitVotes(state, {}, createSeededRng(1))).toThrow(/không hợp lệ/);
  });

  it('ở lượt bỏ phiếu lại chỉ những người đang hoà mới được nhận phiếu', () => {
    const state = {
      ...voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]),
      tiedCandidateIds: ['p0', 'p3'],
      revoteUsed: true,
    };

    expect(() => submitVotes(state, { p1: 2 }, createSeededRng(1))).toThrow(
      /không hợp lệ/,
    );
  });

  it('báo lỗi khi gọi ngoài pha vote', () => {
    const state = makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'] });
    expect(() => submitVotes(state, { p0: 1 }, createSeededRng(1))).toThrow(/pha vote/);
  });
});

describe('resolveTie', () => {
  function tieBreak() {
    return makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'],
      aliveIndexes: [0, 1, 2, 3],
      phase: 'TIE_BREAK',
      round: 3,
      tiedCandidateIds: ['p0', 'p3'],
    });
  }

  it('chọn bỏ phiếu lại thì quay về pha vote và đánh dấu đã dùng quyền', () => {
    const result = resolveTie(tieBreak(), 'REVOTE', createSeededRng(1));

    expect(result.state.phase).toBe('VOTING');
    expect(result.state.revoteUsed).toBe(true);
    expect(result.state.tiedCandidateIds).toEqual(['p0', 'p3']);
    expect(result.state.round).toBe(3);
    expect(result.events[0].type).toBe('VOTE_OPEN');
  });

  it('chọn không loại ai thì sang vòng nói mới và không ai chết', () => {
    const result = resolveTie(tieBreak(), 'NO_ELIMINATION', createSeededRng(1));

    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.round).toBe(4);
    expect(result.state.aliveIds).toHaveLength(4);
    expect(result.state.eliminations).toHaveLength(0);
    expect(result.state.tiedCandidateIds).toEqual([]);
    expect(result.state.revoteUsed).toBe(false);
    expect(result.events[0].type).toBe('NO_ELIMINATION');
  });

  it('sau khi bỏ phiếu lại, người ngoài danh sách hoà không nhận được phiếu', () => {
    const revoting = resolveTie(tieBreak(), 'REVOTE', createSeededRng(1)).state;

    expect(() => submitVotes(revoting, { p1: 2 }, createSeededRng(1))).toThrow(
      /không hợp lệ/,
    );

    const decided = submitVotes(revoting, { p0: 3, p3: 1 }, createSeededRng(1));
    expect(decided.state.eliminations[0].playerId).toBe('p0');
  });

  it('bỏ phiếu lại rồi vẫn hoà thì tự động không loại ai', () => {
    const revoting = resolveTie(tieBreak(), 'REVOTE', createSeededRng(1)).state;
    const result = submitVotes(revoting, { p0: 2, p3: 2 }, createSeededRng(1));

    expect(result.state.aliveIds).toHaveLength(4);
    expect(result.state.phase).toBe('SPEAKING');
    expect(result.events[0].type).toBe('NO_ELIMINATION');
  });

  it('báo lỗi khi gọi ngoài pha xử hoà', () => {
    const state = makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'] });
    expect(() => resolveTie(state, 'REVOTE', createSeededRng(1))).toThrow(/xử hoà/);
  });
});

describe('submitWhiteGuess', () => {
  function whiteGuessing(aliveIndexes: number[]) {
    return makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes,
      phase: 'WHITE_GUESS',
      round: 3,
    });
  }

  it('đoán đúng thì mũ trắng thắng ngay, ván dừng lập tức', () => {
    const result = submitWhiteGuess(whiteGuessing([0, 1, 2]), TEST_CIVILIAN_WORD);

    expect(result.state.phase).toBe('ENDED');
    expect(result.state.outcome).toBe('WHITE');
    expect(result.state.whiteGuess).toEqual({
      text: TEST_CIVILIAN_WORD,
      correct: true,
    });
    expect(result.events.map((event) => event.type)).toEqual([
      'WHITE_GUESS_CORRECT',
      'WHITE_WIN',
    ]);
  });

  it('chấp nhận đoán đúng dù thiếu dấu', () => {
    const result = submitWhiteGuess(
      whiteGuessing([0, 1, 2]),
      'qua thanh long bi mat',
    );

    expect(result.state.outcome).toBe('WHITE');
  });

  it('đoán đúng thắng đè cả lên tình huống gián điệp đang áp đảo', () => {
    // Còn 1 dân và 1 gián điệp: bình thường là gián điệp thắng.
    const result = submitWhiteGuess(whiteGuessing([0, 2]), TEST_CIVILIAN_WORD);

    expect(result.state.outcome).toBe('WHITE');
  });

  it('đoán sai thì rời ván và chuyển sang pha lộ danh tính', () => {
    const result = submitWhiteGuess(whiteGuessing([0, 1, 2]), 'cái bàn gỗ');

    expect(result.state.phase).toBe('REVEAL');
    expect(result.state.outcome).toBeNull();
    expect(result.state.whiteGuess).toEqual({ text: 'cái bàn gỗ', correct: false });
    expect(result.events.map((event) => event.type)).toEqual(['WHITE_GUESS_WRONG']);
  });

  it('báo lỗi khi gọi ngoài pha đoán từ', () => {
    const state = makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'] });
    expect(() => submitWhiteGuess(state, 'gì đó')).toThrow(/đoán từ/);
  });
});

describe('continueAfterReveal', () => {
  function revealed(roles: Role[], aliveIndexes: number[]) {
    return makeState({ roles, aliveIndexes, phase: 'REVEAL', round: 3 });
  }

  it('ván chưa ngã ngũ thì sang vòng nói mới', () => {
    const state = revealed(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 3]);
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.round).toBe(4);
    expect(result.state.speakerIndex).toBe(0);
    expect([...result.state.speakingOrder].sort()).toEqual(['p0', 'p1', 'p3']);
    expect(result.events.map((event) => event.type)).toEqual([
      'ROUND_START',
      'SPEAKER_TURN',
    ]);
  });

  it('giữ nguyên thứ tự của ván, chỉ bỏ người vừa bị loại', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'],
      aliveIndexes: [0, 1, 3],
      phase: 'REVEAL',
      round: 3,
      speakingOrder: ['p3', 'p2', 'p0', 'p1'],
    });

    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.speakingOrder).toEqual(['p3', 'p0', 'p1']);
  });

  it('dân làng thắng thì kết thúc và phát đúng sự kiện', () => {
    const state = revealed(['CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1]);
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.phase).toBe('ENDED');
    expect(result.state.outcome).toBe('CIVILIANS');
    expect(result.events).toEqual([
      { type: 'CIVILIANS_WIN', payload: { village: 'Thử Nghiệm' } },
    ]);
  });

  it('gián điệp thắng thì kết thúc và phát đúng sự kiện', () => {
    const state = revealed(['CIVILIAN', 'CIVILIAN', 'SPY'], [0, 2]);
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.outcome).toBe('SPIES');
    expect(result.events[0].type).toBe('SPIES_WIN');
  });

  it('chỉ còn mũ trắng sống một mình thì mũ trắng thắng', () => {
    const state = revealed(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [3]);
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.outcome).toBe('WHITE');
    expect(result.events[0].type).toBe('WHITE_WIN');
  });

  it('hết gián điệp mà mũ trắng còn sống thì ván tiếp tục', () => {
    const state = revealed(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [0, 1, 3]);
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.outcome).toBeNull();
  });

  it('mũ trắng đoán sai rồi thì trận tiếp tục bình thường', () => {
    const state = {
      ...revealed(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [0, 1, 2]),
      whiteGuess: { text: 'sai bét', correct: false },
    };
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.outcome).toBeNull();
  });

  it('báo lỗi khi gọi ngoài pha lộ danh tính', () => {
    const state = makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'] });
    expect(() => continueAfterReveal(state, createSeededRng(9))).toThrow(
      /lộ danh tính/,
    );
  });
});
