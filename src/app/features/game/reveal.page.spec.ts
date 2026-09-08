import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { RevealPage } from './reveal.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

/** Chơi tới lúc vừa loại một người, chọn đúng vai muốn loại. */
async function setup(target: 'SPY' | 'CIVILIAN') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RevealPage],
    providers: [
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
    ],
  });

  const session = TestBed.inject(GameSessionStore);
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: NAMES,
    config: {
      ...DEFAULT_GAME_CONFIG,
      spyCount: 1,
      hasWhite: false,
      minRoundsBeforeVote: 1,
    },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }
  for (let i = 0; i < NAMES.length; i++) {
    await session.nextSpeaker();
  }

  const state = session.state()!;
  const victim = state.aliveIds.find((id) => state.assignments[id].role === target)!;
  await session.vote({ [victim]: 3 });

  const fixture = TestBed.createComponent(RevealPage);
  fixture.detectChanges();
  const name = state.players.find((p) => p.id === victim)!.name;
  return { session, fixture, name };
}

/** Dựng TestBed trắng cho màn này. Mấy ca đặc biệt bên dưới dựng ván khác nhau. */
function configure(): GameSessionStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RevealPage],
    providers: [
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
    ],
  });
  return TestBed.inject(GameSessionStore);
}

/** Từ không đời nào khớp với từ dân làng, dù bộ so khớp có nới sai vài ký tự. */
const WRONG_GUESS = 'quangthantuyetdoikhongphaitunay';

/** Nói hết một vòng để engine mở pha vote. */
async function speakWholeRound(session: GameSessionStore): Promise<void> {
  const count = session.state()!.speakingOrder.length;
  for (let i = 0; i < count; i++) {
    await session.nextSpeaker();
  }
}

async function voteOut(session: GameSessionStore, playerId: string): Promise<void> {
  await session.vote({ [playerId]: 1 });
}

function aliveWithRole(session: GameSessionStore, role: 'SPY' | 'WHITE' | 'CIVILIAN') {
  const state = session.state()!;
  return state.aliveIds.find((id) => state.assignments[id].role === role)!;
}

/**
 * Chơi một ván có mũ trắng cho tới lúc mũ trắng bị loại và đoán trượt, nên ván
 * dừng ở màn lộ danh tính chứ chưa kết.
 */
async function setupWrongWhiteGuess() {
  const session = configure();
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: [...NAMES, 'Trang'],
    config: {
      ...DEFAULT_GAME_CONFIG,
      spyCount: 1,
      hasWhite: true,
      minRoundsBeforeVote: 1,
    },
  });
  for (let i = 0; i < 5; i++) {
    await session.revealNext();
  }
  await speakWholeRound(session);

  await voteOut(session, aliveWithRole(session, 'WHITE'));
  expect(session.state()?.phase).toBe('WHITE_GUESS');
  await session.guessCivilianWord(WRONG_GUESS);
  expect(session.state()?.phase).toBe('REVEAL');

  const fixture = TestBed.createComponent(RevealPage);
  fixture.detectChanges();
  return { session, fixture };
}

/**
 * Chơi tới nước cờ hai người cuối rồi hoà phiếu, để engine phải bốc ngẫu nhiên.
 *
 * Chỉ tới được trạng thái hai người sống mà ván chưa kết khi hai người đó là
 * một dân làng và mũ trắng: mọi cặp còn lại đều thoả một điều kiện thắng.
 */
async function setupRandomTieBreak() {
  const session = configure();
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: NAMES,
    config: {
      ...DEFAULT_GAME_CONFIG,
      spyCount: 1,
      hasWhite: true,
      minRoundsBeforeVote: 1,
    },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }

  // Loại gián điệp trước, rồi loại một dân làng: còn 1 dân làng và mũ trắng.
  await speakWholeRound(session);
  await voteOut(session, aliveWithRole(session, 'SPY'));
  await session.afterReveal();

  await speakWholeRound(session);
  await voteOut(session, aliveWithRole(session, 'CIVILIAN'));
  await session.afterReveal();

  await speakWholeRound(session);
  const [a, b] = session.state()!.aliveIds;
  await session.vote({ [a]: 1, [b]: 1 });

  // Ai bị bốc là chuyện của nguồn ngẫu nhiên thật. Trúng mũ trắng thì còn phải
  // qua lượt đoán từ nữa mới tới màn này; đoán trượt nên ván vẫn dừng ở đây.
  if (session.state()?.phase === 'WHITE_GUESS') {
    await session.guessCivilianWord(WRONG_GUESS);
  }
  expect(session.state()?.phase).toBe('REVEAL');

  const fixture = TestBed.createComponent(RevealPage);
  fixture.detectChanges();
  return { session, fixture };
}

