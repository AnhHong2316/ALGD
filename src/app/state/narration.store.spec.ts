import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SFX_PORT } from '../audio/sfx.token';
import { SilentSfx } from '../audio/silent-sfx';
import { SilentSpeech } from '../audio/silent-speech';
import { SpeechPort } from '../audio/speech-port';
import { SPEECH_PORT } from '../audio/speech.token';
import { ActiveGameRepository } from '../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../data/repositories/settings.repository';
import { WordBankRepository } from '../data/repositories/word-bank.repository';
import { MemoryStorage } from '../data/storage/memory-storage';
import { STORAGE_PORT } from '../data/storage/storage.token';
import { GameSessionStore } from './game-session.store';
import { NARRATION_HOLD_MS, NARRATION_RNG, NarrationStore } from './narration.store';

/**
 * Bốc lần lượt biến thể 0, 1, 2 rồi quay lại — không dùng Math.random thật.
 *
 * Kịch bản có câu mang {village}/{player} xen giữa câu không mang (cố ý, để
 * đỡ nghe lặp). Nếu test bốc bằng Math.random thật thì so khớp chữ trong
 * assertion trở thành may rủi. Giống cách line-picker.spec.ts dùng Rng cố
 * định (`first`, `last`) thay vì ngẫu nhiên thật.
 */
function sequentialRng(period = 3): () => number {
  let i = 0;
  return () => {
    const value = (i % period) / period;
    i += 1;
    return value;
  };
}

/**
 * Bản đọc giữ lại lời hứa cho tới khi test chủ động thả.
 *
 * SilentSpeech resolve tức thì nên một đợt không bao giờ còn đang dở khi đợt
 * sau tới — mà đó chính là tình huống duy nhất phép cắt đợt có ý nghĩa.
 */
class PausableSpeech implements SpeechPort {
  readonly spoken: { text: string; rate: number }[] = [];
  stopCount = 0;
  vietnameseVoice = true;

  private pending: (() => void)[] = [];

  speak(text: string, rate: number): Promise<void> {
    this.spoken.push({ text, rate });
    return new Promise((resolve) => this.pending.push(resolve));
  }

  /** Thả hết câu đang treo, như thể máy vừa đọc xong. */
  finishAll(): void {
    const waiting = this.pending;
    this.pending = [];
    for (const resolve of waiting) resolve();
  }

  stop(): Promise<void> {
    this.stopCount += 1;
    return Promise.resolve();
  }

  hasVietnameseVoice(): Promise<boolean> {
    return Promise.resolve(this.vietnameseVoice);
  }
}

