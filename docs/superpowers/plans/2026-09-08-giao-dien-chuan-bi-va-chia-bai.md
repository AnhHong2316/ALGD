# Giao diện: chuẩn bị ván và chia bài — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng nền giao diện và luồng chuẩn bị ván, kết thúc ở màn chia bài chuyền tay chạy được thật trên điện thoại.

**Architecture:** Angular 21 standalone, zoneless, dùng signal. Một `GameSessionStore` giữ `GameState` trong signal, bọc các hành động của engine và ghi xuống máy sau mỗi thay đổi. Toàn bộ màn hình trong ván được điều khiển bằng `state.phase` chứ không bằng URL, để khôi phục ván đang dở không bị lệch giữa địa chỉ và trạng thái. Hệ thống thiết kế nằm gọn trong `styles.scss` dưới dạng biến CSS và vài lớp dùng chung, nên mỗi màn hình chỉ còn phần riêng của nó.

**Tech Stack:** Angular 21, TypeScript strict, Vitest, SCSS, `@fontsource` (font đóng gói offline).

**Đặc tả nguồn:** `docs/superpowers/specs/2026-09-07-ai-la-gian-diep-design.md`, mục 6.1 đến 6.4.

**Kế hoạch trước:** số 1 (engine, 149 test) và số 2 (kho từ + lưu trữ, 236 test). Cả hai đã gộp vào `main`.

---

## Bối cảnh cần biết trước khi bắt đầu

Đây là bản 3A trong bốn giai đoạn. Bản 3B sẽ làm nốt vòng nói, vote, lộ danh tính, đoán từ và kết ván.

Kết thúc bản này: cắm điện thoại vào chạy được **trang chủ → lập danh sách → cấu hình → chia bài cho cả nhóm**. Sau người cuối cùng xem xong, app dừng ở một màn tạm báo "chia bài xong" — vòng nói thuộc bản 3B.

### Những gì đã có và sẽ dùng lại

| Đường dẫn | Dùng để làm gì |
|---|---|
| `src/app/core/engine/game-engine.ts` | `createGame`, `buildCard`, `revealNextPlayer`, `EngineResult` |
| `src/app/core/engine/team-rules.ts` | `MIN_PLAYERS`, `MAX_PLAYERS`, `maxSpyCount`, `suggestedSpyCount`, `validateTeam` |
| `src/app/core/models` | `GameState`, `GameConfig`, `DEFAULT_GAME_CONFIG`, `CardContent`, `NarrationEvent` |
| `src/app/data/start-new-game.ts` | `startNewGame({ wordBank, gameId, villageName, playerNames, config, rng })` |
| `src/app/data/repositories/*` | `PlayersRepository`, `SettingsRepository`, `WordBankRepository`, `ActiveGameRepository` |
| `src/app/data/storage/preferences-storage.ts` | `PreferencesStorage` — bản cài dùng trên máy thật |
| `src/app/data/storage/memory-storage.ts` | `MemoryStorage` — dùng trong mọi test |
| `src/app/data/word-bank` | `TOPICS` — tám chủ đề chính thức |

### Hướng thẩm mỹ: "Đêm ở làng"

Trò chơi diễn ra quanh một cái bàn, thường vào buổi tối, và một chiếc điện thoại được chuyền tay. Ba điều đó quyết định thiết kế:

- **Nền tối** không phải vì mốt mà vì công năng: màn hình sáng chói chuyền quanh bàn vừa khó chịu vừa hắt sáng lên mặt người ngồi cạnh, khiến họ dễ liếc thấy thẻ.
- **Chữ rất to** cho tên người nhận máy, đọc được khi cầm cách một sải tay.
- **Vùng bấm lớn**, vì người chơi đang cầm cốc, đang cười, đang chuyền vội.

Bảng màu là xanh mực gần đen với một vùng sáng vàng như đèn dầu đổ xuống thẻ từ. Chữ tiêu đề dùng Playfair Display có chân, thân chữ dùng Be Vietnam Pro — cả hai đều có bộ ký tự tiếng Việt đầy đủ, và được đóng gói vào app chứ không tải từ mạng, vì app phải chạy offline.

**Chi tiết chữ ký của thiết kế, đồng thời là một tính chất an toàn:** thẻ từ mở ra có hoạt hình 180ms, nhưng **đóng lại tức thì, 0ms**. Đóng có hoạt hình nghĩa là trong lúc mờ dần, chữ vẫn đọc được — thả tay ra rồi mà từ bí mật vẫn còn trên màn hình một phần tư giây là quá đủ để người bên cạnh nhìn thấy.

### Ràng buộc giữ bí mật, nhắc lại vì đây là nơi thi hành

Đặc tả mục 6.4 và mục 3.2: khi tắt Bật mí, thẻ dân làng và thẻ gián điệp phải giống hệt nhau ngoài đúng cái từ. Engine đã lo phần dữ liệu qua `buildCard`. Phần giao diện phải giữ hai điều:

1. **Component hiển thị thẻ chỉ được đọc `CardContent`.** Không được nhận `GameState`, không được đọc `assignments`, không được biết vai là gì. Nếu nó không có đường nào để biết vai, nó không thể vô tình để lộ.
2. **Dòng vai nằm trong khung rộng cố định, căn giữa.** Hai nhãn "Bạn là DÂN LÀNG" (15 ký tự) và "Bạn là GIÁN ĐIỆP" (16 ký tự) dài khác nhau; nếu khung co giãn theo chữ thì người ngồi cạnh liếc thấy bề rộng là suy ra vai, chưa cần đọc kịp.

---

### Cố ý chưa làm trong bản 3A

Ba thứ có trong đặc tả mục 6 nhưng để lại, kèm lý do:

- **Chọn độ khó ở màn cấu hình.** Màn cấu hình mới chỉ cho chọn chủ đề; độ khó giữ nguyên mặc định là cả ba mức. Kho từ đã cân bằng sẵn 22 cặp mỗi chủ đề trải đều ba mức, nên lọc thêm theo độ khó chưa mang lại gì rõ rệt mà lại thêm một hàng nút nữa vào màn hình vốn đã dài. Thêm sau khi chơi thật thấy cần.
- **Đồng hồ mỗi lượt nói.** Là thiết lập của vòng nói, mà vòng nói thuộc bản 3B. Đưa nút chỉnh vào bây giờ sẽ là một nút không có tác dụng nhìn thấy được.
- **Kéo thả đổi thứ tự người chơi.** Thứ tự nói được engine xáo lại ngẫu nhiên ở mỗi vòng, nên thứ tự trong danh sách chỉ ảnh hưởng tới trình tự chuyền máy lúc chia bài. Xoá rồi thêm lại là đủ, và kéo thả trên di động tốn nhiều công hơn giá trị nó mang lại.

## Cấu trúc file

### Nền chung

| File | Trách nhiệm |
|---|---|
| `src/styles.scss` | Biến CSS, nền, chữ, và các lớp dùng chung: `.screen`, `.btn`, `.field`, `.lamp` |
| `angular.json` | Nạp ba file CSS font từ `@fontsource` |
| `src/app/app.ts` / `.html` / `.scss` | Vỏ ứng dụng, chỉ chứa `<router-outlet>` |
| `src/app/app.config.ts` | Cắm `StoragePort` thật và các repository vào hệ thống tiêm phụ thuộc |
| `src/app/app.routes.ts` | Bốn tuyến: trang chủ, danh sách, cấu hình, ván |

### Trạng thái

| File | Trách nhiệm |
|---|---|
| `src/app/state/new-game-draft.store.ts` | Tên làng, danh sách tên, cấu hình — sống qua ba màn chuẩn bị |
| `src/app/state/game-session.store.ts` | `GameState` hiện tại, bọc hành động engine, ghi xuống máy |

### Màn hình

| File | Trách nhiệm |
|---|---|
| `src/app/features/home/home.page.ts` | Trang chủ |
| `src/app/features/setup/players.page.ts` | Lập danh sách người chơi |
| `src/app/features/setup/config.page.ts` | Cấu hình ván |
| `src/app/features/game/game.page.ts` | Vỏ trong ván, chọn màn theo `phase` |
| `src/app/features/game/deal.page.ts` | Chia bài chuyền tay |
| `src/app/features/game/secret-card.ts` | Thẻ nhấn-giữ-để-xem, chỉ nhận `CardContent` |

Mỗi màn hình dùng template và style nội tuyến (`template:` và `styles:`) thay vì file riêng, vì mỗi màn ngắn và việc gom lại một chỗ giúp đọc nhanh hơn ba file rời.

---

## Task 1: Hệ thống thiết kế và vỏ ứng dụng

**Files:**
- Modify: `package.json` (hai gói font)
- Modify: `angular.json` (nạp CSS font)
- Modify: `src/styles.scss`
- Modify: `src/app/app.ts`, `src/app/app.html`, `src/app/app.scss`
- Modify: `src/app/app.spec.ts`

