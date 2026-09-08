import { Injectable, computed, inject, signal } from '@angular/core';
import {
  TieChoice,
  advanceSpeaker,
  buildCard,
  continueAfterReveal,
  resolveTie,
  revealNextPlayer,
  submitVotes,
  submitWhiteGuess,
} from '../core/engine/game-engine';
import { VoteTally } from '../core/engine/vote-resolver';
import { Rng } from '../core/engine/rng';
import {
  CardContent,
  GameConfig,
  GameState,
  NarrationEvent,
  Player,
} from '../core/models';
import { ActiveGameRepository } from '../data/repositories/active-game.repository';
import { WordBankRepository } from '../data/repositories/word-bank.repository';
import { startNewGame } from '../data/start-new-game';

export interface StartNewInput {
  villageName: string;
  playerNames: string[];
  config: GameConfig;
}

/**
 * Giữ ván đang chơi và bọc mọi hành động của engine.
 *
 * Hai việc cố định sau mỗi hành động: cập nhật signal, rồi ghi state xuống
 * máy. Ghi sau MỖI thay đổi chứ không chỉ lúc thoát, vì app di động có thể
 * bị hệ điều hành đóng bất cứ lúc nào mà không báo trước.
 */
@Injectable()
export class GameSessionStore {
  private readonly wordBank = inject(WordBankRepository);
  private readonly activeGame = inject(ActiveGameRepository);

  private readonly _state = signal<GameState | null>(null);
  private readonly _events = signal<NarrationEvent[]>([]);

  readonly state = this._state.asReadonly();
  readonly events = this._events.asReadonly();
  readonly hasGame = computed(() => this._state() !== null);

  /** Thẻ của người đang tới lượt xem trong pha chia bài. */
  readonly currentCard = computed<CardContent | null>(() => {
    const state = this._state();
    if (state === null || state.phase !== 'DEALING') return null;
    const player = state.players[state.dealtCount];
    return player === undefined ? null : buildCard(state, player.id);
  });

  /** Người đang tới lượt cầm máy trong pha chia bài. */
  readonly currentDealName = computed<string | null>(() => {
    const state = this._state();
    if (state === null || state.phase !== 'DEALING') return null;
    return state.players[state.dealtCount]?.name ?? null;
  });

  /** Người đang tới lượt nói. null khi không ở pha nói. */
  readonly currentSpeakerName = computed<string | null>(() => {
    const state = this._state();
    if (state === null || state.phase !== 'SPEAKING') return null;
    const id = state.speakingOrder[state.speakerIndex];
    return state.players.find((player) => player.id === id)?.name ?? null;
  });

  /** Thứ tự nói của cả vòng, để hiện thanh nhỏ trên màn vòng nói. */
  readonly speakingNames = computed<string[]>(() => {
    const state = this._state();
    if (state === null) return [];
    return state.speakingOrder.map(
      (id) => state.players.find((player) => player.id === id)?.name ?? '',
    );
  });

  readonly alivePlayers = computed<Player[]>(() => {
    const state = this._state();
    if (state === null) return [];
    return state.players.filter((player) => state.aliveIds.includes(player.id));
  });

  /**
   * Những người được nhận phiếu ở lượt vote hiện tại. Ở lượt bỏ phiếu lại thì
   * chỉ còn những người đang hoà, chứ không phải toàn bộ người sống.
   */
  readonly voteCandidates = computed<Player[]>(() => {
    const state = this._state();
    if (state === null) return [];
    const ids =
      state.tiedCandidateIds.length > 0 ? state.tiedCandidateIds : state.aliveIds;
    return state.players.filter((player) => ids.includes(player.id));
  });

  readonly lastEliminatedName = computed<string | null>(() => {
    const state = this._state();
    if (state === null || state.eliminations.length === 0) return null;
    const last = state.eliminations[state.eliminations.length - 1];
    return state.players.find((player) => player.id === last.playerId)?.name ?? null;
  });

  /**
   * Còn mấy vòng nữa mới được vote. `round` đếm từ 1 và là số thứ tự vòng
   * ĐANG diễn ra, nên ở vòng 1 với ngưỡng 3 thì còn 2 vòng nữa.
   */
  readonly roundsLeftBeforeVote = computed<number>(() => {
    const state = this._state();
    if (state === null) return 0;
    return Math.max(0, state.config.minRoundsBeforeVote - state.round);
  });

  /**
   * Nguồn ngẫu nhiên thật. Engine nhận nó từ ngoài để bản thân nó vẫn là hàm
   * thuần và test cắm được nguồn có hạt giống.
   */
  private readonly rng: Rng = () => Math.random();

  async startNew(input: StartNewInput): Promise<void> {
    const { result } = await startNewGame({
      wordBank: this.wordBank,
      gameId: `g-${Date.now()}`,
      villageName: input.villageName,
      playerNames: input.playerNames,
      config: input.config,
      rng: this.rng,
    });

    await this.apply(result.state, result.events);
  }

  async revealNext(): Promise<void> {
    const state = this.require();
    const result = revealNextPlayer(state, this.rng);
    await this.apply(result.state, result.events);
  }

  async nextSpeaker(): Promise<void> {
    const result = advanceSpeaker(this.require(), this.rng);
    await this.apply(result.state, result.events);
  }

  async vote(tally: VoteTally): Promise<void> {
    const result = submitVotes(this.require(), tally, this.rng);
    await this.apply(result.state, result.events);
  }

  async breakTie(choice: TieChoice): Promise<void> {
    const result = resolveTie(this.require(), choice, this.rng);
    await this.apply(result.state, result.events);
  }

  async guessCivilianWord(text: string): Promise<void> {
    const result = submitWhiteGuess(this.require(), text);
    await this.apply(result.state, result.events);
  }

  async afterReveal(): Promise<void> {
    const result = continueAfterReveal(this.require(), this.rng);
    await this.apply(result.state, result.events);
  }

  async resume(): Promise<void> {
    const saved = await this.activeGame.load();
    this._state.set(saved);
    this._events.set([]);
  }

  async abandon(): Promise<void> {
    this._state.set(null);
    this._events.set([]);
    await this.activeGame.clear();
  }

  /** Chỉ dùng trong test, để giả lập app vừa khởi động lại. */
  clearInMemory(): void {
    this._state.set(null);
    this._events.set([]);
  }

  private require(): GameState {
    const state = this._state();
    if (state === null) throw new Error('GameSessionStore: chưa có ván nào đang chơi');
    return state;
  }

  private async apply(state: GameState, events: NarrationEvent[]): Promise<void> {
    this._state.set(state);
    this._events.set(events);
    await this.activeGame.save(state);
  }
}
