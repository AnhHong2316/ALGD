import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG, GameState, Role } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { EndPage } from './end.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

@Component({ template: '' })
class StubHomePage {}

/** Chơi trọn một ván cho dân làng thắng. */
async function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [EndPage],
    providers: [
      provideRouter([{ path: '', component: StubHomePage }]),
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
  const spy = state.aliveIds.find((id) => state.assignments[id].role === 'SPY')!;
  await session.vote({ [spy]: 3 });
  await session.afterReveal();

  const fixture = TestBed.createComponent(EndPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { session, fixture, ended: state };
}

/** Dựng lại màn kết ván trên ván đang nằm trong kho phiên. */
async function buildPage() {
  const fixture = TestBed.createComponent(EndPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

/**
 * Bấm nút thật trên DOM, để phép nối nút với hành động cũng được ghim.
 *
 * Đợi nhiều nhịp vì `goHome` xâu chuỗi ba việc bất đồng bộ liên tiếp: bỏ ván
 * trong bộ nhớ, xoá ván dưới máy, rồi mới điều hướng.
 */
async function click(fixture: { nativeElement: unknown }, label: string): Promise<void> {
  const button = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
  ).find((one) => (one.textContent ?? '').includes(label));
  if (button === undefined) throw new Error(`không thấy nút "${label}"`);
  button.click();
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * Đọc bảng lật vai đã render, thay vì đọc signal ở sau lưng khuôn mẫu.
 *
 * Đợi một nhịp rồi mới vẽ lại: `ngOnInit` đọc bảng điểm bất đồng bộ và Angular
 * không đợi promise đó, nên khung hình đầu tiên còn vẽ lúc điểm chưa về. Ngoài
 * test thì signal tự kích hoạt vẽ lại nên không cần nhịp này.
 */
async function readRows(fixture: ComponentFixture<EndPage>) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();

  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('.end__row'),
  ).map((row) => {
    const cells = row.querySelectorAll('span');
    return {
      name: (cells[0]?.textContent ?? '').trim(),
      role: (row.querySelector('.end__role')?.textContent ?? '').trim(),
      earned: (row.querySelector('.end__point')?.textContent ?? '').trim(),
      total: (row.querySelector('.muted')?.textContent ?? '').trim(),
    };
  });
}

function namesWithRole(state: GameState, role: Role): string[] {
  return state.players
    .filter((player) => state.assignments[player.id].role === role)
    .map((player) => player.name);
}

/**
 * Chơi nốt ván đang ở pha chia bài cho tới lúc dân làng thắng.
 *
 * Trả về trạng thái ngay trước lượt vote, vì đó là lần cuối còn đọc được
 * `aliveIds` đầy đủ; `assignments` thì không đổi suốt ván.
 */
async function finishCiviliansWin(session: GameSessionStore): Promise<GameState> {
  const count = session.state()!.players.length;
  for (let i = 0; i < count; i++) {
    await session.revealNext();
  }
  for (let i = 0; i < count; i++) {
    await session.nextSpeaker();
  }
  const state = session.state()!;
  const spy = state.aliveIds.find((id) => state.assignments[id].role === 'SPY')!;
  await session.vote({ [spy]: 3 });
  await session.afterReveal();
  return state;
}

/**
 * Chơi trọn một ván cho gián điệp thắng: loại hai dân làng liên tiếp thì
 * gián điệp cuối cùng ngang số với dân làng cuối cùng.
 */
async function setupSpiesWin() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [EndPage],
    providers: [
      provideRouter([{ path: '', component: StubHomePage }]),
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

  // Hai lượt vote, mỗi lượt loại một dân làng. Sau lượt thứ hai còn 1 gián
  // điệp và 1 dân làng, gián điệp áp đảo.
  for (let round = 0; round < 2; round++) {
    const alive = session.state()!.aliveIds.length;
    for (let i = 0; i < alive; i++) {
      await session.nextSpeaker();
    }
    const state = session.state()!;
    const victim = state.aliveIds.find(
      (id) => state.assignments[id].role === 'CIVILIAN',
    )!;
    await session.vote({ [victim]: 2 });
    await session.afterReveal();
  }

  return { session, fixture: await buildPage() };
}

/** Chơi trọn một ván cho mũ trắng đoán trúng từ của dân làng. */
async function setupWhiteWin() {
  const names = [...NAMES, 'Mai'];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [EndPage],
    providers: [
      provideRouter([{ path: '', component: StubHomePage }]),
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
    playerNames: names,
    config: {
      ...DEFAULT_GAME_CONFIG,
      spyCount: 1,
      hasWhite: true,
      minRoundsBeforeVote: 1,
    },
  });
  for (let i = 0; i < names.length; i++) {
    await session.revealNext();
  }
  for (let i = 0; i < names.length; i++) {
    await session.nextSpeaker();
  }
  const state = session.state()!;
  const white = state.aliveIds.find((id) => state.assignments[id].role === 'WHITE')!;
  await session.vote({ [white]: 4 });
  await session.guessCivilianWord(state.civilianWord);

  return { session, fixture: await buildPage() };
}