- [ ] **Step 1: Cài font đóng gói offline**

```bash
cd /c/SRC/ai-la-gian-diep
npm install @fontsource/be-vietnam-pro@5 @fontsource/playfair-display@5
```

Hai gói này chứa sẵn file woff2 đã cắt riêng bộ ký tự tiếng Việt — 12KB và 8KB. Chúng được đóng vào bản build nên app chạy offline vẫn có font đúng, khác với việc nhúng link Google Fonts.

- [ ] **Step 2: Nạp CSS font vào build**

Mở `angular.json`, tìm mảng `styles` trong `projects.ai-la-gian-diep.architect.build.options`, thay bằng:

```json
"styles": [
  "node_modules/@fontsource/be-vietnam-pro/vietnamese-400.css",
  "node_modules/@fontsource/be-vietnam-pro/vietnamese-600.css",
  "node_modules/@fontsource/playfair-display/vietnamese-600.css",
  "src/styles.scss"
]
```

Thứ tự quan trọng: font phải đứng trước `styles.scss` để khai báo `@font-face` có mặt trước khi được dùng.

- [ ] **Step 3: Viết hệ thống thiết kế**

Thay toàn bộ `src/styles.scss`:

```scss
/* ==========================================================================
   Đêm ở làng — hệ thống thiết kế
   Trò chơi diễn ra quanh bàn, buổi tối, một máy chuyền tay. Ba điều đó
   quyết định mọi lựa chọn dưới đây: nền tối để không hắt sáng sang người
   ngồi cạnh, chữ to để đọc được cách một sải tay, vùng bấm lớn để bấm
   trúng khi đang cầm cốc.
   ========================================================================== */

:root {
  --ink-900: #0b0e14;
  --ink-800: #121722;
  --ink-700: #1b2130;
  --ink-600: #2a3244;

  --lamp-500: #f2a65a;
  --lamp-400: #ffbc77;
  --lamp-glow: rgba(242, 166, 90, 0.16);

  --paper-100: #ede7de;
  --paper-400: #8a93a6;

  --blood-500: #d9484b;

  --font-display: 'Playfair Display', Georgia, 'Times New Roman', serif;
  --font-body: 'Be Vietnam Pro', system-ui, -apple-system, sans-serif;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;

  --radius-md: 12px;
  --radius-lg: 20px;

  /* Vùng bấm nhỏ nhất. 56px là ngưỡng bấm trúng bằng ngón cái khi không nhìn kỹ. */
  --tap: 56px;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100dvh;
  background: var(--ink-900);
  color: var(--paper-100);
  font-family: var(--font-body);
  font-size: 17px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

body {
  /* Chặn kéo-chọn chữ và menu giữ-lâu của trình duyệt di động. Bắt buộc:
     màn chia bài dùng thao tác nhấn giữ, mà mặc định nhấn giữ trên di động
     sẽ bôi đen chữ hoặc mở menu sao chép — cả hai đều làm lộ từ bí mật. */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  overscroll-behavior: none;
}

h1,
h2,
h3 {
  font-family: var(--font-display);
  font-weight: 600;
  margin: 0;
  line-height: 1.15;
}

/* --------------------------------------------------------------------------
   Bố cục màn hình
   -------------------------------------------------------------------------- */

.screen {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-height: 100dvh;
  max-width: 32rem;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5) var(--space-5);
}

.screen__eyebrow {
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--paper-400);
}

.screen__title {
  font-size: 2rem;
}

.screen__spacer {
  flex: 1;
}

.screen__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* --------------------------------------------------------------------------
   Nút
   -------------------------------------------------------------------------- */

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--tap);
  padding: 0 var(--space-5);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 1.0625rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 90ms ease, background-color 120ms ease;
}

.btn:active:not(:disabled) {
  transform: scale(0.985);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--lamp-500);
  color: var(--ink-900);
}

.btn--primary:hover:not(:disabled) {
  background: var(--lamp-400);
}

.btn--ghost {
  background: transparent;
  border-color: var(--ink-600);
  color: var(--paper-100);
}

.btn--quiet {
  background: transparent;
  color: var(--paper-400);
  min-height: 44px;
  font-weight: 400;
}

/* --------------------------------------------------------------------------
   Ô nhập
   -------------------------------------------------------------------------- */

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field__label {
  font-size: 0.875rem;
  color: var(--paper-400);
}

.input {
  min-height: var(--tap);
  padding: 0 var(--space-4);
  background: var(--ink-800);
  border: 1px solid var(--ink-600);
  border-radius: var(--radius-md);
  color: var(--paper-100);
  font-family: var(--font-body);
  font-size: 1.0625rem;
  /* Cho phép chọn chữ trong ô nhập, ngược với quy tắc chung ở body. */
  user-select: text;
  -webkit-user-select: text;
}

.input:focus {
  outline: 2px solid var(--lamp-500);
  outline-offset: 1px;
}

/* --------------------------------------------------------------------------
   Tiện ích
   -------------------------------------------------------------------------- */

.muted {
  color: var(--paper-400);
  font-size: 0.9375rem;
}

.warning {
  color: var(--blood-500);
  font-size: 0.9375rem;
}

/* Vùng sáng như đèn dầu, đặt sau nội dung để tạo chiều sâu. */
.lamp {
  position: relative;
}

.lamp::before {
  content: '';
  position: absolute;
  inset: -40% -20%;
  background: radial-gradient(ellipse at 50% 40%, var(--lamp-glow), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.lamp > * {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 4: Rút gọn vỏ ứng dụng**

Thay `src/app/app.html` bằng đúng một dòng:

```html
<router-outlet />
```

Thay `src/app/app.scss` bằng file rỗng có một dòng bình luận:

```scss
/* Vỏ ứng dụng không có style riêng: mọi thứ dùng chung nằm ở src/styles.scss. */
```

Thay `src/app/app.ts`:

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
```

- [ ] **Step 5: Sửa test của vỏ ứng dụng**

`src/app/app.spec.ts` hiện đang kiểm một tiêu đề mặc định mà ta vừa xoá. Thay toàn bộ file:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('dựng được vỏ ứng dụng', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('vỏ chỉ chứa chỗ cắm cho tuyến đường', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });
});
```

- [ ] **Step 6: Chạy test và build**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
npx ng build
```

Expected: PASS. Số test đi từ 236 xuống 236 — file `app.spec.ts` cũ có 2 test, file mới cũng có 2. Build phải thành công và bảng kích thước phải có dòng cho CSS font.

- [ ] **Step 7: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add package.json package-lock.json angular.json src/styles.scss src/app/app.ts src/app/app.html src/app/app.scss src/app/app.spec.ts
git commit -m "feat: he thong thiet ke Dem o lang va vo ung dung"
```

---

## Task 2: Cắm tầng lưu trữ và kho phiên chơi

**Files:**
- Create: `src/app/state/game-session.store.ts`
- Modify: `src/app/app.config.ts`
- Test: `src/app/state/game-session.store.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/state/game-session.store.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../core/models';
import { ActiveGameRepository } from '../data/repositories/active-game.repository';
import { WordBankRepository } from '../data/repositories/word-bank.repository';
import { MemoryStorage } from '../data/storage/memory-storage';
import { STORAGE_PORT } from '../data/storage/storage.token';
import { GameSessionStore } from './game-session.store';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

