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
import { SFX_PORT } from '../../audio/sfx.token';
import { SilentSfx } from '../../audio/silent-sfx';
import { SilentSpeech } from '../../audio/silent-speech';
import { SPEECH_PORT } from '../../audio/speech.token';
import { NARRATION_HOLD_MS, NARRATION_RNG, NarrationStore } from '../../state/narration.store';
import { sequentialRng } from '../../state/testing/sequential-rng';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

async function setup(config: Partial<GameConfig> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpeakingPage],
    providers: [
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      { provide: SPEECH_PORT, useValue: new SilentSpeech() },
      { provide: SFX_PORT, useValue: new SilentSfx() },
      { provide: NARRATION_HOLD_MS, useValue: 0 },
      { provide: NARRATION_RNG, useValue: sequentialRng() },
      NarrationStore,
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

  it('ván tắt đồng hồ thì không gõ tiếng cũng không nhắc gì', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: null });
    const narration = TestBed.inject(NarrationStore);
    await narration.init();

    const tick = vi.spyOn(narration, 'tick');
    const raise = vi.spyOn(narration, 'raise');

    await vi.advanceTimersByTimeAsync(60_000);

    // Bài kiểm này ghim KẾT QUẢ, không ghim một lớp chắn cụ thể nào: hiện có
    // hai lớp độc lập cùng chặn (restartClock thoát sớm, và thân interval
    // dừng ngay khi left === null), nên gỡ một lớp vẫn im. Thứ nó thật sự đỡ
    // là một kiểu "dọn cho gọn" rất dễ xảy ra: đổi `?? null` thành `?? 30`.
    // Khi đó ván tắt đồng hồ sẽ chạy đồng hồ và gõ tick, và bài này đỏ ngay.
    expect(fixture.componentInstance.secondsLeft()).toBeNull();
    expect(tick).not.toHaveBeenCalled();
    expect(raise).not.toHaveBeenCalled();
  });

  it('năm giây cuối gõ tick từng giây nhưng chỉ nhắc đúng một lần', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: 30 });
    const narration = TestBed.inject(NarrationStore);
    await narration.init();

    const tick = vi.spyOn(narration, 'tick');
    const raise = vi.spyOn(narration, 'raise');

    // 30 → 1: đi qua trọn năm giây cuối.
    await vi.advanceTimersByTimeAsync(29_000);

    expect(fixture.componentInstance.secondsLeft()).toBe(1);
    // Giây 5, 4, 3, 2, 1 — mỗi giây một tiếng gõ.
    expect(tick).toHaveBeenCalledTimes(5);
    // Nhưng lời nhắc chỉ đọc một lần, nếu không nó ghi đè lời dẫn của pha
    // đang diễn ra năm lần liên tiếp và tự nói chồng lên chính mình.
    expect(raise).toHaveBeenCalledTimes(1);
    expect(raise.mock.calls[0][0].type).toBe('TIME_ALMOST_UP');
  });

  it('sang người kế thì được nhắc lại từ đầu', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: 30 });
    const narration = TestBed.inject(NarrationStore);
    await narration.init();

    const raise = vi.spyOn(narration, 'raise');

    await vi.advanceTimersByTimeAsync(25_000);
    expect(raise).toHaveBeenCalledTimes(1);

    await fixture.componentInstance.done();
    await vi.advanceTimersByTimeAsync(25_000);

    expect(fixture.componentInstance.secondsLeft()).toBe(5);
    // Cờ đã nhắc phải được đặt lại, nếu không người nói kế tiếp không được
    // nhắc gì cả.
    expect(raise).toHaveBeenCalledTimes(2);
  });
});