/** Bấm nút thật trên DOM, để phép nối nút với hành động cũng được ghim. */
function click(fixture: { nativeElement: unknown }, label: string): Promise<void> {
  const button = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
  ).find((one) => (one.textContent ?? '').includes(label));
  if (button === undefined) throw new Error(`không thấy nút "${label}"`);
  button.click();
  // Cho các promise trong kho phiên chạy xong.
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('RevealPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('gọi tên và lật vai người bị loại', async () => {
    const { fixture, name } = await setup('CIVILIAN');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(name);
    expect(text).toContain('Dân làng');
  });

  it('loại trúng gián điệp thì ghi rõ là gián điệp', async () => {
    const { fixture, name } = await setup('SPY');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(name);
    expect(text).toContain('Gián điệp');
  });

  it('không phải bốc ngẫu nhiên thì không nhắc chuyện bốc', async () => {
    const { fixture } = await setup('CIVILIAN');

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Bốc ngẫu nhiên',
    );
  });

  it('bấm tiếp tục thì ván đi tiếp', async () => {
    const { session, fixture } = await setup('CIVILIAN');

    await fixture.componentInstance.next();

    // Còn gián điệp sống nên ván chưa kết thúc, quay lại vòng nói.
    expect(session.state()?.phase).toBe('SPEAKING');
  });

  it('loại nốt gián điệp cuối thì bấm tiếp tục là kết ván', async () => {
    const { session, fixture } = await setup('SPY');

    await fixture.componentInstance.next();

    expect(session.state()?.phase).toBe('ENDED');
    expect(session.state()?.outcome).toBe('CIVILIANS');
  });

  it('bấm nút Tiếp tục trên màn hình thì ván đi tiếp', async () => {
    const { session, fixture } = await setup('CIVILIAN');

    await click(fixture, 'Tiếp tục');

    expect(session.state()?.phase).toBe('SPEAKING');
  });

  it('bốc ngẫu nhiên ở hai người cuối thì nói rõ là bốc, không phải bị vote', async () => {
    const { fixture } = await setupRandomTieBreak();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Bốc ngẫu nhiên để phân định, vì chỉ còn hai người.');
  });

  it('mũ trắng đoán trượt thì ghi lại đúng từ đã đoán', async () => {
    const { fixture } = await setupWrongWhiteGuess();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Mũ trắng đoán');
    expect(text).toContain(WRONG_GUESS);
    expect(text).toContain('không trúng');
    // Chính mũ trắng vừa bị loại nên màn này cũng phải lật đúng vai đó.
    expect(text).toContain('Mũ trắng');
  });

  it('ván thường không có ai đoán từ thì không nhắc chuyện đoán', async () => {
    const { fixture } = await setup('CIVILIAN');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Mũ trắng đoán');
    expect(text).not.toContain('không trúng');
  });

  it('vòng sau không nhắc lại chuyện mũ trắng đoán trượt', async () => {
    const { session } = await setupWrongWhiteGuess();

    // Mũ trắng đã rời ván. Chơi tiếp một vòng rồi loại một dân làng.
    await session.afterReveal();
    expect(session.state()?.phase).toBe('SPEAKING');
    await speakWholeRound(session);
    await voteOut(session, aliveWithRole(session, 'CIVILIAN'));
    expect(session.state()?.phase).toBe('REVEAL');

    const fixture = TestBed.createComponent(RevealPage);
    fixture.detectChanges();

    // Lời đoán cũ vẫn nằm trong trạng thái ván vì engine giữ lại làm lịch sử.
    // Nhưng nó thuộc về lần lộ diện trước; nhắc lại ở đây là gán nhầm cho
    // người vừa bị loại, mà người đó thậm chí không phải mũ trắng.
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Mũ trắng đoán');
  });
});
