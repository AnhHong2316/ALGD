import {
  Assignment,
  CardContent,
  GameConfig,
  GameState,
  NarrationEvent,
  NarrationEventType,
  Player,
  Role,
} from '../models';
import { Rng, pickIndex, shuffle } from './rng';
import { validateTeam } from './team-rules';
import { findVoteLeaders, isTallyValid, VoteTally } from './vote-resolver';
import { isGuessCorrect } from './guess-matcher';
import { evaluateOutcome } from './win-conditions';

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
 * Mở một vòng nói: đưa về người đầu `speakingOrder` và dọn sạch dấu vết của
 * lượt vote trước.
 */
function openRound(state: GameState): EngineResult {
  const next: GameState = {
    ...state,
    phase: 'SPEAKING',
    speakerIndex: 0,
    tiedCandidateIds: [],
    revoteUsed: false,
  };

  return {
    state: next,
    events: [
      { type: 'ROUND_START', payload: { village: next.villageName, round: next.round } },
      { type: 'SPEAKER_TURN', payload: { player: nameOf(next, next.speakingOrder[0]) } },
    ],
  };
}

/**
 * Vòng đầu ván: xáo thứ tự nói, dùng cho suốt ván.
 *
 * Nếu mũ trắng rơi vào ghế đầu thì bốc lại ĐÚNG một lần rồi lấy kết quả đó,
 * dù lần hai có lại ra mũ trắng hay không. Nói đầu là chỗ tệ nhất cho mũ
 * trắng: họ không có từ nào, phải nghe gợi ý của người khác mới lần ra chủ
 * đề, nên đi đầu gần như tự lộ. Bốc lại một lần kéo xác suất từ 1/n xuống
 * 1/n² — với 6 người là từ 16,7% xuống 2,8%.
 *
 * Cố ý KHÔNG bốc cho tới khi nào được, vì hai lẽ. Một: vòng lặp không chặn số
 * lần sẽ ăn số ngẫu nhiên không biết trước bao nhiêu lần, mà rng.ts đã dặn số
 * lần gọi rng() là hành vi quan sát được. Hai: chừng nào xác suất chưa bằng 0
 * thì không ai loại trừ được người nói đầu khỏi diện nghi — đưa nó về 0 là
 * cho không cả bàn một mẩu thông tin.
 */
function startFirstRound(state: GameState, rng: Rng): EngineResult {
  const drawn = shuffle(rng, state.aliveIds);
  const speakingOrder =
    state.assignments[drawn[0]].role === 'WHITE'
      ? shuffle(rng, state.aliveIds)
      : drawn;

  return openRound({ ...state, speakingOrder });
}

/** Vòng sau: giữ nguyên thứ tự của ván, chỉ lọc bỏ người đã bị loại. */
function startNextRound(state: GameState): EngineResult {
  return openRound({
    ...state,
    round: state.round + 1,
    speakingOrder: state.speakingOrder.filter((id) => state.aliveIds.includes(id)),
  });
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

  return startFirstRound(dealt, rng);
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

  return startNextRound(state);
}

/** Loại một người và chuyển sang pha lộ danh tính tương ứng với vai của họ. */
function eliminate(
  state: GameState,
  playerId: string,
  byRandomTieBreak: boolean,
): EngineResult {
  const role = state.assignments[playerId].role;
  const playerName = nameOf(state, playerId);

  const next: GameState = {
    ...state,
    aliveIds: state.aliveIds.filter((id) => id !== playerId),
    eliminations: [
      ...state.eliminations,
      { round: state.round, playerId, role, byRandomTieBreak },
    ],
    tiedCandidateIds: [],
    revoteUsed: false,
    phase: role === 'WHITE' ? 'WHITE_GUESS' : 'REVEAL',
  };

  const events: NarrationEvent[] = [];
  if (byRandomTieBreak) {
    events.push({ type: 'RANDOM_TIE_BREAK', payload: { player: playerName } });
  }

  const payload = { player: playerName, village: state.villageName };
  if (role === 'WHITE') events.push({ type: 'WHITE_REVEALED', payload });
  else if (role === 'SPY') events.push({ type: 'SPY_CAUGHT', payload });
  else events.push({ type: 'CIVILIAN_KILLED', payload });

  return { state: next, events };
}

