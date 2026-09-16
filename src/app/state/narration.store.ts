import { Injectable, InjectionToken, effect, inject, signal } from '@angular/core';
import { NarrationEvent, NarrationEventType } from '../core/models';
import { Rng } from '../core/engine/rng';
import { pickLine } from '../core/narration/line-picker';
import { SfxName } from '../audio/sfx-port';
import { SFX_PORT } from '../audio/sfx.token';
import { SPEECH_PORT } from '../audio/speech.token';
import { NARRATION_VI } from '../data/narration/narration.vi';
import { SoundLevel, SettingsRepository } from '../data/repositories/settings.repository';
import { GameSessionStore } from './game-session.store';

/** Chữ hiện bao lâu khi không có giọng đọc để định nhịp. Test cắm 0. */
export const NARRATION_HOLD_MS = new InjectionToken<number>('NARRATION_HOLD_MS', {
  factory: () => 2200,
});

/**
 * Nguồn ngẫu nhiên để bốc biến thể câu thoại. Mặc định Math.random thật cho
 * app chạy thật; test cắm một Rng cố định.
 *
 * Kịch bản có nhiều câu KHÔNG mang {village}/{player} (cố ý, để đỡ nghe lặp
 * — xem narration.vi.ts). Bốc bằng Math.random thật trong test thì thành
 * may rủi: có lần trúng câu mang tên làng, có lần trúng câu không, mà test
 * lại so khớp đúng một chữ cụ thể. Cùng lý do line-picker.spec.ts dùng Rng
 * cố định (`first`, `last`) thay vì Math.random — "test không cần may rủi".
 */
export const NARRATION_RNG = new InjectionToken<Rng>('NARRATION_RNG', {
  factory: () => Math.random,
});

interface SfxCue {
  name: SfxName;
  times: 1 | 2;
}

/**
 * Tiếng động cho từng loại sự kiện. Loại nào vắng mặt ở đây là cố ý im lặng.
 *
 * GAME_START, ROUND_START và NO_ELIMINATION xảy ra dày; gắn tiếng vào thì
 * thành ồn nền và làm loãng mấy mốc thật sự đáng chú ý.
 *
 * TIME_ALMOST_UP cũng không có tiếng ở đây: tiếng tick do đồng hồ ở màn vòng
 * nói tự gọi mỗi giây trong 5 giây cuối, qua phương thức tick().
 */
const SFX_BY_EVENT: Partial<Record<NarrationEventType, SfxCue>> = {
  PASS_DEVICE: { name: 'knock', times: 1 },
  SPEAKER_TURN: { name: 'knock', times: 1 },
  VOTE_OPEN: { name: 'knock', times: 2 },
  VOTE_TIE: { name: 'knock', times: 2 },
  RANDOM_TIE_BREAK: { name: 'knock', times: 2 },
  CIVILIAN_KILLED: { name: 'toll', times: 1 },
  SPY_CAUGHT: { name: 'toll', times: 1 },
  WHITE_REVEALED: { name: 'toll', times: 1 },
  WHITE_GUESS_WRONG: { name: 'toll', times: 1 },
  CIVILIANS_WIN: { name: 'chime', times: 1 },
  SPIES_WIN: { name: 'chime', times: 1 },
  WHITE_WIN: { name: 'chime', times: 1 },
  WHITE_GUESS_CORRECT: { name: 'chime', times: 1 },
};

/** Khoảng cách giữa hai tiếng gõ đôi. Test cắm 0 để khỏi chờ thật. */
export const DOUBLE_KNOCK_GAP_MS = new InjectionToken<number>('DOUBLE_KNOCK_GAP_MS', {
  factory: () => 140,
});

const NEXT_LEVEL: Record<SoundLevel, SoundLevel> = {
  FULL: 'SFX_ONLY',
  SFX_ONLY: 'OFF',
  OFF: 'FULL',
};

/**
 * Nối sự kiện dẫn chuyện sang chữ và tiếng.
 *
 * Kho này chỉ TIÊU THỤ signal events mà GameSessionStore đã phơi ra. Không có
 * đường nào gọi ngược vào engine, nên engine vẫn thuần đúng như mục 4 đặc tả.
 */
@Injectable()
export class NarrationStore {
  private readonly session = inject(GameSessionStore);
  private readonly settings = inject(SettingsRepository);
  private readonly speech = inject(SPEECH_PORT);
  private readonly sfx = inject(SFX_PORT);
  private readonly holdMs = inject(NARRATION_HOLD_MS);
  private readonly knockGapMs = inject(DOUBLE_KNOCK_GAP_MS);

  private readonly _line = signal('');
  private readonly _soundLevel = signal<SoundLevel>('FULL');
  private readonly _showVoiceNotice = signal(false);

  readonly line = this._line.asReadonly();
  readonly soundLevel = this._soundLevel.asReadonly();
  readonly showVoiceNotice = this._showVoiceNotice.asReadonly();

  /**
   * Mức âm lượng và tốc độ đọc giữ ở TRƯỜNG THƯỜNG, không đọc qua signal
   * trong hàng đợi.
   *
   * Lý do: mọi lần đọc signal trước dấu await đầu tiên đều bị effect ghi nhận
   * là phụ thuộc. Đọc soundLevel() trong đó là effect tự chạy lại mỗi khi
   * người chơi bấm nút loa, phát lại cả đợt thoại cũ giữa ván.
   */
  private level: SoundLevel = 'FULL';
  private rate = 1;

