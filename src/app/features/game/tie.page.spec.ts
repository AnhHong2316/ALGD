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
import { TiePage } from './tie.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

/** Đưa ván vào pha xử hoà bằng một lượt vote hoà 1–1. */
async function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TiePage],
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

  const [a, b] = session.alivePlayers();
  await session.vote({ [a.id]: 1, [b.id]: 1 });

  const fixture = TestBed.createComponent(TiePage);
  fixture.detectChanges();
  return { session, fixture, tied: [a, b] };
}

describe('TiePage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('gọi tên những người đang hoà', async () => {
    const { fixture, tied } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hoà phiếu');
    expect(text).toContain(tied[0].name);
    expect(text).toContain(tied[1].name);
  });

  it('chỉ gọi tên người đang hoà, không gọi cả làng', async () => {
    const { session, fixture, tied } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vòng 1');

    // Người không hoà không được xuất hiện. Nếu màn này lấy nhầm danh sách
    // người còn sống thì cả làng hiện lên và quản trò đọc sai ai đang hoà.
    const others = session
      .alivePlayers()
      .filter((person) => !tied.some((one) => one.id === person.id));
    expect(others.length).toBeGreaterThan(0);
    for (const other of others) {
      expect(text).not.toContain(other.name);
    }
  });

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

  it('bấm nút bỏ phiếu lại thì đúng là bỏ phiếu lại', async () => {
    const { session, fixture } = await setup();

    await click(fixture, 'Bỏ phiếu lại');

    expect(session.state()?.phase).toBe('VOTING');
  });

  it('bấm nút không loại ai thì đúng là không loại ai', async () => {
    const { session, fixture } = await setup();
    const before = session.state()!.aliveIds.length;

    await click(fixture, 'không loại ai');

    expect(session.state()?.phase).toBe('SPEAKING');
    expect(session.state()?.aliveIds).toHaveLength(before);
  });

  it('chọn bỏ phiếu lại thì quay về pha vote', async () => {
    const { session, fixture } = await setup();

    await fixture.componentInstance.revote();

    expect(session.state()?.phase).toBe('VOTING');
    expect(session.state()?.revoteUsed).toBe(true);
  });

  it('chọn không loại ai thì sang vòng nói mới, không ai bị loại', async () => {
    const { session, fixture } = await setup();
    const before = session.state()!.aliveIds.length;

    await fixture.componentInstance.skip();

    expect(session.state()?.phase).toBe('SPEAKING');
    expect(session.state()?.aliveIds).toHaveLength(before);
    expect(session.state()?.round).toBe(2);
  });

  it('hoà lần hai thì engine tự cho qua vòng, không quay lại màn này', async () => {
    const { session, fixture } = await setup();
    await fixture.componentInstance.revote();

    const [a, b] = session.voteCandidates();
    await session.vote({ [a.id]: 1, [b.id]: 1 });

    expect(session.state()?.phase).toBe('SPEAKING');
  });
});