/** Vòng này không ai bị loại: quay lại vòng nói, không kiểm tra kết thúc. */
function noElimination(state: GameState): EngineResult {
  const started = startNextRound(state);
  return {
    state: started.state,
    events: [
      {
        type: 'NO_ELIMINATION',
        payload: { village: state.villageName, round: state.round },
      },
      ...started.events,
    ],
  };
}

export function submitVotes(
  state: GameState,
  tally: VoteTally,
  rng: Rng,
): EngineResult {
  if (state.phase !== 'VOTING') {
    throw new Error('submitVotes: chỉ gọi được ở pha vote');
  }

  // Ở lượt bỏ phiếu lại, chỉ những người đang hoà mới được nhận phiếu,
  // nhưng số người bỏ phiếu vẫn là toàn bộ người còn sống.
  const candidates =
    state.tiedCandidateIds.length > 0 ? state.tiedCandidateIds : state.aliveIds;

  if (!isTallyValid(tally, candidates, state.aliveIds.length)) {
    throw new Error('submitVotes: bảng phiếu không hợp lệ');
  }

  const leaders = findVoteLeaders(tally);
  if (leaders.length === 1) return eliminate(state, leaders[0], false);

  // Ngoại lệ: còn đúng 2 người sống thì buộc phải phân định, vì nếu để
  // "không loại ai" thì số người sống không bao giờ giảm và ván lặp vô tận.
  if (state.aliveIds.length === 2) {
    return eliminate(state, leaders[pickIndex(rng, leaders.length)], true);
  }

  if (state.revoteUsed) return noElimination(state);

  const next: GameState = { ...state, phase: 'TIE_BREAK', tiedCandidateIds: leaders };
  return {
    state: next,
    events: [
      { type: 'VOTE_TIE', payload: { village: next.villageName, round: next.round } },
    ],
  };
}

export type TieChoice = 'REVOTE' | 'NO_ELIMINATION';

export function resolveTie(
  state: GameState,
  choice: TieChoice,
  rng: Rng,
): EngineResult {
  if (state.phase !== 'TIE_BREAK') {
    throw new Error('resolveTie: chỉ gọi được ở pha xử hoà');
  }

  if (choice === 'NO_ELIMINATION') return noElimination(state);

  const next: GameState = { ...state, phase: 'VOTING', revoteUsed: true };
  return {
    state: next,
    events: [
      { type: 'VOTE_OPEN', payload: { village: next.villageName, round: next.round } },
    ],
  };
}

export function submitWhiteGuess(state: GameState, text: string): EngineResult {
  if (state.phase !== 'WHITE_GUESS') {
    throw new Error('submitWhiteGuess: chỉ gọi được ở pha mũ trắng đoán từ');
  }

  const correct = isGuessCorrect(text, state.civilianWord);
  const guessed: GameState = { ...state, whiteGuess: { text, correct } };

  if (correct) {
    const next: GameState = { ...guessed, phase: 'ENDED', outcome: 'WHITE' };
    return {
      state: next,
      events: [
        { type: 'WHITE_GUESS_CORRECT', payload: { village: next.villageName } },
        { type: 'WHITE_WIN', payload: { village: next.villageName } },
      ],
    };
  }

  return {
    state: { ...guessed, phase: 'REVEAL' },
    events: [
      { type: 'WHITE_GUESS_WRONG', payload: { village: guessed.villageName } },
    ],
  };
}

const WIN_EVENT: Record<string, NarrationEventType> = {
  CIVILIANS: 'CIVILIANS_WIN',
  SPIES: 'SPIES_WIN',
  WHITE: 'WHITE_WIN',
};

export function continueAfterReveal(state: GameState, rng: Rng): EngineResult {
  if (state.phase !== 'REVEAL') {
    throw new Error('continueAfterReveal: chỉ gọi được ở pha lộ danh tính');
  }

  const outcome = evaluateOutcome(state);
  if (outcome === null) {
    return startNextRound(state);
  }

  const next: GameState = { ...state, phase: 'ENDED', outcome };
  return {
    state: next,
    events: [{ type: WIN_EVENT[outcome], payload: { village: next.villageName } }],
  };
}
