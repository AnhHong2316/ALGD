import { SfxName, SfxPort } from './sfx-port';

/**
 * Tiếng động tổng hợp ngay trong mã, không dùng file.
 *
 * Chọn cách này vì: không có giấy phép nào phải theo dõi, APK không phình,
 * và dự án chưa có đường ống tài nguyên nào để phải dựng thêm.
 *
 * Mọi thứ bọc trong try/catch và kiểm tra AudioContext trước khi dùng. Thiếu
 * tiếng là phiền, sập ván vì thiếu tiếng là hỏng.
 */
export class WebAudioSfx implements SfxPort {
  private context: AudioContext | null = null;

  play(name: SfxName): void {
    try {
      const context = this.ensureContext();
      if (context === null) return;

      // Trình duyệt khoá âm thanh cho tới khi người dùng chạm màn hình. Ván
      // này luôn có nút bấm trước đó nên resume() gần như luôn thành công,
      // nhưng vẫn phải gọi vì lần đầu context sinh ra ở trạng thái suspended.
      //
      // resume() trả Promise, và có trình duyệt từ chối thẳng nếu gọi ngoài
      // một cử chỉ chạm — đúng lúc tiếng tick phát ra từ đồng hồ. Khối try
      // bên ngoài là đồng bộ nên không bắt được lời từ chối đó, mà lớp này
      // đã hứa là hỏng thì im chứ không ồn.
      if (context.state === 'suspended') void context.resume().catch(() => {});

      const now = context.currentTime;
      switch (name) {
        case 'knock':
          this.knock(context, now);
          break;
        case 'tick':
          this.tick(context, now);
          break;
        case 'toll':
          this.toll(context, now);
          break;
        case 'chime':
          this.chime(context, now);
          break;
      }
    } catch {
      // Máy lạ, trình duyệt lạ, quyền âm thanh bị chặn. Im lặng là đúng.
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context !== null) return this.context;

    const Ctor = (globalThis as Record<string, unknown>)['AudioContext'] as
      | (new () => AudioContext)
      | undefined;
    if (Ctor === undefined) return null;

    this.context = new Ctor();
    return this.context;
  }

  /** Gõ nhẹ xuống mặt bàn: xung nhiễu ngắn qua bộ lọc dải. */
  private knock(context: AudioContext, at: number): void {
    const length = Math.floor(context.sampleRate * 0.08);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // Nhiễu tắt dần theo hàm mũ. Tắt nhanh mới ra tiếng gõ chứ không ra
      // tiếng xì.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 6);
    }

    const source = context.createBufferSource();
    source.buffer = buffer;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, at);
    filter.Q.setValueAtTime(1.4, at);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.5, at);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(at);
    source.stop(at + 0.09);
  }

  /** Kim đồng hồ: rất ngắn, cao, khô. */
  private tick(context: AudioContext, at: number): void {
    this.tone(context, at, 1200, 0.03, 0.18, 'square');
  }

  /** Chuông trầm: hai sóng sin lệch nhau, tắt chậm. */
  private toll(context: AudioContext, at: number): void {
    this.tone(context, at, 110, 1.2, 0.32, 'sine');
    this.tone(context, at, 165, 1.2, 0.16, 'sine');
  }

  /** Ba nốt lên dần, ấm, nhẹ nhõm. */
  private chime(context: AudioContext, at: number): void {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((frequency, index) => {
      this.tone(context, at + index * 0.16, frequency, 0.5, 0.22, 'sine');
    });
  }

  private tone(
    context: AudioContext,
    at: number,
    frequency: number,
    seconds: number,
    peak: number,
    type: OscillatorType,
  ): void {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);

    const gain = context.createGain();
    // Vào êm trong 12ms để không có tiếng "bụp" ở đầu nốt, rồi tắt dần.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + seconds + 0.02);
  }
}
