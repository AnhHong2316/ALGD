# Kho từ và lưu trữ trên máy — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng kho cặp từ tiếng Việt đóng gói sẵn, quy tắc bốc cặp từ chống lặp, và toàn bộ tầng lưu trữ trên máy — đủ để bắt đầu một ván thật mà không cần người dùng tự nghĩ từ.

**Architecture:** Ba tầng tách bạch. Kho từ và luật bốc cặp là TypeScript thuần, test được mà không cần thiết bị. Tầng lưu trữ nằm sau một cổng bất đồng bộ ba hàm, có một bản cài trong bộ nhớ dùng cho test và một bản cài qua Capacitor Preferences dùng cho máy thật, nên không test nào cần Capacitor. Các repository là lớp mỏng phía trên một `JsonStore` chung, chịu được dữ liệu hỏng bằng cách rơi về giá trị mặc định thay vì làm sập app.

**Tech Stack:** Angular 21, TypeScript strict, Vitest, Capacitor 8 (`@capacitor/core`, `@capacitor/preferences`).

**Đặc tả nguồn:** `docs/superpowers/specs/2026-09-07-ai-la-gian-diep-design.md`, mục 5, 7 và 9.

**Kế hoạch trước:** `docs/superpowers/plans/2026-09-07-nen-mong-va-engine.md` (đã xong, 149 test).

---

## Bối cảnh cần biết trước khi bắt đầu

Đây là bản kế hoạch số 2 trong 4. Bản 1 đã dựng xong workspace và toàn bộ engine luật chơi thuần TypeScript dưới `src/app/core/`. Bản này thêm hai thứ mà engine đang thiếu để chạy được một ván thật:

1. **Nguồn cặp từ.** `createGame` nhận sẵn `civilianWord` và `spyWord` từ ngoài. Ai chọn hai từ đó, chọn thế nào, và làm sao không lặp lại giữa các ván — chưa có gì trả lời.
2. **Bộ nhớ.** Danh sách người chơi, bảng điểm, cài đặt, cặp từ tự thêm, và ván đang dở đều phải sống sót qua việc tắt app.

Kết thúc bản này vẫn chưa có giao diện để bấm. Thứ có được là: gọi một hàm là ra một `GameState` hoàn chỉnh với cặp từ thật, và mọi dữ liệu đọc ghi được xuống máy.

### Những gì đã có và sẽ dùng lại

| Đường dẫn | Dùng để làm gì trong bản này |
|---|---|
| `src/app/core/models/` | `WordPair`, `Difficulty`, `Player`, `GameConfig`, `ScoreRules`, `GameState` |
| `src/app/core/engine/rng.ts` | `Rng`, `shuffle`, `pickIndex` — bốc cặp từ và tung đồng xu hoán đổi |
| `src/app/core/engine/guess-matcher.ts` | `normalizeVi`, `levenshtein` — kiểm khoảng cách giữa hai từ trong cặp |
| `src/app/core/engine/game-engine.ts` | `createGame`, `NewGameInput` — bước cuối của bản này gọi vào đây |

### Ràng buộc kiến trúc phải giữ

- `src/app/core/` tuyệt đối không import Angular, không đụng bộ nhớ máy, không phát âm thanh. Bản này thêm đúng một file vào `core/` và file đó cũng thuần.
- Mọi thứ chạm tới Capacitor phải nằm sau `StoragePort`. Không test nào được import `@capacitor/preferences`.
- Vietnamese trong bình luận và chuỗi hiển thị, English cho định danh.

### Một quyết định lệch khỏi đặc tả, có chủ đích

Đặc tả mục 7 nói kho từ nằm trong `word-bank.json`. Bản kế hoạch này dùng **file TypeScript** thay vì JSON.

Lý do: khi import JSON, TypeScript suy ra `difficulty` là `string` chứ không phải union `'EASY' | 'MEDIUM' | 'HARD'`. Với hai trăm cặp từ gõ tay, một chỗ gõ nhầm `"EASYY"` hoặc sai tên chủ đề sẽ lọt qua trình biên dịch và chỉ lộ ra lúc chạy. Dùng `.ts` với `satisfies` thì sai một ký tự là đỏ ngay lúc build. Đánh đổi duy nhất là file dữ liệu không đọc được bằng công cụ ngoài, mà kho đóng gói sẵn thì không cần điều đó.

Kho cũng được chia thành **tám file theo chủ đề** thay vì một file khổng lồ, để mỗi file đọc hết trong một màn hình và sửa một chủ đề không đụng vào chủ đề khác.

### Cách bản kế hoạch này giao phần nội dung kho từ

Ba task viết dữ liệu (5, 6, 7) là chỗ duy nhất trong cả hai bản kế hoạch **không** chép sẵn từng dòng code. Chép đủ 160 cặp từ vào đây thì bản kế hoạch biến thành chính bộ dữ liệu, mà vẫn không thêm được gì về mặt đúng sai.

Thay vào đó, mỗi task nội dung được giao bằng ba thứ ràng buộc chặt hơn một danh sách chép tay:

1. **Năm quy tắc bắt buộc** cho mọi cặp từ, viết đầy đủ ở Task 5 Step 4.
2. **Tám cặp mẫu** cho mỗi chủ đề, đủ để thấy rõ giọng điệu và mức độ khó mong muốn.
3. **Một bộ test kiểm toàn kho** viết trước ở Task 5, chạy trên mọi cặp mà mọi task sau thêm vào. Nó bắt id trùng, chủ đề sai, từ rỗng, cặp trùng nội dung, thiếu số lượng, thiếu mức độ khó, và quan trọng nhất là cặp có hai từ quá gần nhau — kèm id cụ thể của cặp có vấn đề.

Nói cách khác, tiêu chí nghiệm thu ở đây là bộ test chứ không phải một danh sách có sẵn. Đó là thứ duy nhất thật sự kiểm được khi dữ liệu do người viết ra.

---

## Cấu trúc file

### Thêm vào `src/app/core/engine/`

| File | Trách nhiệm |
|---|---|
| `pair-distance.ts` | Luật "hai từ trong một cặp phải đủ xa nhau sau khi chuẩn hoá" |
| `guess-matcher.ts` | **Sửa**: export thêm `guessThreshold` để `pair-distance` dùng chung một nguồn chân lý |

### Thêm mới `src/app/data/`

| File | Trách nhiệm |
|---|---|
| `word-bank/types.ts` | `TOPICS`, `Topic`, `PackagedPair` |
| `word-bank/animals.ts` … `transport.ts` | Tám file dữ liệu, mỗi file một chủ đề |
| `word-bank/index.ts` | Gom tám file, phơi ra `PACKAGED_PAIRS` và `toWordPair` |
| `word-bank/word-bank.spec.ts` | Kiểm toàn kho: id duy nhất, chủ đề hợp lệ, hai từ đủ xa nhau |
| `pair-picker.ts` | Lọc theo bộ lọc, chống lặp, hoán đổi ngẫu nhiên vai của hai từ |
| `storage/storage-port.ts` | Cổng bất đồng bộ ba hàm |
| `storage/memory-storage.ts` | Bản cài trong bộ nhớ, dùng cho test |
| `storage/preferences-storage.ts` | Bản cài qua Capacitor Preferences, dùng trên máy thật |
| `json-store.ts` | Đọc ghi giá trị có kiểu, chịu được dữ liệu hỏng |
| `repositories/players.repository.ts` | Danh sách người chơi hay dùng |
| `repositories/settings.repository.ts` | Âm thanh, điểm theo vai, đồng hồ, Bật mí gần nhất |
| `repositories/word-bank.repository.ts` | Cặp tự thêm, cặp gốc bị ẩn, lịch sử cặp đã dùng |
| `repositories/scoreboard.repository.ts` | Điểm tích luỹ và lịch sử ván |
| `repositories/active-game.repository.ts` | Ván đang dở, để khôi phục khi mở lại app |
| `start-new-game.ts` | Ghép kho từ với engine: chọn cặp rồi gọi `createGame` |

Mỗi file cài đặt có một `*.spec.ts` nằm cạnh.

Lý do tách `json-store.ts` ra riêng: năm repository đều làm cùng một việc — đọc một chuỗi JSON, kiểm hình dạng, rơi về mặc định nếu hỏng, ghi lại. Viết năm lần là năm cơ hội để một chỗ quên xử lý JSON hỏng.

---

## Task 1: Cổng lưu trữ

Tầng thấp nhất. Ba hàm, không hơn.

**Files:**
- Create: `src/app/data/storage/storage-port.ts`
- Create: `src/app/data/storage/memory-storage.ts`
- Test: `src/app/data/storage/memory-storage.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/data/storage/memory-storage.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from './memory-storage';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('khoá chưa từng ghi thì trả về null', async () => {
    expect(await storage.get('chua-co')).toBeNull();
  });

  it('ghi rồi đọc lại được đúng giá trị', async () => {
    await storage.set('ten', 'Minh');
    expect(await storage.get('ten')).toBe('Minh');
  });

  it('ghi đè lên giá trị cũ', async () => {
    await storage.set('ten', 'Minh');
    await storage.set('ten', 'Hùng');
    expect(await storage.get('ten')).toBe('Hùng');
  });

  it('xoá rồi thì đọc lại ra null', async () => {
    await storage.set('ten', 'Minh');
    await storage.remove('ten');
    expect(await storage.get('ten')).toBeNull();
  });

  it('xoá khoá không tồn tại thì không báo lỗi', async () => {
    await expect(storage.remove('chua-co')).resolves.toBeUndefined();
  });

  it('giữ được chuỗi rỗng, phân biệt với chưa từng ghi', async () => {
    await storage.set('rong', '');
    expect(await storage.get('rong')).toBe('');
  });

  it('các khoá độc lập với nhau', async () => {
    await storage.set('a', '1');
    await storage.set('b', '2');
    await storage.remove('a');

    expect(await storage.get('a')).toBeNull();
    expect(await storage.get('b')).toBe('2');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./memory-storage`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/data/storage/storage-port.ts`:

```ts
/**
 * Cổng lưu trữ khoá-giá trị dạng chuỗi. Cố tình nhỏ hết mức: mọi thứ phức
 * tạp hơn nằm ở tầng trên, còn tầng này chỉ để đổi giữa bộ nhớ tạm khi test
 * và Capacitor Preferences khi chạy thật.
 *
 * Bất đồng bộ vì Preferences bất đồng bộ. Bản trong bộ nhớ cũng phải bất
 * đồng bộ theo, nếu không test sẽ chạy đúng ở chỗ mà máy thật chạy sai.
 */
export interface StoragePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
```

Tạo `src/app/data/storage/memory-storage.ts`:

```ts
import { StoragePort } from './storage-port';

