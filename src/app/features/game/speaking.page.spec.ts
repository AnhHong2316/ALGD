import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GAME_CONFIG, GameConfig } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { SpeakingPage } from './speaking.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

async function setup(config: Partial<GameConfig> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpeakingPage],
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
    config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, ...config },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }

  const fixture = TestBed.createComponent(SpeakingPage);
  fixture.detectChanges();
  return { session, fixture };
}

describe('SpeakingPage', () => {
  beforeEach(() => TestBed.resetTestingModule());
  afterEach(() => vi.useRealTimers());

  it('hiện vòng hiện tại và người đang nói', async () => {
    const { session, fixture } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vòng 1');
    expect(text).toContain(session.currentSpeakerName()!);
  });

  it('hiện thứ tự nói của cả vòng', async () => {
    const { fixture } = await setup();

    const chips = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.speaking__chip',
    );
    expect(chips).toHaveLength(NAMES.length);
    expect(
      Array.from(chips)
        .map((chip) => chip.textContent!.trim())
        .sort(),
    ).toEqual([...NAMES].sort());
  });

  it('nhắc còn mấy vòng nữa mới được vote', async () => {
    const { fixture } = await setup({ minRoundsBeforeVote: 3 });

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Còn 2 vòng nữa',
    );
  });

  it('đủ vòng rồi thì không nhắc nữa', async () => {
    const { fixture } = await setup({ minRoundsBeforeVote: 1 });

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'vòng nữa',
    );
  });

  it('xong lượt thì sang người kế', async () => {
    const { session, fixture } = await setup();
    const first = session.currentSpeakerName();

    await fixture.componentInstance.done();
    fixture.detectChanges();

    expect(session.currentSpeakerName()).not.toBe(first);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      session.currentSpeakerName()!,
    );
  });

  it('đồng hồ đếm ngược theo thời gian thật', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: 30 });

    expect(fixture.componentInstance.secondsLeft()).toBe(30);

    vi.advanceTimersByTime(3000);
    fixture.detectChanges();

    expect(fixture.componentInstance.secondsLeft()).toBe(27);
  });

  it('đồng hồ dừng ở 0, không đi xuống số âm', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: 2 });

    vi.advanceTimersByTime(10000);
    fixture.detectChanges();

    expect(fixture.componentInstance.secondsLeft()).toBe(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Hết giờ');
  });

  it('sang người kế thì đồng hồ chạy lại từ đầu', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: 30 });

    vi.advanceTimersByTime(5000);
    await fixture.componentInstance.done();
    fixture.detectChanges();

    expect(fixture.componentInstance.secondsLeft()).toBe(30);
  });

  it('tắt đồng hồ thì không hiện đồng hồ', async () => {
    const { fixture } = await setup({ timerSeconds: null });

    expect(fixture.componentInstance.secondsLeft()).toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.speaking__clock'),
    ).toBeNull();
  });
});
