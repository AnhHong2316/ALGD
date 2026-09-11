# Dẫn chuyện và âm thanh — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nối tầng dẫn chuyện và âm thanh vào ván chơi: engine phát sự kiện, app đọc thành lời, hiện chữ, và phát tiếng động, với ba mức âm lượng chỉnh được.

**Architecture:** Tầng mới chỉ *tiêu thụ* signal `events` mà `GameSessionStore` đã phơi sẵn. Engine không bị sửa một dòng nào. Việc phát tiếng đi qua hai cổng (`SpeechPort`, `SfxPort`) theo đúng khuôn mà `data/storage/` đang dùng, nên test chạy được không cần trình duyệt thật.

**Tech Stack:** Angular 21 (standalone, signals), Vitest + jsdom, Capacitor 8, Web Audio API, `@capacitor-community/text-to-speech`.

**Đặc tả:** `docs/superpowers/specs/2026-09-09-dan-chuyen-va-am-thanh-design.md`

---

## Bối cảnh cần biết trước khi bắt đầu

### Đang có gì

Chạy `npm test` là toàn bộ test hiện tại phải xanh trước khi bro đụng vào bất cứ thứ gì. App chạy trọn một ván nhưng im lặng hoàn toàn.

| Thứ | Ở đâu | Ghi chú |
|---|---|---|
| 18 loại `NarrationEventType` | `src/app/core/models/narration-event.ts` | **Không sửa file này** |
| Engine phát `events` | `src/app/core/engine/game-engine.ts` | **Không sửa file này** |
| Signal `events` | `src/app/state/game-session.store.ts:65` | Đã phơi ra, chưa ai đọc. **Không sửa** |
| `soundLevel`, `speechRate` | `src/app/data/repositories/settings.repository.ts` | Lưu được, chưa ai dùng |
| `Rng`, `pickIndex` | `src/app/core/engine/rng.ts` | Dùng lại, đừng viết hàm bốc mới |
| Khuôn cổng/bản-cài | `src/app/data/storage/` | Sao y khuôn này cho `src/app/audio/` |

### Quy ước sẵn có phải theo

- Test dùng Vitest, **import tường minh**: `import { beforeEach, describe, expect, it } from 'vitest';`
- Tên test viết bằng tiếng Việt, mô tả hành vi chứ không mô tả hàm.
- Test component dùng `TestBed.configureTestingModule` với một hàm `setup()` ở đầu file, và `beforeEach(() => TestBed.resetTestingModule())`.
- Service đánh dấu `@Injectable()` trơn, rồi liệt kê trong `app.config.ts`. **Không** dùng `providedIn: 'root'`.
- Comment tiếng Việt, giải thích *tại sao*, không giải thích *cái gì*.
- Chạy test: `npm test`. Chạy một file: `npm test -- --include=src/app/audio/silent-speech.spec.ts`

> **Đừng bao giờ gọi thẳng `npx vitest run`.** `npm test` chạy `ng test`, tức là build Angular trước rồi mới chạy Vitest. Gọi thẳng `npx vitest` bỏ qua bước build, và mọi test dùng `TestBed` sẽ đổ sập hàng loạt — lần thử đầu ra 123 đỏ trên 364. Đó là lỗi giả. Test của Task 1 và Task 3 là hàm thuần nên chạy kiểu nào cũng xanh, càng dễ làm bro tưởng lệnh kia dùng được. Từ Task 6 trở đi toàn test component, sai lệnh là mất hàng giờ đi sửa mã vốn đang đúng.

### Ba chỗ dễ làm sai

1. **Đọc signal bên trong `effect()` rồi await.** Mọi lần đọc signal *trước* dấu `await` đầu tiên đều bị `effect` ghi nhận là phụ thuộc. Đọc nhầm `soundLevel()` trong đó là effect tự chạy lại mỗi khi người chơi bấm nút loa, phát lại cả đợt thoại cũ. Cách tránh trong kế hoạch này: mức âm lượng và tốc độ đọc được giữ ở **trường thường** (`private level`, `private rate`), signal chỉ dùng cho giao diện đọc.

2. **`speak()` resolve quá sớm.** Hàng đợi chỉ chạy tuần tự được khi `speak()` resolve lúc đọc *xong*. Bản cài thật phải chờ sự kiện kết thúc của plugin, không được resolve ngay khi gọi.

3. **Thêm trường bắt buộc vào `AppSettings`.** `settings.repository.ts:44` kiểm hình dạng theo kiểu được ăn cả ngã về không. Thêm một trường bắt buộc là xoá sạch cài đặt cũ của người dùng trong im lặng. Task 5 xử lý chuyện này, và nó phải làm **trước** Task 6.

### Thứ tự phụ thuộc

Task 1 → 2, 3, 4, 5 chạy song song được → Task 6 cần xong 1, 3, 4, 5 → Task 7 cần 1 → Task 8 cần 6 → Task 9 cần 6 → Task 10 cần 6 và 8 → Task 11 cuối cùng.

---

## Cấu trúc file

### Tạo mới

| File | Trách nhiệm |
|---|---|
| `src/app/audio/speech-port.ts` | Giao diện đọc: `speak`, `stop`, `hasVietnameseVoice` |
| `src/app/audio/speech.token.ts` | Thẻ tiêm `SPEECH_PORT` |
| `src/app/audio/silent-speech.ts` | Bản câm có ghi nhật ký, **chỉ dùng cho test** |
| `src/app/audio/sfx-port.ts` | Giao diện tiếng động: `play(SfxName)` |
| `src/app/audio/sfx.token.ts` | Thẻ tiêm `SFX_PORT` |
| `src/app/audio/silent-sfx.ts` | Bản câm có ghi nhật ký, **chỉ dùng cho test** |
| `src/app/audio/web-audio-sfx.ts` | Tổng hợp bốn tiếng bằng Web Audio |
| `src/app/audio/capacitor-speech.ts` | Bản đọc thật |
| `src/app/core/narration/line-picker.ts` | Hàm thuần: sự kiện + kịch bản + rng → câu chữ |
| `src/app/data/narration/narration.vi.ts` | Kịch bản thoại, 18 loại sự kiện |
| `src/app/state/narration.store.ts` | Nối `events` sang chữ và lệnh phát tiếng |
| `src/app/shell/app-bar.ts` | Thanh trên cùng: nút quay lại, nút loa, nút cài đặt |
| `src/app/shell/narration-strip.ts` | Dải chữ dẫn, nằm ngay dưới thanh |
| `src/app/features/settings/settings.page.ts` | Màn Cài đặt, tuyến `/cai-dat` |

### Sửa

| File | Sửa gì |
|---|---|
| `src/app/data/repositories/settings.repository.ts` | Thêm `voiceNoticeDismissed` dạng tuỳ chọn |
| `src/app/app.config.ts` | Đăng ký hai cổng và `NarrationStore`. `NARRATION_HOLD_MS` có sẵn `factory` mặc định nên **không** phải đăng ký ở đây, chỉ test mới cắm đè |
| `src/app/app.ts` | Bọc `<router-outlet>` bằng thanh trên cùng và dải chữ |
| `src/app/app.routes.ts` | Thêm tuyến `/cai-dat` |
| `src/app/features/game/speaking.page.ts` | Đồng hồ bắn `TIME_ALMOST_UP` và tiếng tick |
| `src/styles.scss` | Lớp dùng chung cho thanh trên cùng và dải chữ |
| `package.json` | Thêm `@capacitor-community/text-to-speech` |

---

## Task 1: Hai cổng phát tiếng và bản câm

Cổng là interface thuần, không phụ thuộc Angular. Bản câm ghi lại mọi lời gọi để test khẳng định được, và nó sống trong `src/` chứ không phải trong thư mục test — đúng như `MemoryStorage` đang làm.