  /** Tăng mỗi đợt. Đợt cũ thấy token đổi thì tự bỏ cuộc. */
  private runToken = 0;

  private readonly rng: Rng = inject(NARRATION_RNG);

  constructor() {
    effect(() => {
      const events = this.session.events();
      if (events.length === 0) return;
      this.raiseAll(events);
    });
  }

  /** Gọi một lần lúc app khởi động. */
  async init(): Promise<void> {
    const settings = await this.settings.load();
    this.level = settings.soundLevel;
    this.rate = settings.speechRate;
    this._soundLevel.set(settings.soundLevel);

    // Máy không có giọng tiếng Việt thì đọc ra sẽ là một tràng vô nghĩa.
    // Hạ xuống chỉ-tiếng-động và báo cho người dùng biết một lần.
    if (await this.speech.hasVietnameseVoice()) return;

    if (this.level === 'FULL') await this.setSoundLevel('SFX_ONLY');
    if (!settings.voiceNoticeDismissed) this._showVoiceNotice.set(true);
  }

  /** Bắn một sự kiện lẻ. Dùng cho những sự kiện engine không phát được. */
  raise(event: NarrationEvent): void {
    this.raiseAll([event]);
  }

  raiseAll(events: readonly NarrationEvent[]): void {
    void this.run(events);
  }

  /**
   * Chỉ phát tiếng tick, không đụng tới chữ đang hiện.
   *
   * Đồng hồ ở màn vòng nói gọi hàm này mỗi giây trong 5 giây cuối. Tách khỏi
   * raise() vì nếu đi qua hàng đợi thì mỗi giây lại ghi đè lời dẫn một lần.
   */
  tick(): void {
    if (this.level === 'OFF') return;
    this.sfx.play('tick');
  }

  async setSoundLevel(level: SoundLevel): Promise<void> {
    this.level = level;
    this._soundLevel.set(level);

    // Tắt tiếng là phải im NGAY, không đợi đọc nốt câu dở.
    if (level !== 'FULL') {
      this.runToken += 1;
      await this.speech.stop();
    }

    const settings = await this.settings.load();
    await this.settings.save({ ...settings, soundLevel: level });
  }

  cycleSoundLevel(): Promise<void> {
    return this.setSoundLevel(NEXT_LEVEL[this.level]);
  }

  async setSpeechRate(rate: number): Promise<void> {
    this.rate = rate;
    const settings = await this.settings.load();
    await this.settings.save({ ...settings, speechRate: rate });
  }

  async dismissVoiceNotice(): Promise<void> {
    this._showVoiceNotice.set(false);
    const settings = await this.settings.load();
    await this.settings.save({ ...settings, voiceNoticeDismissed: true });
  }

  /**
   * Dẹp dẫn chuyện: cắt đợt đang chạy, bảo máy im, xoá chữ đang hiện.
   *
   * Dải dẫn chuyện nằm ở vỏ ứng dụng nên nó sống lâu hơn màn ván. Không dọn
   * thì câu cuối cùng của ván nằm lại trên màn hình chính — và tệ hơn, đợt
   * đọc còn dở vẫn chạy tiếp, đọc nốt những câu thuộc về một ván đã xong.
   *
   * Tăng token TRƯỚC khi xoá chữ: đợt cũ kiểm token ở đầu mỗi vòng lặp, trước
   * lúc đặt chữ, nên sau khi token đổi nó không thể ghi đè lại chữ vừa xoá.
   */
  async clear(): Promise<void> {
    this.runToken += 1;
    this._line.set('');
    await this.speech.stop();
  }

  /** Đọc thử một câu để người dùng chỉnh tốc độ cho vừa tai. */
  async preview(): Promise<void> {
    if (this.level !== 'FULL') return;
    await this.speech.stop();
    await this.speech.speak('Tới giờ vote rồi bà con ơi', this.rate);
  }

  private async run(events: readonly NarrationEvent[]): Promise<void> {
    const token = ++this.runToken;

    // Đợt mới tới nghĩa là ván đã sang pha khác; câu của pha cũ không còn
    // đúng nữa nên cắt luôn thay vì xếp hàng chờ.
    await this.speech.stop();

    for (const event of events) {
      if (token !== this.runToken) return;

      const line = pickLine(event, NARRATION_VI, this.rng);
      this._line.set(line);
      this.playCue(event.type);

      if (this.level === 'FULL' && line !== '') {
        await this.speech.speak(line, this.rate);
      } else if (events.length > 1) {
        // Không có giọng đọc để định nhịp thì cả đợt sẽ nháy qua trong một
        // khung hình và người chơi chỉ kịp thấy câu cuối.
        await delay(this.holdMs);
      }
    }
  }

  private playCue(type: NarrationEventType): void {
    if (this.level === 'OFF') return;

    const cue = SFX_BY_EVENT[type];
    if (cue === undefined) return;

    this.sfx.play(cue.name);
    if (cue.times === 2) {
      setTimeout(() => {
        // Kiểm lại mức lúc tiếng thứ hai thật sự phát. Người chơi bấm tắt
        // tiếng ngay trong quãng nghỉ giữa hai tiếng gõ là chuyện có thật, và
        // lời hứa "tắt là im ngay" phải đúng cho cả tiếng động chứ không chỉ
        // riêng giọng đọc.
        if (this.level === 'OFF') return;
        this.sfx.play(cue.name);
      }, this.knockGapMs);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
