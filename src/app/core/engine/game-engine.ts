import {
  Assignment,
  CardContent,
  GameConfig,
  GameState,
  NarrationEvent,
  Player,
  Role,
} from '../models';
import { Rng, shuffle } from './rng';
import { validateTeam } from './team-rules';

export interface EngineResult {
  state: GameState;
  events: NarrationEvent[];
}

export interface NewGameInput {
  gameId: string;
  villageName: string;
  players: Player[];
  config: GameConfig;
  pair: { id: string; civilianWord: string; spyWord: string };
  rng: Rng;
}

function buildRoleDeck(config: GameConfig, playerCount: number): Role[] {
  const deck: Role[] = [];
  for (let i = 0; i < config.spyCount; i++) deck.push('SPY');
  if (config.hasWhite) deck.push('WHITE');
  while (deck.length < playerCount) deck.push('CIVILIAN');
  return deck;
}

export function createGame(input: NewGameInput): EngineResult {
  const { players, config, pair } = input;

  const validation = validateTeam(players.length, config.spyCount, config.hasWhite);
  if (!validation.valid) throw new Error(validation.reason);

  const deck = shuffle(input.rng, buildRoleDeck(config, players.length));

  const assignments: Record<string, Assignment> = {};
  players.forEach((player, index) => {
    const role = deck[index];
    assignments[player.id] = {
      playerId: player.id,
      role,
      word:
        role === 'WHITE'
          ? null
          : role === 'SPY'
            ? pair.spyWord
            : pair.civilianWord,
    };
  });

  const state: GameState = {
    id: input.gameId,
    villageName: input.villageName,
    config,
    pairId: pair.id,
    civilianWord: pair.civilianWord,
    spyWord: pair.spyWord,
    players: [...players],
    assignments,
    dealtCount: 0,
    round: 1,
    speakingOrder: [],
    speakerIndex: 0,
    aliveIds: players.map((player) => player.id),
    eliminations: [],
    tiedCandidateIds: [],
    revoteUsed: false,
    whiteGuess: null,
    phase: 'DEALING',
    outcome: null,
  };

  return {
    state,
    events: [
      { type: 'GAME_START', payload: { village: state.villageName } },
      { type: 'PASS_DEVICE', payload: { player: players[0].name } },
    ],
  };
}

/**
 * Nội dung thẻ chia bài. Component render CHỈ được đọc kết quả của hàm này.
 * Khi tắt Bật mí, thẻ dân làng và thẻ gián điệp trả về cùng hình dạng và chỉ
 * khác đúng trường word, nên không thể suy ra vai từ thẻ.
 */
export function buildCard(state: GameState, playerId: string): CardContent {
  const assignment = state.assignments[playerId];
  if (!assignment) {
    throw new Error(`buildCard: không tìm thấy người chơi ${playerId}`);
  }

  if (assignment.role === 'WHITE') {
    return {
      roleLabel: 'Bạn là MŨ TRẮNG',
      word: null,
      note: 'Bạn không có từ nào',
    };
  }

  if (!state.config.revealSpyToSpy) {
    return { roleLabel: null, word: assignment.word, note: null };
  }

  return {
    roleLabel: assignment.role === 'SPY' ? 'Bạn là GIÁN ĐIỆP' : 'Bạn là DÂN LÀNG',
    word: assignment.word,
    note: null,
  };
}

function nameOf(state: GameState, playerId: string): string {
  return state.players.find((player) => player.id === playerId)?.name ?? '';
}

/**
 * Mở một vòng nói mới: xáo lại thứ tự trong số người còn sống và đưa về
 * người nói đầu tiên. Cũng dọn sạch dấu vết của lượt vote trước.
 */
function startRound(state: GameState, rng: Rng): EngineResult {
  const speakingOrder = shuffle(rng, state.aliveIds);
  const next: GameState = {
    ...state,
    phase: 'SPEAKING',
    speakingOrder,
    speakerIndex: 0,
    tiedCandidateIds: [],
    revoteUsed: false,
  };

  return {
    state: next,
    events: [
      { type: 'ROUND_START', payload: { village: next.villageName, round: next.round } },
      { type: 'SPEAKER_TURN', payload: { player: nameOf(next, speakingOrder[0]) } },
    ],
  };
}

export function revealNextPlayer(state: GameState, rng: Rng): EngineResult {
  if (state.phase !== 'DEALING') {
    throw new Error('revealNextPlayer: chỉ gọi được ở pha chia bài');
  }

  const dealtCount = state.dealtCount + 1;
  const dealt: GameState = { ...state, dealtCount };

  if (dealtCount < state.players.length) {
    return {
      state: dealt,
      events: [
        { type: 'PASS_DEVICE', payload: { player: state.players[dealtCount].name } },
      ],
    };
  }

  return startRound(dealt, rng);
}

/**
 * Người đang nói bấm xong lượt.
 *
 * Cách đếm vòng: round bắt đầu từ 1 và là số thứ tự của vòng đang diễn ra.
 * Khi người cuối cùng nói xong, nếu round đã đạt minRoundsBeforeVote thì mở
 * vote ngay tại đây và round giữ nguyên; nếu chưa thì tăng round và mở vòng
 * mới. Với mặc định 3, lần vote đầu tiên rơi vào cuối vòng 3.
 */
export function advanceSpeaker(state: GameState, rng: Rng): EngineResult {
  if (state.phase !== 'SPEAKING') {
    throw new Error('advanceSpeaker: chỉ gọi được ở pha nói');
  }

  const speakerIndex = state.speakerIndex + 1;

  if (speakerIndex < state.speakingOrder.length) {
    const next: GameState = { ...state, speakerIndex };
    return {
      state: next,
      events: [
        {
          type: 'SPEAKER_TURN',
          payload: { player: nameOf(next, next.speakingOrder[speakerIndex]) },
        },
      ],
    };
  }

  if (state.round >= state.config.minRoundsBeforeVote) {
    const next: GameState = {
      ...state,
      phase: 'VOTING',
      tiedCandidateIds: [],
      revoteUsed: false,
    };
    return {
      state: next,
      events: [
        { type: 'VOTE_OPEN', payload: { village: next.villageName, round: next.round } },
      ],
    };
  }

  return startRound({ ...state, round: state.round + 1 }, rng);
}