/** Bản cài dùng cho test. Không có gì bền vững, mỗi thể hiện một bản đồ riêng. */
export class MemoryStorage implements StoragePort {
  private readonly entries = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.entries.has(key) ? this.entries.get(key)! : null;
  }

  async set(key: string, value: string): Promise<void> {
    this.entries.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.entries.delete(key);
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, tổng 149 + 7 = 156.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/storage
git commit -m "feat: them cong luu tru va ban cai trong bo nho"
```

---

## Task 2: Bản cài Capacitor Preferences

Bản cài dùng trên máy thật. Không có test đơn vị cho file này — nó chỉ chuyển tiếp lời gọi sang plugin, và mọi logic thật đã nằm ở tầng trên. Việc kiểm nó thuộc phần thử tay trên thiết bị.

**Files:**
- Modify: `package.json` (thêm ba gói Capacitor)
- Create: `capacitor.config.ts`
- Create: `src/app/data/storage/preferences-storage.ts`

- [ ] **Step 1: Cài Capacitor**

```bash
cd /c/SRC/ai-la-gian-diep
npm install @capacitor/core@8 @capacitor/preferences@8
npm install --save-dev @capacitor/cli@8
```

Nếu npm báo lỗi giải phụ thuộc như từng xảy ra lúc dựng workspace, thêm `--legacy-peer-deps` và ghi lại việc đó trong báo cáo.

- [ ] **Step 2: Khởi tạo cấu hình Capacitor**

```bash
cd /c/SRC/ai-la-gian-diep
npx cap init "Ai Là Gián Điệp" com.hungnguyen.ailagiandiep --web-dir dist/ai-la-gian-diep/browser
```

Lệnh này chỉ sinh ra `capacitor.config.ts`. **Không** chạy `npx cap add android` — nền tảng Android thuộc kế hoạch số 4, và máy này chưa cài Java lẫn Android SDK.

Kiểm tra `capacitor.config.ts` tồn tại và `webDir` trỏ đúng vào thư mục build. Nếu `ng build` xuất ra đường dẫn khác, sửa `webDir` cho khớp.

- [ ] **Step 3: Viết bản cài**

Tạo `src/app/data/storage/preferences-storage.ts`:

```ts
import { Preferences } from '@capacitor/preferences';
import { StoragePort } from './storage-port';

/**
 * Bản cài dùng trên máy thật. Trên web, plugin tự lùi về localStorage nên
 * chạy được cả khi mở bằng trình duyệt lúc phát triển.
 *
 * Không có test đơn vị: file này chỉ chuyển tiếp lời gọi, còn mọi luật đều
 * nằm ở JsonStore và các repository phía trên, vốn được test qua MemoryStorage.
 */
export class PreferencesStorage implements StoragePort {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }

  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
```

- [ ] **Step 4: Kiểm tra biên dịch và test**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
npx ng build
```

Expected: 156 test vẫn xanh, build thành công. Số test không đổi vì task này không thêm test nào.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add package.json package-lock.json capacitor.config.ts src/app/data/storage/preferences-storage.ts
git commit -m "feat: them ban cai luu tru qua Capacitor Preferences"
```

---

## Task 3: Kho chứa giá trị có kiểu

Năm repository sắp tới đều cần cùng một thứ: đọc chuỗi JSON, kiểm hình dạng, rơi về mặc định nếu hỏng.

Chỗ này quan trọng hơn vẻ ngoài. Ván đang dở được ghi sau mỗi thay đổi state; nếu app bị đóng đúng lúc đang ghi, khoá đó sẽ chứa JSON cụt. Đọc lại mà ném lỗi thì app không mở lên được nữa, và người dùng không có cách nào tự sửa ngoài gỡ cài đặt.

**Files:**
- Create: `src/app/data/json-store.ts`
- Test: `src/app/data/json-store.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/data/json-store.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { JsonStore } from './json-store';
import { MemoryStorage } from './storage/memory-storage';

interface Profile {
  name: string;
  age: number;
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate['name'] === 'string' && typeof candidate['age'] === 'number';
}

describe('JsonStore', () => {
  let storage: MemoryStorage;
  let store: JsonStore<Profile>;

  beforeEach(() => {
    storage = new MemoryStorage();
    store = new JsonStore(storage, 'profile', isProfile, () => ({
      name: 'chưa đặt',
      age: 0,
    }));
  });

  it('chưa ghi gì thì đọc ra giá trị mặc định', async () => {
    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });
  });

  it('ghi rồi đọc lại đúng giá trị', async () => {
    await store.write({ name: 'Minh', age: 30 });
    expect(await store.read()).toEqual({ name: 'Minh', age: 30 });
  });

  it('giữ nguyên dấu tiếng Việt qua một vòng ghi đọc', async () => {
    await store.write({ name: 'Nguyễn Đình Khoa', age: 7 });
    expect((await store.read()).name).toBe('Nguyễn Đình Khoa');
  });

  it('JSON hỏng thì rơi về mặc định thay vì ném lỗi', async () => {
    await storage.set('profile', '{"name": "Minh", "age":');

    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });
  });

  it('JSON hợp lệ nhưng sai hình dạng thì cũng rơi về mặc định', async () => {
    await storage.set('profile', '{"name": "Minh"}');

    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });
  });

  it('JSON là mảng hoặc số thì cũng rơi về mặc định', async () => {
    await storage.set('profile', '[1,2,3]');
    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });

    await storage.set('profile', '42');
    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });
  });

  it('dữ liệu hỏng được dọn đi để lần đọc sau không phải phân tích lại', async () => {
    await storage.set('profile', 'khong-phai-json');
    await store.read();

    expect(await storage.get('profile')).toBeNull();
  });

  it('mỗi lần đọc mặc định cho ra một đối tượng riêng', async () => {
    const first = await store.read();
    first.name = 'bị sửa';

    expect((await store.read()).name).toBe('chưa đặt');
  });

  it('clear đưa về lại mặc định', async () => {
    await store.write({ name: 'Minh', age: 30 });
    await store.clear();

    expect(await store.read()).toEqual({ name: 'chưa đặt', age: 0 });
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./json-store`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/data/json-store.ts`:

```ts
import { StoragePort } from './storage/storage-port';

/**
 * Đọc ghi một giá trị có kiểu dưới dạng JSON, qua một StoragePort.
 *
 * Nguyên tắc: đọc KHÔNG BAO GIỜ được ném lỗi. Ván đang dở được ghi lại sau
 * mỗi thay đổi state, nên nếu app bị đóng giữa lúc ghi thì khoá đó sẽ chứa
 * JSON cụt. Nếu lần đọc sau ném lỗi thì app không mở lên được nữa, và người
 * dùng không có cách nào tự sửa ngoài gỡ cài đặt. Thà mất một ván đang dở
 * còn hơn hỏng cả app.
 *
 * `isValid` bảo vệ chống một chuyện âm thầm hơn: JSON hợp lệ nhưng sai hình
 * dạng, chẳng hạn khi cấu trúc dữ liệu đổi giữa hai phiên bản app.
 */
export class JsonStore<T> {
  constructor(
    private readonly storage: StoragePort,
    private readonly key: string,
    private readonly isValid: (value: unknown) => value is T,
    private readonly makeDefault: () => T,
  ) {}

  async read(): Promise<T> {
    const raw = await this.storage.get(this.key);
    if (raw === null) return this.makeDefault();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      await this.storage.remove(this.key);
      return this.makeDefault();
    }

    if (!this.isValid(parsed)) {
      await this.storage.remove(this.key);
      return this.makeDefault();
    }

    return parsed;
  }

  async write(value: T): Promise<void> {
    await this.storage.set(this.key, JSON.stringify(value));
  }

  async clear(): Promise<void> {
    await this.storage.remove(this.key);
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, tổng 156 + 9 = 165.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/json-store.ts src/app/data/json-store.spec.ts
git commit -m "feat: them kho chua gia tri co kieu chiu duoc du lieu hong"
```

---

## Task 4: Luật khoảng cách giữa hai từ trong một cặp

Cài đặt ràng buộc ở mục 7 của đặc tả.

Cách chấm đoán từ bỏ dấu tiếng Việt rồi chấp nhận sai lệch tới một ký tự với đáp án ngắn. Hệ quả: nếu hai từ trong một cặp quá gần nhau sau khi chuẩn hoá, mũ trắng đoán trúng **từ của gián điệp** vẫn được chấm là đúng và thắng cả ván.

Tiếng Việt đặc biệt dễ dính vì rất nhiều từ chỉ khác nhau đúng một dấu thanh: `bò` và `bó` sau chuẩn hoá đều thành `bo`, hoàn toàn không phân biệt nổi. Mà đặc tả lại yêu cầu hai từ phải **tương đồng**, nên người soạn kho sẽ tự nhiên chọn những cặp cùng loại như `mèo`/`heo`.

**Files:**
- Modify: `src/app/core/engine/guess-matcher.ts` (tách một hàm ra và export)
- Create: `src/app/core/engine/pair-distance.ts`
- Test: `src/app/core/engine/pair-distance.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/core/engine/pair-distance.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { describePairProblem, isPairFarEnough } from './pair-distance';

describe('isPairFarEnough', () => {
  it('từ chối cặp trùng khít sau khi bỏ dấu', () => {
    expect(isPairFarEnough('bò', 'bó')).toBe(false);
    expect(isPairFarEnough('chó', 'cho')).toBe(false);
  });

  it('từ chối cặp chỉ cách nhau một ký tự', () => {
    expect(isPairFarEnough('mèo', 'heo')).toBe(false);
    expect(isPairFarEnough('cá', 'gà')).toBe(false);
  });

  it('chấp nhận cặp cách nhau từ hai ký tự trở lên', () => {
    expect(isPairFarEnough('bút bi', 'bút chì')).toBe(true);
    expect(isPairFarEnough('xe máy', 'xe đạp')).toBe(true);
    expect(isPairFarEnough('con chó', 'con mèo')).toBe(true);
  });

  it('với từ dài thì đòi khoảng cách lớn hơn, vì ngưỡng chấm cũng lớn hơn', () => {
    // 'bánh mì thịt nướng' dài hơn 8 ký tự nên ngưỡng chấm là 2,
    // vậy hai từ phải cách nhau ít nhất 3.
    expect(isPairFarEnough('bánh mì thịt nướng', 'bánh mì thịt nương')).toBe(false);
    expect(isPairFarEnough('bánh mì thịt nướng', 'bánh mì chả cá')).toBe(true);
  });

  it('từ chối khi một trong hai từ rỗng sau khi chuẩn hoá', () => {
    expect(isPairFarEnough('', 'con mèo')).toBe(false);
    expect(isPairFarEnough('!!!', 'con mèo')).toBe(false);
  });

  it('đối xứng: đổi chỗ hai từ không đổi kết quả', () => {
    expect(isPairFarEnough('mèo', 'heo')).toBe(isPairFarEnough('heo', 'mèo'));
    expect(isPairFarEnough('xe máy', 'xe đạp')).toBe(isPairFarEnough('xe đạp', 'xe máy'));
  });
});

describe('describePairProblem', () => {
  it('cặp hợp lệ thì không có vấn đề gì', () => {
    expect(describePairProblem('xe máy', 'xe đạp')).toBeNull();
  });

  it('nêu rõ lý do khi hai từ quá gần nhau', () => {
    const problem = describePairProblem('mèo', 'heo');

    expect(problem).not.toBeNull();
    expect(problem).toContain('meo');
    expect(problem).toContain('heo');
  });

  it('nêu rõ lý do khi một từ rỗng', () => {
    expect(describePairProblem('   ', 'con mèo')).toContain('rỗng');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./pair-distance`.

- [ ] **Step 3: Tách ngưỡng ra khỏi guess-matcher**

Mở `src/app/core/engine/guess-matcher.ts`. Hiện tại ngưỡng đang nằm trong thân `isGuessCorrect` dưới dạng `normalizedAnswer.length <= 8 ? 1 : 2`. Tách nó thành hàm được export, rồi gọi lại, để `pair-distance` không phải chép lại con số.

Thêm hàm này ngay TRƯỚC `isGuessCorrect`:

```ts
/**
 * Mức sai lệch tối đa còn được chấp nhận cho một đáp án đã chuẩn hoá.
 * Từ ngắn thì chặt hơn, vì một ký tự sai trong từ ba chữ đã là một từ khác.
 */
export function guessThreshold(normalizedAnswer: string): number {
  return normalizedAnswer.length <= 8 ? 1 : 2;
}
```

Rồi sửa đúng một dòng trong `isGuessCorrect`, thay:

```ts
  const threshold = normalizedAnswer.length <= 8 ? 1 : 2;
```

bằng:

```ts
  const threshold = guessThreshold(normalizedAnswer);
```

Không đụng gì khác trong file đó. Cả 15 test của `guess-matcher.spec.ts` phải vẫn xanh — nếu có test nào đỏ thì bạn đã sửa nhầm chỗ.

- [ ] **Step 4: Viết pair-distance**

Tạo `src/app/core/engine/pair-distance.ts`:

```ts
import { guessThreshold, levenshtein, normalizeVi } from './guess-matcher';

/**
 * Hai từ trong một cặp có đủ xa nhau để hàm chấm đoán từ phân biệt được không.
 *
 * Nếu không, mũ trắng đoán trúng từ của gián điệp vẫn được chấm là đúng và
 * thắng cả ván. Ngưỡng lấy theo từ dài hơn trong hai từ, vì phép chấm có thể
 * chạy theo chiều nào cũng được.
 */
export function isPairFarEnough(wordA: string, wordB: string): boolean {
  const a = normalizeVi(wordA);
  const b = normalizeVi(wordB);

  if (a.length === 0 || b.length === 0) return false;

  const threshold = Math.max(guessThreshold(a), guessThreshold(b));
  return levenshtein(a, b) > threshold;
}

/**
 * Trả về lời giải thích khi cặp không hợp lệ, hoặc null khi cặp ổn.
 * Dùng cho màn hình tự thêm cặp từ, nơi người dùng cần biết vì sao bị từ chối.
 */
export function describePairProblem(wordA: string, wordB: string): string | null {
  const a = normalizeVi(wordA);
  const b = normalizeVi(wordB);

  if (a.length === 0 || b.length === 0) {
    return 'Cả hai từ đều phải có chữ. Một trong hai từ đang rỗng sau khi bỏ dấu và ký tự đặc biệt.';
  }

  if (isPairFarEnough(wordA, wordB)) return null;

  const threshold = Math.max(guessThreshold(a), guessThreshold(b));
  return (
    `Hai từ quá giống nhau sau khi bỏ dấu: "${a}" và "${b}" chỉ cách nhau ` +
    `${levenshtein(a, b)} ký tự, trong khi cần cách nhau hơn ${threshold}. ` +
    `Mũ trắng đoán từ này sẽ được chấm đúng cho cả từ kia.`
  );
}
```

- [ ] **Step 5: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, tổng 165 + 9 = 174. Toàn bộ test cũ của `guess-matcher` vẫn phải xanh.

- [ ] **Step 6: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/guess-matcher.ts src/app/core/engine/pair-distance.ts src/app/core/engine/pair-distance.spec.ts
git commit -m "feat: them luat khoang cach giua hai tu trong mot cap"
```

---

## Task 5: Khung kho từ và hai chủ đề đầu

**Files:**
- Create: `src/app/data/word-bank/types.ts`
- Create: `src/app/data/word-bank/animals.ts`
- Create: `src/app/data/word-bank/food.ts`
- Create: `src/app/data/word-bank/index.ts`
- Test: `src/app/data/word-bank/word-bank.spec.ts`

- [ ] **Step 1: Viết test kiểm toàn kho**

Test này kiểm mọi cặp trong kho, nên nó sẽ tự động phủ luôn sáu chủ đề thêm vào ở Task 6 và Task 7 mà không phải sửa gì.

Tạo `src/app/data/word-bank/word-bank.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { describePairProblem } from '../../core/engine/pair-distance';
import { normalizeVi } from '../../core/engine/guess-matcher';
import { PACKAGED_PAIRS, toWordPair } from './index';
import { TOPICS } from './types';

describe('kho từ đóng gói sẵn', () => {
  it('không rỗng', () => {
    expect(PACKAGED_PAIRS.length).toBeGreaterThan(0);
  });

  it('mọi id đều duy nhất', () => {
    const ids = PACKAGED_PAIRS.map((pair) => pair.id);
    const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicated).toEqual([]);
  });

  it('mọi chủ đề đều nằm trong danh sách chính thức', () => {
    for (const pair of PACKAGED_PAIRS) {
      expect(TOPICS).toContain(pair.topic);
    }
  });

  it('không có từ nào rỗng hoặc thừa khoảng trắng ở hai đầu', () => {
    for (const pair of PACKAGED_PAIRS) {
      expect(pair.wordA).toBe(pair.wordA.trim());
      expect(pair.wordB).toBe(pair.wordB.trim());
      expect(pair.wordA.length).toBeGreaterThan(0);
      expect(pair.wordB.length).toBeGreaterThan(0);
    }
  });

  it('hai từ trong mỗi cặp đủ xa nhau để hàm chấm phân biệt được', () => {
    const problems = PACKAGED_PAIRS.map((pair) => ({
      id: pair.id,
      problem: describePairProblem(pair.wordA, pair.wordB),
    })).filter((entry) => entry.problem !== null);

    // In ra id cụ thể để người sửa biết phải đổi cặp nào.
    expect(problems).toEqual([]);
  });

  it('không có hai cặp nào trùng nội dung sau khi chuẩn hoá', () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];

    for (const pair of PACKAGED_PAIRS) {
      const key = [normalizeVi(pair.wordA), normalizeVi(pair.wordB)].sort().join('|');
      const previous = seen.get(key);
      if (previous !== undefined) collisions.push(`${previous} và ${pair.id}`);
      else seen.set(key, pair.id);
    }

    expect(collisions).toEqual([]);
  });

  it('toWordPair gắn đúng cờ mặc định cho cặp gốc', () => {
    const converted = toWordPair(PACKAGED_PAIRS[0]);

    expect(converted.isCustom).toBe(false);
    expect(converted.hidden).toBe(false);
    expect(converted.id).toBe(PACKAGED_PAIRS[0].id);
  });

  it('mỗi chủ đề đã có mặt đều có ít nhất 20 cặp', () => {
    const counts = new Map<string, number>();
    for (const pair of PACKAGED_PAIRS) {
      counts.set(pair.topic, (counts.get(pair.topic) ?? 0) + 1);
    }

    for (const [topic, count] of counts) {
      expect(count, `chủ đề ${topic} chỉ có ${count} cặp`).toBeGreaterThanOrEqual(20);
    }
  });

  it('mỗi chủ đề có đủ cả ba mức độ khó', () => {
    const byTopic = new Map<string, Set<string>>();
    for (const pair of PACKAGED_PAIRS) {
      if (!byTopic.has(pair.topic)) byTopic.set(pair.topic, new Set());
      byTopic.get(pair.topic)!.add(pair.difficulty);
    }

    for (const [topic, levels] of byTopic) {
      expect([...levels].sort(), `chủ đề ${topic}`).toEqual(['EASY', 'HARD', 'MEDIUM']);
    }
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./index` và `./types`.

- [ ] **Step 3: Viết kiểu dữ liệu**

Tạo `src/app/data/word-bank/types.ts`:

```ts
import { Difficulty } from '../../core/models';

/**
 * Tám chủ đề chính thức. Khai báo `as const` để mọi file dữ liệu chỉ nhận
 * đúng những chuỗi này — gõ sai tên chủ đề là lỗi biên dịch, không phải lỗi
 * chạy.
 */
export const TOPICS = [
  'Động vật',
  'Đồ ăn thức uống',
  'Nghề nghiệp',
  'Đồ vật trong nhà',
  'Thể thao',
  'Phim và nhân vật',
  'Thiên nhiên',
  'Giao thông',
] as const;

export type Topic = (typeof TOPICS)[number];

/**
 * Cặp từ trong kho đóng gói sẵn. Khác `WordPair` ở chỗ không mang `isCustom`
 * và `hidden` — hai cờ đó là trạng thái lúc chạy, do người dùng đổi, nên
 * không thuộc về dữ liệu tĩnh.
 */
export interface PackagedPair {
  id: string;
  wordA: string;
  wordB: string;
  topic: Topic;
  difficulty: Difficulty;
}
```

- [ ] **Step 4: Viết hai file dữ liệu đầu tiên**

Quy tắc bắt buộc cho mọi cặp từ, áp dụng cho cả Task 6 và Task 7:

1. **Hai từ phải cách nhau hơn ngưỡng chấm sau khi bỏ dấu.** Thực tế: khác nhau ít nhất hai ký tự khi đã bỏ dấu. Tránh mọi cặp chỉ khác dấu thanh (`bò`/`bó`), và tránh cặp một âm tiết chỉ khác một chữ (`mèo`/`heo`, `cá`/`gà`). Cách an toàn nhất là dùng từ hai âm tiết trở lên.
2. **Hai từ phải tương đồng về mặt ý nghĩa** — cùng loại, cùng công dụng, cùng bối cảnh. Đó là điều làm trò chơi khó và vui. `con chó`/`con mèo` tốt; `con chó`/`cái tủ lạnh` vô dụng vì lộ ngay.
3. **Độ khó phản ánh mức dễ lẫn khi mô tả**: `EASY` là hai thứ khác nhau rõ ràng, `MEDIUM` là gần nhau, `HARD` là rất dễ mô tả trùng nhau.
4. **Từ phải quen thuộc với người Việt.** Không dùng từ chuyên ngành, từ địa phương hiếm, hay tên riêng khó.
5. **Id theo dạng `<tiền tố chủ đề>-<số ba chữ số>`**, đánh số liên tục từ 001 trong mỗi chủ đề.

Tạo `src/app/data/word-bank/animals.ts` với **ít nhất 20 cặp**, tiền tố id `dv`, đủ cả ba mức độ khó. Bắt đầu từ những cặp dưới đây rồi viết tiếp cho đủ số lượng:

```ts
import { PackagedPair } from './types';

export const ANIMAL_PAIRS = [
  { id: 'dv-001', wordA: 'con chó', wordB: 'con mèo', topic: 'Động vật', difficulty: 'EASY' },
  { id: 'dv-002', wordA: 'con gà', wordB: 'con vịt', topic: 'Động vật', difficulty: 'MEDIUM' },
  { id: 'dv-003', wordA: 'con trâu', wordB: 'con bò', topic: 'Động vật', difficulty: 'MEDIUM' },
  { id: 'dv-004', wordA: 'con voi', wordB: 'con hươu cao cổ', topic: 'Động vật', difficulty: 'EASY' },
  { id: 'dv-005', wordA: 'con cá heo', wordB: 'con cá mập', topic: 'Động vật', difficulty: 'MEDIUM' },
  { id: 'dv-006', wordA: 'con ong', wordB: 'con bướm', topic: 'Động vật', difficulty: 'EASY' },
  { id: 'dv-007', wordA: 'con hổ', wordB: 'con sư tử', topic: 'Động vật', difficulty: 'HARD' },
  { id: 'dv-008', wordA: 'con rùa', wordB: 'con ốc sên', topic: 'Động vật', difficulty: 'HARD' },
  // ... viết tiếp cho đủ ít nhất 20 cặp, id chạy tới dv-020 trở lên
] as const satisfies readonly PackagedPair[];
```

Tạo `src/app/data/word-bank/food.ts` với **ít nhất 20 cặp**, tiền tố id `da`:

```ts
import { PackagedPair } from './types';

export const FOOD_PAIRS = [
  { id: 'da-001', wordA: 'phở bò', wordB: 'bún bò', topic: 'Đồ ăn thức uống', difficulty: 'HARD' },
  { id: 'da-002', wordA: 'cà phê', wordB: 'trà sữa', topic: 'Đồ ăn thức uống', difficulty: 'EASY' },
  { id: 'da-003', wordA: 'bánh mì', wordB: 'bánh bao', topic: 'Đồ ăn thức uống', difficulty: 'MEDIUM' },
  { id: 'da-004', wordA: 'cơm tấm', wordB: 'cơm chiên', topic: 'Đồ ăn thức uống', difficulty: 'HARD' },
  { id: 'da-005', wordA: 'kem que', wordB: 'chè đậu', topic: 'Đồ ăn thức uống', difficulty: 'MEDIUM' },
  { id: 'da-006', wordA: 'nước mắm', wordB: 'nước tương', topic: 'Đồ ăn thức uống', difficulty: 'HARD' },
  { id: 'da-007', wordA: 'quả chuối', wordB: 'quả xoài', topic: 'Đồ ăn thức uống', difficulty: 'EASY' },
  { id: 'da-008', wordA: 'gỏi cuốn', wordB: 'chả giò', topic: 'Đồ ăn thức uống', difficulty: 'MEDIUM' },
  // ... viết tiếp cho đủ ít nhất 20 cặp, id chạy tới da-020 trở lên
] as const satisfies readonly PackagedPair[];
```

Lưu ý về `as const satisfies readonly PackagedPair[]`: `satisfies` bắt lỗi gõ sai tên chủ đề hay độ khó ngay lúc biên dịch, còn `as const` giữ cho mảng bất biến. Giữ nguyên cả hai.

- [ ] **Step 5: Viết file gom**

Tạo `src/app/data/word-bank/index.ts`:

```ts
import { WordPair } from '../../core/models';
import { ANIMAL_PAIRS } from './animals';
import { FOOD_PAIRS } from './food';
import { PackagedPair } from './types';

export * from './types';

/**
 * Toàn bộ kho đóng gói sẵn. Thêm chủ đề mới thì import file rồi nối vào đây;
 * bộ test kiểm kho tự động phủ luôn, không phải sửa test.
 */
export const PACKAGED_PAIRS: readonly PackagedPair[] = [
  ...ANIMAL_PAIRS,
  ...FOOD_PAIRS,
];

/** Gắn hai cờ trạng thái mặc định để biến dữ liệu tĩnh thành WordPair dùng được. */
export function toWordPair(pair: PackagedPair): WordPair {
  return { ...pair, isCustom: false, hidden: false };
}
```

- [ ] **Step 6: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, tổng 174 + 9 = 183.

Nếu test khoảng cách cặp từ đỏ, thông báo lỗi sẽ liệt kê id của những cặp có vấn đề kèm lời giải thích. Đổi một trong hai từ của cặp đó cho xa nhau hơn — **đừng** nới lỏng test.

- [ ] **Step 7: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/word-bank
git commit -m "feat: them khung kho tu va hai chu de dau tien"
```

---

## Task 6: Ba chủ đề tiếp theo

**Files:**
- Create: `src/app/data/word-bank/jobs.ts`
- Create: `src/app/data/word-bank/household.ts`
- Create: `src/app/data/word-bank/sports.ts`
- Modify: `src/app/data/word-bank/index.ts`

- [ ] **Step 1: Viết ba file dữ liệu**

Áp dụng đúng năm quy tắc ở Task 5 Step 4. Mỗi file **ít nhất 20 cặp**, đủ cả ba mức độ khó.

Tạo `src/app/data/word-bank/jobs.ts`, tiền tố id `nn`, chủ đề `'Nghề nghiệp'`:

```ts
import { PackagedPair } from './types';

export const JOB_PAIRS = [
  { id: 'nn-001', wordA: 'bác sĩ', wordB: 'y tá', topic: 'Nghề nghiệp', difficulty: 'MEDIUM' },
  { id: 'nn-002', wordA: 'giáo viên', wordB: 'gia sư', topic: 'Nghề nghiệp', difficulty: 'HARD' },
  { id: 'nn-003', wordA: 'đầu bếp', wordB: 'thợ làm bánh', topic: 'Nghề nghiệp', difficulty: 'MEDIUM' },
  { id: 'nn-004', wordA: 'cảnh sát', wordB: 'bảo vệ', topic: 'Nghề nghiệp', difficulty: 'MEDIUM' },
  { id: 'nn-005', wordA: 'ca sĩ', wordB: 'diễn viên', topic: 'Nghề nghiệp', difficulty: 'EASY' },
  { id: 'nn-006', wordA: 'thợ cắt tóc', wordB: 'thợ may', topic: 'Nghề nghiệp', difficulty: 'EASY' },
  { id: 'nn-007', wordA: 'phi công', wordB: 'tiếp viên hàng không', topic: 'Nghề nghiệp', difficulty: 'MEDIUM' },
  { id: 'nn-008', wordA: 'lập trình viên', wordB: 'kỹ sư điện', topic: 'Nghề nghiệp', difficulty: 'HARD' },
  // ... viết tiếp cho đủ ít nhất 20 cặp
] as const satisfies readonly PackagedPair[];
```

Tạo `src/app/data/word-bank/household.ts`, tiền tố id `dv2`, chủ đề `'Đồ vật trong nhà'`:

```ts
import { PackagedPair } from './types';

export const HOUSEHOLD_PAIRS = [
  { id: 'dv2-001', wordA: 'cái tủ lạnh', wordB: 'máy giặt', topic: 'Đồ vật trong nhà', difficulty: 'EASY' },
  { id: 'dv2-002', wordA: 'bút bi', wordB: 'bút chì', topic: 'Đồ vật trong nhà', difficulty: 'HARD' },
  { id: 'dv2-003', wordA: 'cái ghế', wordB: 'cái bàn', topic: 'Đồ vật trong nhà', difficulty: 'MEDIUM' },
  { id: 'dv2-004', wordA: 'cái gối', wordB: 'cái chăn', topic: 'Đồ vật trong nhà', difficulty: 'MEDIUM' },
  { id: 'dv2-005', wordA: 'cái quạt', wordB: 'máy lạnh', topic: 'Đồ vật trong nhà', difficulty: 'MEDIUM' },
  { id: 'dv2-006', wordA: 'cái chổi', wordB: 'cây lau nhà', topic: 'Đồ vật trong nhà', difficulty: 'HARD' },
  { id: 'dv2-007', wordA: 'cái nồi', wordB: 'cái chảo', topic: 'Đồ vật trong nhà', difficulty: 'HARD' },
  { id: 'dv2-008', wordA: 'ti vi', wordB: 'máy tính', topic: 'Đồ vật trong nhà', difficulty: 'EASY' },
  // ... viết tiếp cho đủ ít nhất 20 cặp
] as const satisfies readonly PackagedPair[];
```

Tạo `src/app/data/word-bank/sports.ts`, tiền tố id `tt`, chủ đề `'Thể thao'`:

```ts
import { PackagedPair } from './types';

export const SPORT_PAIRS = [
  { id: 'tt-001', wordA: 'bóng đá', wordB: 'bóng rổ', topic: 'Thể thao', difficulty: 'MEDIUM' },
  { id: 'tt-002', wordA: 'cầu lông', wordB: 'bóng bàn', topic: 'Thể thao', difficulty: 'HARD' },
  { id: 'tt-003', wordA: 'bơi lội', wordB: 'chạy bộ', topic: 'Thể thao', difficulty: 'EASY' },
  { id: 'tt-004', wordA: 'cờ vua', wordB: 'cờ tướng', topic: 'Thể thao', difficulty: 'HARD' },
  { id: 'tt-005', wordA: 'đạp xe', wordB: 'trượt patin', topic: 'Thể thao', difficulty: 'MEDIUM' },
  { id: 'tt-006', wordA: 'yoga', wordB: 'thể dục nhịp điệu', topic: 'Thể thao', difficulty: 'MEDIUM' },
  { id: 'tt-007', wordA: 'bóng chuyền', wordB: 'bóng ném', topic: 'Thể thao', difficulty: 'HARD' },
  { id: 'tt-008', wordA: 'leo núi', wordB: 'đi bộ đường dài', topic: 'Thể thao', difficulty: 'MEDIUM' },
  // ... viết tiếp cho đủ ít nhất 20 cặp
] as const satisfies readonly PackagedPair[];
```

- [ ] **Step 2: Nối ba chủ đề vào file gom**

Sửa `src/app/data/word-bank/index.ts`. Thêm ba dòng import và ba dòng nối mảng:

```ts
import { WordPair } from '../../core/models';
import { ANIMAL_PAIRS } from './animals';
import { FOOD_PAIRS } from './food';
import { HOUSEHOLD_PAIRS } from './household';
import { JOB_PAIRS } from './jobs';
import { SPORT_PAIRS } from './sports';
import { PackagedPair } from './types';

export * from './types';

/**
 * Toàn bộ kho đóng gói sẵn. Thêm chủ đề mới thì import file rồi nối vào đây;
 * bộ test kiểm kho tự động phủ luôn, không phải sửa test.
 */
export const PACKAGED_PAIRS: readonly PackagedPair[] = [
  ...ANIMAL_PAIRS,
  ...FOOD_PAIRS,
  ...JOB_PAIRS,
  ...HOUSEHOLD_PAIRS,
  ...SPORT_PAIRS,
];

/** Gắn hai cờ trạng thái mặc định để biến dữ liệu tĩnh thành WordPair dùng được. */
export function toWordPair(pair: PackagedPair): WordPair {
  return { ...pair, isCustom: false, hidden: false };
}
```

- [ ] **Step 3: Chạy test**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, vẫn 183 test — task này không thêm test nào, nhưng bộ kiểm kho giờ chạy trên nhiều cặp hơn.

Nếu test khoảng cách đỏ, đổi cặp bị nêu tên. Nếu test "mỗi chủ đề có ít nhất 20 cặp" đỏ, viết thêm cặp cho chủ đề đó.

- [ ] **Step 4: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/word-bank
git commit -m "feat: them ba chu de nghe nghiep, do vat trong nha, the thao"
```

---

## Task 7: Ba chủ đề cuối

**Files:**
- Create: `src/app/data/word-bank/movies.ts`
- Create: `src/app/data/word-bank/nature.ts`
- Create: `src/app/data/word-bank/transport.ts`
- Modify: `src/app/data/word-bank/index.ts`

- [ ] **Step 1: Viết ba file dữ liệu**

Áp dụng đúng năm quy tắc ở Task 5 Step 4. Mỗi file **ít nhất 20 cặp**, đủ cả ba mức độ khó.

Tạo `src/app/data/word-bank/movies.ts`, tiền tố id `pa`, chủ đề `'Phim và nhân vật'`. Chỉ dùng nhân vật và thể loại mà người Việt nói chung đều biết:

```ts
import { PackagedPair } from './types';

export const MOVIE_PAIRS = [
  { id: 'pa-001', wordA: 'siêu nhân', wordB: 'người nhện', topic: 'Phim và nhân vật', difficulty: 'MEDIUM' },
  { id: 'pa-002', wordA: 'phim hoạt hình', wordB: 'phim tài liệu', topic: 'Phim và nhân vật', difficulty: 'EASY' },
  { id: 'pa-003', wordA: 'phim kinh dị', wordB: 'phim hành động', topic: 'Phim và nhân vật', difficulty: 'MEDIUM' },
  { id: 'pa-004', wordA: 'ông bụt', wordB: 'bà tiên', topic: 'Phim và nhân vật', difficulty: 'HARD' },
  { id: 'pa-005', wordA: 'Tôn Ngộ Không', wordB: 'Trư Bát Giới', topic: 'Phim và nhân vật', difficulty: 'MEDIUM' },
  { id: 'pa-006', wordA: 'phù thuỷ', wordB: 'thầy pháp', topic: 'Phim và nhân vật', difficulty: 'HARD' },
  { id: 'pa-007', wordA: 'đạo diễn', wordB: 'nhà sản xuất', topic: 'Phim và nhân vật', difficulty: 'HARD' },
  { id: 'pa-008', wordA: 'rạp chiếu phim', wordB: 'sân khấu kịch', topic: 'Phim và nhân vật', difficulty: 'MEDIUM' },
  // ... viết tiếp cho đủ ít nhất 20 cặp
] as const satisfies readonly PackagedPair[];
```

Tạo `src/app/data/word-bank/nature.ts`, tiền tố id `tn`, chủ đề `'Thiên nhiên'`:

```ts
import { PackagedPair } from './types';

export const NATURE_PAIRS = [
  { id: 'tn-001', wordA: 'mặt trời', wordB: 'mặt trăng', topic: 'Thiên nhiên', difficulty: 'MEDIUM' },
  { id: 'tn-002', wordA: 'dòng sông', wordB: 'con suối', topic: 'Thiên nhiên', difficulty: 'HARD' },
  { id: 'tn-003', wordA: 'ngọn núi', wordB: 'quả đồi', topic: 'Thiên nhiên', difficulty: 'HARD' },
  { id: 'tn-004', wordA: 'cơn mưa', wordB: 'cơn bão', topic: 'Thiên nhiên', difficulty: 'MEDIUM' },
  { id: 'tn-005', wordA: 'bãi biển', wordB: 'sa mạc', topic: 'Thiên nhiên', difficulty: 'EASY' },
  { id: 'tn-006', wordA: 'cây tre', wordB: 'cây dừa', topic: 'Thiên nhiên', difficulty: 'MEDIUM' },
  { id: 'tn-007', wordA: 'cầu vồng', wordB: 'tia chớp', topic: 'Thiên nhiên', difficulty: 'EASY' },
  { id: 'tn-008', wordA: 'rừng rậm', wordB: 'đồng cỏ', topic: 'Thiên nhiên', difficulty: 'MEDIUM' },
  // ... viết tiếp cho đủ ít nhất 20 cặp
] as const satisfies readonly PackagedPair[];
```

Tạo `src/app/data/word-bank/transport.ts`, tiền tố id `gt`, chủ đề `'Giao thông'`:

```ts
import { PackagedPair } from './types';

export const TRANSPORT_PAIRS = [
  { id: 'gt-001', wordA: 'xe máy', wordB: 'xe đạp', topic: 'Giao thông', difficulty: 'MEDIUM' },
  { id: 'gt-002', wordA: 'máy bay', wordB: 'trực thăng', topic: 'Giao thông', difficulty: 'MEDIUM' },
  { id: 'gt-003', wordA: 'tàu hoả', wordB: 'tàu điện', topic: 'Giao thông', difficulty: 'HARD' },
  { id: 'gt-004', wordA: 'xe buýt', wordB: 'xe khách', topic: 'Giao thông', difficulty: 'HARD' },
  { id: 'gt-005', wordA: 'thuyền buồm', wordB: 'ca nô', topic: 'Giao thông', difficulty: 'MEDIUM' },
  { id: 'gt-006', wordA: 'đèn giao thông', wordB: 'biển báo', topic: 'Giao thông', difficulty: 'MEDIUM' },
  { id: 'gt-007', wordA: 'cây xăng', wordB: 'bãi đỗ xe', topic: 'Giao thông', difficulty: 'EASY' },
  { id: 'gt-008', wordA: 'mũ bảo hiểm', wordB: 'dây an toàn', topic: 'Giao thông', difficulty: 'EASY' },
  // ... viết tiếp cho đủ ít nhất 20 cặp
] as const satisfies readonly PackagedPair[];
```

- [ ] **Step 2: Nối ba chủ đề cuối vào file gom**

Sửa `src/app/data/word-bank/index.ts` thành:

```ts
import { WordPair } from '../../core/models';
import { ANIMAL_PAIRS } from './animals';
import { FOOD_PAIRS } from './food';
import { HOUSEHOLD_PAIRS } from './household';
import { JOB_PAIRS } from './jobs';
import { MOVIE_PAIRS } from './movies';
import { NATURE_PAIRS } from './nature';
import { SPORT_PAIRS } from './sports';
import { TRANSPORT_PAIRS } from './transport';
import { PackagedPair } from './types';

export * from './types';

/**
 * Toàn bộ kho đóng gói sẵn. Thêm chủ đề mới thì import file rồi nối vào đây;
 * bộ test kiểm kho tự động phủ luôn, không phải sửa test.
 */
export const PACKAGED_PAIRS: readonly PackagedPair[] = [
  ...ANIMAL_PAIRS,
  ...FOOD_PAIRS,
  ...JOB_PAIRS,
  ...HOUSEHOLD_PAIRS,
  ...SPORT_PAIRS,
  ...MOVIE_PAIRS,
  ...NATURE_PAIRS,
  ...TRANSPORT_PAIRS,
];

/** Gắn hai cờ trạng thái mặc định để biến dữ liệu tĩnh thành WordPair dùng được. */
export function toWordPair(pair: PackagedPair): WordPair {
  return { ...pair, isCustom: false, hidden: false };
}
```

- [ ] **Step 3: Thêm một test khẳng định đủ tám chủ đề**

Thêm test này vào cuối khối `describe('kho từ đóng gói sẵn', ...)` trong `src/app/data/word-bank/word-bank.spec.ts`:

```ts
  it('đủ cả tám chủ đề chính thức', () => {
    const present = new Set(PACKAGED_PAIRS.map((pair) => pair.topic));

    expect([...present].sort()).toEqual([...TOPICS].sort());
  });
```

- [ ] **Step 4: Chạy test**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, tổng 183 + 1 = 184. Kho lúc này có ít nhất 160 cặp.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/word-bank
git commit -m "feat: them ba chu de phim, thien nhien, giao thong"
```

---

## Task 8: Bốc cặp từ

Cài đặt mục 7 của đặc tả.

**Files:**
- Create: `src/app/data/pair-picker.ts`
- Test: `src/app/data/pair-picker.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/data/pair-picker.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { WordPair } from '../core/models';
import { createSeededRng } from '../core/engine/rng';
import { pickPair } from './pair-picker';

function pair(id: string, overrides: Partial<WordPair> = {}): WordPair {
  return {
    id,
    wordA: `${id}-a`,
    wordB: `${id}-b`,
    topic: 'Động vật',
    difficulty: 'EASY',
    isCustom: false,
    hidden: false,
    ...overrides,
  };
}

const THREE = [pair('p1'), pair('p2'), pair('p3')];

describe('pickPair', () => {
  it('bốc được một cặp từ kho', () => {
    const picked = pickPair({
      pairs: THREE,
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: [],
      rng: createSeededRng(1),
    });

    expect(['p1', 'p2', 'p3']).toContain(picked.pairId);
    expect([picked.civilianWord, picked.spyWord].sort()).toEqual(
      [`${picked.pairId}-a`, `${picked.pairId}-b`].sort(),
    );
  });

  it('bỏ qua cặp đã ẩn', () => {
    const picked = pickPair({
      pairs: [pair('p1', { hidden: true }), pair('p2')],
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: [],
      rng: createSeededRng(1),
    });

    expect(picked.pairId).toBe('p2');
  });

  it('lọc theo chủ đề', () => {
    const picked = pickPair({
      pairs: [pair('p1'), pair('p2', { topic: 'Thể thao' })],
      topics: ['Thể thao'],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: [],
      rng: createSeededRng(1),
    });

    expect(picked.pairId).toBe('p2');
  });

  it('danh sách chủ đề rỗng nghĩa là lấy tất cả', () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      ids.add(
        pickPair({
          pairs: [pair('p1'), pair('p2', { topic: 'Thể thao' })],
          topics: [],
          difficulties: ['EASY', 'MEDIUM', 'HARD'],
          usedPairIds: [],
          rng: createSeededRng(seed),
        }).pairId,
      );
    }

    expect(ids).toEqual(new Set(['p1', 'p2']));
  });

  it('lọc theo độ khó', () => {
    const picked = pickPair({
      pairs: [pair('p1'), pair('p2', { difficulty: 'HARD' })],
      topics: [],
      difficulties: ['HARD'],
      usedPairIds: [],
      rng: createSeededRng(1),
    });

    expect(picked.pairId).toBe('p2');
  });

  it('ưu tiên cặp chưa dùng', () => {
    const picked = pickPair({
      pairs: THREE,
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: ['p1', 'p2'],
      rng: createSeededRng(1),
    });

    expect(picked.pairId).toBe('p3');
  });

  it('ghi cặp vừa bốc vào lịch sử', () => {
    const picked = pickPair({
      pairs: THREE,
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: ['p1'],
      rng: createSeededRng(1),
    });

    expect(picked.usedPairIds).toContain('p1');
    expect(picked.usedPairIds).toContain(picked.pairId);
  });

  it('dùng hết kho thì xoá lịch sử và bắt đầu vòng mới', () => {
    const picked = pickPair({
      pairs: THREE,
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: ['p1', 'p2', 'p3'],
      rng: createSeededRng(1),
    });

    expect(['p1', 'p2', 'p3']).toContain(picked.pairId);
    // Lịch sử được làm mới, chỉ còn đúng cặp vừa bốc.
    expect(picked.usedPairIds).toEqual([picked.pairId]);
  });

  it('lịch sử chỉ giữ cặp còn hợp lệ, không phình vô hạn', () => {
    const picked = pickPair({
      pairs: THREE,
      topics: [],
      difficulties: ['EASY', 'MEDIUM', 'HARD'],
      usedPairIds: ['p1', 'da-999-khong-con-ton-tai'],
      rng: createSeededRng(1),
    });

    expect(picked.usedPairIds).not.toContain('da-999-khong-con-ton-tai');
  });

  it('quét hết kho thì mỗi cặp ra đúng một lần trước khi lặp lại', () => {
    let used: string[] = [];
    const seen: string[] = [];

    for (let round = 0; round < 3; round++) {
      const picked = pickPair({
        pairs: THREE,
        topics: [],
        difficulties: ['EASY', 'MEDIUM', 'HARD'],
        usedPairIds: used,
        rng: createSeededRng(round + 1),
      });
      seen.push(picked.pairId);
      used = picked.usedPairIds;
    }

    expect([...seen].sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('hoán đổi vai hai từ giữa các ván', () => {
    const civilianWords = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      civilianWords.add(
        pickPair({
          pairs: [pair('p1')],
          topics: [],
          difficulties: ['EASY', 'MEDIUM', 'HARD'],
          usedPairIds: [],
          rng: createSeededRng(seed),
        }).civilianWord,
      );
    }

    expect(civilianWords).toEqual(new Set(['p1-a', 'p1-b']));
  });

  it('báo lỗi rõ ràng khi bộ lọc không còn cặp nào', () => {
    expect(() =>
      pickPair({
        pairs: THREE,
        topics: ['Giao thông'],
        difficulties: ['EASY', 'MEDIUM', 'HARD'],
        usedPairIds: [],
        rng: createSeededRng(1),
      }),
    ).toThrow(/không còn cặp từ nào/);
  });

  it('báo lỗi khi kho rỗng hoàn toàn', () => {
    expect(() =>
      pickPair({
        pairs: [],
        topics: [],
        difficulties: ['EASY', 'MEDIUM', 'HARD'],
        usedPairIds: [],
        rng: createSeededRng(1),
      }),
    ).toThrow(/không còn cặp từ nào/);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./pair-picker`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/data/pair-picker.ts`:

```ts
import { Difficulty, WordPair } from '../core/models';
import { Rng, pickIndex } from '../core/engine/rng';

export interface PickPairInput {
  pairs: readonly WordPair[];
  /** Rỗng nghĩa là lấy tất cả chủ đề. */
  topics: readonly string[];
  difficulties: readonly Difficulty[];
  usedPairIds: readonly string[];
  rng: Rng;
}

export interface PickedPair {
  pairId: string;
  civilianWord: string;
  spyWord: string;
  /** Lịch sử đã cập nhật, để nơi gọi ghi lại xuống máy. */
  usedPairIds: string[];
}

function isEligible(
  pair: WordPair,
  topics: readonly string[],
  difficulties: readonly Difficulty[],
): boolean {
  if (pair.hidden) return false;
  if (topics.length > 0 && !topics.includes(pair.topic)) return false;
  return difficulties.includes(pair.difficulty);
}

/**
 * Bốc một cặp từ theo mục 7 của đặc tả.
 *
 * Ba việc, theo đúng thứ tự này:
 * 1. Lọc theo chủ đề và độ khó, bỏ cặp đã ẩn.
 * 2. Ưu tiên cặp chưa dùng. Hết cặp chưa dùng thì xoá lịch sử và bắt đầu
 *    vòng mới, thay vì báo lỗi — người chơi không có lỗi gì ở đây.
 * 3. Tung đồng xu quyết định từ nào làm từ của dân làng. Nhờ vậy chơi lâu
 *    không đoán được vai qua thói quen của app.
 */
export function pickPair(input: PickPairInput): PickedPair {
  const eligible = input.pairs.filter((pair) =>
    isEligible(pair, input.topics, input.difficulties),
  );

  if (eligible.length === 0) {
    throw new Error(
      'pickPair: không còn cặp từ nào hợp lệ với bộ lọc hiện tại. ' +
        'Hãy bật thêm chủ đề hoặc thêm mức độ khó.',
    );
  }

  const eligibleIds = new Set(eligible.map((pair) => pair.id));

  // Chỉ giữ lịch sử của những cặp còn hợp lệ. Cặp bị xoá hoặc bị lọc ra
  // không được phép chiếm chỗ trong lịch sử, nếu không danh sách sẽ phình
  // mãi và điều kiện "đã dùng hết" không bao giờ đúng.
  const relevantHistory = input.usedPairIds.filter((id) => eligibleIds.has(id));
  const used = new Set(relevantHistory);

  const fresh = eligible.filter((pair) => !used.has(pair.id));
  const startingNewCycle = fresh.length === 0;
  const candidates = startingNewCycle ? eligible : fresh;

  const chosen = candidates[pickIndex(input.rng, candidates.length)];
  const civilianFirst = input.rng() < 0.5;

  return {
    pairId: chosen.id,
    civilianWord: civilianFirst ? chosen.wordA : chosen.wordB,
    spyWord: civilianFirst ? chosen.wordB : chosen.wordA,
    usedPairIds: startingNewCycle ? [chosen.id] : [...relevantHistory, chosen.id],
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, tổng 184 + 13 = 197.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/pair-picker.ts src/app/data/pair-picker.spec.ts
git commit -m "feat: them boc cap tu chong lap va hoan doi ngau nhien"
```

---

## Task 9: Repository người chơi và cài đặt

Hai repository đơn giản nhất, làm cùng lúc để lộ ra khuôn mẫu chung.

**Files:**
- Create: `src/app/data/repositories/players.repository.ts`
- Create: `src/app/data/repositories/settings.repository.ts`
- Test: `src/app/data/repositories/players.repository.spec.ts`
- Test: `src/app/data/repositories/settings.repository.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/data/repositories/players.repository.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from '../storage/memory-storage';
import { PlayersRepository } from './players.repository';

describe('PlayersRepository', () => {
  let storage: MemoryStorage;
  let repository: PlayersRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new PlayersRepository(storage);
  });

  it('lần đầu chạy thì danh sách rỗng', async () => {
    expect(await repository.load()).toEqual([]);
  });

  it('lưu rồi đọc lại đúng danh sách', async () => {
    await repository.save(['Minh', 'Hùng', 'Lan']);

    expect(await repository.load()).toEqual(['Minh', 'Hùng', 'Lan']);
  });

  it('giữ nguyên dấu tiếng Việt', async () => {
    await repository.save(['Nguyễn Đức Mạnh', 'Đỗ Thị Hường']);

    expect(await repository.load()).toEqual(['Nguyễn Đức Mạnh', 'Đỗ Thị Hường']);
  });

  it('dữ liệu hỏng thì trả về danh sách rỗng', async () => {
    await storage.set('players', 'khong-phai-json');

    expect(await repository.load()).toEqual([]);
  });

  it('mảng chứa thứ không phải chuỗi cũng bị coi là hỏng', async () => {
    await storage.set('players', '["Minh", 42]');

    expect(await repository.load()).toEqual([]);
  });

  it('xoá thì về lại rỗng', async () => {
    await repository.save(['Minh']);
    await repository.clear();

    expect(await repository.load()).toEqual([]);
  });
});
```

Tạo `src/app/data/repositories/settings.repository.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_RULES } from '../../core/models';
import { MemoryStorage } from '../storage/memory-storage';
import { SettingsRepository } from './settings.repository';

describe('SettingsRepository', () => {
  let storage: MemoryStorage;
  let repository: SettingsRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new SettingsRepository(storage);
  });

  it('mặc định khớp với đặc tả', async () => {
    const settings = await repository.load();

    expect(settings.scoreRules).toEqual(DEFAULT_SCORE_RULES);
    expect(settings.soundLevel).toBe('FULL');
    expect(settings.speechRate).toBe(1);
    expect(settings.timerSeconds).toBe(30);
    expect(settings.minRoundsBeforeVote).toBe(3);
    expect(settings.lastRevealSpyToSpy).toBe(false);
  });

  it('lưu rồi đọc lại đúng giá trị', async () => {
    await repository.save({
      scoreRules: { civilianWin: 2, spyWin: 3, whiteWin: 5 },
      soundLevel: 'SFX_ONLY',
      speechRate: 1.4,
      timerSeconds: null,
      minRoundsBeforeVote: 2,
      lastRevealSpyToSpy: true,
    });

    const settings = await repository.load();
    expect(settings.scoreRules.spyWin).toBe(3);
    expect(settings.soundLevel).toBe('SFX_ONLY');
    expect(settings.timerSeconds).toBeNull();
    expect(settings.lastRevealSpyToSpy).toBe(true);
  });

  it('dữ liệu hỏng thì rơi về mặc định thay vì làm sập app', async () => {
    await storage.set('settings', '{"soundLevel":');

    expect((await repository.load()).soundLevel).toBe('FULL');
  });

  it('mức âm thanh lạ thì coi như hỏng', async () => {
    await storage.set(
      'settings',
      JSON.stringify({
        scoreRules: DEFAULT_SCORE_RULES,
        soundLevel: 'RAT_TO',
        speechRate: 1,
        timerSeconds: 30,
        minRoundsBeforeVote: 3,
        lastRevealSpyToSpy: false,
      }),
    );

    expect((await repository.load()).soundLevel).toBe('FULL');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được hai module repository.

- [ ] **Step 3: Cài đặt repository người chơi**

Tạo `src/app/data/repositories/players.repository.ts`:

```ts
import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';

function isNameList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Danh sách tên người chơi hay dùng, để lần sau khỏi gõ lại.
 * Chỉ lưu tên: id người chơi được sinh mới ở mỗi ván.
 */
export class PlayersRepository {
  private readonly store: JsonStore<string[]>;

  constructor(storage: StoragePort) {
    this.store = new JsonStore(storage, 'players', isNameList, () => []);
  }

  load(): Promise<string[]> {
    return this.store.read();
  }

  save(names: string[]): Promise<void> {
    return this.store.write(names);
  }

  clear(): Promise<void> {
    return this.store.clear();
  }
}
```

- [ ] **Step 4: Cài đặt repository cài đặt**

Tạo `src/app/data/repositories/settings.repository.ts`:

```ts
import { DEFAULT_SCORE_RULES, ScoreRules } from '../../core/models';
import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';

export type SoundLevel = 'OFF' | 'SFX_ONLY' | 'FULL';

const SOUND_LEVELS: readonly SoundLevel[] = ['OFF', 'SFX_ONLY', 'FULL'];

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
}

export function defaultSettings(): AppSettings {
  return {
    scoreRules: { ...DEFAULT_SCORE_RULES },
    soundLevel: 'FULL',
    speechRate: 1,
    timerSeconds: 30,
    minRoundsBeforeVote: 3,
    lastRevealSpyToSpy: false,
  };
}

function isScoreRules(value: unknown): value is ScoreRules {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['civilianWin'] === 'number' &&
    typeof candidate['spyWin'] === 'number' &&
    typeof candidate['whiteWin'] === 'number'
  );
}

function isAppSettings(value: unknown): value is AppSettings {
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
    typeof candidate['lastRevealSpyToSpy'] === 'boolean'
  );
}

export class SettingsRepository {
  private readonly store: JsonStore<AppSettings>;

  constructor(storage: StoragePort) {
    this.store = new JsonStore(storage, 'settings', isAppSettings, defaultSettings);
  }

  load(): Promise<AppSettings> {
    return this.store.read();
  }

  save(settings: AppSettings): Promise<void> {
    return this.store.write(settings);
  }
}
```

- [ ] **Step 5: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, tổng 197 + 10 = 207.

- [ ] **Step 6: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/repositories
git commit -m "feat: them repository nguoi choi va cai dat"
```

---

## Task 10: Repository kho từ

Ba mẩu dữ liệu liên quan tới kho từ: cặp người dùng tự thêm, id các cặp gốc bị ẩn, và lịch sử cặp đã dùng. Gộp vào một repository vì chúng luôn được đọc cùng nhau khi dựng danh sách cặp khả dụng.

**Files:**
- Create: `src/app/data/repositories/word-bank.repository.ts`
- Test: `src/app/data/repositories/word-bank.repository.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/data/repositories/word-bank.repository.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { WordPair } from '../../core/models';
import { PACKAGED_PAIRS } from '../word-bank';
import { MemoryStorage } from '../storage/memory-storage';
import { WordBankRepository } from './word-bank.repository';

function customPair(id: string, wordA: string, wordB: string): WordPair {
  return {
    id,
    wordA,
    wordB,
    topic: 'Động vật',
    difficulty: 'EASY',
    isCustom: true,
    hidden: false,
  };
}

describe('WordBankRepository', () => {
  let storage: MemoryStorage;
  let repository: WordBankRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new WordBankRepository(storage);
  });

  it('lần đầu chạy thì danh sách khả dụng đúng bằng kho đóng gói', async () => {
    const available = await repository.loadAvailablePairs();

    expect(available).toHaveLength(PACKAGED_PAIRS.length);
    expect(available.every((pair) => !pair.isCustom)).toBe(true);
    expect(available.every((pair) => !pair.hidden)).toBe(true);
  });

  it('cặp tự thêm xuất hiện trong danh sách khả dụng', async () => {
    await repository.addCustomPair(customPair('tu-1', 'xe tăng', 'máy bay ném bom'));

    const available = await repository.loadAvailablePairs();
    expect(available.some((pair) => pair.id === 'tu-1')).toBe(true);
    expect(available).toHaveLength(PACKAGED_PAIRS.length + 1);
  });

  it('từ chối cặp tự thêm có hai từ quá giống nhau', async () => {
    await expect(
      repository.addCustomPair(customPair('tu-2', 'con bò', 'con bó')),
    ).rejects.toThrow(/quá giống nhau/);

    expect(await repository.loadCustomPairs()).toEqual([]);
  });

  it('từ chối cặp tự thêm trùng id với cặp đã có', async () => {
    await repository.addCustomPair(customPair('tu-3', 'cái ô', 'áo mưa'));

    await expect(
      repository.addCustomPair(customPair('tu-3', 'con dao', 'cái kéo')),
    ).rejects.toThrow(/đã tồn tại/);
  });

  it('xoá được cặp tự thêm', async () => {
    await repository.addCustomPair(customPair('tu-4', 'cái ô', 'áo mưa'));
    await repository.removeCustomPair('tu-4');

    expect(await repository.loadCustomPairs()).toEqual([]);
  });

  it('ẩn cặp gốc thì nó biến khỏi danh sách khả dụng', async () => {
    const target = PACKAGED_PAIRS[0].id;
    await repository.hidePair(target);

    const available = await repository.loadAvailablePairs();
    expect(available.some((pair) => pair.id === target)).toBe(false);
    expect(available).toHaveLength(PACKAGED_PAIRS.length - 1);
  });

  it('hiện lại cặp gốc đã ẩn', async () => {
    const target = PACKAGED_PAIRS[0].id;
    await repository.hidePair(target);
    await repository.unhidePair(target);

    const available = await repository.loadAvailablePairs();
    expect(available.some((pair) => pair.id === target)).toBe(true);
  });

  it('ẩn cùng một cặp hai lần không tạo bản ghi trùng', async () => {
    const target = PACKAGED_PAIRS[0].id;
    await repository.hidePair(target);
    await repository.hidePair(target);

    expect(await repository.loadHiddenIds()).toEqual([target]);
  });

  it('lưu và đọc lại lịch sử cặp đã dùng', async () => {
    await repository.saveUsedPairIds(['a', 'b']);

    expect(await repository.loadUsedPairIds()).toEqual(['a', 'b']);
  });

  it('lịch sử hỏng thì coi như chưa dùng cặp nào', async () => {
    await storage.set('usedPairIds', '{"khong":"phai-mang"}');

    expect(await repository.loadUsedPairIds()).toEqual([]);
  });

  it('danh sách cặp tự thêm hỏng thì bỏ qua, kho gốc vẫn dùng được', async () => {
    await storage.set('customPairs', 'hong');

    const available = await repository.loadAvailablePairs();
    expect(available).toHaveLength(PACKAGED_PAIRS.length);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./word-bank.repository`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/data/repositories/word-bank.repository.ts`:

```ts
import { describePairProblem } from '../../core/engine/pair-distance';
import { WordPair } from '../../core/models';
import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';
import { PACKAGED_PAIRS, toWordPair } from '../word-bank';

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isWordPair(value: unknown): value is WordPair {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['id'] === 'string' &&
    typeof candidate['wordA'] === 'string' &&
    typeof candidate['wordB'] === 'string' &&
    typeof candidate['topic'] === 'string' &&
    typeof candidate['difficulty'] === 'string' &&
    typeof candidate['isCustom'] === 'boolean' &&
    typeof candidate['hidden'] === 'boolean'
  );
}

function isWordPairList(value: unknown): value is WordPair[] {
  return Array.isArray(value) && value.every(isWordPair);
}

/**
 * Gom ba mẩu dữ liệu quanh kho từ: cặp người dùng tự thêm, id các cặp gốc bị
 * ẩn, và lịch sử cặp đã dùng. Chúng luôn được đọc cùng nhau khi dựng danh
 * sách cặp khả dụng, nên để chung một chỗ.
 *
 * Cặp gốc chỉ được ẩn chứ không xoá, để người dùng lỡ tay còn hiện lại được.
 * Cặp tự thêm thì xoá thật.
 */
export class WordBankRepository {
  private readonly customPairs: JsonStore<WordPair[]>;
  private readonly hiddenIds: JsonStore<string[]>;
  private readonly usedPairIds: JsonStore<string[]>;

  constructor(storage: StoragePort) {
    this.customPairs = new JsonStore(storage, 'customPairs', isWordPairList, () => []);
    this.hiddenIds = new JsonStore(storage, 'hiddenPairIds', isStringList, () => []);
    this.usedPairIds = new JsonStore(storage, 'usedPairIds', isStringList, () => []);
  }

  loadCustomPairs(): Promise<WordPair[]> {
    return this.customPairs.read();
  }

  loadHiddenIds(): Promise<string[]> {
    return this.hiddenIds.read();
  }

  loadUsedPairIds(): Promise<string[]> {
    return this.usedPairIds.read();
  }

  saveUsedPairIds(ids: string[]): Promise<void> {
    return this.usedPairIds.write(ids);
  }

  /** Kho gốc cộng cặp tự thêm, đã bỏ đi những cặp bị ẩn. */
  async loadAvailablePairs(): Promise<WordPair[]> {
    const [custom, hidden] = await Promise.all([
      this.loadCustomPairs(),
      this.loadHiddenIds(),
    ]);

    const hiddenSet = new Set(hidden);
    return [...PACKAGED_PAIRS.map(toWordPair), ...custom].filter(
      (pair) => !hiddenSet.has(pair.id),
    );
  }

  async addCustomPair(pair: WordPair): Promise<void> {
    const problem = describePairProblem(pair.wordA, pair.wordB);
    if (problem !== null) throw new Error(problem);

    const existing = await this.loadCustomPairs();
    const takenByPackaged = PACKAGED_PAIRS.some((item) => item.id === pair.id);
    if (takenByPackaged || existing.some((item) => item.id === pair.id)) {
      throw new Error(`Cặp từ có mã "${pair.id}" đã tồn tại.`);
    }

    await this.customPairs.write([...existing, { ...pair, isCustom: true }]);
  }

  async removeCustomPair(id: string): Promise<void> {
    const existing = await this.loadCustomPairs();
    await this.customPairs.write(existing.filter((pair) => pair.id !== id));
  }

  async hidePair(id: string): Promise<void> {
    const hidden = await this.loadHiddenIds();
    if (hidden.includes(id)) return;
    await this.hiddenIds.write([...hidden, id]);
  }

  async unhidePair(id: string): Promise<void> {
    const hidden = await this.loadHiddenIds();
    await this.hiddenIds.write(hidden.filter((item) => item !== id));
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, tổng 207 + 12 = 219.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/repositories/word-bank.repository.ts src/app/data/repositories/word-bank.repository.spec.ts
git commit -m "feat: them repository kho tu"
```

---

## Task 11: Repository bảng điểm và ván đang dở

**Files:**
- Create: `src/app/data/repositories/scoreboard.repository.ts`
- Create: `src/app/data/repositories/active-game.repository.ts`
- Test: `src/app/data/repositories/scoreboard.repository.spec.ts`
- Test: `src/app/data/repositories/active-game.repository.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/data/repositories/scoreboard.repository.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from '../storage/memory-storage';
import { ScoreboardRepository } from './scoreboard.repository';

describe('ScoreboardRepository', () => {
  let storage: MemoryStorage;
  let repository: ScoreboardRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new ScoreboardRepository(storage);
  });

  it('lần đầu chạy thì bảng điểm rỗng', async () => {
    const board = await repository.load();

    expect(board.totals).toEqual({});
    expect(board.history).toEqual([]);
  });

  it('cộng điểm cho người mới', async () => {
    await repository.recordGame({
      villageName: 'Ác Quỷ',
      playedAt: '2026-09-08T10:00:00.000Z',
      outcome: 'CIVILIANS',
      points: { Minh: 1, Hùng: 0 },
    });

    const board = await repository.load();
    expect(board.totals).toEqual({ Minh: 1, Hùng: 0 });
    expect(board.history).toHaveLength(1);
    expect(board.history[0].villageName).toBe('Ác Quỷ');
  });

  it('cộng dồn qua nhiều ván', async () => {
    await repository.recordGame({
      villageName: 'Ác Quỷ',
      playedAt: '2026-09-08T10:00:00.000Z',
      outcome: 'CIVILIANS',
      points: { Minh: 1 },
    });
    await repository.recordGame({
      villageName: 'Vô Tội',
      playedAt: '2026-09-08T11:00:00.000Z',
      outcome: 'SPIES',
      points: { Minh: 2 },
    });

    const board = await repository.load();
    expect(board.totals['Minh']).toBe(3);
    expect(board.history).toHaveLength(2);
  });

  it('xoá sạch bảng điểm', async () => {
    await repository.recordGame({
      villageName: 'Ác Quỷ',
      playedAt: '2026-09-08T10:00:00.000Z',
      outcome: 'CIVILIANS',
      points: { Minh: 1 },
    });
    await repository.clear();

    const board = await repository.load();
    expect(board.totals).toEqual({});
    expect(board.history).toEqual([]);
  });

  it('dữ liệu hỏng thì bắt đầu lại từ bảng rỗng', async () => {
    await storage.set('scoreboard', '[1,2,3]');

    expect((await repository.load()).totals).toEqual({});
  });
});
```

Tạo `src/app/data/repositories/active-game.repository.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { makeState } from '../../core/engine/testing/make-state';
import { MemoryStorage } from '../storage/memory-storage';
import { ActiveGameRepository } from './active-game.repository';

describe('ActiveGameRepository', () => {
  let storage: MemoryStorage;
  let repository: ActiveGameRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new ActiveGameRepository(storage);
  });

  it('chưa có ván nào thì trả về null', async () => {
    expect(await repository.load()).toBeNull();
  });

  it('lưu rồi khôi phục lại được nguyên vẹn', async () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 1, 3],
      round: 4,
      villageName: 'Ác Quỷ',
    });

    await repository.save(state);
    const restored = await repository.load();

    expect(restored).toEqual(state);
  });

  it('ván đã kết thúc thì không được coi là ván đang dở', async () => {
    const state = {
      ...makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'SPY'] }),
      phase: 'ENDED' as const,
      outcome: 'CIVILIANS' as const,
    };

    await repository.save(state);

    expect(await repository.load()).toBeNull();
  });

  it('xoá thì không còn ván đang dở', async () => {
    await repository.save(makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'SPY'] }));
    await repository.clear();

    expect(await repository.load()).toBeNull();
  });

  it('state ghi dở dang thì bỏ qua, không làm sập app', async () => {
    await storage.set('activeGame', '{"id":"g1","phase":');

    expect(await repository.load()).toBeNull();
  });

  it('state thiếu trường bắt buộc cũng bị bỏ qua', async () => {
    await storage.set('activeGame', '{"id":"g1"}');

    expect(await repository.load()).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được hai module repository.

- [ ] **Step 3: Cài đặt repository bảng điểm**

Tạo `src/app/data/repositories/scoreboard.repository.ts`:

```ts
import { Outcome } from '../../core/models';
import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';

export interface GameRecord {
  villageName: string;
  /** Chuỗi ISO. Truyền vào từ ngoài để tầng này vẫn thuần. */
  playedAt: string;
  outcome: Outcome;
  /** Điểm cộng của ván này, khoá là tên người chơi. */
  points: Record<string, number>;
}

export interface Scoreboard {
  /** Điểm tích luỹ, khoá là tên người chơi. */
  totals: Record<string, number>;
  history: GameRecord[];
}

function emptyScoreboard(): Scoreboard {
  return { totals: {}, history: [] };
}

function isScoreboard(value: unknown): value is Scoreboard {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;

  const totals = candidate['totals'];
  const history = candidate['history'];

  if (typeof totals !== 'object' || totals === null || Array.isArray(totals)) return false;
  if (!Object.values(totals).every((point) => typeof point === 'number')) return false;

  return Array.isArray(history);
}

/**
 * Điểm được khoá theo TÊN người chơi chứ không phải id, vì id chỉ sống trong
 * một ván còn bảng điểm phải cộng dồn qua nhiều ván. Hệ quả: đổi tên là mất
 * điểm cũ, chấp nhận được cho một app chơi tại chỗ.
 */
export class ScoreboardRepository {
  private readonly store: JsonStore<Scoreboard>;

  constructor(storage: StoragePort) {
    this.store = new JsonStore(storage, 'scoreboard', isScoreboard, emptyScoreboard);
  }

  load(): Promise<Scoreboard> {
    return this.store.read();
  }

  async recordGame(record: GameRecord): Promise<void> {
    const board = await this.load();

    const totals = { ...board.totals };
    for (const [name, points] of Object.entries(record.points)) {
      totals[name] = (totals[name] ?? 0) + points;
    }

    await this.store.write({ totals, history: [...board.history, record] });
  }

  clear(): Promise<void> {
    return this.store.clear();
  }
}
```

- [ ] **Step 4: Cài đặt repository ván đang dở**

Tạo `src/app/data/repositories/active-game.repository.ts`:

```ts
import { GameState } from '../../core/models';
import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';

function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate['id'] === 'string' &&
    typeof candidate['villageName'] === 'string' &&
    typeof candidate['civilianWord'] === 'string' &&
    typeof candidate['spyWord'] === 'string' &&
    typeof candidate['phase'] === 'string' &&
    typeof candidate['round'] === 'number' &&
    typeof candidate['dealtCount'] === 'number' &&
    Array.isArray(candidate['players']) &&
    Array.isArray(candidate['aliveIds']) &&
    Array.isArray(candidate['speakingOrder']) &&
    Array.isArray(candidate['eliminations']) &&
    typeof candidate['assignments'] === 'object' &&
    candidate['assignments'] !== null
  );
}

/**
 * Ván đang dở, để mở lại app còn chơi tiếp.
 *
 * `load` trả về null cho cả ba trường hợp: chưa từng lưu, dữ liệu hỏng, và
 * ván đã kết thúc. Người gọi chỉ cần hỏi một câu "có ván nào để tiếp không".
 */
export class ActiveGameRepository {
  private readonly store: JsonStore<GameState | null>;

  constructor(storage: StoragePort) {
    this.store = new JsonStore<GameState | null>(
      storage,
      'activeGame',
      (value): value is GameState | null => value === null || isGameState(value),
      () => null,
    );
  }

  async load(): Promise<GameState | null> {
    const state = await this.store.read();
    if (state === null) return null;
    return state.phase === 'ENDED' ? null : state;
  }

  save(state: GameState): Promise<void> {
    return this.store.write(state);
  }

  clear(): Promise<void> {
    return this.store.clear();
  }
}
```

- [ ] **Step 5: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, tổng 219 + 11 = 230.

- [ ] **Step 6: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/repositories/scoreboard.repository.ts src/app/data/repositories/scoreboard.repository.spec.ts src/app/data/repositories/active-game.repository.ts src/app/data/repositories/active-game.repository.spec.ts
git commit -m "feat: them repository bang diem va van dang do"
```

---

## Task 12: Ghép lại — bắt đầu một ván mới

Bước cuối nối kho từ với engine. Sau task này, gọi một hàm là ra một `GameState` hoàn chỉnh với cặp từ thật.

**Files:**
- Create: `src/app/data/start-new-game.ts`
- Test: `src/app/data/start-new-game.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/data/start-new-game.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../core/models';
import { createSeededRng } from '../core/engine/rng';
import { WordBankRepository } from './repositories/word-bank.repository';
import { startNewGame } from './start-new-game';
import { MemoryStorage } from './storage/memory-storage';

describe('startNewGame', () => {
  let storage: MemoryStorage;
  let wordBank: WordBankRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    wordBank = new WordBankRepository(storage);
  });

  const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

  it('dựng được một ván đầy đủ với cặp từ thật', async () => {
    const { result } = await startNewGame({
      wordBank,
      gameId: 'g1',
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      rng: createSeededRng(1),
    });

    expect(result.state.phase).toBe('DEALING');
    expect(result.state.players).toHaveLength(4);
    expect(result.state.civilianWord.length).toBeGreaterThan(0);
    expect(result.state.spyWord.length).toBeGreaterThan(0);
    expect(result.state.civilianWord).not.toBe(result.state.spyWord);
    expect(result.state.villageName).toBe('Ác Quỷ');
  });

  it('sinh id người chơi duy nhất và giữ nguyên tên', async () => {
    const { result } = await startNewGame({
      wordBank,
      gameId: 'g1',
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      rng: createSeededRng(1),
    });

    const ids = result.state.players.map((player) => player.id);
    expect(new Set(ids).size).toBe(4);
    expect(result.state.players.map((player) => player.name)).toEqual(NAMES);
  });

  it('khử trùng tên bằng hậu tố', async () => {
    const { result } = await startNewGame({
      wordBank,
      gameId: 'g1',
      villageName: '',
      playerNames: ['Minh', 'Minh', 'Lan', 'Minh'],
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      rng: createSeededRng(1),
    });

    expect(result.state.players.map((player) => player.name)).toEqual([
      'Minh',
      'Minh 2',
      'Lan',
      'Minh 3',
    ]);
  });

  it('ghi lại lịch sử cặp đã dùng để ván sau không lặp', async () => {
    const first = await startNewGame({
      wordBank,
      gameId: 'g1',
      villageName: '',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
      rng: createSeededRng(1),
    });

    expect(await wordBank.loadUsedPairIds()).toEqual([first.result.state.pairId]);
  });

  it('hai ván liên tiếp không dùng lại cùng một cặp', async () => {
    const seen = new Set<string>();

    for (let round = 0; round < 5; round++) {
      const { result } = await startNewGame({
        wordBank,
        gameId: `g${round}`,
        villageName: '',
        playerNames: NAMES,
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
        rng: createSeededRng(round + 1),
      });
      expect(seen.has(result.state.pairId)).toBe(false);
      seen.add(result.state.pairId);
    }
  });

  it('đội hình không hợp lệ thì báo lỗi và KHÔNG ghi lịch sử cặp từ', async () => {
    await expect(
      startNewGame({
        wordBank,
        gameId: 'g1',
        villageName: '',
        playerNames: ['Minh', 'Hùng', 'Lan'],
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1 },
        rng: createSeededRng(1),
      }),
    ).rejects.toThrow(/ít nhất 4 người/);

    expect(await wordBank.loadUsedPairIds()).toEqual([]);
  });

  it('bộ lọc không còn cặp nào thì báo lỗi rõ ràng', async () => {
    await expect(
      startNewGame({
        wordBank,
        gameId: 'g1',
        villageName: '',
        playerNames: NAMES,
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, topics: ['Không Có Thật'] },
        rng: createSeededRng(1),
      }),
    ).rejects.toThrow(/không còn cặp từ nào/);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./start-new-game`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/data/start-new-game.ts`:

```ts
import { EngineResult, createGame } from '../core/engine/game-engine';
import { Rng } from '../core/engine/rng';
import { GameConfig, Player } from '../core/models';
import { pickPair } from './pair-picker';
import { WordBankRepository } from './repositories/word-bank.repository';

export interface StartNewGameInput {
  wordBank: WordBankRepository;
  gameId: string;
  villageName: string;
  playerNames: string[];
  config: GameConfig;
  rng: Rng;
}

/**
 * Tên trùng nhau được thêm hậu tố: Minh, Minh 2, Minh 3. Cần thiết vì bảng
 * điểm khoá theo tên, và vì màn chia bài gọi tên từng người khi chuyền máy —
 * hai người cùng tên thì không biết máy đang tới lượt ai.
 */
function dedupeNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();

  return names.map((name) => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name} ${count}`;
  });
}

/**
 * Chọn cặp từ rồi dựng ván.
 *
 * Thứ tự quan trọng: đội hình được engine kiểm TRƯỚC khi lịch sử cặp từ được
 * ghi xuống máy. Nếu ghi trước rồi mới phát hiện đội hình sai, cặp từ đó coi
 * như bị đốt oan mà ván lại không diễn ra.
 */
export async function startNewGame(
  input: StartNewGameInput,
): Promise<{ result: EngineResult }> {
  const [pairs, usedPairIds] = await Promise.all([
    input.wordBank.loadAvailablePairs(),
    input.wordBank.loadUsedPairIds(),
  ]);

  const picked = pickPair({
    pairs,
    topics: input.config.topics,
    difficulties: input.config.difficulties,
    usedPairIds,
    rng: input.rng,
  });

  const players: Player[] = dedupeNames(input.playerNames).map((name, index) => ({
    id: `p${index}`,
    name,
  }));

  const result = createGame({
    gameId: input.gameId,
    villageName: input.villageName,
    players,
    config: input.config,
    pair: {
      id: picked.pairId,
      civilianWord: picked.civilianWord,
      spyWord: picked.spyWord,
    },
    rng: input.rng,
  });

  await input.wordBank.saveUsedPairIds(picked.usedPairIds);

  return { result };
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS, tổng 230 + 7 = 237.

- [ ] **Step 5: Kiểm tra build**

```bash
cd /c/SRC/ai-la-gian-diep
npx ng build
```

Expected: build thành công.

- [ ] **Step 6: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/start-new-game.ts src/app/data/start-new-game.spec.ts
git commit -m "feat: ghep kho tu voi engine de bat dau van moi"
```

---

## Kiểm chứng cuối bằng phép thử đột biến

Như kế hoạch trước, một bộ test toàn xanh chứng minh **một trong hai** điều: code đúng, hoặc test không đủ sức bắt lỗi. Sau khi mọi task xong, cố tình gây ba lỗi rồi kiểm tra xem test có đỏ:

| Đột biến | Cách gây | Phải bị bắt bởi |
|---|---|---|
| Mất khả năng chịu dữ liệu hỏng | Bỏ khối `try/catch` quanh `JSON.parse` trong `json-store.ts` | Các test "dữ liệu hỏng thì rơi về mặc định" |
| Mất chống lặp cặp từ | Trong `pair-picker.ts`, đổi `const candidates = startingNewCycle ? eligible : fresh;` thành `const candidates = eligible;` | Test "ưu tiên cặp chưa dùng" và "quét hết kho thì mỗi cặp ra đúng một lần" |
| Mất kiểm khoảng cách cặp từ | Trong `pair-distance.ts`, đổi `> threshold` thành `>= 0` | Test kiểm toàn kho và test "từ chối cặp tự thêm có hai từ quá giống nhau" |

Hoàn nguyên bằng `git checkout -- <file>` sau mỗi lần thử.

## Xong bản kế hoạch này thì có gì

- Kho ít nhất 160 cặp từ tiếng Việt trên tám chủ đề, mọi cặp đã được máy kiểm là đủ xa nhau để hàm chấm phân biệt được.
- Bốc cặp từ có chống lặp và hoán đổi ngẫu nhiên vai hai từ.
- Toàn bộ tầng lưu trữ, chịu được dữ liệu hỏng mà không làm sập app.
- Một hàm duy nhất `startNewGame` cho ra `GameState` hoàn chỉnh, sẵn sàng để giao diện gọi.

## Bản kế hoạch tiếp theo

Bản số 3 dựng giao diện chơi được trọn một ván: trang chủ, lập danh sách, cấu hình, chia bài chuyền tay, vòng nói, vote, lộ danh tính, đoán từ, kết ván. Màn chia bài là khó nhất — nhấn giữ để xem, thả ra che ngay, chặn nút back, và dòng vai phải nằm trong khung rộng cố định để bề rộng chữ không làm lộ vai.