**Files:**
- Create: `src/app/audio/speech-port.ts`
- Create: `src/app/audio/speech.token.ts`
- Create: `src/app/audio/silent-speech.ts`
- Create: `src/app/audio/sfx-port.ts`
- Create: `src/app/audio/sfx.token.ts`
- Create: `src/app/audio/silent-sfx.ts`
- Test: `src/app/audio/silent-speech.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/audio/silent-speech.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SilentSfx } from './silent-sfx';
import { SilentSpeech } from './silent-speech';

describe('SilentSpeech', () => {
  it('ghi lại câu đã đọc kèm tốc độ', async () => {
    const speech = new SilentSpeech();

    await speech.speak('Tới giờ vote rồi', 1.2);

    expect(speech.spoken).toEqual([{ text: 'Tới giờ vote rồi', rate: 1.2 }]);
  });

  it('đếm số lần bị cắt', async () => {
    const speech = new SilentSpeech();

    await speech.stop();
    await speech.stop();

    expect(speech.stopCount).toBe(2);
  });

  it('mặc định coi như máy có giọng tiếng Việt', async () => {
    expect(await new SilentSpeech().hasVietnameseVoice()).toBe(true);
  });

  it('giả lập được máy thiếu giọng tiếng Việt', async () => {
    const speech = new SilentSpeech();
    speech.vietnameseVoice = false;

    expect(await speech.hasVietnameseVoice()).toBe(false);
  });
});

describe('SilentSfx', () => {
  it('ghi lại tên tiếng đã phát, đúng thứ tự', () => {
    const sfx = new SilentSfx();

    sfx.play('knock');
    sfx.play('toll');

    expect(sfx.played).toEqual(['knock', 'toll']);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

Run: `npm test -- --include=src/app/audio/silent-speech.spec.ts`
Expected: FAIL — không tìm thấy module `./silent-sfx` và `./silent-speech`.

- [ ] **Step 3: Viết hai cổng**

Tạo `src/app/audio/speech-port.ts`:

```ts
/**
 * Cổng đọc thành lời.
 *
 * `speak` phải resolve khi đọc XONG, không phải khi bắt đầu đọc. Hàng đợi
 * trong NarrationStore dựa hẳn vào điều này để đọc tuần tự; resolve sớm là
 * các câu chồng lên nhau.
 */
export interface SpeechPort {
  speak(text: string, rate: number): Promise<void>;
  stop(): Promise<void>;
  hasVietnameseVoice(): Promise<boolean>;
}
```

Tạo `src/app/audio/sfx-port.ts`:

```ts
export type SfxName = 'knock' | 'tick' | 'toll' | 'chime';

/**
 * Cổng phát tiếng động ngắn.
 *
 * `play` không trả Promise: tiếng động là thứ điểm xuyết, không ai phải chờ
 * nó xong mới làm việc tiếp. Trả Promise ở đây chỉ mời gọi người sau await
 * nhầm rồi làm ván chơi khựng lại.
 */
export interface SfxPort {
  play(name: SfxName): void;
}
```

Tạo `src/app/audio/speech.token.ts`:

```ts
import { InjectionToken } from '@angular/core';
import { SpeechPort } from './speech-port';

/**
 * Thẻ tiêm cho cổng đọc. SpeechPort là interface nên không tồn tại lúc chạy,
 * phải có thẻ này Angular mới tiêm được: app thật cắm CapacitorSpeech, test
 * cắm SilentSpeech.
 */
export const SPEECH_PORT = new InjectionToken<SpeechPort>('SPEECH_PORT');
```

Tạo `src/app/audio/sfx.token.ts`:

```ts
import { InjectionToken } from '@angular/core';
import { SfxPort } from './sfx-port';

export const SFX_PORT = new InjectionToken<SfxPort>('SFX_PORT');
```

- [ ] **Step 4: Viết hai bản câm**

Tạo `src/app/audio/silent-speech.ts`:

```ts
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
```

Tạo `src/app/audio/silent-sfx.ts`:

```ts
import { SfxName, SfxPort } from './sfx-port';

/** Bản phát tiếng câm dùng cho test. */
export class SilentSfx implements SfxPort {
  readonly played: SfxName[] = [];

  play(name: SfxName): void {
    this.played.push(name);
  }
}
```

- [ ] **Step 5: Chạy test để xác nhận xanh**

Run: `npm test -- --include=src/app/audio/silent-speech.spec.ts`
Expected: PASS, 5 test.

- [ ] **Step 6: Commit**

```bash
git add src/app/audio
git commit -m "feat: them cong phat tieng va ban cam cho test"
```

---

## Task 2: Tiếng động tổng hợp bằng Web Audio

Bốn tiếng, không file. Điều quan trọng nhất ở task này không phải là tiếng nghe hay, mà là **nó không được ném lỗi khi máy không có `AudioContext`** — vừa để test chạy được dưới jsdom, vừa vì đó là hành vi đúng trên máy lạ: thiếu tiếng thì im, không phải sập ván.

**Files:**
- Create: `src/app/audio/web-audio-sfx.ts`
- Test: `src/app/audio/web-audio-sfx.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/audio/web-audio-sfx.spec.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebAudioSfx } from './web-audio-sfx';

/** Ghi lại việc đã dựng bao nhiêu nguồn âm và đã nối vào đâu. */
function fakeAudioContext() {
  const started: number[] = [];
  const context = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createGain: () => ({
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }),
    createOscillator: () => ({
      type: '',
      frequency: { setValueAtTime: vi.fn(), value: 0 },
      connect: vi.fn(),
      start: vi.fn((at: number) => started.push(at)),
      stop: vi.fn(),
    }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(64) }),
    createBufferSource: () => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn((at: number) => started.push(at)),
      stop: vi.fn(),
    }),
    createBiquadFilter: () => ({
      type: '',
      frequency: { setValueAtTime: vi.fn(), value: 0 },
      Q: { setValueAtTime: vi.fn(), value: 0 },
      connect: vi.fn(),
    }),
    sampleRate: 44100,
  };
  return { context, started };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>)['AudioContext'];
});

