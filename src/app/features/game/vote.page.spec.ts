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
import { VotePage } from './vote.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

/** Chia bài rồi nói hết một vòng để ván mở pha vote. */
async function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [VotePage],
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
    config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, minRoundsBeforeVote: 1 },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }
  for (let i = 0; i < NAMES.length; i++) {
    await session.nextSpeaker();
  }

  const fixture = TestBed.createComponent(VotePage);
  fixture.detectChanges();
  return { session, fixture };
}

describe('VotePage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('liệt kê mọi người còn sống', async () => {
    const { fixture } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const name of NAMES) {
      expect(text).toContain(name);
    }
  });

  it('chưa ai có phiếu thì chưa gửi được', async () => {
    const { fixture } = await setup();

    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('cộng phiếu cho một người thì gửi được', async () => {
    const { session, fixture } = await setup();
    const target = session.alivePlayers()[0];

    fixture.componentInstance.add(target.id, 2);
    fixture.detectChanges();

    expect(fixture.componentInstance.total()).toBe(2);
    expect(fixture.componentInstance.canSubmit()).toBe(true);
  });

  it('tổng phiếu vượt số người còn sống thì cảnh báo và chặn gửi', async () => {
    const { session, fixture } = await setup();
    const target = session.alivePlayers()[0];

    for (let i = 0; i < 5; i++) {
      fixture.componentInstance.add(target.id, 1);
    }
    fixture.detectChanges();

    expect(fixture.componentInstance.canSubmit()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'nhiều hơn số người còn sống',
    );
  });

  it('không cho trừ xuống dưới 0', async () => {
    const { session, fixture } = await setup();
    const target = session.alivePlayers()[0];

    fixture.componentInstance.add(target.id, -3);

    expect(fixture.componentInstance.votesFor(target.id)).toBe(0);
  });

  it('gửi phiếu thì người nhiều phiếu nhất bị loại', async () => {
    const { session, fixture } = await setup();
    const target = session.alivePlayers()[0];

    fixture.componentInstance.add(target.id, 3);
    await fixture.componentInstance.submit();

    expect(session.state()?.aliveIds).not.toContain(target.id);
  });

  it('ở lượt bỏ phiếu lại chỉ hiện những người đang hoà', async () => {
    const { session, fixture } = await setup();
    const [a, b, c] = session.alivePlayers();

    fixture.componentInstance.add(a.id, 1);
    fixture.componentInstance.add(b.id, 1);
    await fixture.componentInstance.submit();
    expect(session.state()?.phase).toBe('TIE_BREAK');

    await session.breakTie('REVOTE');
    const revote = TestBed.createComponent(VotePage);
    revote.detectChanges();

    const text = (revote.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(a.name);
    expect(text).toContain(b.name);
    expect(text).not.toContain(c.name);
  });
});
