import { describe, expect, it } from 'vitest';
import { CardContent, DEFAULT_GAME_CONFIG, GameConfig, Player } from '../models';
import {
  buildCard,
  createGame,
  NewGameInput,
  revealNextPlayer,
} from './game-engine';
import { createSeededRng } from './rng';

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
