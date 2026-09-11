import { SpeechPort } from './speech-port';

/**
 * Bản đọc câm dùng cho test.
 *
 * KHÔNG dùng bản này để làm mức OFF trong app thật. Mức OFF được xử lý bằng
 * cách NarrationStore không phát lệnh đọc, chứ không phải bằng cách tráo bản
 * cài lúc chạy — tráo bản cài thì lúc bật tiếng lại phải dựng lại cả cây
 * tiêm phụ thuộc.
 */
export class SilentSpeech implements SpeechPort {
  readonly spoken: { text: string; rate: number }[] = [];
  stopCount = 0;

  /** Đặt false để giả lập máy không cài giọng tiếng Việt. */
  vietnameseVoice = true;

  speak(text: string, rate: number): Promise<void> {
    this.spoken.push({ text, rate });
    return Promise.resolve();
  }

  stop(): Promise<void> {
    this.stopCount += 1;
    return Promise.resolve();
  }

  hasVietnameseVoice(): Promise<boolean> {
    return Promise.resolve(this.vietnameseVoice);
  }
}