describe('WebAudioSfx', () => {
  it('không ném lỗi khi máy không có AudioContext', () => {
    const sfx = new WebAudioSfx();

    expect(() => {
      sfx.play('knock');
      sfx.play('tick');
      sfx.play('toll');
      sfx.play('chime');
    }).not.toThrow();
  });

  it('dựng nguồn âm khi máy có AudioContext', () => {
    const { context, started } = fakeAudioContext();
    (globalThis as Record<string, unknown>)['AudioContext'] = function () {
      return context;
    };

    new WebAudioSfx().play('toll');

    expect(started.length).toBeGreaterThan(0);
  });

  it('chime dựng nhiều nguồn hơn tick vì nó là ba nốt', () => {
    const { context, started } = fakeAudioContext();
    (globalThis as Record<string, unknown>)['AudioContext'] = function () {
      return context;
    };

    const sfx = new WebAudioSfx();
    sfx.play('tick');
    const afterTick = started.length;
    sfx.play('chime');

    expect(started.length - afterTick).toBeGreaterThan(afterTick);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

Run: `npm test -- --include=src/app/audio/web-audio-sfx.spec.ts`
Expected: FAIL — không tìm thấy module `./web-audio-sfx`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/audio/web-audio-sfx.ts`:

```ts
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
      // Phải nuốt lời từ chối: resume() trả Promise và có trình duyệt từ chối
      // thẳng nếu gọi ngoài một cử chỉ chạm — đúng lúc tiếng tick phát ra từ
      // đồng hồ. Khối try bên ngoài là đồng bộ nên không bắt được nó.
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
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

Run: `npm test -- --include=src/app/audio/web-audio-sfx.spec.ts`
Expected: PASS, 3 test.

- [ ] **Step 5: Commit**

```bash
git add src/app/audio/web-audio-sfx.ts src/app/audio/web-audio-sfx.spec.ts
git commit -m "feat: tong hop bon tieng dong bang web audio"
```

---

## Task 3: Hàm bốc câu thoại

Hàm thuần, không phụ thuộc Angular, nhận `rng` truyền vào theo từng lời gọi đúng như engine đang làm. Nhờ vậy test khẳng định được sự kiện nào ra đúng câu nào.

**Files:**
- Create: `src/app/core/narration/line-picker.ts`
- Test: `src/app/core/narration/line-picker.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/core/narration/line-picker.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { NarrationEventType } from '../models';
import { Rng } from '../engine/rng';
import { NarrationScript, pickLine } from './line-picker';

/** Rng luôn trả 0 nên luôn bốc biến thể đầu. Test không cần may rủi. */
const first: Rng = () => 0;

/** Rng trả gần 1 nên luôn bốc biến thể cuối. */
const last: Rng = () => 0.999;

/**
 * Dựng một kịch bản đủ 17 loại sự kiện, rồi ghi đè loại đang cần thử.
 *
 * Phải liệt kê đủ vì NarrationScript là Record đầy đủ, không phải Partial.
 */
function scriptWith(overrides: Partial<NarrationScript>): NarrationScript {
  const types: NarrationEventType[] = [
    'GAME_START',
    'PASS_DEVICE',
    'ROUND_START',
    'SPEAKER_TURN',
    'TIME_ALMOST_UP',
    'VOTE_OPEN',
    'VOTE_TIE',
    'NO_ELIMINATION',
    'RANDOM_TIE_BREAK',
    'CIVILIAN_KILLED',
    'SPY_CAUGHT',
    'WHITE_REVEALED',
    'WHITE_GUESS_CORRECT',
    'WHITE_GUESS_WRONG',
    'CIVILIANS_WIN',
    'SPIES_WIN',
    'WHITE_WIN',
  ];

  // Dùng reduce với mầm có kiểu chứ không phải Object.fromEntries: hàm đó
  // luôn trả kiểu chỉ mục { [k: string]: T }, không bao giờ trả kiểu khoá cụ
  // thể, nên ép thẳng sang NarrationScript sẽ đỏ TS2352. Mầm rỗng thì không
  // có thuộc tính nào để xung khắc, nên chỉ cần một phép ép hẹp — khỏi phải
  // dùng `as unknown as`, thứ tắt sạch mọi kiểm tra kiểu.
  const base = types.reduce((acc, type) => {
    acc[type] = ['câu mặc định'];
    return acc;
  }, {} as NarrationScript);

  return { ...base, ...overrides };
}

describe('pickLine', () => {
  it('bốc biến thể theo nguồn ngẫu nhiên truyền vào', () => {
    const script = scriptWith({ VOTE_OPEN: ['câu một', 'câu hai'] });

    expect(pickLine({ type: 'VOTE_OPEN', payload: {} }, script, first)).toBe('câu một');
    expect(pickLine({ type: 'VOTE_OPEN', payload: {} }, script, last)).toBe('câu hai');
  });

  it('thay tên người và số vòng vào chỗ giữ chỗ', () => {
    const script = scriptWith({
      SPEAKER_TURN: ['Vòng {round}, tới lượt {player}'],
    });

    const line = pickLine(
      { type: 'SPEAKER_TURN', payload: { player: 'Minh', round: 2 } },
      script,
      first,
    );

    expect(line).toBe('Vòng 2, tới lượt Minh');
  });

  it('tên làng rỗng thì thay bằng "ta"', () => {
    const script = scriptWith({ VOTE_OPEN: ['Làng {village} bỏ phiếu đi'] });

    expect(pickLine({ type: 'VOTE_OPEN', payload: { village: '' } }, script, first)).toBe(
      'Làng ta bỏ phiếu đi',
    );
    expect(pickLine({ type: 'VOTE_OPEN', payload: {} }, script, first)).toBe(
      'Làng ta bỏ phiếu đi',
    );
  });

  it('tên làng chỉ toàn khoảng trắng cũng coi như rỗng', () => {
    const script = scriptWith({ VOTE_OPEN: ['Làng {village} ơi'] });

    expect(
      pickLine({ type: 'VOTE_OPEN', payload: { village: '   ' } }, script, first),
    ).toBe('Làng ta ơi');
  });

  it('thiếu tên người thì bỏ chỗ giữ chỗ đi chứ không để lộ ra màn hình', () => {
    const script = scriptWith({ CIVILIAN_KILLED: ['{player} đã ra đi'] });

    const line = pickLine({ type: 'CIVILIAN_KILLED', payload: {} }, script, first);

    expect(line).not.toContain('{');
    expect(line).toBe('đã ra đi');
  });

  it('không để lại khoảng trắng đôi sau khi bỏ chỗ giữ chỗ', () => {
    const script = scriptWith({ CIVILIAN_KILLED: ['Thương thay {player} nhé'] });

    expect(pickLine({ type: 'CIVILIAN_KILLED', payload: {} }, script, first)).toBe(
      'Thương thay nhé',
    );
  });

  it('loại sự kiện không có biến thể nào thì trả chuỗi rỗng, không ném lỗi', () => {
    const script = scriptWith({ ROUND_START: [] });

    expect(pickLine({ type: 'ROUND_START', payload: {} }, script, first)).toBe('');
  });

  it('tên có ký tự $ không bị diễn giải thành mẫu thay thế', () => {
    const script = scriptWith({ SPEAKER_TURN: ['Tới lượt {player}'] });

    expect(
      pickLine({ type: 'SPEAKER_TURN', payload: { player: 'Minh$&Anh' } }, script, first),
    ).toBe('Tới lượt Minh$&Anh');
  });

  it('giá trị vừa thay vào không bị lượt thay sau đó quét lại', () => {
    const script = scriptWith({ VOTE_OPEN: ['Làng {village} chào {player}'] });

    const line = pickLine(
      { type: 'VOTE_OPEN', payload: { village: '{player}', player: 'Minh' } },
      script,
      first,
    );

    expect(line).toBe('Làng {player} chào Minh');
  });

  it('một chỗ giữ chỗ xuất hiện hai lần thì thay cả hai', () => {
    const script = scriptWith({ SPEAKER_TURN: ['{player} ơi, {player} nói đi'] });

    expect(
      pickLine({ type: 'SPEAKER_TURN', payload: { player: 'Lan' } }, script, first),
    ).toBe('Lan ơi, Lan nói đi');
  });

  it('tên làng thừa khoảng trắng thì cắt gọn chứ không mất', () => {
    const script = scriptWith({ VOTE_OPEN: ['Làng {village} ơi'] });

    expect(
      pickLine({ type: 'VOTE_OPEN', payload: { village: '  Đà Nẵng  ' } }, script, first),
    ).toBe('Làng Đà Nẵng ơi');
  });

  it('vòng số 0 vẫn hiện là 0, khác hẳn với vắng mặt', () => {
    const script = scriptWith({ ROUND_START: ['Vòng {round}'] });

    expect(pickLine({ type: 'ROUND_START', payload: { round: 0 } }, script, first)).toBe(
      'Vòng 0',
    );
    expect(pickLine({ type: 'ROUND_START', payload: {} }, script, first)).toBe('Vòng');
  });
});
```

Hai test `$` và "quét lại" ghim đúng hai lỗi thật đã tái hiện được ở bản đầu. Ba test còn lại ghim hành vi vốn đã đúng nhưng chưa ai kiểm.

- [ ] **Step 2: Chạy test để xác nhận đỏ**

Run: `npm test -- --include=src/app/core/narration/line-picker.spec.ts`
Expected: FAIL — không tìm thấy module `./line-picker`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/core/narration/line-picker.ts`:

```ts
import { NarrationEvent, NarrationEventType, NarrationPayload } from '../models';
import { Rng, pickIndex } from '../engine/rng';

/**
 * Kịch bản thoại: mỗi loại sự kiện có một danh sách biến thể.
 *
 * Dùng Record đầy đủ chứ không phải Partial: trình biên dịch sẽ bắt lỗi ngay
 * nếu ai đó thêm loại sự kiện mới mà quên viết thoại cho nó.
 */
export type NarrationScript = Record<NarrationEventType, readonly string[]>;

/**
 * Bốc một biến thể rồi điền chỗ giữ chỗ.
 *
 * Hàm này CHỈ đọc ba trường trong payload. Nó không nhận GameState và không
 * có đường nào để biết từ bí mật của ván — thứ nó không biết thì nó không
 * thể làm lộ.
 */
export function pickLine(
  event: NarrationEvent,
  script: NarrationScript,
  rng: Rng,
): string {
  // script là Record đầy đủ nên script[event.type] không bao giờ undefined qua
  // một lệnh gọi đã kiểm kiểu. Giữ ?? [] lại làm lớp bảo hiểm cho fixture nào
  // dựng bằng ép kiểu `as` mà lỡ thiếu một khoá — nếu không, nó đọc như code
  // phòng thủ thừa và sẽ bị ai đó xoá đi.
  const variants = script[event.type] ?? [];
  if (variants.length === 0) return '';

  return fill(variants[pickIndex(rng, variants.length)], event.payload);
}

function fill(line: string, payload: NarrationPayload): string {
  const village = payload.village?.trim();

  const values: Record<string, string> = {
    // Làng chưa đặt tên thì gọi là "làng ta", nghe tự nhiên hơn là bỏ trống.
    '{village}': village === undefined || village === '' ? 'ta' : village,
    '{player}': payload.player?.trim() ?? '',
    '{round}': payload.round === undefined ? '' : String(payload.round),
  };

  return (
    line
      // Thay MỘT lượt bằng hàm, không phải ba lượt nối tiếp bằng chuỗi. Hai lý
      // do, đều là lỗi thật đã tái hiện được: chuỗi thay thế mà chứa $& hay $$
      // sẽ bị diễn giải thành mẫu, mà tên người chơi là chữ người dùng tự gõ;
      // và thay nối tiếp thì giá trị chèn ở lượt trước bị lượt sau quét lại,
      // nên ai đặt tên làng là "{player}" sẽ bị nuốt mất tên.
      .replace(/\{village\}|\{player\}|\{round\}/g, (match) => values[match] ?? '')
      // Bỏ chỗ giữ chỗ đi thường để lại khoảng trắng đôi. Gom lại, nếu không
      // giọng đọc sẽ ngắt một nhịp thừa ngay giữa câu.
      .replace(/\s+/g, ' ')
      .trim()
  );
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

Run: `npm test -- --include=src/app/core/narration/line-picker.spec.ts`
Expected: PASS, 12 test.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/narration
git commit -m "feat: ham thuan boc cau thoai theo su kien"
```

---

## Task 4: Kịch bản thoại tiếng Việt

**Files:**
- Create: `src/app/data/narration/narration.vi.ts`
- Test: `src/app/data/narration/narration.spec.ts`

- [ ] **Step 1: Viết test kiểm toàn kịch bản**

Tạo `src/app/data/narration/narration.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { NarrationEventType } from '../../core/models';
import { NARRATION_VI } from './narration.vi';

const ALL_TYPES: NarrationEventType[] = [
  'GAME_START',
  'PASS_DEVICE',
  'ROUND_START',
  'SPEAKER_TURN',
  'TIME_ALMOST_UP',
  'VOTE_OPEN',
  'VOTE_TIE',
  'NO_ELIMINATION',
  'RANDOM_TIE_BREAK',
  'CIVILIAN_KILLED',
  'SPY_CAUGHT',
  'WHITE_REVEALED',
  'WHITE_GUESS_CORRECT',
  'WHITE_GUESS_WRONG',
  'CIVILIANS_WIN',
  'SPIES_WIN',
  'WHITE_WIN',
];

const ALLOWED_PLACEHOLDERS = ['{village}', '{player}', '{round}'];

describe('kịch bản thoại tiếng Việt', () => {
  it('mọi loại sự kiện đều có ít nhất một câu', () => {
    for (const type of ALL_TYPES) {
      expect(NARRATION_VI[type].length, `thiếu thoại cho ${type}`).toBeGreaterThan(0);
    }
  });

  it('phần lớn sự kiện có từ hai biến thể trở lên để đỡ nghe lặp', () => {
    const many = ALL_TYPES.filter((type) => NARRATION_VI[type].length >= 2);

    expect(many.length).toBeGreaterThanOrEqual(ALL_TYPES.length - 2);
  });

  it('không câu nào chứa chỗ giữ chỗ ngoài ba cái được phép', () => {
    for (const type of ALL_TYPES) {
      for (const line of NARRATION_VI[type]) {
        for (const found of line.match(/\{[^}]*\}/g) ?? []) {
          expect(ALLOWED_PLACEHOLDERS, `${type}: "${line}"`).toContain(found);
        }
      }
    }
  });

  it('sự kiện không mang tên người thì thoại không được dùng {player}', () => {
    // Engine không đặt player vào payload của mấy loại này, nên câu nào dùng
    // {player} sẽ ra một chỗ trống ngay giữa lời dẫn.
    const withoutPlayer: NarrationEventType[] = [
      'GAME_START',
      'ROUND_START',
      'VOTE_OPEN',
      'NO_ELIMINATION',
      'CIVILIANS_WIN',
      'SPIES_WIN',
    ];

    for (const type of withoutPlayer) {
      for (const line of NARRATION_VI[type]) {
        expect(line, `${type}: "${line}"`).not.toContain('{player}');
      }
    }
  });

  it('không câu nào rỗng hay chỉ có khoảng trắng', () => {
    for (const type of ALL_TYPES) {
      for (const line of NARRATION_VI[type]) {
        expect(line.trim().length, `${type} có câu rỗng`).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

Run: `npm test -- --include=src/app/data/narration/narration.spec.ts`
Expected: FAIL — không tìm thấy module `./narration.vi`.

- [ ] **Step 3: Viết kịch bản**

Tạo `src/app/data/narration/narration.vi.ts`:

```ts
import { NarrationScript } from '../../core/narration/line-picker';

/**
 * Kịch bản thoại tiếng Việt.
 *
 * Mỗi loại sự kiện có nhiều biến thể để bốc ngẫu nhiên, tránh nghe lặp khi
 * chơi liên tiếp nhiều ván. Giọng văn cố ý hơi bỗ bã kiểu bàn nhậu, vì trò
 * này chơi quanh bàn chứ không phải trong rạp.
 *
 * Thêm câu mới chỉ cần sửa file này. Chỉ được dùng ba chỗ giữ chỗ:
 * {village}, {player}, {round}. Có test khoá lại chuyện đó.
 */
export const NARRATION_VI: NarrationScript = {
  GAME_START: [
    'Đêm xuống rồi, làng {village} bắt đầu một ván mới',
    'Làng {village} vào ván. Ai gian ai ngay, lát nữa khắc rõ',
    'Ván mới của làng {village} bắt đầu. Chúc mọi người tỉnh táo',
  ],

  PASS_DEVICE: [
    'Chuyền máy cho {player} nào',
    'Tới lượt {player} cầm máy. Mấy người khác ngó đi chỗ khác giùm',
    '{player} ơi, tới lượt bạn xem thẻ',
  ],

  ROUND_START: [
    'Vòng {round} bắt đầu',
    'Bước sang vòng {round}',
    'Vòng {round}. Nghe cho kỹ nhé bà con',
  ],

  SPEAKER_TURN: [
    'Tới lượt {player} nói',
    'Mời {player} cho một từ gợi ý',
    '{player} nói đi, cả làng đang nghe',
  ],

  TIME_ALMOST_UP: [
    'Sắp hết giờ rồi',
    'Còn chút xíu nữa thôi',
    'Nhanh lên, hết giờ tới nơi rồi',
  ],

  VOTE_OPEN: [
    'Tới giờ vote rồi người dân của làng {village} ơi',
    'Làng {village} nghi ngờ ai, chỉ mặt đặt tên đi',
    'Bỏ phiếu thôi bà con. Ai thấy khả nghi thì cứ chỉ',
  ],

  VOTE_TIE: [
    'Hoà phiếu rồi, làng {village} tính sao đây',
    'Không ai chịu ai. Cùng số phiếu cao nhất',
    'Hoà rồi. Làng {village} phải chọn cách xử',
  ],

  NO_ELIMINATION: [
    'Vòng này không ai bị loại. Làng {village} tha cho hết',
    'Không loại ai cả, ván tiếp tục',
    'Làng {village} quyết định không xử ai vòng này',
  ],

  RANDOM_TIE_BREAK: [
    'Chỉ còn hai người, bốc thăm cho nhanh',
    'Không phân định được thì để số phận quyết',
    'Bốc ngẫu nhiên đây, đừng trách ai',
  ],

  CIVILIAN_KILLED: [
    'Tèo teo, một người dân vô tội đã đi bán muối',
    '{player} ra đi trong oan ức, làng {village} mất một người tốt',
    'Ối giời, {player} là dân thường. Làng {village} xử oan rồi',
  ],

  SPY_CAUGHT: [
    'Tóm được rồi. {player} đúng là gián điệp',
    '{player} lộ mặt gián điệp. Làng {village} tinh mắt thật',
    'Không thoát được đâu. {player} chính là gián điệp',
  ],

  WHITE_REVEALED: [
    '{player} là mũ trắng. Cho một cơ hội đoán từ',
    'Lộ rồi, {player} là mũ trắng đấy',
    'Hoá ra {player} là mũ trắng. Giờ tới lượt đoán',
  ],

  WHITE_GUESS_CORRECT: [
    'Đoán trúng phóc. Mũ trắng lật ngược cả ván',
    'Chính xác. Một mình mũ trắng thắng cả làng {village}',
    'Trúng rồi. {player} gỡ lại tất cả trong một câu',
  ],

  WHITE_GUESS_WRONG: [
    'Trật lất. Mũ trắng đi về',
    'Sai rồi. Đoán trượt là hết cơ hội',
    'Không phải từ đó đâu {player} ơi',
  ],

  CIVILIANS_WIN: [
    'Chúc mừng dân làng chiến thắng',
    'Làng {village} sạch bóng gián điệp rồi',
    'Dân làng thắng. Bắt hết gián điệp rồi bà con ơi',
  ],

  SPIES_WIN: [
    'Gián điệp mưu mô đã lên nắm quyền',
    'Làng {village} thất thủ rồi bà con ơi',
    'Gián điệp thắng. Làng {village} bị qua mặt hoàn toàn',
  ],

  WHITE_WIN: [
    'Mũ trắng thắng một mình. Cao tay thật',
    'Một mình một ngựa, mũ trắng ôm trọn ván này',
    'Không phe nào ngờ tới. Mũ trắng thắng',
  ],
};
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

Run: `npm test -- --include=src/app/data/narration/narration.spec.ts`
Expected: PASS, 5 test.

- [ ] **Step 5: Commit**

```bash
git add src/app/data/narration
git commit -m "feat: kich ban thoai tieng viet cho 17 su kien"
```

---

## Task 5: Thêm trường nhớ thông báo, giữ tương thích dữ liệu cũ

Đây là task nguy hiểm nhất về dữ liệu trong cả bản kế hoạch. `settings.repository.ts:44` kiểm hình dạng theo kiểu được ăn cả ngã về không: thiếu bất kỳ trường nào là coi như hỏng và rơi về mặc định. Thêm một trường **bắt buộc** nghĩa là mọi cài đặt người dùng đã lưu từ trước, kể cả luật tính điểm họ tự sửa, bị xoá sạch trong im lặng ngay lần mở app đầu tiên sau khi cập nhật.

**Files:**
- Modify: `src/app/data/repositories/settings.repository.ts:11-58`
- Test: `src/app/data/repositories/settings.repository.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `describe('SettingsRepository', ...)` trong `src/app/data/repositories/settings.repository.spec.ts`:

```ts
  it('mặc định là chưa tắt lời nhắc thiếu giọng', async () => {
    expect((await repository.load()).voiceNoticeDismissed).toBe(false);
  });

  it('nhớ được là người dùng đã bảo đừng nhắc nữa', async () => {
    const settings = await repository.load();
    await repository.save({ ...settings, voiceNoticeDismissed: true });

    expect((await repository.load()).voiceNoticeDismissed).toBe(true);
  });

  it('dữ liệu lưu từ bản cũ, chưa có trường mới, vẫn đọc nguyên vẹn', async () => {
    // Đây là bản ghi thật của bản trước: đủ mọi trường CŨ, không có
    // voiceNoticeDismissed. Nếu kiểm hình dạng đòi trường mới thì luật tính
    // điểm người dùng tự sửa dưới đây sẽ bị xoá sạch trong im lặng.
    await storage.set(
      'settings',
      JSON.stringify({
        scoreRules: { civilianWin: 7, spyWin: 9, whiteWin: 11 },
        soundLevel: 'SFX_ONLY',
        speechRate: 1.3,
        timerSeconds: 45,
        minRoundsBeforeVote: 2,
        lastRevealSpyToSpy: true,
      }),
    );

    const settings = await repository.load();

    expect(settings.scoreRules).toEqual({ civilianWin: 7, spyWin: 9, whiteWin: 11 });
    expect(settings.soundLevel).toBe('SFX_ONLY');
    expect(settings.speechRate).toBe(1.3);
    expect(settings.timerSeconds).toBe(45);
    expect(settings.minRoundsBeforeVote).toBe(2);
    expect(settings.lastRevealSpyToSpy).toBe(true);
    // Trường mới vắng mặt thì lấy mặc định, không được làm hỏng bản ghi.
    expect(settings.voiceNoticeDismissed).toBe(false);
  });
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

Run: `npm test -- --include=src/app/data/repositories/settings.repository.spec.ts`
Expected: FAIL — `voiceNoticeDismissed` là `undefined`, không phải `false`.

- [ ] **Step 3: Cài đặt**

Trong `src/app/data/repositories/settings.repository.ts`, sửa `AppSettings` (dòng 11-21) thành:

```ts
export interface AppSettings {
  scoreRules: ScoreRules;
  soundLevel: SoundLevel;
  /** Tốc độ đọc, 1 là bình thường. */
  speechRate: number;
  /** null nghĩa là tắt đồng hồ. */
  timerSeconds: number | null;
  minRoundsBeforeVote: number;
  /** Lựa chọn Bật mí của ván gần nhất, để điền sẵn cho ván sau. */
  lastRevealSpyToSpy: boolean;
  /** Người dùng đã bấm "không nhắc lại" ở thông báo thiếu giọng tiếng Việt. */
  voiceNoticeDismissed: boolean;
}
```

Sửa `defaultSettings` (dòng 23-32) thành:

```ts
export function defaultSettings(): AppSettings {
  return {
    scoreRules: { ...DEFAULT_SCORE_RULES },
    soundLevel: 'FULL',
    speechRate: 1,
    timerSeconds: 30,
    minRoundsBeforeVote: 3,
    lastRevealSpyToSpy: false,
    voiceNoticeDismissed: false,
  };
}
```

Sửa `isAppSettings` (dòng 44-58) thành:

```ts
/**
 * Kiểm hình dạng bản ghi đọc từ máy.
 *
 * Quy tắc cho người thêm trường về sau: trường MỚI phải là tuỳ chọn ở đây và
 * được điền mặc định trong withDefaults. Bắt buộc nó nghĩa là mọi bản ghi
 * người dùng lưu từ phiên bản trước đều trượt kiểm và bị thay bằng mặc định
 * trong im lặng — mất luôn cả luật tính điểm họ tự sửa.
 */
function isAppSettings(value: unknown): value is Partial<AppSettings> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    isScoreRules(candidate['scoreRules']) &&
    typeof candidate['soundLevel'] === 'string' &&
    SOUND_LEVELS.includes(candidate['soundLevel'] as SoundLevel) &&
    typeof candidate['speechRate'] === 'number' &&
    (candidate['timerSeconds'] === null ||
      typeof candidate['timerSeconds'] === 'number') &&
    typeof candidate['minRoundsBeforeVote'] === 'number' &&
    typeof candidate['lastRevealSpyToSpy'] === 'boolean' &&
    // Tuỳ chọn: vắng mặt là hợp lệ, có mặt thì phải đúng kiểu.
    (candidate['voiceNoticeDismissed'] === undefined ||
      typeof candidate['voiceNoticeDismissed'] === 'boolean')
  );
}

/** Điền mặc định cho những trường mà bản ghi cũ chưa có. */
function withDefaults(stored: Partial<AppSettings>): AppSettings {
  return { ...defaultSettings(), ...stored };
}
```

Sửa constructor và `load` (dòng 60-74) thành:

```ts
@Injectable()
export class SettingsRepository {
  private readonly store: JsonStore<Partial<AppSettings>>;

  constructor(@Inject(STORAGE_PORT) storage: StoragePort) {
    this.store = new JsonStore(storage, 'settings', isAppSettings, defaultSettings);
  }

  async load(): Promise<AppSettings> {
    return withDefaults(await this.store.read());
  }

  save(settings: AppSettings): Promise<void> {
    return this.store.write(settings);
  }
}
```

- [ ] **Step 4: Chạy toàn bộ test**

Run: `npm test`
Expected: PASS toàn bộ. Nếu `JsonStore` báo lỗi kiểu, kiểm tra lại tham số kiểu ở dòng khai báo `store` — nó phải là `JsonStore<Partial<AppSettings>>` để khớp với `isAppSettings`.

- [ ] **Step 5: Commit**

```bash
git add src/app/data/repositories/settings.repository.ts src/app/data/repositories/settings.repository.spec.ts
git commit -m "feat: nho loi nhac thieu giong, giu tuong thich du lieu cu"
```

---

## Task 6: Kho dẫn chuyện

Trái tim của bản này. Nối signal `events` sang chữ và lệnh phát tiếng.

**Files:**
- Create: `src/app/state/narration.store.ts`
- Test: `src/app/state/narration.store.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/state/narration.store.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
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
import { GameSessionStore } from './game-session.store';
import { NARRATION_HOLD_MS, NarrationStore } from './narration.store';

function setup() {
  const speech = new SilentSpeech();
  const sfx = new SilentSfx();

  TestBed.configureTestingModule({
    providers: [
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      { provide: SPEECH_PORT, useValue: speech },
      { provide: SFX_PORT, useValue: sfx },
      // Không chờ thật trong test. Nhịp giữ chữ chỉ có ý nghĩa với người xem.
      { provide: NARRATION_HOLD_MS, useValue: 0 },
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
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

Run: `npm test -- --include=src/app/state/narration.store.spec.ts`
Expected: FAIL — không tìm thấy module `./narration.store`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/state/narration.store.ts`:

```ts
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

const DOUBLE_KNOCK_GAP_MS = 140;

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

  private readonly rng: Rng = () => Math.random();

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
      setTimeout(() => this.sfx.play(cue.name), DOUBLE_KNOCK_GAP_MS);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

Run: `npm test -- --include=src/app/state/narration.store.spec.ts`
Expected: PASS, 15 test.

Nếu test "đợt mới cắt đợt cũ" chập chờn, nguyên nhân gần như chắc chắn là `SilentSpeech.speak` resolve ngay nên đợt đầu chạy xong trước khi đợt hai kịp tới. Đó vẫn là hành vi đúng vì `run` gọi `stop()` ở đầu mỗi đợt, nên `stopCount` vẫn tăng. Đừng sửa mã cài đặt để chiều test.

- [ ] **Step 5: Commit**

```bash
git add src/app/state/narration.store.ts src/app/state/narration.store.spec.ts
git commit -m "feat: kho dan chuyen noi su kien sang chu va tieng"
```

---

## Task 7: Bản đọc thật và đăng ký tiêm phụ thuộc

**Files:**
- Create: `src/app/audio/capacitor-speech.ts`
- Modify: `src/app/app.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Cài plugin và kiểm tra tương thích**

```bash
npm install @capacitor-community/text-to-speech
```

Kiểm ngay xem plugin có nhận Capacitor 8 không (dự án đang dùng `@capacitor/core` ^8.5.1):

```bash
npm ls @capacitor/core
```

Expected: một cây phụ thuộc duy nhất, không có cảnh báo `peer dep` xung đột.

Nếu plugin chưa hỗ trợ Capacitor 8, **dừng lại và báo người dùng** thay vì ép cài. Đường lui: viết `capacitor-speech.ts` dùng thẳng `speechSynthesis` của WebView, cùng interface, không đổi gì ở các task khác — chỉ có phần thân class là khác.

- [ ] **Step 2: Đọc API thật của phiên bản vừa cài**

```bash
npx cat node_modules/@capacitor-community/text-to-speech/dist/esm/definitions.d.ts
```

Đối chiếu ba thứ trước khi viết: tên tuỳ chọn của `speak` (`text`, `lang`, `rate`), có `stop()` không, và `getSupportedVoices()` trả về hình dạng gì. Mã dưới đây viết theo API phổ biến của plugin; **sửa cho khớp với những gì bro vừa đọc được** thay vì tin lời kế hoạch.

- [ ] **Step 3: Viết bản đọc thật**

Tạo `src/app/audio/capacitor-speech.ts`:

```ts
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechPort } from './speech-port';

/**
 * Bản đọc thật.
 *
 * Trên Android plugin gọi TTS của hệ thống, trên trình duyệt nó rơi về Web
 * Speech API. Cả hai đường đều không đảm bảo có giọng tiếng Việt, nên
 * hasVietnameseVoice là thứ NarrationStore hỏi lúc khởi động.
 */
export class CapacitorSpeech implements SpeechPort {
  async speak(text: string, rate: number): Promise<void> {
    if (text.trim() === '') return;

    try {
      // Promise này resolve khi đọc XONG. Hàng đợi trong NarrationStore dựa
      // hẳn vào điều đó để đọc tuần tự.
      await TextToSpeech.speak({ text, lang: 'vi-VN', rate });
    } catch {
      // Máy không đọc được thì thôi. Chữ vẫn đang hiện trên màn hình nên ván
      // không mất thông tin gì.
    }
  }

  async stop(): Promise<void> {
    try {
      await TextToSpeech.stop();
    } catch {
      // Không có gì đang đọc thì stop ném lỗi trên vài máy. Bỏ qua.
    }
  }

  async hasVietnameseVoice(): Promise<boolean> {
    try {
      const { voices } = await TextToSpeech.getSupportedVoices();
      return voices.some((voice) => (voice.lang ?? '').toLowerCase().startsWith('vi'));
    } catch {
      // Không hỏi được thì đoán là có, để không tự tắt tiếng oan trên máy mà
      // plugin chỉ thiếu hàm liệt kê giọng.
      return true;
    }
  }
}
```

- [ ] **Step 4: Đăng ký vào cây tiêm phụ thuộc**

Trong `src/app/app.config.ts`, thêm import:

```ts
import { CapacitorSpeech } from './audio/capacitor-speech';
import { SPEECH_PORT } from './audio/speech.token';
import { SFX_PORT } from './audio/sfx.token';
import { WebAudioSfx } from './audio/web-audio-sfx';
import { NarrationStore } from './state/narration.store';
```

Thêm vào mảng `providers`, ngay dưới dòng `{ provide: STORAGE_PORT, useClass: PreferencesStorage }`:

```ts
    // Trên máy thật đọc bằng TTS hệ thống và tổng hợp tiếng bằng Web Audio;
    // test tự cắm SilentSpeech và SilentSfx.
    { provide: SPEECH_PORT, useClass: CapacitorSpeech },
    { provide: SFX_PORT, useClass: WebAudioSfx },
```

Và thêm `NarrationStore` vào cuối mảng, ngay dưới `GameSessionStore`.

- [ ] **Step 5: Kiểm tra biên dịch và test**

Run: `npm run build && npm test`
Expected: build thành công, toàn bộ test xanh.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/app/audio/capacitor-speech.ts src/app/app.config.ts
git commit -m "feat: ban doc that va dang ky hai cong vao app"
```

---

## Task 8: Thanh trên cùng và dải chữ dẫn

Bố cục đã chọn: thanh trên cùng cố định, dải chữ ngay dưới nó. Cả hai nằm ở vỏ ứng dụng bọc ngoài `<router-outlet>`, nên **không trang nào phải sửa**.

**Files:**
- Create: `src/app/shell/app-bar.ts`
- Create: `src/app/shell/narration-strip.ts`
- Modify: `src/app/app.ts`
- Modify: `src/styles.scss`
- Test: `src/app/shell/app-bar.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/shell/app-bar.spec.ts`:

```ts
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
import { NARRATION_HOLD_MS, NarrationStore } from '../state/narration.store';
import { AppBar } from './app-bar';
import { NarrationStrip } from './narration-strip';

function providers() {
  return [
    provideRouter([]),
    { provide: STORAGE_PORT, useValue: new MemoryStorage() },
    { provide: SPEECH_PORT, useValue: new SilentSpeech() },
    { provide: SFX_PORT, useValue: new SilentSfx() },
    { provide: NARRATION_HOLD_MS, useValue: 0 },
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
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

Run: `npm test -- --include=src/app/shell/app-bar.spec.ts`
Expected: FAIL — không tìm thấy module `./app-bar`.

- [ ] **Step 3: Viết thanh trên cùng**

Tạo `src/app/shell/app-bar.ts`:

```ts
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SoundLevel } from '../data/repositories/settings.repository';
import { NarrationStore } from '../state/narration.store';

const SOUND_LABEL: Record<SoundLevel, string> = {
  FULL: 'Đọc đầy đủ',
  SFX_ONLY: 'Chỉ tiếng động',
  OFF: 'Tắt tiếng',
};

const SOUND_ICON: Record<SoundLevel, string> = {
  FULL: '🔊',
  SFX_ONLY: '🔈',
  OFF: '🔇',
};

/**
 * Thanh trên cùng, có mặt trên mọi màn.
 *
 * Nút loa phải luôn ở đúng một chỗ để tắt gấp được giữa ván mà không phải đi
 * tìm. Đó là lý do nó nằm ở vỏ ứng dụng chứ không nằm trong màn Cài đặt.
 */
@Component({
  selector: 'app-bar',
  imports: [RouterLink],
  template: `
    <header class="bar">
      <a class="bar__home" routerLink="/">Ai Là Gián Điệp</a>

      <div class="bar__tools">
        <button
          type="button"
          class="bar__btn"
          data-test="sound"
          [attr.aria-label]="'Âm thanh: ' + label()"
          (click)="cycle()"
        >
          {{ icon() }}
        </button>

        <a class="bar__btn" routerLink="/cai-dat" aria-label="Cài đặt">⚙</a>
      </div>
    </header>
  `,
  styles: [
    `
      .bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-2) var(--space-4);
        background: var(--ink-800);
        border-bottom: 1px solid var(--ink-700);
      }

      .bar__home {
        color: var(--paper-400);
        font-size: 0.8125rem;
        letter-spacing: 0.04em;
        text-decoration: none;
      }

      .bar__tools {
        display: flex;
        gap: var(--space-2);
      }

      /* 44px là ngưỡng bấm trúng khi không nhìn kỹ. Thanh này mỏng nên không
         dùng --tap 56px, nhưng không được nhỏ hơn 44. */
      .bar__btn {
        display: grid;
        place-items: center;
        min-width: 44px;
        min-height: 44px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: var(--radius-md);
        color: var(--lamp-400);
        font-size: 1.125rem;
        text-decoration: none;
        cursor: pointer;
      }

      .bar__btn:active {
        background: var(--ink-700);
      }
    `,
  ],
})
export class AppBar {
  private readonly narration = inject(NarrationStore);

  readonly label = computed(() => SOUND_LABEL[this.narration.soundLevel()]);
  readonly icon = computed(() => SOUND_ICON[this.narration.soundLevel()]);

  protected cycle(): void {
    void this.narration.cycleSoundLevel();
  }
}
```

- [ ] **Step 4: Viết dải chữ dẫn**

Tạo `src/app/shell/narration-strip.ts`:

```ts
import { Component, inject } from '@angular/core';
import { NarrationStore } from '../state/narration.store';

/**
 * Dải chữ dẫn chuyện.
 *
 * Chữ hiện ở MỌI mức âm lượng, kể cả khi tắt tiếng hoàn toàn. Đây là đường
 * chính để người chơi biết chuyện gì vừa xảy ra; giọng đọc chỉ là thứ tăng
 * thêm. Máy không có giọng tiếng Việt thì ván vẫn chơi đủ nhờ dải này.
 */
@Component({
  selector: 'app-narration-strip',
  template: `
    @if (line() !== '') {
      <p class="strip__line" role="status">{{ line() }}</p>
    }
  `,
  styles: [
    `
      .strip__line {
        margin: 0;
        padding: var(--space-3) var(--space-4);
        background: var(--lamp-glow);
        border-bottom: 1px solid var(--ink-700);
        color: var(--lamp-400);
        font-size: 0.9375rem;
        font-style: italic;
        line-height: 1.35;
        text-align: center;
      }
    `,
  ],
})
export class NarrationStrip {
  private readonly narration = inject(NarrationStore);
  readonly line = this.narration.line;
}
```

- [ ] **Step 5: Cắm vào vỏ ứng dụng**

Thay toàn bộ `src/app/app.ts` bằng:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppBar } from './shell/app-bar';
import { NarrationStrip } from './shell/narration-strip';
import { NarrationStore } from './state/narration.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppBar, NarrationStrip],
  template: `
    <app-bar />
    <app-narration-strip />
    <router-outlet />

    @if (narration.showVoiceNotice()) {
      <div class="notice" role="alert">
        <p class="notice__text">
          Máy này chưa có giọng đọc tiếng Việt nên phần dẫn chuyện sẽ chỉ hiện
          bằng chữ. Ván vẫn chơi bình thường.
        </p>
        <button type="button" class="btn btn--ghost" (click)="dismiss()">
          Không nhắc lại
        </button>
      </div>
    }
  `,
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly narration = inject(NarrationStore);

  ngOnInit(): void {
    // Chạy ngầm: giao diện hiện ngay, mức âm lượng đã lưu được áp vào sau khi
    // đọc xong từ máy.
    void this.narration.init();
  }

  protected dismiss(): void {
    void this.narration.dismissVoiceNotice();
  }
}
```

- [ ] **Step 6: Thêm kiểu cho hộp thông báo**

Thêm vào cuối `src/styles.scss`:

```scss
/* --------------------------------------------------------------------------
   Hộp thông báo nổi
   -------------------------------------------------------------------------- */

.notice {
  position: fixed;
  left: var(--space-4);
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 32rem;
  margin: 0 auto;
  padding: var(--space-4);
  background: var(--ink-700);
  border: 1px solid var(--ink-600);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}

.notice__text {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.45;
}
```

- [ ] **Step 7: Sửa test của vỏ ứng dụng**

`src/app/app.spec.ts` sẽ đỏ ở cả hai test: `App` giờ cần thêm nhà cung cấp, và test thứ hai đang khẳng định vỏ **rỗng chữ** — điều không còn đúng khi vỏ có thanh trên cùng.

Thay toàn bộ `src/app/app.spec.ts` bằng:

```ts
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
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('.notice')).toBeNull();
  });

  it('máy thiếu giọng tiếng Việt thì hiện thông báo một lần', async () => {
    const speech = new SilentSpeech();
    speech.vietnameseVoice = false;

    const fixture = await setup(speech);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.notice')).not.toBeNull();
  });
});
```

- [ ] **Step 8: Chạy toàn bộ test**

Run: `npm test`
Expected: PASS toàn bộ.

Các test trang khác có thể đỏ nếu chúng dựng `App`. Trang nào chỉ dựng component của riêng nó thì không ảnh hưởng.

- [ ] **Step 9: Commit**

```bash
git add src/app/shell src/app/app.ts src/app/app.spec.ts src/styles.scss
git commit -m "feat: thanh tren cung va dai chu dan o vo ung dung"
```

---

## Task 9: Màn Cài đặt

**Files:**
- Create: `src/app/features/settings/settings.page.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/settings/settings.page.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/features/settings/settings.page.spec.ts`:

```ts
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
import { NARRATION_HOLD_MS, NarrationStore } from '../../state/narration.store';
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
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

Run: `npm test -- --include=src/app/features/settings/settings.page.spec.ts`
Expected: FAIL — không tìm thấy module `./settings.page`.

- [ ] **Step 3: Viết màn Cài đặt**

Tạo `src/app/features/settings/settings.page.ts`:

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { SettingsRepository, SoundLevel } from '../../data/repositories/settings.repository';
import { NarrationStore } from '../../state/narration.store';

const LEVELS: { value: SoundLevel; title: string; note: string }[] = [
  { value: 'FULL', title: 'Đọc đầy đủ', note: 'Đọc lời dẫn kèm tiếng động.' },
  { value: 'SFX_ONLY', title: 'Chỉ tiếng động', note: 'Không đọc, chỉ báo hiệu bằng tiếng.' },
  { value: 'OFF', title: 'Tắt tiếng', note: 'Im lặng hoàn toàn. Lời dẫn vẫn hiện bằng chữ.' },
];

@Component({
  selector: 'app-settings-page',
  template: `
    <div class="screen">
      <p class="screen__eyebrow">Cài đặt</p>
      <h1 class="screen__title">Âm thanh</h1>

      <div class="screen__actions">
        @for (level of levels; track level.value) {
          <label class="choice">
            <input
              type="radio"
              name="soundLevel"
              [value]="level.value"
              [checked]="narration.soundLevel() === level.value"
              (change)="chooseLevel(level.value)"
            />
            <span>
              <strong>{{ level.title }}</strong>
              <span class="muted">{{ level.note }}</span>
            </span>
          </label>
        }
      </div>

      <div class="field">
        <label class="field__label" for="rate">
          Tốc độ đọc: {{ rateText() }}
        </label>
        <input
          id="rate"
          class="slider"
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          [value]="rateText()"
          (input)="changeRate($event)"
        />
      </div>

      <button
        type="button"
        class="btn btn--ghost"
        data-test="preview"
        [disabled]="narration.soundLevel() !== 'FULL'"
        (click)="preview()"
      >
        Nghe thử
      </button>

      <p class="muted">
        Lời dẫn luôn hiện bằng chữ ở cả ba mức, nên tắt tiếng vẫn chơi đủ.
      </p>

      <div class="screen__spacer"></div>
    </div>
  `,
  styles: [
    `
      .choice {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        min-height: var(--tap);
        padding: var(--space-3) var(--space-4);
        background: var(--ink-800);
        border: 1px solid var(--ink-600);
        border-radius: var(--radius-md);
        cursor: pointer;
      }

      .choice span {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }

      .slider {
        width: 100%;
        min-height: 44px;
        accent-color: var(--lamp-500);
      }
    `,
  ],
})
export class SettingsPage implements OnInit {
  protected readonly narration = inject(NarrationStore);
  private readonly settings = inject(SettingsRepository);

  protected readonly levels = LEVELS;
  protected readonly rate = signal(1);

  /**
   * Bật strictTemplates nên `[value]` của input chỉ nhận chuỗi. Đổi sẵn ở đây
   * thay vì nhét số vào rồi để Angular báo lỗi lúc biên dịch template.
   */
  protected readonly rateText = computed(() => this.rate().toFixed(1));

  ngOnInit(): void {
    void this.settings.load().then((settings) => this.rate.set(settings.speechRate));
  }

  protected chooseLevel(level: SoundLevel): void {
    void this.narration.setSoundLevel(level);
  }

  protected changeRate(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.rate.set(value);
    void this.narration.setSpeechRate(value);
  }

  protected preview(): void {
    void this.narration.preview();
  }
}
```

- [ ] **Step 4: Đăng ký tuyến đường**

Trong `src/app/app.routes.ts`, thêm ngay trước dòng `{ path: '**', redirectTo: '' }`:

```ts
  {
    path: 'cai-dat',
    loadComponent: () =>
      import('./features/settings/settings.page').then((m) => m.SettingsPage),
  },
```

- [ ] **Step 5: Chạy test để xác nhận xanh**

Run: `npm test -- --include=src/app/features/settings/settings.page.spec.ts`
Expected: PASS, 5 test.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/settings src/app/app.routes.ts
git commit -m "feat: man cai dat am thanh va toc do doc"
```

---

## Task 10: Đồng hồ bắn sự kiện sắp hết giờ

`TIME_ALMOST_UP` không đến từ engine được vì engine là hàm thuần, không biết tới thời gian thực. Đồng hồ nằm ở giao diện nên nó phải tự bắn.

**Files:**
- Modify: `src/app/features/game/speaking.page.ts:110-160`
- Test: `src/app/features/game/speaking.page.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Sửa `src/app/features/game/speaking.page.spec.ts` ba chỗ.

**Một,** thêm các import này vào đầu file, ngay dưới dòng import `MemoryStorage`:

```ts
import { SFX_PORT } from '../../audio/sfx.token';
import { SilentSfx } from '../../audio/silent-sfx';
import { SilentSpeech } from '../../audio/silent-speech';
import { SPEECH_PORT } from '../../audio/speech.token';
import { NARRATION_HOLD_MS, NarrationStore } from '../../state/narration.store';
```

**Hai,** thêm bốn dòng vào mảng `providers` trong hàm `setup()` sẵn có (dòng 19-26), ngay dưới dòng `{ provide: STORAGE_PORT, useValue: new MemoryStorage() },`:

```ts
      { provide: SPEECH_PORT, useValue: new SilentSpeech() },
      { provide: SFX_PORT, useValue: new SilentSfx() },
      { provide: NARRATION_HOLD_MS, useValue: 0 },
      NarrationStore,
```

**Ba,** thêm hai test này vào cuối `describe('SpeakingPage', ...)`:

```ts
  it('còn 5 giây thì nhắc sắp hết giờ, và chỉ nhắc đúng một lần', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: 30 });
    const narration = TestBed.inject(NarrationStore);
    await narration.init();

    // Chạy tới lúc còn đúng 5 giây. Dùng bản Async vì hàng đợi dẫn chuyện là
    // chuỗi promise; advanceTimersByTime bản thường không nhả microtask nên
    // lời dẫn chưa kịp được đặt.
    await vi.advanceTimersByTimeAsync(25_000);
    const warned = narration.line();

    // Thêm một giây nữa: chỉ được gõ tick, không được nhắc lần hai.
    await vi.advanceTimersByTimeAsync(1_000);

    expect(warned).not.toBe('');
    expect(narration.line()).toBe(warned);
    expect(fixture.componentInstance.secondsLeft()).toBe(4);
  });

  it('sang người kế thì được nhắc lại từ đầu', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: 30 });
    const narration = TestBed.inject(NarrationStore);
    await narration.init();

    await vi.advanceTimersByTimeAsync(25_000);
    await fixture.componentInstance.done();

    // Đồng hồ chạy lại từ 30, nên cờ đã nhắc phải được đặt lại.
    await vi.advanceTimersByTimeAsync(25_000);

    expect(fixture.componentInstance.secondsLeft()).toBe(5);
    expect(narration.line()).not.toBe('');
  });
```

File này đã có sẵn `vi` trong dòng import từ `vitest` và `afterEach(() => vi.useRealTimers())`, nên không phải thêm gì cho phần dọn dẹp đồng hồ giả.

- [ ] **Step 2: Chạy test để xác nhận đỏ**

Run: `npm test -- --include=src/app/features/game/speaking.page.spec.ts`
Expected: FAIL — `narration.line()` vẫn là chuỗi rỗng vì đồng hồ chưa bắn gì.

- [ ] **Step 3: Cài đặt**

Trong `src/app/features/game/speaking.page.ts`, thêm import:

```ts
import { NarrationStore } from '../../state/narration.store';
```

Thêm hằng số ngay trên `@Component`:

```ts
/** Bắt đầu nhắc và gõ tick khi còn ngần này giây. */
const ALMOST_UP_AT = 5;
```

Trong class, thêm dưới dòng `private readonly destroyRef = inject(DestroyRef);`:

```ts
  private readonly narration = inject(NarrationStore);

  /** Mỗi lượt chỉ nhắc một lần, dù đồng hồ chạy qua mốc 5 giây nhiều nhịp. */
  private warned = false;
```

Thay `restartClock` (dòng 137-152) bằng:

```ts
  private restartClock(): void {
    this.stopClock();
    this.warned = false;

    const seconds = this.session.state()?.config.timerSeconds ?? null;
    this._secondsLeft.set(seconds);
    if (seconds === null) return;

    this.handle = setInterval(() => {
      const left = this._secondsLeft();
      if (left === null || left <= 0) {
        this.stopClock();
        return;
      }

      const next = left - 1;
      this._secondsLeft.set(next);

      if (next > 0 && next <= ALMOST_UP_AT) {
        // Tiếng tick gõ từng giây, còn lời nhắc chỉ đọc đúng một lần. Đọc lại
        // mỗi giây thì vừa ồn vừa ghi đè lời dẫn của pha đang diễn ra.
        this.narration.tick();
        if (!this.warned) {
          this.warned = true;
          this.narration.raise({ type: 'TIME_ALMOST_UP', payload: {} });
        }
      }
    }, 1000);
  }
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

Run: `npm test -- --include=src/app/features/game/speaking.page.spec.ts`
Expected: PASS toàn bộ test của file.

- [ ] **Step 5: Chạy toàn bộ test**

Run: `npm test`
Expected: PASS toàn bộ.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/game/speaking.page.ts src/app/features/game/speaking.page.spec.ts
git commit -m "feat: dong ho bao sap het gio bang tieng va loi nhac"
```

---

## Task 11: Chạy thử trên trình duyệt và soát lại bằng tai

Test không nghe được. Task này bắt buộc phải làm bằng tai và bằng mắt.

**Files:** không sửa file nào trừ khi phát hiện lỗi.

- [ ] **Step 1: Chạy app**

```bash
npm start
```

Mở `http://localhost:4200`. **Bật loa máy lên.**

- [ ] **Step 2: Đi hết một ván ngắn**

Dựng ván 4 người, bật đồng hồ 30 giây, rồi đi hết: chia bài → vòng nói → vote → lộ danh tính → kết ván.

Soát từng điểm:

| Điểm | Phải thấy hoặc nghe |
|---|---|
| Mọi màn | Thanh trên cùng luôn ở đó, nút loa không nhảy chỗ |
| Chia bài | Nghe tiếng gõ nhẹ mỗi lần chuyền máy, chữ hiện tên người sắp cầm máy |
| Vòng nói | Nghe tiếng gõ khi đổi lượt |
| Còn 5 giây | Nghe tick từng giây, lời nhắc sắp hết giờ đọc **đúng một lần** |
| Mở vote | Nghe hai tiếng gõ liền nhau |
| Có người bị loại | Nghe chuông trầm, chữ nói đúng tên người đó |
| Kết ván | Nghe ba nốt lên dần |
| Dải chữ | Không bao giờ hiện `{player}` hay `{village}` thô ra màn hình |

- [ ] **Step 3: Soát ba mức âm lượng**

Bấm nút loa giữa lúc đang đọc dở một câu dài.

| Mức | Phải đúng |
|---|---|
| `FULL` → `SFX_ONLY` | Giọng đọc **im ngay lập tức**, không đọc nốt câu |
| `SFX_ONLY` | Còn tiếng động, chữ vẫn hiện |
| `OFF` | Im hoàn toàn, chữ vẫn hiện |
| Bấm tiếp | Quay lại `FULL` |

- [ ] **Step 4: Soát việc nhớ cài đặt**

Đặt mức `SFX_ONLY`, tải lại trang. Mức phải vẫn là `SFX_ONLY`.

- [ ] **Step 5: Soát màn Cài đặt**

Vào `/cai-dat`. Kéo tốc độ đọc lên 1.5, bấm "Nghe thử" — phải nghe rõ là đọc nhanh hơn. Kéo xuống 0.5, nghe thử lại — phải chậm hơn hẳn.

- [ ] **Step 6: Soát đường suy giảm khi thiếu giọng**

Không phải máy nào cũng thiếu giọng tiếng Việt để thử. Giả lập bằng cách tạm sửa `hasVietnameseVoice` trong `capacitor-speech.ts` cho trả `false`, tải lại trang:

- Hộp thông báo phải hiện.
- Mức phải tự hạ xuống `SFX_ONLY`.
- Bấm "Không nhắc lại", tải lại trang — hộp không được hiện nữa.

**Nhớ hoàn nguyên sửa đổi tạm này trước khi commit.**

- [ ] **Step 7: Ghi lại những gì nghe không ổn**

Tiếng động là chuyện gu. Nếu tiếng nào chói, to quá, hay lạc tông, chỉnh các con số trong `web-audio-sfx.ts` — `peak` cho độ to, `seconds` cho độ dài, `frequency` cho cao thấp. Đây là việc chỉnh tay, không có test nào bắt được.

- [ ] **Step 8: Chạy lần cuối rồi commit**

```bash
npm test && npm run build
```

Expected: test xanh, build thành công.

```bash
git add -A
git commit -m "chore: chinh tieng dong sau khi chay thu"
```

Bỏ qua bước commit này nếu không sửa gì ở Step 7.

---

## Sau khi xong

Cập nhật cột trạng thái trong `docs/superpowers/specs/2026-09-09-dan-chuyen-va-am-thanh-design.md` nếu có chỗ nào làm khác đặc tả, và ghi rõ lý do — đúng như bảng ở mục 11 của đặc tả đang làm.

Phần hình ảnh và chuyển động là một bản đặc tả riêng, chưa viết. Nó sẽ đánh bóng cả thanh trên cùng và dải chữ mà bản này vừa dựng.