describe('GameSessionStore', () => {
  let storage: MemoryStorage;
  let store: GameSessionStore;

  beforeEach(() => {
    storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_PORT, useValue: storage },
        WordBankRepository,
        ActiveGameRepository,
        GameSessionStore,
      ],
    });
    store = TestBed.inject(GameSessionStore);
  });

  it('chưa bắt đầu thì chưa có ván nào', () => {
    expect(store.state()).toBeNull();
    expect(store.hasGame()).toBe(false);
  });

  it('bắt đầu ván mới thì có state ở pha chia bài', async () => {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    const state = store.state();
    expect(state?.phase).toBe('DEALING');
    expect(state?.players).toHaveLength(4);
    expect(store.hasGame()).toBe(true);
  });

  it('ghi ván xuống máy ngay khi bắt đầu', async () => {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    const saved = await new ActiveGameRepository(storage).load();
    expect(saved?.id).toBe(store.state()?.id);
  });

  it('chuyền máy làm tăng số người đã xem', async () => {
    await store.startNew({
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    expect(store.state()?.dealtCount).toBe(0);
    await store.revealNext();
    expect(store.state()?.dealtCount).toBe(1);
  });

  it('người cuối xem xong thì sang pha nói', async () => {
    await store.startNew({
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    for (let i = 0; i < 4; i++) await store.revealNext();

    expect(store.state()?.phase).toBe('SPEAKING');
  });

  it('mỗi bước đều được ghi lại xuống máy', async () => {
    await store.startNew({
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });
    await store.revealNext();

    const saved = await new ActiveGameRepository(storage).load();
    expect(saved?.dealtCount).toBe(1);
  });

  it('khôi phục được ván đang dở', async () => {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });
    await store.revealNext();
    const before = store.state();

    const fresh = TestBed.inject(GameSessionStore);
    fresh.clearInMemory();
    await fresh.resume();

    expect(fresh.state()).toEqual(before);
  });

  it('không có ván dở thì khôi phục ra null', async () => {
    await store.resume();

    expect(store.state()).toBeNull();
  });

  it('bỏ ván thì xoá cả trong bộ nhớ lẫn trên máy', async () => {
    await store.startNew({
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });
    await store.abandon();

    expect(store.state()).toBeNull();
    expect(await new ActiveGameRepository(storage).load()).toBeNull();
  });

  it('đội hình sai thì ném lỗi và không tạo ván', async () => {
    await expect(
      store.startNew({
        villageName: '',
        playerNames: ['Minh', 'Hùng', 'Lan'],
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      }),
    ).rejects.toThrow(/ít nhất 4 người/);

    expect(store.state()).toBeNull();
  });

  it('gọi chuyền máy khi chưa có ván thì ném lỗi', async () => {
    await expect(store.revealNext()).rejects.toThrow(/chưa có ván/);
  });

  it('thẻ của người đang tới lượt lấy được qua store', async () => {
    await store.startNew({
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
    });

    const card = store.currentCard();
    expect(card).not.toBeNull();
    expect(typeof card?.word === 'string' || card?.word === null).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./game-session.store` và `../data/storage/storage.token`.

- [ ] **Step 3: Tạo thẻ tiêm cho cổng lưu trữ**

Tạo `src/app/data/storage/storage.token.ts`:

```ts
import { InjectionToken } from '@angular/core';
import { StoragePort } from './storage-port';

/**
 * Thẻ tiêm cho cổng lưu trữ. Nhờ nó, app thật cắm PreferencesStorage còn
 * test cắm MemoryStorage mà không file nào phải biết cái kia tồn tại.
 */
export const STORAGE_PORT = new InjectionToken<StoragePort>('STORAGE_PORT');
```

- [ ] **Step 4: Viết kho phiên chơi**

Tạo `src/app/state/game-session.store.ts`:

```ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { buildCard, revealNextPlayer } from '../core/engine/game-engine';
import { Rng } from '../core/engine/rng';
import { CardContent, GameConfig, GameState, NarrationEvent } from '../core/models';
import { ActiveGameRepository } from '../data/repositories/active-game.repository';
import { WordBankRepository } from '../data/repositories/word-bank.repository';
import { startNewGame } from '../data/start-new-game';

export interface StartNewInput {
  villageName: string;
  playerNames: string[];
  config: GameConfig;
}

/**
 * Giữ ván đang chơi và bọc mọi hành động của engine.
 *
 * Hai việc cố định sau mỗi hành động: cập nhật signal, rồi ghi state xuống
 * máy. Ghi sau MỖI thay đổi chứ không chỉ lúc thoát, vì app di động có thể
 * bị hệ điều hành đóng bất cứ lúc nào mà không báo trước.
 */
@Injectable()
export class GameSessionStore {
  private readonly wordBank = inject(WordBankRepository);
  private readonly activeGame = inject(ActiveGameRepository);

  private readonly _state = signal<GameState | null>(null);
  private readonly _events = signal<NarrationEvent[]>([]);

  readonly state = this._state.asReadonly();
  readonly events = this._events.asReadonly();
  readonly hasGame = computed(() => this._state() !== null);

  /** Thẻ của người đang tới lượt xem trong pha chia bài. */
  readonly currentCard = computed<CardContent | null>(() => {
    const state = this._state();
    if (state === null || state.phase !== 'DEALING') return null;
    const player = state.players[state.dealtCount];
    return player === undefined ? null : buildCard(state, player.id);
  });

  /** Người đang tới lượt cầm máy trong pha chia bài. */
  readonly currentDealName = computed<string | null>(() => {
    const state = this._state();
    if (state === null || state.phase !== 'DEALING') return null;
    return state.players[state.dealtCount]?.name ?? null;
  });

  /**
   * Nguồn ngẫu nhiên thật. Engine nhận nó từ ngoài để bản thân nó vẫn là hàm
   * thuần và test cắm được nguồn có hạt giống.
   */
  private readonly rng: Rng = () => Math.random();

  async startNew(input: StartNewInput): Promise<void> {
    const { result } = await startNewGame({
      wordBank: this.wordBank,
      gameId: `g-${Date.now()}`,
      villageName: input.villageName,
      playerNames: input.playerNames,
      config: input.config,
      rng: this.rng,
    });

    await this.apply(result.state, result.events);
  }

  async revealNext(): Promise<void> {
    const state = this.require();
    const result = revealNextPlayer(state, this.rng);
    await this.apply(result.state, result.events);
  }

  async resume(): Promise<void> {
    const saved = await this.activeGame.load();
    this._state.set(saved);
    this._events.set([]);
  }

  async abandon(): Promise<void> {
    this._state.set(null);
    this._events.set([]);
    await this.activeGame.clear();
  }

  /** Chỉ dùng trong test, để giả lập app vừa khởi động lại. */
  clearInMemory(): void {
    this._state.set(null);
    this._events.set([]);
  }

  private require(): GameState {
    const state = this._state();
    if (state === null) throw new Error('GameSessionStore: chưa có ván nào đang chơi');
    return state;
  }

  private async apply(state: GameState, events: NarrationEvent[]): Promise<void> {
    this._state.set(state);
    this._events.set(events);
    await this.activeGame.save(state);
  }
}
```

- [ ] **Step 5: Cắm mọi thứ vào hệ thống tiêm phụ thuộc**

Thay `src/app/app.config.ts`:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { ActiveGameRepository } from './data/repositories/active-game.repository';
import { PlayersRepository } from './data/repositories/players.repository';
import { ScoreboardRepository } from './data/repositories/scoreboard.repository';
import { SettingsRepository } from './data/repositories/settings.repository';
import { WordBankRepository } from './data/repositories/word-bank.repository';
import { PreferencesStorage } from './data/storage/preferences-storage';
import { STORAGE_PORT } from './data/storage/storage.token';
import { GameSessionStore } from './state/game-session.store';
import { NewGameDraftStore } from './state/new-game-draft.store';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    // Trên máy thật dùng Capacitor Preferences; test tự cắm MemoryStorage.
    { provide: STORAGE_PORT, useClass: PreferencesStorage },

    PlayersRepository,
    SettingsRepository,
    WordBankRepository,
    ScoreboardRepository,
    ActiveGameRepository,

    NewGameDraftStore,
    GameSessionStore,
  ],
};
```

Các repository hiện nhận `StoragePort` qua tham số hàm dựng, còn Angular thì tiêm theo kiểu. Sửa từng file để lấy cổng qua thẻ tiêm. Trong **cả năm** file dưới `src/app/data/repositories/`, thay hàm dựng:

```ts
  constructor(storage: StoragePort) {
```

bằng:

```ts
  constructor(@Inject(STORAGE_PORT) storage: StoragePort) {
```

và thêm hai dòng import ở đầu mỗi file:

```ts
import { Inject, Injectable } from '@angular/core';
import { STORAGE_PORT } from '../storage/storage.token';
```

rồi đặt `@Injectable()` ngay trên mỗi khai báo `export class ...Repository`.

Năm file cần sửa: `players.repository.ts`, `settings.repository.ts`, `word-bank.repository.ts`, `scoreboard.repository.ts`, `active-game.repository.ts`.

Việc này giữ nguyên toàn bộ hành vi: các test cũ vẫn dựng repository bằng `new XxxRepository(storage)` như trước, vì `@Inject` chỉ có tác dụng khi Angular tự dựng.

- [ ] **Step 6: Tạo kho tạm cho ván sắp tạo**

`app.config.ts` ở bước trên có nhắc `NewGameDraftStore`, nên phải tạo nó ngay để biên dịch được. Tạo `src/app/state/new-game-draft.store.ts`:

```ts
import { Injectable, signal } from '@angular/core';
import { DEFAULT_GAME_CONFIG, GameConfig } from '../core/models';

/**
 * Giữ những gì người dùng đang chọn khi chuẩn bị một ván, sống qua ba màn
 * trang chủ, danh sách người chơi, và cấu hình. Không ghi xuống máy: đây là
 * bản nháp, chỉ khi bấm Bắt đầu nó mới biến thành một ván thật.
 */
@Injectable()
export class NewGameDraftStore {
  readonly villageName = signal('');
  readonly playerNames = signal<string[]>([]);
  readonly config = signal<GameConfig>({ ...DEFAULT_GAME_CONFIG });

  reset(): void {
    this.villageName.set('');
    this.playerNames.set([]);
    this.config.set({ ...DEFAULT_GAME_CONFIG });
  }
}
```

- [ ] **Step 7: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 236 hiện có cộng 12 mới, thành **248**. Báo lại con số thật quan sát được.

- [ ] **Step 8: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/state src/app/data/storage/storage.token.ts src/app/data/repositories src/app/app.config.ts
git commit -m "feat: cam tang luu tru vao Angular va them kho phien choi"
```

---

## Task 3: Trang chủ

**Files:**
- Create: `src/app/features/home/home.page.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/home/home.page.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/features/home/home.page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { HomePage } from './home.page';

function setup() {
  const storage = new MemoryStorage();
  TestBed.configureTestingModule({
    imports: [HomePage],
    providers: [
      provideRouter([]),
      { provide: STORAGE_PORT, useValue: storage },
      WordBankRepository,
      ActiveGameRepository,
      GameSessionStore,
      NewGameDraftStore,
    ],
  });
  return { storage, fixture: TestBed.createComponent(HomePage) };
}

describe('HomePage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('hiện tên trò chơi', async () => {
    const { fixture } = setup();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ai Là Gián Điệp');
  });

  it('có nút bắt đầu ván mới', async () => {
    const { fixture } = setup();
    await fixture.whenStable();

    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button, a')];
    expect(buttons.some((b) => b.textContent?.includes('Ván mới'))).toBe(true);
  });

  it('không có ván dở thì không mời chơi tiếp', async () => {
    const { fixture } = setup();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Chơi tiếp');
  });

  it('có ván dở thì mời chơi tiếp', async () => {
    const { fixture } = setup();
    const store = TestBed.inject(GameSessionStore);
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: ['Minh', 'Hùng', 'Lan', 'Đức'],
      config: TestBed.inject(NewGameDraftStore).config(),
    });

    // Giả lập app vừa khởi động lại: xoá state trong bộ nhớ rồi đọc lại từ
    // máy. Gọi thẳng resume() thay vì dựa vào ngOnInit, vì ngOnInit chạy
    // ngầm không chờ được, dễ làm test chập chờn.
    store.clearInMemory();
    await store.resume();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Chơi tiếp');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./home.page`.

- [ ] **Step 3: Viết trang chủ**

Tạo `src/app/features/home/home.page.ts`:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';

@Component({
  selector: 'app-home-page',
  template: `
    <div class="screen home lamp">
      <div class="screen__spacer"></div>

      <div class="home__brand">
        <p class="screen__eyebrow">Trò chơi bàn tròn</p>
        <h1 class="home__title">Ai Là Gián Điệp</h1>
        <p class="muted">Một máy, chuyền tay, không cần mạng.</p>
      </div>

      <div class="screen__spacer"></div>

      <div class="screen__actions">
        @if (session.hasGame()) {
          <button type="button" class="btn btn--primary" (click)="continueGame()">
            Chơi tiếp ván đang dở
          </button>
          <button type="button" class="btn btn--ghost" (click)="newGame()">Ván mới</button>
        } @else {
          <button type="button" class="btn btn--primary" (click)="newGame()">Ván mới</button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .home {
        text-align: center;
      }

      .home__brand {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .home__title {
        font-size: 2.75rem;
        color: var(--lamp-500);
      }
    `,
  ],
})
export class HomePage implements OnInit {
  protected readonly session = inject(GameSessionStore);
  private readonly draft = inject(NewGameDraftStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Hỏi máy xem có ván nào đang dở không. Chạy ngầm: trang chủ hiện ngay,
    // dải "Chơi tiếp" xuất hiện sau khi đọc xong.
    void this.session.resume();
  }

  protected newGame(): void {
    this.draft.reset();
    void this.router.navigate(['/nguoi-choi']);
  }

  protected continueGame(): void {
    void this.router.navigate(['/van']);
  }
}
```

- [ ] **Step 4: Đăng ký tuyến đường**

Thay `src/app/app.routes.ts`:

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 5: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 248 cộng 4 mới, thành **252**. Báo lại con số thật.

- [ ] **Step 6: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/home src/app/app.routes.ts
git commit -m "feat: them trang chu"
```

---

## Task 4: Màn lập danh sách người chơi

**Files:**
- Create: `src/app/features/setup/players.page.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/setup/players.page.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/features/setup/players.page.spec.ts`:

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlayersRepository } from '../../data/repositories/players.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { PlayersPage } from './players.page';

/**
 * Trang giữ chỗ cho tuyến /cau-hinh, chỉ tồn tại trong test này.
 *
 * Cần thiết vì Router.navigate() trả về promise bị từ chối khi không khớp
 * tuyến nào. Màn cấu hình thật xuất hiện ở Task 5; ở đây ta chỉ cần một
 * đích hợp lệ để phép điều hướng thành công thay vì ném lỗi.
 */
@Component({ template: '' })
class StubConfigPage {}

function setup() {
  const storage = new MemoryStorage();
  TestBed.configureTestingModule({
    imports: [PlayersPage],
    providers: [
      provideRouter([{ path: 'cau-hinh', component: StubConfigPage }]),
      { provide: STORAGE_PORT, useValue: storage },
      PlayersRepository,
      NewGameDraftStore,
    ],
  });
  return { storage, fixture: TestBed.createComponent(PlayersPage) };
}

describe('PlayersPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('thêm được người chơi', async () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;

    page.draftName.set('Minh');
    page.addPlayer();

    expect(page.names()).toEqual(['Minh']);
  });

  it('bỏ qua tên rỗng hoặc chỉ có khoảng trắng', async () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;

    page.draftName.set('   ');
    page.addPlayer();

    expect(page.names()).toEqual([]);
  });

  it('cắt khoảng trắng thừa hai đầu', async () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;

    page.draftName.set('  Minh  ');
    page.addPlayer();

    expect(page.names()).toEqual(['Minh']);
  });

  it('xoá được người chơi theo vị trí', async () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;

    for (const name of ['Minh', 'Hùng', 'Lan']) {
      page.draftName.set(name);
      page.addPlayer();
    }
    page.removeAt(1);

    expect(page.names()).toEqual(['Minh', 'Lan']);
  });

  it('dưới 4 người thì chưa cho đi tiếp và nói rõ lý do', async () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;

    for (const name of ['Minh', 'Hùng', 'Lan']) {
      page.draftName.set(name);
      page.addPlayer();
    }

    expect(page.canContinue()).toBe(false);
    expect(page.hint()).toContain('4 người');
  });

  it('đủ 4 người thì cho đi tiếp', async () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;

    for (const name of ['Minh', 'Hùng', 'Lan', 'Đức']) {
      page.draftName.set(name);
      page.addPlayer();
    }

    expect(page.canContinue()).toBe(true);
  });

  it('quá 12 người thì chặn thêm', async () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;

    for (let i = 0; i < 12; i++) {
      page.draftName.set(`Người ${i}`);
      page.addPlayer();
    }
    page.draftName.set('Thừa');
    page.addPlayer();

    expect(page.names()).toHaveLength(12);
    expect(page.hint()).toContain('12 người');
  });

  it('gọi lại được nhóm đã lưu lần trước', async () => {
    const { storage, fixture } = setup();
    await new PlayersRepository(storage).save(['Minh', 'Hùng', 'Lan', 'Đức']);

    await fixture.componentInstance.loadSaved();

    expect(fixture.componentInstance.names()).toEqual(['Minh', 'Hùng', 'Lan', 'Đức']);
  });

  it('đi tiếp thì ghi danh sách vào bản nháp và lưu lại cho lần sau', async () => {
    const { storage, fixture } = setup();
    const page = fixture.componentInstance;
    for (const name of ['Minh', 'Hùng', 'Lan', 'Đức']) {
      page.draftName.set(name);
      page.addPlayer();
    }

    await page.continue();

    expect(TestBed.inject(NewGameDraftStore).playerNames()).toEqual([
      'Minh',
      'Hùng',
      'Lan',
      'Đức',
    ]);
    expect(await new PlayersRepository(storage).load()).toEqual([
      'Minh',
      'Hùng',
      'Lan',
      'Đức',
    ]);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./players.page`.

- [ ] **Step 3: Viết màn danh sách**

Tạo `src/app/features/setup/players.page.ts`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../core/engine/team-rules';
import { PlayersRepository } from '../../data/repositories/players.repository';
import { NewGameDraftStore } from '../../state/new-game-draft.store';

@Component({
  selector: 'app-players-page',
  imports: [FormsModule],
  template: `
    <div class="screen">
      <div>
        <p class="screen__eyebrow">Bước 1 / 2</p>
        <h1 class="screen__title">Ai chơi?</h1>
      </div>

      <div class="players__add">
        <input
          class="input players__input"
          type="text"
          placeholder="Tên người chơi"
          [ngModel]="draftName()"
          (ngModelChange)="draftName.set($event)"
          (keyup.enter)="addPlayer()"
        />
        <button type="button" class="btn btn--ghost players__plus" (click)="addPlayer()">
          Thêm
        </button>
      </div>

      @if (names().length === 0) {
        <button type="button" class="btn btn--quiet" (click)="loadSaved()">
          Gọi lại nhóm lần trước
        </button>
      }

      <ul class="players__list">
        @for (name of names(); track $index) {
          <li class="players__row">
            <span class="players__index">{{ $index + 1 }}</span>
            <span class="players__name">{{ name }}</span>
            <button
              type="button"
              class="players__remove"
              [attr.aria-label]="'Xoá ' + name"
              (click)="removeAt($index)"
            >
              ✕
            </button>
          </li>
        }
      </ul>

      <div class="screen__spacer"></div>

      <p class="muted">{{ hint() }}</p>

      <div class="screen__actions">
        <button
          type="button"
          class="btn btn--primary"
          [disabled]="!canContinue()"
          (click)="continue()"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .players__add {
        display: flex;
        gap: var(--space-3);
      }

      .players__input {
        flex: 1;
        min-width: 0;
      }

      .players__plus {
        flex: 0 0 auto;
      }

      .players__list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .players__row {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-height: var(--tap);
        padding: 0 var(--space-4);
        background: var(--ink-800);
        border-radius: var(--radius-md);
      }

      .players__index {
        color: var(--paper-400);
        font-size: 0.875rem;
        min-width: 1.25rem;
      }

      .players__name {
        flex: 1;
        font-weight: 500;
      }

      .players__remove {
        min-width: 44px;
        min-height: 44px;
        background: none;
        border: none;
        color: var(--paper-400);
        font-size: 1.125rem;
        cursor: pointer;
      }
    `,
  ],
})
export class PlayersPage {
  private readonly draft = inject(NewGameDraftStore);
  private readonly playersRepo = inject(PlayersRepository);
  private readonly router = inject(Router);

  readonly draftName = signal('');
  readonly names = signal<string[]>([]);

  readonly canContinue = computed(
    () => this.names().length >= MIN_PLAYERS && this.names().length <= MAX_PLAYERS,
  );

  readonly hint = computed(() => {
    const count = this.names().length;
    if (count >= MAX_PLAYERS) return `Đã đủ ${MAX_PLAYERS} người, tối đa rồi.`;
    if (count < MIN_PLAYERS) return `Cần ít nhất ${MIN_PLAYERS} người, đang có ${count}.`;
    return `${count} người. Thêm được tới ${MAX_PLAYERS}.`;
  });

  addPlayer(): void {
    const name = this.draftName().trim();
    if (name.length === 0) return;
    if (this.names().length >= MAX_PLAYERS) return;

    this.names.update((list) => [...list, name]);
    this.draftName.set('');
  }

  removeAt(index: number): void {
    this.names.update((list) => list.filter((_, i) => i !== index));
  }

  async loadSaved(): Promise<void> {
    const saved = await this.playersRepo.load();
    this.names.set(saved.slice(0, MAX_PLAYERS));
  }

  async continue(): Promise<void> {
    const names = this.names();
    this.draft.playerNames.set(names);
    await this.playersRepo.save(names);
    await this.router.navigate(['/cau-hinh']);
  }
}
```

- [ ] **Step 4: Đăng ký tuyến đường**

Thay `src/app/app.routes.ts`:

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'nguoi-choi',
    loadComponent: () =>
      import('./features/setup/players.page').then((m) => m.PlayersPage),
  },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 5: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 252 cộng 9 mới, thành **261**. Báo lại con số thật.

- [ ] **Step 6: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/setup src/app/app.routes.ts
git commit -m "feat: them man lap danh sach nguoi choi"
```

---

## Task 5: Màn cấu hình ván

**Files:**
- Create: `src/app/features/setup/config.page.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/setup/config.page.spec.ts`

Đây là màn thi hành các ràng buộc đội hình ở mục 3.3 của đặc tả. Điểm dễ sai nhất: mức tối đa số gián điệp phụ thuộc vào việc có bật mũ trắng hay không, nên bật mũ trắng khi đang chọn nhiều gián điệp phải tự kéo số gián điệp về mức hợp lệ chứ không được để cấu hình sai.

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/features/setup/config.page.spec.ts`:

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { ConfigPage } from './config.page';

/** Trang giữ chỗ cho tuyến /van, chỉ tồn tại trong test này. Router.navigate()
 *  trả về promise bị từ chối khi không khớp tuyến nào, nên phải có một đích
 *  hợp lệ thì phép điều hướng mới thành công. Màn ván thật ở Task 6. */
@Component({ template: '' })
class StubGamePage {}

function setup(playerCount = 6) {
  const storage = new MemoryStorage();
  TestBed.configureTestingModule({
    imports: [ConfigPage],
    providers: [
      provideRouter([{ path: 'van', component: StubGamePage }]),
      { provide: STORAGE_PORT, useValue: storage },
      SettingsRepository,
      NewGameDraftStore,
    ],
  });
  const draft = TestBed.inject(NewGameDraftStore);
  draft.playerNames.set(
    Array.from({ length: playerCount }, (_, i) => `Người ${i + 1}`),
  );
  return { storage, draft, fixture: TestBed.createComponent(ConfigPage) };
}

describe('ConfigPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('điền sẵn số gián điệp gợi ý theo sĩ số', () => {
    const { fixture } = setup(8);

    expect(fixture.componentInstance.spyCount()).toBe(2);
  });

  it('mức tối đa số gián điệp giảm khi bật mũ trắng', () => {
    const { fixture } = setup(7);
    const page = fixture.componentInstance;

    expect(page.maxSpies()).toBe(3);
    page.hasWhite.set(true);
    expect(page.maxSpies()).toBe(2);
  });

  it('bật mũ trắng khi đang chọn quá nhiều gián điệp thì tự kéo về mức hợp lệ', () => {
    const { fixture } = setup(7);
    const page = fixture.componentInstance;

    page.setSpyCount(3);
    expect(page.spyCount()).toBe(3);

    page.hasWhite.set(true);
    page.clampSpies();

    expect(page.spyCount()).toBe(2);
  });

  it('không cho chọn quá mức tối đa', () => {
    const { fixture } = setup(6);
    const page = fixture.componentInstance;

    page.setSpyCount(99);

    expect(page.spyCount()).toBe(page.maxSpies());
  });

  it('không cho chọn dưới 1 gián điệp', () => {
    const { fixture } = setup(6);
    const page = fixture.componentInstance;

    page.setSpyCount(0);

    expect(page.spyCount()).toBe(1);
  });

  it('đội hình 4 người vẫn bật được mũ trắng', () => {
    const { fixture } = setup(4);
    const page = fixture.componentInstance;

    page.hasWhite.set(true);
    page.clampSpies();

    expect(page.maxSpies()).toBe(1);
    expect(page.spyCount()).toBe(1);
    expect(page.canStart()).toBe(true);
  });

  it('bốc được tên làng ngẫu nhiên', () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;

    page.rollVillageName();

    expect(page.villageName().length).toBeGreaterThan(0);
  });

  it('tám chủ đề đều bật sẵn', () => {
    const { fixture } = setup();

    expect(fixture.componentInstance.selectedTopics()).toHaveLength(8);
  });

  it('tắt hết chủ đề thì không cho bắt đầu', () => {
    const { fixture } = setup();
    const page = fixture.componentInstance;

    for (const topic of [...page.selectedTopics()]) page.toggleTopic(topic);

    expect(page.selectedTopics()).toHaveLength(0);
    expect(page.canStart()).toBe(false);
  });

  it('bắt đầu thì ghi đủ cấu hình vào bản nháp', async () => {
    const { draft, fixture } = setup(6);
    const page = fixture.componentInstance;
    page.villageName.set('Ác Quỷ');
    page.hasWhite.set(true);
    page.revealSpyToSpy.set(true);
    page.setSpyCount(2);

    await page.start();

    expect(draft.villageName()).toBe('Ác Quỷ');
    expect(draft.config().spyCount).toBe(2);
    expect(draft.config().hasWhite).toBe(true);
    expect(draft.config().revealSpyToSpy).toBe(true);
    expect(draft.config().topics).toHaveLength(8);
  });

  it('nhớ lựa chọn Bật mí cho ván sau', async () => {
    const { storage, fixture } = setup(6);
    const page = fixture.componentInstance;
    page.revealSpyToSpy.set(true);

    await page.start();

    const settings = await new SettingsRepository(storage).load();
    expect(settings.lastRevealSpyToSpy).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./config.page`.

- [ ] **Step 3: Viết màn cấu hình**

Tạo `src/app/features/setup/config.page.ts`:

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { maxSpyCount, suggestedSpyCount } from '../../core/engine/team-rules';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { TOPICS } from '../../data/word-bank';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { NewGameDraftStore } from '../../state/new-game-draft.store';

/** Tên làng bốc ngẫu nhiên, cốt cho vui và để câu thoại dẫn chuyện có chỗ nhét vào. */
const VILLAGE_NAMES = [
  'Ác Quỷ',
  'Vô Tội',
  'Cà Khịa',
  'Bảy Núi',
  'Mộng Mơ',
  'Lắm Chuyện',
  'Hiền Lành',
  'Bí Ẩn',
];

@Component({
  selector: 'app-config-page',
  imports: [FormsModule],
  template: `
    <div class="screen">
      <div>
        <p class="screen__eyebrow">Bước 2 / 2</p>
        <h1 class="screen__title">Luật chơi ván này</h1>
      </div>

      <div class="field">
        <label class="field__label" for="village">Tên làng</label>
        <div class="config__village">
          <input
            id="village"
            class="input config__village-input"
            type="text"
            placeholder="làng ta"
            [ngModel]="villageName()"
            (ngModelChange)="villageName.set($event)"
          />
          <button type="button" class="btn btn--ghost" (click)="rollVillageName()">🎲</button>
        </div>
      </div>

      <div class="field">
        <span class="field__label">Số gián điệp</span>
        <div class="config__steps">
          @for (n of spyChoices(); track n) {
            <button
              type="button"
              class="config__step"
              [class.config__step--on]="spyCount() === n"
              (click)="setSpyCount(n)"
            >
              {{ n }}
            </button>
          }
        </div>
        <p class="muted">{{ teamSummary() }}</p>
      </div>

      <label class="config__toggle">
        <input
          type="checkbox"
          [ngModel]="hasWhite()"
          (ngModelChange)="hasWhite.set($event); clampSpies()"
        />
        <span>
          <strong>Mũ trắng</strong>
          <span class="muted">Một người không có từ, phải đoán từ của dân làng.</span>
        </span>
      </label>

      <label class="config__toggle">
        <input
          type="checkbox"
          [ngModel]="revealSpyToSpy()"
          (ngModelChange)="revealSpyToSpy.set($event)"
        />
        <span>
          <strong>Bật mí</strong>
          <span class="muted">Mỗi người sẽ biết vai của mình. Ván sẽ dễ hơn cho gián điệp.</span>
        </span>
      </label>

      <div class="field">
        <span class="field__label">Chủ đề</span>
        <div class="config__topics">
          @for (topic of allTopics; track topic) {
            <button
              type="button"
              class="config__chip"
              [class.config__chip--on]="selectedTopics().includes(topic)"
              (click)="toggleTopic(topic)"
            >
              {{ topic }}
            </button>
          }
        </div>
      </div>

      <div class="screen__spacer"></div>

      @if (!canStart()) {
        <p class="warning">Chọn ít nhất một chủ đề để bắt đầu.</p>
      }

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" [disabled]="!canStart()" (click)="start()">
          Bắt đầu chia bài
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .config__village {
        display: flex;
        gap: var(--space-3);
      }

      .config__village-input {
        flex: 1;
        min-width: 0;
      }

      .config__steps {
        display: flex;
        gap: var(--space-2);
      }

      .config__step {
        flex: 1;
        min-height: var(--tap);
        background: var(--ink-800);
        border: 1px solid var(--ink-600);
        border-radius: var(--radius-md);
        color: var(--paper-100);
        font-family: var(--font-body);
        font-size: 1.125rem;
        font-weight: 600;
        cursor: pointer;
      }

      .config__step--on {
        background: var(--lamp-500);
        border-color: var(--lamp-500);
        color: var(--ink-900);
      }

      .config__toggle {
        display: flex;
        gap: var(--space-3);
        align-items: flex-start;
        padding: var(--space-4);
        background: var(--ink-800);
        border-radius: var(--radius-md);
        cursor: pointer;
      }

      .config__toggle input {
        margin-top: 0.2rem;
        width: 1.25rem;
        height: 1.25rem;
        accent-color: var(--lamp-500);
      }

      .config__toggle span {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }

      .config__topics {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .config__chip {
        min-height: 44px;
        padding: 0 var(--space-4);
        background: var(--ink-800);
        border: 1px solid var(--ink-600);
        border-radius: 999px;
        color: var(--paper-400);
        font-family: var(--font-body);
        font-size: 0.9375rem;
        cursor: pointer;
      }

      .config__chip--on {
        background: var(--ink-700);
        border-color: var(--lamp-500);
        color: var(--paper-100);
      }
    `,
  ],
})
export class ConfigPage implements OnInit {
  private readonly draft = inject(NewGameDraftStore);
  private readonly settingsRepo = inject(SettingsRepository);
  private readonly router = inject(Router);

  protected readonly allTopics = [...TOPICS];

  readonly villageName = signal('');
  readonly hasWhite = signal(false);
  readonly revealSpyToSpy = signal(false);
  readonly spyCount = signal(1);
  readonly selectedTopics = signal<string[]>([...TOPICS]);

  readonly playerCount = computed(() => this.draft.playerNames().length);

  readonly maxSpies = computed(() => maxSpyCount(this.playerCount(), this.hasWhite()));

  readonly spyChoices = computed(() =>
    Array.from({ length: this.maxSpies() }, (_, i) => i + 1),
  );

  readonly teamSummary = computed(() => {
    const civilians = this.playerCount() - this.spyCount() - (this.hasWhite() ? 1 : 0);
    const white = this.hasWhite() ? ', 1 mũ trắng' : '';
    return `${civilians} dân làng, ${this.spyCount()} gián điệp${white}.`;
  });

  readonly canStart = computed(() => this.selectedTopics().length > 0);

  async ngOnInit(): Promise<void> {
    this.spyCount.set(suggestedSpyCount(this.playerCount(), this.hasWhite()));

    const settings = await this.settingsRepo.load();
    this.revealSpyToSpy.set(settings.lastRevealSpyToSpy);
  }

  rollVillageName(): void {
    const index = Math.floor(Math.random() * VILLAGE_NAMES.length);
    this.villageName.set(VILLAGE_NAMES[index]);
  }

  setSpyCount(value: number): void {
    this.spyCount.set(Math.min(Math.max(1, value), this.maxSpies()));
  }

  /**
   * Bật mũ trắng làm giảm mức tối đa số gián điệp, nên số đang chọn có thể
   * bỗng nhiên vượt ngưỡng. Kéo nó về thay vì để người dùng bấm Bắt đầu rồi
   * mới bị engine từ chối.
   */
  clampSpies(): void {
    this.setSpyCount(this.spyCount());
  }

  toggleTopic(topic: string): void {
    this.selectedTopics.update((list) =>
      list.includes(topic) ? list.filter((t) => t !== topic) : [...list, topic],
    );
  }

  async start(): Promise<void> {
    this.draft.villageName.set(this.villageName().trim());
    this.draft.config.set({
      ...DEFAULT_GAME_CONFIG,
      spyCount: this.spyCount(),
      hasWhite: this.hasWhite(),
      revealSpyToSpy: this.revealSpyToSpy(),
      topics: this.selectedTopics(),
    });

    const settings = await this.settingsRepo.load();
    await this.settingsRepo.save({ ...settings, lastRevealSpyToSpy: this.revealSpyToSpy() });

    await this.router.navigate(['/van']);
  }
}
```

- [ ] **Step 4: Đăng ký tuyến đường**

Thêm một mục vào `src/app/app.routes.ts`, ngay trước mục `'**'`:

```ts
  {
    path: 'cau-hinh',
    loadComponent: () => import('./features/setup/config.page').then((m) => m.ConfigPage),
  },
```

- [ ] **Step 5: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 261 cộng 11 mới, thành **272**. Báo lại con số thật.

- [ ] **Step 6: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/setup/config.page.ts src/app/features/setup/config.page.spec.ts src/app/app.routes.ts
git commit -m "feat: them man cau hinh van"
```

---

## Task 6: Thẻ bí mật và màn chia bài

Màn quan trọng nhất của cả bản kế hoạch. Đọc kỹ phần ràng buộc giữ bí mật ở đầu tài liệu trước khi bắt đầu.

**Files:**
- Create: `src/app/features/game/secret-card.ts`
- Create: `src/app/features/game/deal.page.ts`
- Create: `src/app/features/game/game.page.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/features/game/secret-card.spec.ts`
- Test: `src/app/features/game/deal.page.spec.ts`

- [ ] **Step 1: Viết test đỏ cho thẻ bí mật**

Tạo `src/app/features/game/secret-card.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CardContent } from '../../core/models';
import { SecretCard } from './secret-card';

const CIVILIAN: CardContent = { roleLabel: null, word: 'con mèo', note: null };
const SPY: CardContent = { roleLabel: null, word: 'con chó', note: null };
const WHITE: CardContent = {
  roleLabel: 'Bạn là MŨ TRẮNG',
  word: null,
  note: 'Bạn không có từ nào',
};

function render(content: CardContent) {
  const fixture = TestBed.createComponent(SecretCard);
  fixture.componentRef.setInput('content', content);
  fixture.detectChanges();
  return fixture;
}

describe('SecretCard', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SecretCard] });
  });

  it('mặc định thẻ đang úp, không lộ từ', () => {
    const fixture = render(CIVILIAN);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('con mèo');
    expect(text).toContain('Nhấn giữ');
  });

  it('nhấn giữ thì lộ từ', () => {
    const fixture = render(CIVILIAN);

    fixture.componentInstance.hold();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('con mèo');
  });

  it('thả tay ra thì che lại ngay', () => {
    const fixture = render(CIVILIAN);

    fixture.componentInstance.hold();
    fixture.detectChanges();
    fixture.componentInstance.release();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('con mèo');
  });

  it('mũ trắng thấy nhãn vai và lời nhắc, không có từ', () => {
    const fixture = render(WHITE);

    fixture.componentInstance.hold();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Bạn là MŨ TRẮNG');
    expect(text).toContain('Bạn không có từ nào');
  });

  it('khi tắt Bật mí, thẻ dân làng và thẻ gián điệp có cùng cấu trúc HTML', () => {
    const civilianFixture = render(CIVILIAN);
    civilianFixture.componentInstance.hold();
    civilianFixture.detectChanges();
    const civilianHtml = (civilianFixture.nativeElement as HTMLElement).innerHTML;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SecretCard] });
    const spyFixture = render(SPY);
    spyFixture.componentInstance.hold();
    spyFixture.detectChanges();
    const spyHtml = (spyFixture.nativeElement as HTMLElement).innerHTML;

    // Thay từ bằng một chuỗi trung tính rồi so sánh: mọi thứ còn lại phải
    // giống hệt nhau, kể cả tên lớp CSS và thứ tự thẻ.
    //
    // Nếu test này đỏ vì Angular chèn thuộc tính sinh tự động khác nhau giữa
    // hai lần dựng, hãy BÁO LẠI thay vì nới lỏng phép so sánh. Đây là bằng
    // chứng duy nhất kiểm được bằng máy rằng thẻ không lộ vai.
    expect(civilianHtml.replace('con mèo', 'TU')).toBe(spyHtml.replace('con chó', 'TU'));
  });

  it('nhãn vai nằm trong khung rộng cố định', () => {
    const fixture = render(WHITE);
    fixture.componentInstance.hold();
    fixture.detectChanges();

    const label = (fixture.nativeElement as HTMLElement).querySelector('.secret-card__role');
    expect(label).not.toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./secret-card`.

- [ ] **Step 3: Viết thẻ bí mật**

Tạo `src/app/features/game/secret-card.ts`:

```ts
import { Component, input, signal } from '@angular/core';
import { CardContent } from '../../core/models';

/**
 * Thẻ nhấn-giữ-để-xem.
 *
 * Component này CHỈ nhận CardContent. Nó không nhận GameState, không đọc
 * assignments, và không có đường nào để biết người cầm máy là vai gì. Đó là
 * chủ đích: thứ nó không biết thì nó không thể làm lộ.
 *
 * Mở ra có hoạt hình 180ms, đóng lại TỨC THÌ. Đóng có hoạt hình nghĩa là
 * trong lúc mờ dần chữ vẫn đọc được, mà thả tay rồi từ bí mật còn nằm trên
 * màn hình một phần tư giây là quá đủ cho người ngồi cạnh.
 */
@Component({
  selector: 'app-secret-card',
  template: `
    <div
      class="secret-card"
      [class.secret-card--open]="revealed()"
      (pointerdown)="hold()"
      (pointerup)="release()"
      (pointerleave)="release()"
      (pointercancel)="release()"
      (contextmenu)="$event.preventDefault()"
    >
      @if (revealed()) {
        <div class="secret-card__face">
          <p class="secret-card__role">{{ content().roleLabel }}</p>
          <p class="secret-card__word">{{ content().word }}</p>
          <p class="secret-card__note">{{ content().note }}</p>
        </div>
      } @else {
        <div class="secret-card__cover">
          <p class="secret-card__hint">Nhấn giữ để xem</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .secret-card {
        display: grid;
        place-items: center;
        min-height: 13rem;
        padding: var(--space-5);
        background: var(--ink-800);
        border: 1px solid var(--ink-600);
        border-radius: var(--radius-lg);
        touch-action: none;
        cursor: pointer;
      }

      .secret-card--open {
        background: var(--ink-700);
        border-color: var(--lamp-500);
        /* Chỉ hoạt hình lúc mở. Lúc đóng, khối này biến mất ngay lập tức vì
           template thay hẳn nội dung chứ không làm mờ dần. */
        animation: card-open 180ms ease-out;
      }

      @keyframes card-open {
        from {
          opacity: 0.2;
          transform: scale(0.97);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .secret-card__cover,
      .secret-card__face {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        text-align: center;
      }

      .secret-card__hint {
        margin: 0;
        color: var(--paper-400);
        letter-spacing: 0.04em;
      }

      /* Khung rộng cố định: hai nhãn vai dài khác nhau, nếu để khung co giãn
         theo chữ thì người ngồi cạnh liếc thấy bề rộng là đoán ra vai. */
      .secret-card__role {
        margin: 0;
        width: 12rem;
        min-height: 1.5rem;
        text-align: center;
        font-size: 0.9375rem;
        letter-spacing: 0.06em;
        color: var(--lamp-500);
      }

      .secret-card__word {
        margin: 0;
        font-family: var(--font-display);
        font-size: 2.25rem;
        line-height: 1.1;
      }

      .secret-card__note {
        margin: 0;
        min-height: 1.25rem;
        color: var(--paper-400);
        font-size: 0.9375rem;
      }
    `,
  ],
})
export class SecretCard {
  readonly content = input.required<CardContent>();

  private readonly _revealed = signal(false);
  readonly revealed = this._revealed.asReadonly();

  hold(): void {
    this._revealed.set(true);
  }

  release(): void {
    this._revealed.set(false);
  }
}
```

- [ ] **Step 4: Viết test đỏ cho màn chia bài**

Tạo `src/app/features/game/deal.page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { DealPage } from './deal.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

async function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [DealPage],
    providers: [
      provideRouter([]),
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      GameSessionStore,
    ],
  });

  const session = TestBed.inject(GameSessionStore);
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: NAMES,
    config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
  });

  const fixture = TestBed.createComponent(DealPage);
  fixture.detectChanges();
  return { session, fixture };
}

