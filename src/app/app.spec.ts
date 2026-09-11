import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SFX_PORT } from './audio/sfx.token';
import { SilentSfx } from './audio/silent-sfx';
import { SilentSpeech } from './audio/silent-speech';
import { SPEECH_PORT } from './audio/speech.token';
import { ActiveGameRepository } from './data/repositories/active-game.repository';
import { ScoreboardRepository } from './data/repositories/scoreboard.repository';
import { SettingsRepository } from './data/repositories/settings.repository';
import { WordBankRepository } from './data/repositories/word-bank.repository';
import { MemoryStorage } from './data/storage/memory-storage';
import { STORAGE_PORT } from './data/storage/storage.token';
import { GameSessionStore } from './state/game-session.store';
import { NARRATION_HOLD_MS, NarrationStore } from './state/narration.store';
import { App } from './app';

async function setup(speech = new SilentSpeech()) {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([]),
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      { provide: SPEECH_PORT, useValue: speech },
      { provide: SFX_PORT, useValue: new SilentSfx() },
      { provide: NARRATION_HOLD_MS, useValue: 0 },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
      NarrationStore,
    ],
  }).compileComponents();

  return TestBed.createComponent(App);
}

describe('App', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('dựng được vỏ ứng dụng', async () => {
    const fixture = await setup();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('vỏ có thanh trên cùng với nút loa, hiện trên mọi tuyến', async () => {
    const fixture = await setup();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-test="sound"]')).not.toBeNull();
    expect(element.textContent).toContain('Ai Là Gián Điệp');
  });

  it('máy có giọng tiếng Việt thì không hiện thông báo thiếu giọng', async () => {
    const fixture = await setup();
    // Gọi thẳng init() thay vì dựa vào ngOnInit: ngOnInit chạy ngầm không
    // chờ được (xem home.page.spec.ts), dễ làm test chập chờn.
    await TestBed.inject(NarrationStore).init();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.notice')).toBeNull();
  });

  it('máy thiếu giọng tiếng Việt thì hiện thông báo một lần', async () => {
    const speech = new SilentSpeech();
    speech.vietnameseVoice = false;

    const fixture = await setup(speech);
    await TestBed.inject(NarrationStore).init();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.notice')).not.toBeNull();
  });
});