function setup(speech = new SilentSpeech()) {
  const sfx = new SilentSfx();

  TestBed.configureTestingModule({
    providers: [
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      { provide: SPEECH_PORT, useValue: speech },
      { provide: SFX_PORT, useValue: sfx },
      // Không chờ thật trong test. Nhịp giữ chữ chỉ có ý nghĩa với người xem.
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

  return { speech, sfx, store: TestBed.inject(NarrationStore) };
}

/** Nhường vòng lặp sự kiện cho hàng đợi chạy hết. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('NarrationStore', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('mức FULL thì đọc câu và đặt chữ lên màn', async () => {
    const { speech, store } = setup();
    await store.init();

    store.raise({ type: 'VOTE_OPEN', payload: { village: 'Ác Quỷ' } });
    await settle();

    expect(speech.spoken.length).toBe(1);
    expect(speech.spoken[0].text).toContain('Ác Quỷ');
    expect(store.line()).toContain('Ác Quỷ');
  });

  it('mức OFF thì không đọc gì nhưng chữ vẫn hiện', async () => {
    const { speech, sfx, store } = setup();
    await store.init();
    await store.setSoundLevel('OFF');

    store.raise({ type: 'VOTE_OPEN', payload: {} });
    await settle();

    expect(speech.spoken).toEqual([]);
    expect(sfx.played).toEqual([]);
    expect(store.line().length).toBeGreaterThan(0);
  });

  it('mức SFX_ONLY thì có tiếng động, không có giọng đọc, chữ vẫn hiện', async () => {
    const { speech, sfx, store } = setup();
    await store.init();
    await store.setSoundLevel('SFX_ONLY');

    store.raise({ type: 'SPEAKER_TURN', payload: { player: 'Minh' } });
    await settle();

    expect(speech.spoken).toEqual([]);
    expect(sfx.played).toEqual(['knock']);
    expect(store.line()).toContain('Minh');
  });

  it('đọc tuần tự nhiều sự kiện của cùng một đợt, đúng thứ tự', async () => {
    const { speech, store } = setup();
    await store.init();

    store.raiseAll([
      { type: 'SPY_CAUGHT', payload: { player: 'Minh' } },
      { type: 'CIVILIANS_WIN', payload: { village: 'Ác Quỷ' } },
    ]);
    await settle();

    expect(speech.spoken.length).toBe(2);
    expect(speech.spoken[0].text).toContain('Minh');
    expect(speech.spoken[1].text).toContain('Ác Quỷ');
  });

  it('đợt mới cắt đợt cũ', async () => {
    const { speech, store } = setup();
    await store.init();

    store.raise({ type: 'VOTE_OPEN', payload: {} });
    store.raise({ type: 'CIVILIANS_WIN', payload: {} });
    await settle();

    expect(speech.stopCount).toBeGreaterThanOrEqual(1);
  });

  it('đợt mới tới thì đợt cũ bỏ dở, không đọc nốt câu còn lại', async () => {
    const speech = new PausableSpeech();
    const { store } = setup(speech);
    await store.init();

    // Đợt cũ hai câu: câu đầu đang đọc dở, câu sau còn xếp hàng.
    store.raiseAll([
      { type: 'SPY_CAUGHT', payload: { player: 'Minh' } },
      { type: 'CIVILIANS_WIN', payload: { village: 'Ác Quỷ' } },
    ]);
    await settle();
    expect(speech.spoken.length).toBe(1);

    // Đợt mới tới giữa chừng.
    store.raise({ type: 'VOTE_OPEN', payload: { village: 'Ác Quỷ' } });
    await settle();

    speech.finishAll();
    await settle();
    speech.finishAll();
    await settle();

    // Chỉ được đọc câu đầu của đợt cũ và câu của đợt mới. Câu thứ hai của
    // đợt cũ phải bị bỏ, vì lúc nó tới lượt thì ván đã sang pha khác.
    expect(speech.spoken.length).toBe(2);
  });

  it('đọc theo tốc độ đã cài', async () => {
    const { speech, store } = setup();
    await store.init();
    await store.setSpeechRate(1.4);

    store.raise({ type: 'VOTE_OPEN', payload: {} });
    await settle();

    expect(speech.spoken[0].rate).toBe(1.4);
  });

  it('nút loa xoay vòng ba mức rồi quay lại', async () => {
    const { store } = setup();
    await store.init();

    expect(store.soundLevel()).toBe('FULL');
    await store.cycleSoundLevel();
    expect(store.soundLevel()).toBe('SFX_ONLY');
    await store.cycleSoundLevel();
    expect(store.soundLevel()).toBe('OFF');
    await store.cycleSoundLevel();
    expect(store.soundLevel()).toBe('FULL');
  });

  it('chuyển sang OFF thì cắt luôn câu đang đọc dở', async () => {
    const { speech, store } = setup();
    await store.init();

    await store.setSoundLevel('OFF');

    expect(speech.stopCount).toBeGreaterThanOrEqual(1);
  });

  it('mức âm lượng được ghi xuống máy', async () => {
    const { store } = setup();
    await store.init();

    await store.setSoundLevel('SFX_ONLY');

    expect((await TestBed.inject(SettingsRepository).load()).soundLevel).toBe(
      'SFX_ONLY',
    );
  });

  it('máy thiếu giọng tiếng Việt thì hạ xuống SFX_ONLY và xin hiện thông báo', async () => {
    const { speech, store } = setup();
    speech.vietnameseVoice = false;

    await store.init();

    expect(store.soundLevel()).toBe('SFX_ONLY');
    expect(store.showVoiceNotice()).toBe(true);
  });

  it('đã bảo đừng nhắc nữa thì lần khởi động sau không hiện thông báo', async () => {
    const { speech, store } = setup();
    speech.vietnameseVoice = false;
    await store.init();

    await store.dismissVoiceNotice();
    expect(store.showVoiceNotice()).toBe(false);

    // Gọi lại init như thể app vừa mở lại. Lựa chọn phải đọc được từ máy chứ
    // không chỉ nằm trong bộ nhớ, nếu không thì mở lại app là nhắc lại.
    await store.init();

    expect(store.showVoiceNotice()).toBe(false);
  });

  it('máy có giọng tiếng Việt thì không đụng gì tới mức đã cài', async () => {
    const { store } = setup();

    await store.init();

    expect(store.soundLevel()).toBe('FULL');
    expect(store.showVoiceNotice()).toBe(false);
  });

  it('tick chỉ phát tiếng, không đụng tới chữ đang hiện', async () => {
    const { sfx, store } = setup();
    await store.init();
    store.raise({ type: 'SPEAKER_TURN', payload: { player: 'Minh' } });
    await settle();
    const before = store.line();

    store.tick();

    expect(sfx.played).toContain('tick');
    expect(store.line()).toBe(before);
  });

  it('mức OFF thì tick cũng im', async () => {
    const { sfx, store } = setup();
    await store.init();
    await store.setSoundLevel('OFF');

    store.tick();

    expect(sfx.played).toEqual([]);
  });

  it('sự kiện dày đặc thì im lặng, không kêu liên tục', async () => {
    const { sfx, store } = setup();
    await store.init();

    store.raise({ type: 'ROUND_START', payload: { round: 2 } });
    await settle();

    expect(sfx.played).toEqual([]);
  });
});