describe('DealPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('gọi tên người đang tới lượt cầm máy', async () => {
    const { fixture } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Minh');
    expect(text).toContain('Chuyền máy cho');
  });

  it('hiện tiến độ chia bài', async () => {
    const { fixture } = await setup();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 / 4');
  });

  it('chưa xác nhận đúng người thì chưa hiện thẻ', async () => {
    const { fixture } = await setup();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-secret-card'),
    ).toBeNull();
  });

  it('xác nhận rồi mới hiện thẻ', async () => {
    const { fixture } = await setup();

    fixture.componentInstance.confirmIdentity();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-secret-card'),
    ).not.toBeNull();
  });

  it('xem xong thì chuyển sang người kế và thu thẻ lại', async () => {
    const { fixture } = await setup();
    fixture.componentInstance.confirmIdentity();
    fixture.detectChanges();

    await fixture.componentInstance.seen();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hùng');
    expect(text).toContain('2 / 4');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-secret-card'),
    ).toBeNull();
  });

  it('người cuối xem xong thì ván sang pha nói', async () => {
    const { session, fixture } = await setup();

    for (let i = 0; i < 4; i++) {
      fixture.componentInstance.confirmIdentity();
      await fixture.componentInstance.seen();
    }

    expect(session.state()?.phase).toBe('SPEAKING');
  });
});
```

- [ ] **Step 5: Viết màn chia bài và vỏ trong ván**

Tạo `src/app/features/game/deal.page.ts`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { GameSessionStore } from '../../state/game-session.store';
import { SecretCard } from './secret-card';

/**
 * Chia bài chuyền tay.
 *
 * Hai bước cho mỗi người, cố ý tách rời: trước hết xác nhận đúng người đang
 * cầm máy, sau đó mới hiện thẻ. Nếu hiện thẻ ngay khi tới lượt thì người vừa
 * chuyền máy đi vẫn còn đang nhìn màn hình.
 */
@Component({
  selector: 'app-deal-page',
  imports: [SecretCard],
  template: `
    <div class="screen lamp deal">
      <p class="screen__eyebrow">
        Người thứ {{ position() }} / {{ total() }}
      </p>

      <div class="deal__who">
        <p class="deal__lead">Chuyền máy cho</p>
        <h1 class="deal__name">{{ name() }}</h1>
      </div>

      @if (confirmed()) {
        @if (card(); as content) {
          <app-secret-card [content]="content" />
        }
        <div class="screen__spacer"></div>
        <div class="screen__actions">
          <button type="button" class="btn btn--primary" (click)="seen()">Tôi đã xem</button>
        </div>
      } @else {
        <div class="screen__spacer"></div>
        <div class="screen__actions">
          <button type="button" class="btn btn--primary" (click)="confirmIdentity()">
            Tôi là {{ name() }}
          </button>
          <p class="muted deal__warn">Chỉ bấm khi máy đã ở trong tay bạn.</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .deal {
        text-align: center;
      }

      .deal__who {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .deal__lead {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.25rem;
        color: var(--paper-400);
      }

      .deal__name {
        font-size: 3rem;
        color: var(--lamp-500);
        word-break: break-word;
      }

      .deal__warn {
        text-align: center;
      }
    `,
  ],
})
export class DealPage {
  private readonly session = inject(GameSessionStore);

  private readonly _confirmed = signal(false);
  readonly confirmed = this._confirmed.asReadonly();

  readonly name = computed(() => this.session.currentDealName() ?? '');
  readonly card = computed(() => this.session.currentCard());
  readonly total = computed(() => this.session.state()?.players.length ?? 0);
  readonly position = computed(() => (this.session.state()?.dealtCount ?? 0) + 1);

  confirmIdentity(): void {
    this._confirmed.set(true);
  }

  async seen(): Promise<void> {
    // Thu thẻ lại TRƯỚC khi đổi người, để không có khoảnh khắc nào thẻ của
    // người trước còn hiện trong lúc tên người sau đã đổi.
    this._confirmed.set(false);
    await this.session.revealNext();
  }
}
```

Tạo `src/app/features/game/game.page.ts`:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { DealPage } from './deal.page';

/**
 * Vỏ của mọi màn trong ván. Chọn màn theo `phase` chứ không theo địa chỉ URL,
 * vì ván được khôi phục từ máy phải rơi đúng vào bước đang dở — nếu điều
 * hướng bằng URL thì địa chỉ và trạng thái sẽ lệch nhau ngay lần đầu mở lại.
 */
@Component({
  selector: 'app-game-page',
  imports: [DealPage],
  template: `
    @let state = session.state();
    @if (state === null) {
      <div class="screen">
        <div class="screen__spacer"></div>
        <p class="muted">Đang mở ván…</p>
        <div class="screen__spacer"></div>
      </div>
    } @else {
      @switch (state.phase) {
        @case ('DEALING') {
          <app-deal-page />
        }
        @default {
          <div class="screen">
            <div class="screen__spacer"></div>
            <h1 class="screen__title">Chia bài xong</h1>
            <p class="muted">
              Vòng nói, vote và kết ván nằm ở bản kế hoạch tiếp theo.
            </p>
            <div class="screen__spacer"></div>
          </div>
        }
      }
    }
  `,
})
export class GamePage implements OnInit {
  protected readonly session = inject(GameSessionStore);
  private readonly draft = inject(NewGameDraftStore);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    if (this.session.hasGame()) return;

    const names = this.draft.playerNames();
    if (names.length === 0) {
      await this.router.navigate(['/']);
      return;
    }

    await this.session.startNew({
      villageName: this.draft.villageName(),
      playerNames: names,
      config: this.draft.config(),
    });
  }
}
```

- [ ] **Step 6: Đăng ký tuyến đường**

Thêm vào `src/app/app.routes.ts`, ngay trước mục `'**'`:

```ts
  {
    path: 'van',
    loadComponent: () => import('./features/game/game.page').then((m) => m.GamePage),
  },
```

- [ ] **Step 7: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 272 cộng 12 mới, thành **284**. Báo lại con số thật.

- [ ] **Step 8: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/game src/app/app.routes.ts
git commit -m "feat: them the bi mat va man chia bai"
```

---

## Task 7: Chạy thử trên trình duyệt và soát lại bằng mắt

Bộ test kiểm được logic, nhưng không kiểm được cảm giác cầm máy. Task này chạy app thật và đi qua một lượt.

**Files:** không sửa file nào trừ khi phát hiện lỗi.

- [ ] **Step 1: Chạy app**

```bash
cd /c/SRC/ai-la-gian-diep
npx ng serve
```

Mở `http://localhost:4200` trong trình duyệt, bật chế độ giả lập điện thoại của DevTools và chọn một máy cỡ khoảng 390×844.

- [ ] **Step 2: Đi hết một lượt chuẩn bị**

Làm đúng thứ tự này và ghi lại kết quả từng mục:

1. Trang chủ hiện tên trò chơi, chỉ có nút **Ván mới** (chưa có ván dở).
2. Bấm **Ván mới** → thêm bốn tên có dấu tiếng Việt, ví dụ `Minh`, `Hùng`, `Lan`, `Đức`. Kiểm dấu hiển thị đúng, không bị ô vuông.
3. Thử bấm **Tiếp tục** khi mới có ba người — nút phải bị vô hiệu và dòng gợi ý nói cần ít nhất 4 người.
4. Đủ bốn người → **Tiếp tục**.
5. Màn cấu hình: bấm 🎲 vài lần, tên làng phải đổi. Bật **Mũ trắng** rồi kiểm dòng tóm tắt đội hình đổi theo.
6. Với 4 người và bật mũ trắng, số gián điệp chỉ được chọn tới 1.
7. Tắt hết chủ đề → nút **Bắt đầu chia bài** phải bị vô hiệu kèm cảnh báo.
8. Bật lại vài chủ đề → **Bắt đầu chia bài**.

- [ ] **Step 3: Soát kỹ màn chia bài**

Đây là phần quan trọng nhất, làm chậm và quan sát:

1. Tên người nhận máy phải rất to, đọc được khi để máy cách một sải tay.
2. Bấm **Tôi là Minh** → thẻ hiện ra ở trạng thái úp, chỉ ghi "Nhấn giữ để xem".
3. Nhấn giữ chuột (hoặc chạm giữ) lên thẻ → từ hiện ra kèm hoạt hình ngắn.
4. **Thả tay ra → từ phải biến mất tức thì, không mờ dần.** Đây là điểm phải nhìn kỹ nhất. Nếu thấy chữ còn kịp đọc trong lúc biến mất thì báo lại, đừng tự sửa.
5. Nhấn giữ rồi kéo ngón tay ra khỏi thẻ mà chưa nhả → thẻ cũng phải che lại.
6. Thử nhấn giữ lâu trên di động giả lập: **không** được hiện menu sao chép, **không** được bôi đen chữ.
7. Bấm **Tôi đã xem** → sang người kế, thẻ trở lại trạng thái chưa xác nhận.
8. Đi hết bốn người → màn "Chia bài xong".

- [ ] **Step 4: Kiểm khôi phục ván đang dở**

1. Đang ở giữa lúc chia bài, tải lại trang (F5).
2. Vào lại trang chủ — phải thấy nút **Chơi tiếp ván đang dở**.
3. Bấm vào đó → quay lại đúng người đang tới lượt, đúng số thứ tự.

- [ ] **Step 5: Chạy toàn bộ test và build lần cuối**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
npx ng build
```

Expected: 284 test xanh, build thành công.

- [ ] **Step 6: Báo cáo**

Không commit gì ở task này trừ khi phải sửa lỗi. Báo lại:

- Từng mục ở Step 2, 3, 4 đạt hay không đạt.
- Bất kỳ chỗ nào chữ tiếng Việt hiển thị sai.
- Bất kỳ chỗ nào thẻ từ lộ lâu hơn mong đợi.
- Ảnh chụp màn hình nếu có gì bất thường.

---

## Xong bản kế hoạch này thì có gì

- Hệ thống thiết kế "Đêm ở làng" với font tiếng Việt đóng gói offline.
- Trang chủ, màn lập danh sách, màn cấu hình, màn chia bài chuyền tay.
- Ván được ghi xuống máy sau mỗi bước, khôi phục được sau khi đóng app.
- Ràng buộc giữ bí mật được thi hành ở mức component: thẻ chỉ nhận `CardContent`, và có test so sánh nguyên khối HTML của thẻ dân làng với thẻ gián điệp.

## Bản kế hoạch tiếp theo

Bản 3B làm nốt vòng lặp ván đấu: vòng nói với đồng hồ, màn vote và xử hoà, lộ danh tính, mũ trắng đoán từ, và màn kết ván có cộng điểm vào bảng điểm tích luỹ.
