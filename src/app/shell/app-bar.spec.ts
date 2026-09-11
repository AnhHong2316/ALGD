import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SFX_PORT } from '../audio/sfx.token';
import { SilentSfx } from '../audio/silent-sfx';
import { SilentSpeech } from '../audio/silent-speech';
import { SPEECH_PORT } from '../audio/speech.token';
import { ActiveGameRepository } from '../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../data/repositories/settings.repository';
import { WordBankRepository } from '../data/repositories/word-bank.repository';
import { MemoryStorage } from '../data/storage/memory-storage';
import { STORAGE_PORT } from '../data/storage/storage.token';
import { GameSessionStore } from '../state/game-session.store';
import { NARRATION_HOLD_MS, NARRATION_RNG, NarrationStore } from '../state/narration.store';
import { sequentialRng } from '../state/testing/sequential-rng';
import { AppBar } from './app-bar';
import { NarrationStrip } from './narration-strip';

function providers() {
  return [
    provideRouter([]),
    { provide: STORAGE_PORT, useValue: new MemoryStorage() },
    { provide: SPEECH_PORT, useValue: new SilentSpeech() },
    { provide: SFX_PORT, useValue: new SilentSfx() },
    { provide: NARRATION_HOLD_MS, useValue: 0 },
    { provide: NARRATION_RNG, useValue: sequentialRng() },
    WordBankRepository,
    ActiveGameRepository,
    ScoreboardRepository,
    SettingsRepository,
    GameSessionStore,
    NarrationStore,
  ];
}

describe('AppBar', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('có nút loa bấm được', async () => {
    TestBed.configureTestingModule({ imports: [AppBar], providers: providers() });
    const fixture = TestBed.createComponent(AppBar);
    await fixture.whenStable();

    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-test="sound"]',
    );

    expect(button).not.toBeNull();
  });

  it('bấm nút loa thì đổi mức âm lượng', async () => {
    TestBed.configureTestingModule({ imports: [AppBar], providers: providers() });
    const fixture = TestBed.createComponent(AppBar);
    const store = TestBed.inject(NarrationStore);
    await store.init();
    await fixture.whenStable();

    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-test="sound"]',
    ) as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(store.soundLevel()).toBe('SFX_ONLY');
  });

  it('nhãn nút loa cho biết mức hiện tại', async () => {
    TestBed.configureTestingModule({ imports: [AppBar], providers: providers() });
    const fixture = TestBed.createComponent(AppBar);
    const store = TestBed.inject(NarrationStore);
    await store.init();
    await store.setSoundLevel('OFF');
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-test="sound"]',
    ) as HTMLButtonElement;

    expect(button.getAttribute('aria-label')).toContain('Tắt tiếng');
  });
});

describe('NarrationStrip', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('hiện câu dẫn hiện tại', async () => {
    TestBed.configureTestingModule({
      imports: [NarrationStrip],
      providers: providers(),
    });
    const fixture = TestBed.createComponent(NarrationStrip);
    const store = TestBed.inject(NarrationStore);
    await store.init();

    store.raise({ type: 'VOTE_OPEN', payload: { village: 'Ác Quỷ' } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ác Quỷ');
  });

  it('chưa có câu nào thì không chiếm chỗ bằng chữ rỗng', async () => {
    TestBed.configureTestingModule({
      imports: [NarrationStrip],
      providers: providers(),
    });
    const fixture = TestBed.createComponent(NarrationStrip);
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.strip__line'),
    ).toBeNull();
  });

  it('tắt tiếng hoàn toàn thì chữ vẫn hiện, vì chữ mới là đường chính', async () => {
    TestBed.configureTestingModule({
      imports: [NarrationStrip],
      providers: providers(),
    });
    const fixture = TestBed.createComponent(NarrationStrip);
    const store = TestBed.inject(NarrationStore);
    await store.init();
    await store.setSoundLevel('OFF');

    store.raise({ type: 'VOTE_OPEN', payload: { village: 'Ác Quỷ' } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ác Quỷ');
  });
});