describe('EndPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('công bố phe thắng', async () => {
    const { fixture } = await setup();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Dân làng thắng',
    );
  });

  it('lật hết vai của mọi người', async () => {
    const { fixture } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const name of NAMES) {
      expect(text).toContain(name);
    }
    expect(text).toContain('Gián điệp');
    expect(text).toContain('Dân làng');
  });

  it('hiện cả hai từ gốc', async () => {
    const { fixture, ended } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(ended.civilianWord);
    expect(text).toContain(ended.spyWord);
  });

  it('hiện điểm tích luỹ đã cộng ván này', async () => {
    const { fixture } = await setup();

    // Ba dân làng mỗi người 1 điểm.
    const board = fixture.componentInstance.totals();
    expect(Object.values(board).filter((point) => point === 1)).toHaveLength(3);
  });

  it('chơi ván nữa thì giữ nguyên danh sách người chơi', async () => {
    const { session, fixture } = await setup();
    const oldId = session.state()!.id;

    await fixture.componentInstance.playAgain();

    expect(session.state()?.id).not.toBe(oldId);
    expect(session.state()?.phase).toBe('DEALING');
    expect(session.state()!.players.map((p) => p.name).sort()).toEqual(
      [...NAMES].sort(),
    );
  });

  it('về trang chủ thì bỏ ván đang lưu', async () => {
    const { session, fixture } = await setup();

    await fixture.componentInstance.goHome();

    expect(session.hasGame()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('bấm nút chơi ván nữa thì đúng là chia ván mới', async () => {
    const { session, fixture } = await setup();
    const oldId = session.state()!.id;

    // Đi qua DOM thật: mọi test trên đây gọi thẳng vào component, nên nếu hai
    // nút bị đấu nhầm hành động thì chúng vẫn xanh, còn người chơi bấm "Về
    // trang chủ" lại bị chia cho một ván mới.
    await click(fixture, 'Chơi ván nữa');

    expect(session.state()?.phase).toBe('DEALING');
    expect(session.state()?.id).not.toBe(oldId);
  });

  it('bấm nút về trang chủ thì đúng là bỏ ván', async () => {
    const { session, fixture } = await setup();

    await click(fixture, 'Về trang chủ');

    expect(session.hasGame()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('cột điểm ván này hiện đúng cho từng vai', async () => {
    const { fixture } = await setup();

    const rows = await readRows(fixture);
    expect(rows).toHaveLength(NAMES.length);

    const civilians = rows.filter((row) => row.role === 'Dân làng');
    const spies = rows.filter((row) => row.role === 'Gián điệp');
    expect(civilians).toHaveLength(3);
    expect(spies).toHaveLength(1);

    for (const row of civilians) {
      expect(row.earned).toBe('+1');
    }
    expect(spies[0].earned).toBe('+0');
  });

  it('điểm tích luỹ cộng dồn qua hai ván chứ không ghi đè', async () => {
    const { session, fixture, ended } = await setup();
    const wonFirst = namesWithRole(ended, 'CIVILIAN');

    await fixture.componentInstance.playAgain();
    const secondGame = await finishCiviliansWin(session);
    const wonSecond = namesWithRole(secondGame, 'CIVILIAN');

    const wonBoth = wonFirst.filter((name) => wonSecond.includes(name));
    // Ba dân làng trên bốn người, hai ván, nên luôn có ít nhất hai người
    // thắng cả hai ván dù vai được chia ngẫu nhiên.
    expect(wonBoth.length).toBeGreaterThanOrEqual(2);

    const rows = await readRows(await buildPage());
    for (const name of wonBoth) {
      const row = rows.find((one) => one.name === name)!;
      // Ván này vẫn chỉ 1 điểm, nhưng tích luỹ phải là 2.
      expect(row.earned).toBe('+1');
      expect(row.total).toBe('2');
    }
  });

  it('gián điệp thắng thì công bố đúng phe', async () => {
    const { session, fixture } = await setupSpiesWin();

    expect(session.state()?.outcome).toBe('SPIES');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Gián điệp lên nắm quyền',
    );
  });

  it('mũ trắng thắng thì công bố đúng phe', async () => {
    const { session, fixture } = await setupWhiteWin();

    expect(session.state()?.outcome).toBe('WHITE');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Mũ trắng thắng một mình');
    expect(text).toContain('Mũ trắng');
  });
});
