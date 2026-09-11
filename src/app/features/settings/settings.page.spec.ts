import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SFX_PORT } from '../../audio/sfx.token';
import { SilentSfx } from '../../audio/silent-sfx';
import { SilentSpeech } from '../../audio/silent-speech';
import { SPEECH_PORT } from '../../audio/speech.token';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { NARRATION_HOLD_MS, NARRATION_RNG, NarrationStore } from '../../state/narration.store';
import { sequentialRng } from '../../state/testing/sequential-rng';
import { SettingsPage } from './settings.page';

function setup() {
  const speech = new SilentSpeech();

  TestBed.configureTestingModule({
    imports: [SettingsPage],
    providers: [
      provideRouter([]),
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      { provide: SPEECH_PORT, useValue: speech },
      { provide: SFX_PORT, useValue: new SilentSfx() },
      { provide: NARRATION_HOLD_MS, useValue: 0 },
      { provide: NARRATION_RNG, useValue: sequentialRng() },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
      NarrationStore,
    ],
  });

  return { speech, fixture: TestBed.createComponent(SettingsPage) };
}

function radios(fixture: { nativeElement: unknown }): HTMLInputElement[] {
  return [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input[type="radio"]',
    ),
  ];
}

describe('SettingsPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('hiện đủ ba mức âm thanh', async () => {
    const { fixture } = setup();
    await fixture.whenStable();

    expect(radios(fixture).length).toBe(3);
  });

  it('đánh dấu sẵn mức đang dùng', async () => {
    const { fixture } = setup();
    await TestBed.inject(NarrationStore).init();
    await TestBed.inject(NarrationStore).setSoundLevel('SFX_ONLY');
    fixture.detectChanges();
    await fixture.whenStable();

    const checked = radios(fixture).find((input) => input.checked);

    expect(checked?.value).toBe('SFX_ONLY');
  });

  it('chọn mức khác thì kho dẫn chuyện đổi theo', async () => {
    const { fixture } = setup();
    const store = TestBed.inject(NarrationStore);
    await store.init();
    await fixture.whenStable();

    const off = radios(fixture).find((input) => input.value === 'OFF')!;
    off.click();
    await fixture.whenStable();

    expect(store.soundLevel()).toBe('OFF');
  });

  it('có thanh trượt tốc độ đọc trong khoảng cho phép', async () => {
    const { fixture } = setup();
    await fixture.whenStable();

    const slider = (fixture.nativeElement as HTMLElement).querySelector(
      'input[type="range"]',
    ) as HTMLInputElement;

    expect(slider.min).toBe('0.5');
    expect(slider.max).toBe('1.5');
  });

  it('nút nghe thử đọc một câu mẫu', async () => {
    const { speech, fixture } = setup();
    await TestBed.inject(NarrationStore).init();
    await fixture.whenStable();

    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-test="preview"]',
    ) as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(speech.spoken.length).toBe(1);
  });

  it('không ở mức đọc đầy đủ thì nút nghe thử bị khoá', async () => {
    const { fixture } = setup();
    const store = TestBed.inject(NarrationStore);
    await store.init();
    await store.setSoundLevel('SFX_ONLY');
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-test="preview"]',
    ) as HTMLButtonElement;

    // preview() tự thoát sớm khi mức khác FULL. Không khoá nút thì người chơi
    // thấy một nút bấm được mà im lặng, tưởng hỏng.
    expect(button.disabled).toBe(true);
  });

  it('kéo thanh trượt chỉ ghi xuống máy lúc thả tay', async () => {
    const { fixture } = setup();
    const store = TestBed.inject(NarrationStore);
    await store.init();
    await fixture.whenStable();

    const slider = (fixture.nativeElement as HTMLElement).querySelector(
      'input[type="range"]',
    ) as HTMLInputElement;

    slider.value = '1.2';
    slider.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    // Đang kéo thì chưa ghi: mỗi bước một lượt đọc-rồi-ghi qua cầu nối native
    // vừa phí vừa có thể kết thúc lệch thứ tự.
    expect((await TestBed.inject(SettingsRepository).load()).speechRate).toBe(1);

    slider.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect((await TestBed.inject(SettingsRepository).load()).speechRate).toBe(1.2);
  });
});
