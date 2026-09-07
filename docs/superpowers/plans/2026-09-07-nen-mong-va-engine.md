# Nền móng dự án và Engine luật chơi — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng workspace Angular cho app "Ai Là Gián Điệp" và cài đặt trọn vẹn engine luật chơi dưới dạng TypeScript thuần, có bộ test chứng minh mọi luật ở mục 3 của đặc tả là đúng.

**Architecture:** Engine là một máy trạng thái thuần: mỗi hành động nhận `GameState` hiện tại và trả về `GameState` mới cùng danh sách sự kiện dẫn chuyện. Engine không import gì từ Angular, không đụng vào bộ nhớ máy, không phát âm thanh. Nguồn ngẫu nhiên được truyền vào theo từng lời gọi nên test cắm được nguồn có hạt giống để kết quả lặp lại được. Các luật con tách thành từng file nhỏ một trách nhiệm: đội hình, chấm đoán từ, đếm phiếu, điều kiện kết thúc, tính điểm.

**Tech Stack:** Angular 21 (standalone, zoneless), TypeScript strict, Vitest qua builder `@angular/build:unit-test`, npm.

**Đặc tả nguồn:** `docs/superpowers/specs/2026-09-07-ai-la-gian-diep-design.md`

---

## Bối cảnh cần biết trước khi bắt đầu

**Đây là bản kế hoạch số 1 trong 4 bản.** Toàn bộ đặc tả được chia thành bốn giai đoạn, mỗi giai đoạn cho ra phần mềm chạy được và test được:

1. **Nền móng và engine luật chơi** ← bản này
2. Kho từ và lưu trữ trên máy
3. Giao diện chơi được một ván trọn vẹn
4. Dẫn chuyện, âm thanh, bảng điểm, cài đặt, và đóng gói APK

Kết thúc bản này chưa có giao diện để bấm. Thứ có được là một thư viện luật chơi đã được chứng minh đúng bằng test — phần mà sai thì cả app sai theo, và cũng là phần khó sửa nhất về sau.

**Về phiên bản Angular.** Máy đang chạy Node `v22.22.1`. Angular 22 đòi Node `>= 22.22.3` và sẽ từ chối chạy, nên bản kế hoạch này dùng **Angular 21**, vốn chỉ đòi Node `>= 22.12.0`. Nếu sau này nâng Node lên `22.22.3` trở lên thì nâng Angular bằng `ng update` được, không có gì trong kế hoạch này phụ thuộc vào bản 21.

**Về Vitest.** Từ Angular 20, builder `@angular/build:unit-test` thay cho Karma và mặc định chạy Vitest. Engine là TypeScript thuần nên test không cần `TestBed`, không cần dựng component — chỉ là hàm vào, hàm ra.

**Quy ước đặt tên file.** Angular 21 mặc định dùng style guide 2025: file component là `app.ts` chứ không phải `app.component.ts`. Kế hoạch này giữ nguyên mặc định đó.

**Tiếng Việt trong code.** Thông báo lỗi và nhãn hiển thị viết bằng tiếng Việt vì người dùng cuối đọc chúng. Tên biến, tên hàm, tên kiểu viết bằng tiếng Anh.

---

## Cấu trúc file

Sau khi hoàn thành bản kế hoạch này, các file dưới đây tồn tại và có test đi kèm.

### Kiểu dữ liệu — `src/app/core/models/`

| File | Trách nhiệm |
|---|---|
| `role.ts` | `Role`, `Outcome`, `GamePhase` |
| `word-pair.ts` | `Difficulty`, `WordPair` |
| `player.ts` | `Player` |
| `game-config.ts` | `GameConfig`, `ScoreRules`, và hai hằng mặc định |
| `game-state.ts` | `Assignment`, `Elimination`, `WhiteGuess`, `GameState` |
| `card-content.ts` | `CardContent` — nội dung thẻ chia bài |
| `narration-event.ts` | `NarrationEventType`, `NarrationPayload`, `NarrationEvent` |
| `index.ts` | Barrel, để nơi khác chỉ cần `import { ... } from '../models'` |

### Luật chơi — `src/app/core/engine/`

| File | Trách nhiệm |
|---|---|
| `rng.ts` | Nguồn ngẫu nhiên có hạt giống, xáo mảng, bốc chỉ số |
| `team-rules.ts` | Giới hạn sĩ số, số gián điệp tối đa và gợi ý, validate đội hình |
| `guess-matcher.ts` | Chuẩn hoá tiếng Việt, khoảng cách Levenshtein, chấm đoán từ |
| `vote-resolver.ts` | Kiểm tra bảng phiếu hợp lệ, tìm người nhiều phiếu nhất |
| `win-conditions.ts` | Đếm người sống theo vai, xác định kết quả ván |
| `scoring.ts` | Chia điểm theo vai và kết quả |
| `game-engine.ts` | Máy trạng thái ghép mọi thứ lại |

Mỗi file có một `*.spec.ts` nằm cạnh nó. File cuối cùng `game-engine.spec.ts` chứa cả hai test toàn cục: ván luôn kết thúc, và không rò rỉ từ bí mật.

Lý do tách nhỏ như vậy: mỗi file đọc hết trong một màn hình, và khi một luật sai thì test đỏ chỉ thẳng vào file chứa luật đó thay vì vào một file engine khổng lồ.

---

## Task 1: Dựng workspace Angular

**Files:**
- Create: toàn bộ scaffold Angular tại `C:\SRC\ai-la-gian-diep`
- Modify: `package.json` (thêm script `test`)
- Modify: `.gitignore` (giữ nguyên bản Angular sinh ra)

- [ ] **Step 1: Chạy ng new vào thư mục dự án hiện có**

Thư mục đã có sẵn `.git/` và `docs/`. Cờ `--skip-git` để CLI không khởi tạo lại repo.

```bash
cd /c/SRC/ai-la-gian-diep
npx -y -p @angular/cli@21 ng new ai-la-gian-diep \
  --directory . \
  --package-manager npm \
  --style scss \
  --test-runner vitest \
  --routing \
  --zoneless \
  --ssr=false \
  --skip-git \
  --defaults
```

Lệnh này mất vài phút vì phải cài node_modules.

- [ ] **Step 2: Kiểm tra scaffold chạy được**

```bash
cd /c/SRC/ai-la-gian-diep
npx ng build
```

Expected: build thành công, in ra bảng kích thước bundle, không có lỗi.

- [ ] **Step 3: Đặt script test chạy một lần thay vì chế độ theo dõi**

Mở `package.json`, sửa mục `scripts` để `test` không treo ở chế độ watch:

```json
"scripts": {
  "ng": "ng",
  "start": "ng serve",
  "build": "ng build",
  "watch": "ng build --watch --configuration development",
  "test": "ng test --watch=false"
}
```

- [ ] **Step 4: Chạy test mặc định của scaffold**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: Vitest chạy và báo PASS cho các spec mặc định của `App`. Nếu báo lỗi thiếu gói Vitest thì chạy `npm install` một lần nữa rồi thử lại.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add -A
git commit -m "chore: dung workspace Angular 21 voi vitest"
```

---

## Task 2: Kiểu dữ liệu lõi

**Files:**
- Create: `src/app/core/models/role.ts`
- Create: `src/app/core/models/word-pair.ts`
- Create: `src/app/core/models/player.ts`
- Create: `src/app/core/models/game-config.ts`
- Create: `src/app/core/models/game-state.ts`
- Create: `src/app/core/models/card-content.ts`
- Create: `src/app/core/models/narration-event.ts`
- Create: `src/app/core/models/index.ts`
- Test: `src/app/core/models/models.spec.ts`

- [ ] **Step 1: Viết test dựng một GameState mẫu**

Kiểu dữ liệu không có hành vi nên test ở đây làm hai việc: chốt rằng mọi trường bắt buộc đều dựng được, và chốt hai hằng mặc định đúng như đặc tả. Test này sẽ đỏ ngay ở bước biên dịch vì chưa có file nào.

Tạo `src/app/core/models/models.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_CONFIG,
  DEFAULT_SCORE_RULES,
  GameState,
} from './index';

describe('models', () => {
  it('điểm mặc định đúng như đặc tả mục 3.8', () => {
    expect(DEFAULT_SCORE_RULES).toEqual({
      civilianWin: 1,
      spyWin: 2,
      whiteWin: 3,
    });
  });

  it('cấu hình mặc định tắt mũ trắng, tắt Bật mí, vote từ vòng 3', () => {
    expect(DEFAULT_GAME_CONFIG.hasWhite).toBe(false);
    expect(DEFAULT_GAME_CONFIG.revealSpyToSpy).toBe(false);
    expect(DEFAULT_GAME_CONFIG.minRoundsBeforeVote).toBe(3);
    expect(DEFAULT_GAME_CONFIG.spyCount).toBe(1);
  });

  it('dựng được một GameState đầy đủ trường', () => {
    const state: GameState = {
      id: 'g1',
      villageName: 'Ác Quỷ',
      config: DEFAULT_GAME_CONFIG,
      pairId: 'p1',
      civilianWord: 'con mèo',
      spyWord: 'con chó',
      players: [{ id: 'a', name: 'An' }],
      assignments: {
        a: { playerId: 'a', role: 'CIVILIAN', word: 'con mèo' },
      },
      dealtCount: 0,
      round: 1,
      speakingOrder: [],
      speakerIndex: 0,
      aliveIds: ['a'],
      eliminations: [],
      tiedCandidateIds: [],
      revoteUsed: false,
      whiteGuess: null,
      phase: 'DEALING',
      outcome: null,
    };

    expect(state.phase).toBe('DEALING');
    expect(state.assignments['a'].role).toBe('CIVILIAN');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./index`.

- [ ] **Step 3: Tạo các file kiểu dữ liệu**

`src/app/core/models/role.ts`:

```ts
export type Role = 'CIVILIAN' | 'SPY' | 'WHITE';

export type Outcome = 'CIVILIANS' | 'SPIES' | 'WHITE';

/**
 * Không có 'SETUP': trước khi bấm Bắt đầu thì chưa tồn tại GameState nào,
 * nên đó là trạng thái của màn hình chứ không phải của ván.
 */
export type GamePhase =
  | 'DEALING'
  | 'SPEAKING'
  | 'VOTING'
  | 'TIE_BREAK'
  | 'REVEAL'
  | 'WHITE_GUESS'
  | 'ENDED';
```

`src/app/core/models/word-pair.ts`:

```ts
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface WordPair {
  id: string;
  wordA: string;
  wordB: string;
  topic: string;
  difficulty: Difficulty;
  /** Cặp do người dùng tự thêm thì xoá được thật; cặp gốc chỉ được ẩn. */
  isCustom: boolean;
  hidden: boolean;
}
```

`src/app/core/models/player.ts`:

```ts
export interface Player {
  id: string;
  /** Đã khử trùng lặp trước khi vào đây. */
  name: string;
}
```

`src/app/core/models/game-config.ts`:

```ts
import { Difficulty } from './word-pair';

export interface GameConfig {
  spyCount: number;
  hasWhite: boolean;
  /** Chế độ Bật mí: mỗi người được cho biết vai của mình. */
  revealSpyToSpy: boolean;
  /** Rỗng nghĩa là lấy tất cả chủ đề đang bật. */
  topics: readonly string[];
  difficulties: readonly Difficulty[];
  /** null nghĩa là tắt đồng hồ. */
  timerSeconds: number | null;
  minRoundsBeforeVote: number;
}

export interface ScoreRules {
  civilianWin: number;
  spyWin: number;
  whiteWin: number;
}

/**
 * Đóng băng cả hằng lẫn mảng con: cấu hình mặc định được spread ở rất nhiều
 * nơi, mà spread chỉ copy nông. Nếu mảng con còn sửa được thì một lần push
 * nhầm sẽ làm hỏng mặc định cho toàn bộ phiên chạy.
 */
export const DEFAULT_SCORE_RULES: ScoreRules = Object.freeze({
  civilianWin: 1,
  spyWin: 2,
  whiteWin: 3,
});

export const DEFAULT_GAME_CONFIG: GameConfig = Object.freeze({
  spyCount: 1,
  hasWhite: false,
  revealSpyToSpy: false,
  topics: Object.freeze([] as string[]),
  difficulties: Object.freeze(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]),
  timerSeconds: 30,
  minRoundsBeforeVote: 3,
});
```

`src/app/core/models/game-state.ts`:

```ts
import { GameConfig } from './game-config';
import { Player } from './player';
import { GamePhase, Outcome, Role } from './role';

export interface Assignment {
  playerId: string;
  role: Role;
  /** null khi là mũ trắng. */
  word: string | null;
}

export interface Elimination {
  round: number;
  playerId: string;
  role: Role;
  /** true khi bị loại do bốc ngẫu nhiên ở nước cờ 2 người cuối. */
  byRandomTieBreak: boolean;
}

export interface WhiteGuess {
  text: string;
  correct: boolean;
}

export interface GameState {
  id: string;
  /** Rỗng thì tầng dẫn chuyện hiển thị "ta". */
  villageName: string;
  config: GameConfig;
  pairId: string;
  civilianWord: string;
  spyWord: string;
  players: Player[];
  assignments: Record<string, Assignment>;
  dealtCount: number;
  /** Số thứ tự vòng đang diễn ra, bắt đầu từ 1. */
  round: number;
  speakingOrder: string[];
  speakerIndex: number;
  aliveIds: string[];
  eliminations: Elimination[];
  /** Chỉ có giá trị ở pha TIE_BREAK và ở lượt bỏ phiếu lại. */
  tiedCandidateIds: string[];
  revoteUsed: boolean;
  whiteGuess: WhiteGuess | null;
  phase: GamePhase;
  outcome: Outcome | null;
}
```

`src/app/core/models/card-content.ts`:

```ts
/**
 * Nội dung thẻ chia bài. Component render thẻ CHỈ được đọc kiểu này và
 * không được đụng tới Assignment.role, để không thể vô tình tạo ra một
 * khác biệt hiển thị nào theo vai.
 */
export interface CardContent {
  /** null nghĩa là không hiện dòng vai nào. */
  roleLabel: string | null;
  /** null khi là mũ trắng. */
  word: string | null;
  note: string | null;
}
```

`src/app/core/models/narration-event.ts`:

```ts
export type NarrationEventType =
  | 'GAME_START'
  | 'PASS_DEVICE'
  | 'ROUND_START'
  | 'SPEAKER_TURN'
  | 'TIME_ALMOST_UP'
  | 'VOTE_OPEN'
  | 'VOTE_TIE'
  | 'NO_ELIMINATION'
  | 'RANDOM_TIE_BREAK'
  | 'CIVILIAN_KILLED'
  | 'SPY_CAUGHT'
  | 'WHITE_REVEALED'
  | 'WHITE_GUESS_CORRECT'
  | 'WHITE_GUESS_WRONG'
  | 'CIVILIANS_WIN'
  | 'SPIES_WIN'
  | 'WHITE_WIN';

/**
 * Ràng buộc an toàn: payload chỉ được chứa đúng ba trường này.
 * Không bao giờ được chứa từ bí mật của ván.
 */
export interface NarrationPayload {
  village?: string;
  player?: string;
  round?: number;
}

export interface NarrationEvent {
  type: NarrationEventType;
  payload: NarrationPayload;
}
```

`src/app/core/models/index.ts`:

```ts
export * from './card-content';
export * from './game-config';
export * from './game-state';
export * from './narration-event';
export * from './player';
export * from './role';
export * from './word-pair';
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS cả 3 test trong `models.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/models
git commit -m "feat: them kieu du lieu loi cho engine"
```

---

## Task 3: Nguồn ngẫu nhiên có hạt giống

Engine phải là hàm thuần thì test mới lặp lại được. Nên thay vì gọi `Math.random()` bên trong, engine nhận một hàm `Rng` từ ngoài. Test cắm nguồn có hạt giống; app thật cắm `Math.random`.

**Files:**
- Create: `src/app/core/engine/rng.ts`
- Test: `src/app/core/engine/rng.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/core/engine/rng.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createSeededRng, pickIndex, shuffle } from './rng';

describe('rng', () => {
  it('cùng hạt giống thì cho cùng dãy số', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const seriesA = [a(), a(), a(), a(), a()];
    const seriesB = [b(), b(), b(), b(), b()];
    expect(seriesA).toEqual(seriesB);
  });

  it('khác hạt giống thì cho dãy khác', () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it('luôn trả về số trong nửa khoảng [0, 1)', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 500; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('pickIndex luôn nằm trong khoảng hợp lệ', () => {
    const rng = createSeededRng(3);
    for (let i = 0; i < 200; i++) {
      const index = pickIndex(rng, 5);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(5);
    }
  });

  it('pickIndex báo lỗi khi độ dài không hợp lệ', () => {
    const rng = createSeededRng(3);
    expect(() => pickIndex(rng, 0)).toThrow();
  });

  it('shuffle giữ nguyên tập phần tử và không sửa mảng gốc', () => {
    const rng = createSeededRng(99);
    const input = ['a', 'b', 'c', 'd', 'e'];
    const output = shuffle(rng, input);

    expect(input).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect([...output].sort()).toEqual([...input].sort());
  });

  it('shuffle có xáo thật chứ không trả về nguyên thứ tự cũ', () => {
    const rng = createSeededRng(12345);
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const shuffledOnce = shuffle(rng, input);
    expect(shuffledOnce).not.toEqual(input);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./rng`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/core/engine/rng.ts`:

```ts
/** Hàm sinh số ngẫu nhiên trong nửa khoảng [0, 1), cùng dạng với Math.random. */
export type Rng = () => number;

/**
 * Thuật toán mulberry32. Chọn nó vì ngắn, không phụ thuộc thư viện ngoài,
 * và cùng một hạt giống luôn cho cùng một dãy — điều kiện cần để test lặp lại được.
 */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickIndex(rng: Rng, length: number): number {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('pickIndex: độ dài phải là số nguyên lớn hơn 0');
  }
  return Math.min(length - 1, Math.floor(rng() * length));
}

/** Xáo Fisher-Yates. Trả về mảng mới, không sửa mảng đầu vào. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `rng.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/rng.ts src/app/core/engine/rng.spec.ts
git commit -m "feat: them nguon ngau nhien co hat giong"
```

---

## Task 4: Luật đội hình

Cài đặt mục 3.3 của đặc tả. Đây là chỗ dễ sai một đơn vị nhất nên test quét đúng bảng trong đặc tả thay vì thử vài ca lẻ.

**Files:**
- Create: `src/app/core/engine/team-rules.ts`
- Test: `src/app/core/engine/team-rules.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/core/engine/team-rules.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  civilianCount,
  maxSpyCount,
  suggestedSpyCount,
  validateTeam,
} from './team-rules';

/** Chép nguyên bảng ở mục 3.3 của đặc tả. */
const SPEC_TABLE = [
  { players: 4, suggested: 1, maxNoWhite: 1, maxWithWhite: 1 },
  { players: 5, suggested: 1, maxNoWhite: 2, maxWithWhite: 1 },
  { players: 6, suggested: 1, maxNoWhite: 2, maxWithWhite: 2 },
  { players: 7, suggested: 2, maxNoWhite: 3, maxWithWhite: 2 },
  { players: 8, suggested: 2, maxNoWhite: 3, maxWithWhite: 3 },
  { players: 9, suggested: 2, maxNoWhite: 4, maxWithWhite: 3 },
  { players: 10, suggested: 2, maxNoWhite: 4, maxWithWhite: 4 },
  { players: 11, suggested: 3, maxNoWhite: 5, maxWithWhite: 4 },
  { players: 12, suggested: 3, maxNoWhite: 5, maxWithWhite: 5 },
];

describe('team-rules', () => {
  it('giới hạn sĩ số đúng đặc tả', () => {
    expect(MIN_PLAYERS).toBe(4);
    expect(MAX_PLAYERS).toBe(12);
  });

  it.each(SPEC_TABLE)(
    '$players người: số gián điệp tối đa khớp bảng đặc tả',
    ({ players, maxNoWhite, maxWithWhite }) => {
      expect(maxSpyCount(players, false)).toBe(maxNoWhite);
      expect(maxSpyCount(players, true)).toBe(maxWithWhite);
    },
  );

  it.each(SPEC_TABLE)(
    '$players người: số gián điệp gợi ý khớp bảng đặc tả',
    ({ players, suggested }) => {
      expect(suggestedSpyCount(players, false)).toBe(suggested);
    },
  );

  it('mức tối đa luôn thoả ràng buộc dân làng nhiều hơn gián điệp', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      for (const hasWhite of [false, true]) {
        const max = maxSpyCount(players, hasWhite);
        expect(civilianCount(players, max, hasWhite)).toBeGreaterThan(max);
        expect(civilianCount(players, max + 1, hasWhite)).toBeLessThanOrEqual(max + 1);
      }
    }
  });

  it('đội hình nhỏ nhất có mũ trắng là 2 dân + 1 gián điệp + 1 mũ trắng', () => {
    expect(validateTeam(4, 1, true)).toEqual({ valid: true });
    expect(civilianCount(4, 1, true)).toBe(2);
  });

  it('chặn khi dưới 4 người', () => {
    const result = validateTeam(3, 1, false);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.reason).toContain('4 người');
  });

  it('chặn khi trên 12 người', () => {
    const result = validateTeam(13, 1, false);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.reason).toContain('12 người');
  });

  it('chặn khi không có gián điệp nào', () => {
    const result = validateTeam(6, 0, false);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.reason).toContain('gián điệp');
  });

  it('chặn khi gián điệp không ít hơn dân làng, và nêu rõ mức tối đa', () => {
    const result = validateTeam(6, 3, false);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.reason).toContain('tối đa 2 gián điệp');
  });

  it('gợi ý không bao giờ vượt mức tối đa khi bật mũ trắng', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const suggested = suggestedSpyCount(players, true);
      expect(suggested).toBeGreaterThanOrEqual(1);
      expect(suggested).toBeLessThanOrEqual(maxSpyCount(players, true));
    }
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./team-rules`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/core/engine/team-rules.ts`:

```ts
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;

/**
 * Suy trực tiếp từ ràng buộc soDan > soGianDiep.
 * Mũ trắng không thuộc phe nào nên bị trừ ra khỏi số người tranh chấp.
 */
export function maxSpyCount(playerCount: number, hasWhite: boolean): number {
  const contested = hasWhite ? playerCount - 1 : playerCount;
  return Math.max(0, Math.ceil(contested / 2) - 1);
}

/** Giá trị app điền sẵn cho cân bằng, luôn kẹp lại trong mức hợp lệ. */
export function suggestedSpyCount(playerCount: number, hasWhite: boolean): number {
  const base = playerCount <= 6 ? 1 : playerCount <= 10 ? 2 : 3;
  return Math.max(1, Math.min(base, maxSpyCount(playerCount, hasWhite)));
}

export function civilianCount(
  playerCount: number,
  spyCount: number,
  hasWhite: boolean,
): number {
  return playerCount - spyCount - (hasWhite ? 1 : 0);
}

export type TeamValidation = { valid: true } | { valid: false; reason: string };

export function validateTeam(
  playerCount: number,
  spyCount: number,
  hasWhite: boolean,
): TeamValidation {
  // Phải chặn trước mọi phép so sánh: mọi so sánh với NaN đều cho false, nên
  // NaN sẽ lọt qua hết các kiểm tra khoảng bên dưới rồi được báo là hợp lệ.
  if (!Number.isInteger(playerCount)) {
    return { valid: false, reason: 'Số người chơi phải là số nguyên' };
  }
  if (!Number.isInteger(spyCount)) {
    return { valid: false, reason: 'Số gián điệp phải là số nguyên' };
  }

  if (playerCount < MIN_PLAYERS) {
    return { valid: false, reason: `Cần ít nhất ${MIN_PLAYERS} người chơi` };
  }
  if (playerCount > MAX_PLAYERS) {
    return { valid: false, reason: `Tối đa ${MAX_PLAYERS} người chơi` };
  }
  if (spyCount < 1) {
    return { valid: false, reason: 'Cần ít nhất 1 gián điệp' };
  }

  const max = maxSpyCount(playerCount, hasWhite);
  if (spyCount > max) {
    const whitePart = hasWhite ? ' và 1 mũ trắng' : '';
    return {
      valid: false,
      reason:
        `Dân làng phải nhiều hơn gián điệp. ` +
        `Với ${playerCount} người${whitePart}, tối đa ${max} gián điệp`,
    };
  }

  return { valid: true };
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `team-rules.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/team-rules.ts src/app/core/engine/team-rules.spec.ts
git commit -m "feat: them luat rang buoc doi hinh"
```

---

## Task 5: Chấm từ đoán của mũ trắng

Cài đặt mục 3.6. Người chơi gõ trên điện thoại nên phải chịu được thiếu dấu và sai một hai ký tự.

**Files:**
- Create: `src/app/core/engine/guess-matcher.ts`
- Test: `src/app/core/engine/guess-matcher.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/core/engine/guess-matcher.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isGuessCorrect, levenshtein, normalizeVi } from './guess-matcher';

describe('normalizeVi', () => {
  it('bỏ dấu tiếng Việt', () => {
    expect(normalizeVi('con mèo')).toBe('con meo');
    expect(normalizeVi('bánh mì')).toBe('banh mi');
  });

  it('xử lý được chữ đ hoa và thường', () => {
    expect(normalizeVi('đường')).toBe('duong');
    expect(normalizeVi('Đà Nẵng')).toBe('da nang');
  });

  it('viết thường và gộp khoảng trắng thừa', () => {
    expect(normalizeVi('  Con   MÈO  ')).toBe('con meo');
  });

  it('bỏ dấu câu', () => {
    expect(normalizeVi('con mèo!!!')).toBe('con meo');
    expect(normalizeVi('bún-bò')).toBe('bunbo');
  });
});

describe('levenshtein', () => {
  it('chuỗi giống hệt thì khoảng cách bằng 0', () => {
    expect(levenshtein('con meo', 'con meo')).toBe(0);
  });

  it('đếm đúng số phép sửa', () => {
    expect(levenshtein('meo', 'mao')).toBe(1);
    expect(levenshtein('meo', 'me')).toBe(1);
    expect(levenshtein('meo', 'meoo')).toBe(1);
    expect(levenshtein('meo', 'cho')).toBe(2);
  });

  it('chuỗi rỗng thì khoảng cách bằng độ dài chuỗi kia', () => {
    expect(levenshtein('', 'meo')).toBe(3);
    expect(levenshtein('meo', '')).toBe(3);
  });
});

describe('isGuessCorrect', () => {
  it('chấp nhận đúng nguyên văn', () => {
    expect(isGuessCorrect('con mèo', 'con mèo')).toBe(true);
  });

  it('chấp nhận thiếu dấu', () => {
    expect(isGuessCorrect('con meo', 'con mèo')).toBe(true);
  });

  it('chấp nhận sai hoa thường và thừa khoảng trắng', () => {
    expect(isGuessCorrect('  Con Mèo ', 'con mèo')).toBe(true);
  });

  it('chấp nhận sai nhẹ một ký tự với từ ngắn', () => {
    expect(isGuessCorrect('con meoo', 'con mèo')).toBe(true);
  });

  it('với đáp án dài hơn 8 ký tự thì chịu được sai hai ký tự', () => {
    expect(isGuessCorrect('banh mi thit nuong', 'bánh mì thịt nướng')).toBe(true);
    expect(isGuessCorrect('banh my thit nuong', 'bánh mì thịt nướng')).toBe(true);
  });

  it('từ chối khi đoán một từ khác hẳn', () => {
    expect(isGuessCorrect('con chó', 'con mèo')).toBe(false);
    expect(isGuessCorrect('xe máy', 'con mèo')).toBe(false);
  });

  it('từ chối chuỗi rỗng', () => {
    expect(isGuessCorrect('', 'con mèo')).toBe(false);
    expect(isGuessCorrect('   ', 'con mèo')).toBe(false);
  });

  it('không nhận nhầm khi đáp án ngắn mà đoán sai hai ký tự', () => {
    expect(isGuessCorrect('cha', 'chó')).toBe(true);
    expect(isGuessCorrect('mua', 'chó')).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./guess-matcher`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/core/engine/guess-matcher.ts`:

```ts
/**
 * Chuẩn hoá để so sánh: viết thường, bỏ dấu, bỏ ký tự không phải chữ số,
 * gộp khoảng trắng. Chữ đ phải xử lý riêng vì NFD không tách nó ra.
 */
export function normalizeVi(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Khoảng cách sửa đổi, cài theo kiểu cuộn hai hàng cho gọn bộ nhớ. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }

  return previous[b.length];
}

/**
 * Ngưỡng theo độ dài đáp án: đáp án tối đa 8 ký tự thì cho sai 1,
 * dài hơn thì cho sai 2. Tránh việc từ ngắn bị nhận nhầm sang từ khác.
 */
export function isGuessCorrect(guess: string, answer: string): boolean {
  const normalizedGuess = normalizeVi(guess);
  const normalizedAnswer = normalizeVi(answer);

  if (normalizedGuess.length === 0 || normalizedAnswer.length === 0) return false;
  if (normalizedGuess === normalizedAnswer) return true;

  const threshold = normalizedAnswer.length <= 8 ? 1 : 2;
  return levenshtein(normalizedGuess, normalizedAnswer) <= threshold;
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `guess-matcher.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/guess-matcher.ts src/app/core/engine/guess-matcher.spec.ts
git commit -m "feat: them cham tu doan cua mu trang"
```

---

## Task 6: Đếm phiếu

Hai hàm thuần chỉ làm việc với bảng phiếu, chưa biết gì về ván. Việc quyết định loại ai để engine lo ở Task 12.

Lưu ý về chữ ký hàm: khi bỏ phiếu lại, danh sách **ứng viên** hẹp hơn danh sách **người bỏ phiếu**. Ví dụ 5 người còn sống hoà 2 người thì lượt bỏ phiếu lại chỉ có 2 ứng viên nhưng vẫn có 5 người bỏ phiếu. Vì thế hàm nhận cả hai thứ chứ không suy một từ cái kia.

**Files:**
- Create: `src/app/core/engine/vote-resolver.ts`
- Test: `src/app/core/engine/vote-resolver.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/core/engine/vote-resolver.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findVoteLeaders, isTallyValid } from './vote-resolver';

describe('findVoteLeaders', () => {
  it('trả về đúng một người khi có người dẫn rõ ràng', () => {
    expect(findVoteLeaders({ a: 3, b: 1, c: 0 })).toEqual(['a']);
  });

  it('trả về mọi người đồng hạng nhất khi hoà', () => {
    expect(findVoteLeaders({ a: 2, b: 2, c: 1 }).sort()).toEqual(['a', 'b']);
  });

  it('trả về cả ba khi hoà ba người', () => {
    expect(findVoteLeaders({ a: 2, b: 2, c: 2 }).sort()).toEqual(['a', 'b', 'c']);
  });

  it('bỏ qua người không có phiếu nào', () => {
    expect(findVoteLeaders({ a: 1, b: 0 })).toEqual(['a']);
  });

  it('trả về mảng rỗng khi không ai có phiếu', () => {
    expect(findVoteLeaders({ a: 0, b: 0 })).toEqual([]);
  });
});

describe('isTallyValid', () => {
  const candidates = ['a', 'b', 'c'];

  it('chấp nhận bảng phiếu bình thường', () => {
    expect(isTallyValid({ a: 2, b: 1 }, candidates, 3)).toBe(true);
  });

  it('từ chối khi có phiếu cho người không phải ứng viên', () => {
    expect(isTallyValid({ a: 1, z: 1 }, candidates, 3)).toBe(false);
  });

  it('từ chối khi tổng phiếu vượt số người bỏ phiếu', () => {
    expect(isTallyValid({ a: 3, b: 2 }, candidates, 4)).toBe(false);
  });

  it('từ chối khi không có phiếu nào', () => {
    expect(isTallyValid({ a: 0, b: 0 }, candidates, 3)).toBe(false);
    expect(isTallyValid({}, candidates, 3)).toBe(false);
  });

  it('từ chối phiếu âm hoặc không phải số nguyên', () => {
    expect(isTallyValid({ a: -1, b: 2 }, candidates, 3)).toBe(false);
    expect(isTallyValid({ a: 1.5 }, candidates, 3)).toBe(false);
  });

  it('chấp nhận lượt bỏ phiếu lại: ít ứng viên hơn số người bỏ phiếu', () => {
    expect(isTallyValid({ a: 3, b: 2 }, ['a', 'b'], 5)).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./vote-resolver`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/core/engine/vote-resolver.ts`:

```ts
export type VoteTally = Record<string, number>;

/** Danh sách những người cùng đứng đầu về số phiếu. Rỗng khi không ai có phiếu. */
export function findVoteLeaders(tally: VoteTally): string[] {
  const scored = Object.entries(tally).filter(([, votes]) => votes > 0);
  if (scored.length === 0) return [];

  const highest = Math.max(...scored.map(([, votes]) => votes));
  return scored.filter(([, votes]) => votes === highest).map(([id]) => id);
}

/**
 * candidateIds là những người được phép nhận phiếu.
 * voterCount là số người đang bỏ phiếu, thường là số người còn sống.
 * Ở lượt bỏ phiếu lại thì hai con số này khác nhau.
 */
export function isTallyValid(
  tally: VoteTally,
  candidateIds: readonly string[],
  voterCount: number,
): boolean {
  const entries = Object.entries(tally);

  if (entries.some(([id]) => !candidateIds.includes(id))) return false;
  if (entries.some(([, votes]) => !Number.isInteger(votes) || votes < 0)) return false;

  const total = entries.reduce((sum, [, votes]) => sum + votes, 0);
  return total >= 1 && total <= voterCount;
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `vote-resolver.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/vote-resolver.ts src/app/core/engine/vote-resolver.spec.ts
git commit -m "feat: them dem phieu vote"
```

---

## Task 7: Điều kiện kết thúc

Cài đặt mục 3.5. Thứ tự kiểm tra quan trọng: mũ trắng đoán đúng thắng đè lên mọi điều kiện khác.

Vì các test từ đây trở đi đều cần dựng `GameState`, task này tạo luôn một file trợ giúp dùng chung cho mọi spec sau.

**Files:**
- Create: `src/app/core/engine/testing/make-state.ts`
- Create: `src/app/core/engine/win-conditions.ts`
- Test: `src/app/core/engine/win-conditions.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/core/engine/win-conditions.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeState } from './testing/make-state';
import { countAlive, evaluateOutcome } from './win-conditions';

describe('countAlive', () => {
  it('đếm đúng số người sống theo từng vai', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 2, 3],
    });

    expect(countAlive(state)).toEqual({ civilians: 1, spies: 1, whites: 1 });
  });
});

describe('evaluateOutcome', () => {
  it('ván vẫn tiếp tục khi dân làng còn áp đảo', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'],
      aliveIndexes: [0, 1, 2, 3],
    });

    expect(evaluateOutcome(state)).toBeNull();
  });

  it('gián điệp thắng khi số gián điệp bằng số người còn lại', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY'],
      aliveIndexes: [0, 2],
    });

    expect(evaluateOutcome(state)).toBe('SPIES');
  });

  it('gián điệp thắng khi mũ trắng còn sống nhưng gián điệp đã đủ đông', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [1, 2],
    });

    expect(evaluateOutcome(state)).toBe('SPIES');
  });

  it('dân làng thắng khi hết cả gián điệp lẫn mũ trắng', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 1],
    });

    expect(evaluateOutcome(state)).toBe('CIVILIANS');
  });

  it('ván CHƯA kết thúc khi hết gián điệp mà mũ trắng còn sống', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 1, 3],
    });

    expect(evaluateOutcome(state)).toBeNull();
  });

  it('mũ trắng thắng khi đoán đúng, đè lên mọi điều kiện khác', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 1],
      whiteGuess: { text: 'con mèo', correct: true },
    });

    expect(evaluateOutcome(state)).toBe('WHITE');
  });

  it('mũ trắng đoán sai thì không thắng', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [0, 1],
      whiteGuess: { text: 'con chó', correct: false },
    });

    expect(evaluateOutcome(state)).toBe('CIVILIANS');
  });

  it('mũ trắng thắng khi sống sót một mình', () => {
    const state = makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes: [3],
    });

    expect(evaluateOutcome(state)).toBe('WHITE');
  });

  it('mọi trạng thái còn đúng một người sống đều kết thúc ván', () => {
    const roles = ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'] as const;
    for (let index = 0; index < roles.length; index++) {
      const state = makeState({ roles: [...roles], aliveIndexes: [index] });
      expect(evaluateOutcome(state)).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./testing/make-state` và `./win-conditions`.

- [ ] **Step 3: Tạo file trợ giúp dựng state cho test**

Tạo `src/app/core/engine/testing/make-state.ts`:

```ts
import {
  Assignment,
  DEFAULT_GAME_CONFIG,
  GameConfig,
  GamePhase,
  GameState,
  Player,
  Role,
  WhiteGuess,
} from '../../models';

export const TEST_CIVILIAN_WORD = 'quả thanh long bí mật';
export const TEST_SPY_WORD = 'quả vải thiều bí mật';

export interface MakeStateOptions {
  /** Vai của từng người, theo thứ tự. Người thứ i có id `p{i}` và tên `Người {i}`. */
  roles: Role[];
  /** Chỉ số của những người còn sống. Bỏ trống nghĩa là tất cả còn sống. */
  aliveIndexes?: number[];
  phase?: GamePhase;
  round?: number;
  villageName?: string;
  whiteGuess?: WhiteGuess | null;
  config?: Partial<GameConfig>;
  speakingOrder?: string[];
  speakerIndex?: number;
  tiedCandidateIds?: string[];
  revoteUsed?: boolean;
}

/**
 * Dựng một GameState đủ dùng cho test mà không phải chạy qua createGame.
 * Vai được gán cố định theo thứ tự nên test đọc ra là biết ai là ai.
 */
export function makeState(options: MakeStateOptions): GameState {
  const players: Player[] = options.roles.map((_, index) => ({
    id: `p${index}`,
    name: `Người ${index}`,
  }));

  const assignments: Record<string, Assignment> = {};
  options.roles.forEach((role, index) => {
    assignments[players[index].id] = {
      playerId: players[index].id,
      role,
      word:
        role === 'WHITE'
          ? null
          : role === 'SPY'
            ? TEST_SPY_WORD
            : TEST_CIVILIAN_WORD,
    };
  });

  const aliveIndexes =
    options.aliveIndexes ?? options.roles.map((_, index) => index);

  return {
    id: 'test-game',
    villageName: options.villageName ?? 'Thử Nghiệm',
    config: {
      ...DEFAULT_GAME_CONFIG,
      spyCount: options.roles.filter((role) => role === 'SPY').length,
      hasWhite: options.roles.includes('WHITE'),
      ...options.config,
    },
    pairId: 'test-pair',
    civilianWord: TEST_CIVILIAN_WORD,
    spyWord: TEST_SPY_WORD,
    players,
    assignments,
    dealtCount: players.length,
    round: options.round ?? 1,
    speakingOrder:
      options.speakingOrder ?? aliveIndexes.map((index) => players[index].id),
    speakerIndex: options.speakerIndex ?? 0,
    aliveIds: aliveIndexes.map((index) => players[index].id),
    eliminations: [],
    tiedCandidateIds: options.tiedCandidateIds ?? [],
    revoteUsed: options.revoteUsed ?? false,
    whiteGuess: options.whiteGuess ?? null,
    phase: options.phase ?? 'SPEAKING',
    outcome: null,
  };
}
```

- [ ] **Step 4: Cài đặt điều kiện kết thúc**

Tạo `src/app/core/engine/win-conditions.ts`:

```ts
import { GameState, Outcome } from '../models';

export interface AliveCounts {
  civilians: number;
  spies: number;
  whites: number;
}

export function countAlive(state: GameState): AliveCounts {
  const counts: AliveCounts = { civilians: 0, spies: 0, whites: 0 };

  for (const playerId of state.aliveIds) {
    const role = state.assignments[playerId].role;
    if (role === 'SPY') counts.spies++;
    else if (role === 'WHITE') counts.whites++;
    else counts.civilians++;
  }

  return counts;
}

/**
 * Mục 3.5 của đặc tả. Thứ tự kiểm tra là một phần của luật, không đổi được.
 * Trả về null nghĩa là ván còn tiếp tục.
 */
export function evaluateOutcome(state: GameState): Outcome | null {
  // Không thể xảy ra nếu engine chạy đúng: từ một người sống, hàm này luôn
  // trả về một kết quả nên ván kết thúc trước khi danh sách rỗng. Nổ to ở
  // đây vì nếu để lọt, phép kiểm tra số 3 sẽ đọc 0 >= 0 và tuyên bố gián
  // điệp thắng giữa lúc không còn gián điệp nào — sai mà im lặng.
  if (state.aliveIds.length === 0) {
    throw new Error('evaluateOutcome: không còn ai sống, đây là trạng thái không thể xảy ra');
  }

  // 1. Mũ trắng đoán đúng thì thắng ngay, đè lên mọi điều kiện khác.
  if (state.whiteGuess?.correct) return 'WHITE';

  const { civilians, spies, whites } = countAlive(state);

  // 2. Mũ trắng sống sót một mình. Điều kiện này bịt nhánh treo với đúng
  //    một người còn sống mà không phải dân làng cũng không phải gián điệp.
  if (whites === 1 && civilians === 0 && spies === 0) return 'WHITE';

  // 3. Gián điệp đủ đông để áp đảo phần còn lại.
  if (spies >= civilians + whites) return 'SPIES';

  // 4. Sạch bóng gián điệp lẫn mũ trắng.
  if (spies === 0 && whites === 0) return 'CIVILIANS';

  return null;
}
```

- [ ] **Step 5: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `win-conditions.spec.ts`.

- [ ] **Step 6: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/win-conditions.ts src/app/core/engine/win-conditions.spec.ts src/app/core/engine/testing/make-state.ts
git commit -m "feat: them dieu kien ket thuc van"
```

---

## Task 8: Tính điểm

Cài đặt mục 3.8. Điểm trao cho mọi người thuộc phe thắng, kể cả người đã bị loại.

**Files:**
- Create: `src/app/core/engine/scoring.ts`
- Test: `src/app/core/engine/scoring.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/core/engine/scoring.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_RULES } from '../models';
import { awardPoints } from './scoring';
import { makeState } from './testing/make-state';

describe('awardPoints', () => {
  it('dân làng thắng: mỗi dân làng được 1 điểm, kể cả người đã bị loại', () => {
    const state = {
      ...makeState({
        roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
        aliveIndexes: [0],
      }),
      outcome: 'CIVILIANS' as const,
    };

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      p0: 1,
      p1: 1,
      p2: 0,
      p3: 0,
    });
  });

  it('gián điệp thắng: mỗi gián điệp được 2 điểm', () => {
    const state = {
      ...makeState({
        roles: ['CIVILIAN', 'SPY', 'SPY'],
        aliveIndexes: [1, 2],
      }),
      outcome: 'SPIES' as const,
    };

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      p0: 0,
      p1: 2,
      p2: 2,
    });
  });

  it('mũ trắng thắng: chỉ mình mũ trắng được điểm', () => {
    const state = {
      ...makeState({
        roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
        aliveIndexes: [3],
      }),
      outcome: 'WHITE' as const,
    };

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 3,
    });
  });

  it('mũ trắng không được điểm khi dân làng thắng', () => {
    const state = {
      ...makeState({
        roles: ['CIVILIAN', 'SPY', 'WHITE'],
        aliveIndexes: [0],
      }),
      outcome: 'CIVILIANS' as const,
    };

    expect(awardPoints(state, DEFAULT_SCORE_RULES)['p2']).toBe(0);
  });

  it('ván chưa kết thúc thì không ai được điểm', () => {
    const state = makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'SPY'] });

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      p0: 0,
      p1: 0,
      p2: 0,
    });
  });

  it('tôn trọng bảng điểm tuỳ chỉnh', () => {
    const state = {
      ...makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'SPY'], aliveIndexes: [2] }),
      outcome: 'SPIES' as const,
    };

    const points = awardPoints(state, { civilianWin: 5, spyWin: 7, whiteWin: 9 });
    expect(points['p2']).toBe(7);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./scoring`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/core/engine/scoring.ts`:

```ts
import { GameState, ScoreRules } from '../models';

/**
 * Trả về điểm cộng của từng người trong ván này.
 * Mọi người chơi đều có mặt trong kết quả, người thua nhận 0, để màn kết ván
 * hiển thị được đủ danh sách mà không phải tự bù chỗ trống.
 */
export function awardPoints(
  state: GameState,
  rules: ScoreRules,
): Record<string, number> {
  const points: Record<string, number> = {};

  for (const player of state.players) {
    const role = state.assignments[player.id].role;

    if (state.outcome === 'CIVILIANS' && role === 'CIVILIAN') {
      points[player.id] = rules.civilianWin;
    } else if (state.outcome === 'SPIES' && role === 'SPY') {
      points[player.id] = rules.spyWin;
    } else if (state.outcome === 'WHITE' && role === 'WHITE') {
      points[player.id] = rules.whiteWin;
    } else {
      points[player.id] = 0;
    }
  }

  return points;
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `scoring.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/scoring.ts src/app/core/engine/scoring.spec.ts
git commit -m "feat: them tinh diem theo vai"
```

---

## Task 9: Engine — tạo ván và dựng thẻ chia bài

Bắt đầu file `game-engine.ts`. Task này làm hai hàm: `createGame` và `buildCard`.

`buildCard` là chỗ quan trọng nhất về mặt che giấu thông tin. Test phải chứng minh rằng khi tắt Bật mí thì thẻ dân làng và thẻ gián điệp giống nhau tới từng trường, không chỉ giống ở phần chữ nhìn thấy.

**Files:**
- Create: `src/app/core/engine/game-engine.ts`
- Test: `src/app/core/engine/game-engine.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/core/engine/game-engine.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CardContent, DEFAULT_GAME_CONFIG, GameConfig, Player } from '../models';
import { buildCard, createGame, NewGameInput } from './game-engine';
import { createSeededRng } from './rng';

const PAIR = { id: 'pair-1', civilianWord: 'con mèo', spyWord: 'con chó' };

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    name: `Người ${index}`,
  }));
}

function makeInput(overrides: Partial<NewGameInput> = {}): NewGameInput {
  return {
    gameId: 'g1',
    villageName: 'Ác Quỷ',
    players: makePlayers(6),
    pair: PAIR,
    rng: createSeededRng(2026),
    ...overrides,
    // Đặt sau cùng để cấu hình truyền vào luôn được trộn với mặc định,
    // thay vì thay thế nguyên khối.
    config: { ...DEFAULT_GAME_CONFIG, ...overrides.config },
  };
}

describe('createGame', () => {
  it('phát đúng số lượng từng vai', () => {
    const { state } = createGame(
      makeInput({ config: { ...DEFAULT_GAME_CONFIG, spyCount: 2, hasWhite: true } }),
    );

    const roles = Object.values(state.assignments).map((a) => a.role);
    expect(roles.filter((r) => r === 'SPY')).toHaveLength(2);
    expect(roles.filter((r) => r === 'WHITE')).toHaveLength(1);
    expect(roles.filter((r) => r === 'CIVILIAN')).toHaveLength(3);
  });

  it('phát từ đúng theo vai, mũ trắng không có từ', () => {
    const { state } = createGame(
      makeInput({ config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, hasWhite: true } }),
    );

    for (const assignment of Object.values(state.assignments)) {
      if (assignment.role === 'WHITE') expect(assignment.word).toBeNull();
      else if (assignment.role === 'SPY') expect(assignment.word).toBe('con chó');
      else expect(assignment.word).toBe('con mèo');
    }
  });

  it('bắt đầu ở pha chia bài, vòng 1, mọi người còn sống', () => {
    const { state } = createGame(makeInput());

    expect(state.phase).toBe('DEALING');
    expect(state.round).toBe(1);
    expect(state.dealtCount).toBe(0);
    expect(state.aliveIds).toHaveLength(6);
    expect(state.outcome).toBeNull();
  });

  it('phát sự kiện mở ván và sự kiện chuyền máy cho người đầu tiên', () => {
    const { events } = createGame(makeInput());

    expect(events[0]).toEqual({
      type: 'GAME_START',
      payload: { village: 'Ác Quỷ' },
    });
    expect(events[1]).toEqual({
      type: 'PASS_DEVICE',
      payload: { player: 'Người 0' },
    });
  });

  it('cùng hạt giống thì chia vai giống hệt nhau', () => {
    const first = createGame(makeInput({ rng: createSeededRng(7) }));
    const second = createGame(makeInput({ rng: createSeededRng(7) }));

    expect(first.state.assignments).toEqual(second.state.assignments);
  });

  it('không phải lúc nào người đầu danh sách cũng nhận cùng một vai', () => {
    const roles = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const { state } = createGame(makeInput({ rng: createSeededRng(seed) }));
      roles.add(state.assignments['p0'].role);
    }
    expect(roles.size).toBeGreaterThan(1);
  });

  it('từ chối đội hình không hợp lệ', () => {
    expect(() =>
      createGame(
        makeInput({
          players: makePlayers(6),
          config: { ...DEFAULT_GAME_CONFIG, spyCount: 3 },
        }),
      ),
    ).toThrow(/tối đa 2 gián điệp/);
  });

  it('từ chối khi dưới 4 người', () => {
    expect(() => createGame(makeInput({ players: makePlayers(3) }))).toThrow(
      /ít nhất 4 người/,
    );
  });
});

describe('buildCard', () => {
  function cardsByRole(revealSpyToSpy: boolean) {
    const { state } = createGame(
      makeInput({
        rng: createSeededRng(5),
        config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, hasWhite: true, revealSpyToSpy },
      }),
    );

    const find = (role: string) =>
      Object.values(state.assignments).find((a) => a.role === role)!.playerId;

    return {
      civilian: buildCard(state, find('CIVILIAN')),
      spy: buildCard(state, find('SPY')),
      white: buildCard(state, find('WHITE')),
    };
  }

  it('Bật mí tắt: thẻ dân làng và thẻ gián điệp chỉ khác đúng cái từ', () => {
    const { civilian, spy } = cardsByRole(false);

    expect(civilian).toEqual({ roleLabel: null, word: 'con mèo', note: null });
    expect(spy).toEqual({ roleLabel: null, word: 'con chó', note: null });

    // So sánh toàn bộ dữ liệu dựng thẻ sau khi trung hoà trường từ:
    // mọi trường còn lại phải trùng khớp tuyệt đối.
    const withoutWord = (card: CardContent): CardContent => ({ ...card, word: null });
    expect(withoutWord(civilian)).toEqual(withoutWord(spy));
  });

  it('Bật mí bật: cả hai vai đều được ghi nhãn, bố cục vẫn giống nhau', () => {
    const { civilian, spy } = cardsByRole(true);

    expect(civilian).toEqual({
      roleLabel: 'Bạn là DÂN LÀNG',
      word: 'con mèo',
      note: null,
    });
    expect(spy).toEqual({
      roleLabel: 'Bạn là GIÁN ĐIỆP',
      word: 'con chó',
      note: null,
    });

    // Cùng hình dạng: cùng tập trường, cùng trường nào có giá trị và trường nào null.
    // Tham số phải là CardContent chứ không phải Record<string, unknown>: một
    // interface có tên không tự thoả index signature, nên truyền vào sẽ không
    // biên dịch được, và vì Angular type-check cả dự án nên lỗi đó chặn luôn
    // mọi file spec khác.
    const shape = (card: CardContent) =>
      Object.fromEntries(
        Object.entries(card).map(([key, value]) => [key, value === null]),
      );
    expect(shape(civilian)).toEqual(shape(spy));
  });

  it('mũ trắng luôn biết mình là mũ trắng, ở cả hai chế độ', () => {
    const expected = {
      roleLabel: 'Bạn là MŨ TRẮNG',
      word: null,
      note: 'Bạn không có từ nào',
    };

    expect(cardsByRole(false).white).toEqual(expected);
    expect(cardsByRole(true).white).toEqual(expected);
  });

  it('báo lỗi khi hỏi thẻ của người không tồn tại', () => {
    const { state } = createGame(makeInput());
    expect(() => buildCard(state, 'khong-co-ai')).toThrow();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./game-engine`.

- [ ] **Step 3: Cài đặt**

Tạo `src/app/core/engine/game-engine.ts`:

```ts
import {
  Assignment,
  CardContent,
  GameConfig,
  GameState,
  NarrationEvent,
  Player,
  Role,
} from '../models';
import { Rng, shuffle } from './rng';
import { validateTeam } from './team-rules';

export interface EngineResult {
  state: GameState;
  events: NarrationEvent[];
}

export interface NewGameInput {
  gameId: string;
  villageName: string;
  players: Player[];
  config: GameConfig;
  pair: { id: string; civilianWord: string; spyWord: string };
  rng: Rng;
}

function buildRoleDeck(config: GameConfig, playerCount: number): Role[] {
  const deck: Role[] = [];
  for (let i = 0; i < config.spyCount; i++) deck.push('SPY');
  if (config.hasWhite) deck.push('WHITE');
  while (deck.length < playerCount) deck.push('CIVILIAN');
  return deck;
}

export function createGame(input: NewGameInput): EngineResult {
  const { players, config, pair } = input;

  const validation = validateTeam(players.length, config.spyCount, config.hasWhite);
  if (!validation.valid) throw new Error(validation.reason);

  const deck = shuffle(input.rng, buildRoleDeck(config, players.length));

  const assignments: Record<string, Assignment> = {};
  players.forEach((player, index) => {
    const role = deck[index];
    assignments[player.id] = {
      playerId: player.id,
      role,
      word:
        role === 'WHITE'
          ? null
          : role === 'SPY'
            ? pair.spyWord
            : pair.civilianWord,
    };
  });

  const state: GameState = {
    id: input.gameId,
    villageName: input.villageName,
    config,
    pairId: pair.id,
    civilianWord: pair.civilianWord,
    spyWord: pair.spyWord,
    players: [...players],
    assignments,
    dealtCount: 0,
    round: 1,
    speakingOrder: [],
    speakerIndex: 0,
    aliveIds: players.map((player) => player.id),
    eliminations: [],
    tiedCandidateIds: [],
    revoteUsed: false,
    whiteGuess: null,
    phase: 'DEALING',
    outcome: null,
  };

  return {
    state,
    events: [
      { type: 'GAME_START', payload: { village: state.villageName } },
      { type: 'PASS_DEVICE', payload: { player: players[0].name } },
    ],
  };
}

/**
 * Nội dung thẻ chia bài. Component render CHỈ được đọc kết quả của hàm này.
 * Khi tắt Bật mí, thẻ dân làng và thẻ gián điệp trả về cùng hình dạng và chỉ
 * khác đúng trường word, nên không thể suy ra vai từ thẻ.
 */
export function buildCard(state: GameState, playerId: string): CardContent {
  const assignment = state.assignments[playerId];
  if (!assignment) {
    throw new Error(`buildCard: không tìm thấy người chơi ${playerId}`);
  }

  if (assignment.role === 'WHITE') {
    return {
      roleLabel: 'Bạn là MŨ TRẮNG',
      word: null,
      note: 'Bạn không có từ nào',
    };
  }

  if (!state.config.revealSpyToSpy) {
    return { roleLabel: null, word: assignment.word, note: null };
  }

  return {
    roleLabel: assignment.role === 'SPY' ? 'Bạn là GIÁN ĐIỆP' : 'Bạn là DÂN LÀNG',
    word: assignment.word,
    note: null,
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `game-engine.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/game-engine.ts src/app/core/engine/game-engine.spec.ts
git commit -m "feat: them tao van va dung the chia bai"
```

---

## Task 10: Engine — chia bài và mở vòng nói

`revealNextPlayer` đẩy lượt chuyền máy. Khi người cuối cùng đã xem xong thì tự chuyển sang vòng nói đầu tiên, không cần một hành động riêng.

**Files:**
- Modify: `src/app/core/engine/game-engine.ts`
- Test: `src/app/core/engine/game-engine.spec.ts` (thêm khối describe mới)

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `src/app/core/engine/game-engine.spec.ts`:

```ts
describe('revealNextPlayer', () => {
  it('chuyền máy lần lượt theo đúng thứ tự danh sách', () => {
    const rng = createSeededRng(11);
    let result = createGame(makeInput({ players: makePlayers(4), rng }));

    result = revealNextPlayer(result.state, rng);
    expect(result.state.dealtCount).toBe(1);
    expect(result.events).toEqual([
      { type: 'PASS_DEVICE', payload: { player: 'Người 1' } },
    ]);

    result = revealNextPlayer(result.state, rng);
    expect(result.events).toEqual([
      { type: 'PASS_DEVICE', payload: { player: 'Người 2' } },
    ]);
  });

  it('người cuối cùng xem xong thì tự mở vòng nói đầu tiên', () => {
    const rng = createSeededRng(11);
    let result = createGame(makeInput({ players: makePlayers(4), rng }));

    for (let i = 0; i < 4; i++) {
      result = revealNextPlayer(result.state, rng);
    }

    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.round).toBe(1);
    expect(result.state.speakingOrder).toHaveLength(4);
    expect([...result.state.speakingOrder].sort()).toEqual([
      'p0',
      'p1',
      'p2',
      'p3',
    ]);
    expect(result.state.speakerIndex).toBe(0);

    expect(result.events.map((event) => event.type)).toEqual([
      'ROUND_START',
      'SPEAKER_TURN',
    ]);
  });

  it('thứ tự nói không phải lúc nào cũng trùng thứ tự danh sách', () => {
    const orders = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const rng = createSeededRng(seed);
      let result = createGame(makeInput({ players: makePlayers(5), rng }));
      for (let i = 0; i < 5; i++) result = revealNextPlayer(result.state, rng);
      orders.add(result.state.speakingOrder.join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('báo lỗi khi gọi ngoài pha chia bài', () => {
    const rng = createSeededRng(11);
    let result = createGame(makeInput({ players: makePlayers(4), rng }));
    for (let i = 0; i < 4; i++) result = revealNextPlayer(result.state, rng);

    expect(() => revealNextPlayer(result.state, rng)).toThrow(/chia bài/);
  });
});
```

Đồng thời sửa dòng import ở đầu file spec:

```ts
import {
  buildCard,
  createGame,
  NewGameInput,
  revealNextPlayer,
} from './game-engine';
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — `revealNextPlayer` chưa được export.

- [ ] **Step 3: Cài đặt**

Thêm vào `src/app/core/engine/game-engine.ts`, sau hàm `buildCard`:

```ts
function nameOf(state: GameState, playerId: string): string {
  return state.players.find((player) => player.id === playerId)?.name ?? '';
}

/**
 * Mở một vòng nói mới: xáo lại thứ tự trong số người còn sống và đưa về
 * người nói đầu tiên. Cũng dọn sạch dấu vết của lượt vote trước.
 */
function startRound(state: GameState, rng: Rng): EngineResult {
  const speakingOrder = shuffle(rng, state.aliveIds);
  const next: GameState = {
    ...state,
    phase: 'SPEAKING',
    speakingOrder,
    speakerIndex: 0,
    tiedCandidateIds: [],
    revoteUsed: false,
  };

  return {
    state: next,
    events: [
      { type: 'ROUND_START', payload: { village: next.villageName, round: next.round } },
      { type: 'SPEAKER_TURN', payload: { player: nameOf(next, speakingOrder[0]) } },
    ],
  };
}

export function revealNextPlayer(state: GameState, rng: Rng): EngineResult {
  if (state.phase !== 'DEALING') {
    throw new Error('revealNextPlayer: chỉ gọi được ở pha chia bài');
  }

  const dealtCount = state.dealtCount + 1;
  const dealt: GameState = { ...state, dealtCount };

  if (dealtCount < state.players.length) {
    return {
      state: dealt,
      events: [
        { type: 'PASS_DEVICE', payload: { player: state.players[dealtCount].name } },
      ],
    };
  }

  return startRound(dealt, rng);
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `game-engine.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/game-engine.ts src/app/core/engine/game-engine.spec.ts
git commit -m "feat: them chia bai va mo vong noi"
```

---

## Task 11: Engine — vòng nói và mở vote

Cài đặt cách đếm vòng ở mục 3.4. Đây là chỗ dễ lệch một đơn vị: `round` bắt đầu từ 1, và vote mở khi người cuối cùng của vòng thứ `minRoundsBeforeVote` nói xong.

**Files:**
- Modify: `src/app/core/engine/game-engine.ts`
- Test: `src/app/core/engine/game-engine.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `src/app/core/engine/game-engine.spec.ts`:

```ts
describe('advanceSpeaker', () => {
  /** Chia bài xong xuôi cho `count` người, trả về state ở pha nói vòng 1. */
  function dealt(count: number, seed: number, config?: Partial<GameConfig>) {
    const rng = createSeededRng(seed);
    let result = createGame(
      makeInput({
        players: makePlayers(count),
        rng,
        config: { ...DEFAULT_GAME_CONFIG, ...config },
      }),
    );
    for (let i = 0; i < count; i++) result = revealNextPlayer(result.state, rng);
    return { state: result.state, rng };
  }

  it('đi qua từng người trong vòng và báo tên người kế tiếp', () => {
    const { state, rng } = dealt(4, 21);

    const result = advanceSpeaker(state, rng);
    expect(result.state.speakerIndex).toBe(1);
    expect(result.events).toEqual([
      {
        type: 'SPEAKER_TURN',
        payload: { player: nameOfPlayer(state, state.speakingOrder[1]) },
      },
    ]);
  });

  it('hết vòng mà chưa đủ số vòng tối thiểu thì sang vòng tiếp theo', () => {
    let { state, rng } = dealt(4, 21);

    for (let i = 0; i < 4; i++) state = advanceSpeaker(state, rng).state;

    expect(state.round).toBe(2);
    expect(state.phase).toBe('SPEAKING');
    expect(state.speakerIndex).toBe(0);
  });

  it('vote mở đúng ở cuối vòng 3 với thiết lập mặc định', () => {
    let { state, rng } = dealt(4, 21);

    // Vòng 1 và vòng 2 trôi qua, vẫn ở pha nói.
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < 4; i++) state = advanceSpeaker(state, rng).state;
      expect(state.phase).toBe('SPEAKING');
    }
    expect(state.round).toBe(3);

    // Ba người đầu của vòng 3 nói xong, vẫn chưa mở vote.
    for (let i = 0; i < 3; i++) state = advanceSpeaker(state, rng).state;
    expect(state.phase).toBe('SPEAKING');

    // Người thứ tư nói xong thì vote mở ngay.
    const opened = advanceSpeaker(state, rng);
    expect(opened.state.phase).toBe('VOTING');
    expect(opened.state.round).toBe(3);
    expect(opened.events).toEqual([
      { type: 'VOTE_OPEN', payload: { village: 'Ác Quỷ', round: 3 } },
    ]);
  });

  it('tôn trọng thiết lập số vòng tối thiểu khác mặc định', () => {
    let { state, rng } = dealt(4, 21, { minRoundsBeforeVote: 1 });

    for (let i = 0; i < 4; i++) state = advanceSpeaker(state, rng).state;

    expect(state.phase).toBe('VOTING');
    expect(state.round).toBe(1);
  });

  it('mỗi vòng mới đều xáo lại thứ tự nói', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 25; seed++) {
      let { state, rng } = dealt(5, seed);
      const first = state.speakingOrder.join(',');
      for (let i = 0; i < 5; i++) state = advanceSpeaker(state, rng).state;
      seen.add(`${first}|${state.speakingOrder.join(',')}`);
    }
    const differed = [...seen].filter((entry) => {
      const [before, after] = entry.split('|');
      return before !== after;
    });
    expect(differed.length).toBeGreaterThan(0);
  });

  it('mở vote thì xoá sạch dấu vết lượt vote trước', () => {
    let { state, rng } = dealt(4, 21, { minRoundsBeforeVote: 1 });
    state = { ...state, tiedCandidateIds: ['p0'], revoteUsed: true };

    for (let i = 0; i < 4; i++) state = advanceSpeaker(state, rng).state;

    expect(state.tiedCandidateIds).toEqual([]);
    expect(state.revoteUsed).toBe(false);
  });

  it('báo lỗi khi gọi ngoài pha nói', () => {
    const { state, rng } = dealt(4, 21);
    const voting = { ...state, phase: 'VOTING' as const };
    expect(() => advanceSpeaker(voting, rng)).toThrow(/pha nói/);
  });
});
```

Thêm hàm trợ giúp nhỏ này vào phần đầu file spec, ngay sau `makeInput`:

```ts
function nameOfPlayer(
  state: { players: Player[] },
  playerId: string,
): string {
  return state.players.find((player) => player.id === playerId)!.name;
}
```

Và cập nhật dòng import:

```ts
import {
  advanceSpeaker,
  buildCard,
  createGame,
  NewGameInput,
  revealNextPlayer,
} from './game-engine';
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — `advanceSpeaker` chưa được export.

- [ ] **Step 3: Cài đặt**

Thêm vào `src/app/core/engine/game-engine.ts`, sau `revealNextPlayer`:

```ts
/**
 * Người đang nói bấm xong lượt.
 *
 * Cách đếm vòng theo mục 3.4: round bắt đầu từ 1 và là số thứ tự của vòng
 * đang diễn ra. Khi người cuối cùng nói xong, nếu round đã đạt
 * minRoundsBeforeVote thì mở vote ngay tại đây; nếu chưa thì tăng round
 * và mở vòng mới. Với mặc định 3, lần vote đầu tiên rơi vào cuối vòng 3.
 */
export function advanceSpeaker(state: GameState, rng: Rng): EngineResult {
  if (state.phase !== 'SPEAKING') {
    throw new Error('advanceSpeaker: chỉ gọi được ở pha nói');
  }

  const speakerIndex = state.speakerIndex + 1;

  if (speakerIndex < state.speakingOrder.length) {
    const next: GameState = { ...state, speakerIndex };
    return {
      state: next,
      events: [
        {
          type: 'SPEAKER_TURN',
          payload: { player: nameOf(next, next.speakingOrder[speakerIndex]) },
        },
      ],
    };
  }

  if (state.round >= state.config.minRoundsBeforeVote) {
    const next: GameState = {
      ...state,
      phase: 'VOTING',
      tiedCandidateIds: [],
      revoteUsed: false,
    };
    return {
      state: next,
      events: [
        { type: 'VOTE_OPEN', payload: { village: next.villageName, round: next.round } },
      ],
    };
  }

  return startRound({ ...state, round: state.round + 1 }, rng);
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `game-engine.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/game-engine.ts src/app/core/engine/game-engine.spec.ts
git commit -m "feat: them vong noi va mo vote dung thoi diem"
```

---

## Task 12: Engine — nộp phiếu và loại người

Cài đặt mục 3.7, gồm cả ngoại lệ bốc ngẫu nhiên khi chỉ còn 2 người sống.

**Files:**
- Modify: `src/app/core/engine/game-engine.ts`
- Test: `src/app/core/engine/game-engine.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `src/app/core/engine/game-engine.spec.ts`:

```ts
describe('submitVotes', () => {
  /** Dựng nhanh một state đang ở pha vote, dùng makeState cho gọn. */
  function voting(roles: Role[], aliveIndexes: number[]) {
    return makeState({ roles, aliveIndexes, phase: 'VOTING', round: 3 });
  }

  it('loại người nhiều phiếu nhất và chuyển sang pha lộ danh tính', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]);
    const result = submitVotes(state, { p0: 3, p3: 1 }, createSeededRng(1));

    expect(result.state.aliveIds).toEqual(['p1', 'p2', 'p3']);
    expect(result.state.phase).toBe('REVEAL');
    expect(result.state.eliminations).toEqual([
      { round: 3, playerId: 'p0', role: 'CIVILIAN', byRandomTieBreak: false },
    ]);
    expect(result.events).toEqual([
      { type: 'CIVILIAN_KILLED', payload: { player: 'Người 0', village: 'Thử Nghiệm' } },
    ]);
  });

  it('bắt được gián điệp thì phát sự kiện riêng', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]);
    const result = submitVotes(state, { p3: 3 }, createSeededRng(1));

    expect(result.events[0].type).toBe('SPY_CAUGHT');
  });

  it('loại mũ trắng thì chuyển thẳng sang pha đoán từ', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [0, 1, 2, 3]);
    const result = submitVotes(state, { p3: 3 }, createSeededRng(1));

    expect(result.state.phase).toBe('WHITE_GUESS');
    expect(result.events[0].type).toBe('WHITE_REVEALED');
  });

  it('hoà phiếu thì chuyển sang pha xử hoà và ghi lại danh sách hoà', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]);
    const result = submitVotes(state, { p0: 2, p3: 2 }, createSeededRng(1));

    expect(result.state.phase).toBe('TIE_BREAK');
    expect([...result.state.tiedCandidateIds].sort()).toEqual(['p0', 'p3']);
    expect(result.state.aliveIds).toHaveLength(4);
    expect(result.events[0].type).toBe('VOTE_TIE');
  });

  it('bỏ phiếu lại mà vẫn hoà thì không loại ai và sang vòng mới', () => {
    const state = {
      ...voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]),
      tiedCandidateIds: ['p0', 'p3'],
      revoteUsed: true,
    };
    const result = submitVotes(state, { p0: 2, p3: 2 }, createSeededRng(1));

    expect(result.state.aliveIds).toHaveLength(4);
    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.round).toBe(4);
    expect(result.events[0].type).toBe('NO_ELIMINATION');
  });

  it('chỉ còn 2 người sống mà hoà thì bốc ngẫu nhiên, không treo ván', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [0, 3]);
    const result = submitVotes(state, { p0: 1, p3: 1 }, createSeededRng(4));

    expect(result.state.aliveIds).toHaveLength(1);
    expect(result.state.eliminations[0].byRandomTieBreak).toBe(true);
    expect(result.events[0].type).toBe('RANDOM_TIE_BREAK');
  });

  it('bốc ngẫu nhiên ở 2 người cuối không thiên vị một phía', () => {
    const eliminated = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const state = voting(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [0, 3]);
      const result = submitVotes(state, { p0: 1, p3: 1 }, createSeededRng(seed));
      eliminated.add(result.state.eliminations[0].playerId);
    }
    expect(eliminated).toEqual(new Set(['p0', 'p3']));
  });

  it('từ chối bảng phiếu không hợp lệ', () => {
    const state = voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]);

    expect(() => submitVotes(state, { p0: 5 }, createSeededRng(1))).toThrow(
      /không hợp lệ/,
    );
    expect(() => submitVotes(state, {}, createSeededRng(1))).toThrow(/không hợp lệ/);
  });

  it('ở lượt bỏ phiếu lại chỉ những người đang hoà mới được nhận phiếu', () => {
    const state = {
      ...voting(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 2, 3]),
      tiedCandidateIds: ['p0', 'p3'],
      revoteUsed: true,
    };

    expect(() => submitVotes(state, { p1: 2 }, createSeededRng(1))).toThrow(
      /không hợp lệ/,
    );
  });

  it('báo lỗi khi gọi ngoài pha vote', () => {
    const state = makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'] });
    expect(() => submitVotes(state, { p0: 1 }, createSeededRng(1))).toThrow(/pha vote/);
  });
});
```

Cập nhật import ở đầu file spec:

```ts
import { DEFAULT_GAME_CONFIG, GameConfig, Player, Role } from '../models';
import {
  advanceSpeaker,
  buildCard,
  createGame,
  NewGameInput,
  revealNextPlayer,
  submitVotes,
} from './game-engine';
import { createSeededRng } from './rng';
import { makeState } from './testing/make-state';
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — `submitVotes` chưa được export.

- [ ] **Step 3: Cài đặt**

Thêm import vào đầu `src/app/core/engine/game-engine.ts`:

```ts
import { Rng, pickIndex, shuffle } from './rng';
import { findVoteLeaders, isTallyValid, VoteTally } from './vote-resolver';
```

Thêm vào cuối `src/app/core/engine/game-engine.ts`:

```ts
/** Loại một người và chuyển sang pha lộ danh tính tương ứng với vai của họ. */
function eliminate(
  state: GameState,
  playerId: string,
  byRandomTieBreak: boolean,
): EngineResult {
  const role = state.assignments[playerId].role;
  const playerName = nameOf(state, playerId);

  const next: GameState = {
    ...state,
    aliveIds: state.aliveIds.filter((id) => id !== playerId),
    eliminations: [
      ...state.eliminations,
      { round: state.round, playerId, role, byRandomTieBreak },
    ],
    tiedCandidateIds: [],
    revoteUsed: false,
    phase: role === 'WHITE' ? 'WHITE_GUESS' : 'REVEAL',
  };

  const events: NarrationEvent[] = [];
  if (byRandomTieBreak) {
    events.push({ type: 'RANDOM_TIE_BREAK', payload: { player: playerName } });
  }

  const payload = { player: playerName, village: state.villageName };
  if (role === 'WHITE') events.push({ type: 'WHITE_REVEALED', payload });
  else if (role === 'SPY') events.push({ type: 'SPY_CAUGHT', payload });
  else events.push({ type: 'CIVILIAN_KILLED', payload });

  return { state: next, events };
}

/** Vòng này không ai bị loại: quay lại vòng nói, không kiểm tra kết thúc. */
function noElimination(state: GameState, rng: Rng): EngineResult {
  const started = startRound({ ...state, round: state.round + 1 }, rng);
  return {
    state: started.state,
    events: [
      {
        type: 'NO_ELIMINATION',
        payload: { village: state.villageName, round: state.round },
      },
      ...started.events,
    ],
  };
}

export function submitVotes(
  state: GameState,
  tally: VoteTally,
  rng: Rng,
): EngineResult {
  if (state.phase !== 'VOTING') {
    throw new Error('submitVotes: chỉ gọi được ở pha vote');
  }

  // Ở lượt bỏ phiếu lại, chỉ những người đang hoà mới được nhận phiếu,
  // nhưng số người bỏ phiếu vẫn là toàn bộ người còn sống.
  const candidates =
    state.tiedCandidateIds.length > 0 ? state.tiedCandidateIds : state.aliveIds;

  if (!isTallyValid(tally, candidates, state.aliveIds.length)) {
    throw new Error('submitVotes: bảng phiếu không hợp lệ');
  }

  const leaders = findVoteLeaders(tally);
  if (leaders.length === 1) return eliminate(state, leaders[0], false);

  // Ngoại lệ mục 3.7: còn đúng 2 người sống thì buộc phải phân định,
  // nếu để "không loại ai" thì ván lặp vô tận.
  if (state.aliveIds.length === 2) {
    return eliminate(state, leaders[pickIndex(rng, leaders.length)], true);
  }

  if (state.revoteUsed) return noElimination(state, rng);

  const next: GameState = { ...state, phase: 'TIE_BREAK', tiedCandidateIds: leaders };
  return {
    state: next,
    events: [
      { type: 'VOTE_TIE', payload: { village: next.villageName, round: next.round } },
    ],
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `game-engine.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/game-engine.ts src/app/core/engine/game-engine.spec.ts
git commit -m "feat: them nop phieu va loai nguoi"
```

---

## Task 13: Engine — xử hoà phiếu

**Files:**
- Modify: `src/app/core/engine/game-engine.ts`
- Test: `src/app/core/engine/game-engine.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `src/app/core/engine/game-engine.spec.ts`:

```ts
describe('resolveTie', () => {
  function tieBreak() {
    return makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'],
      aliveIndexes: [0, 1, 2, 3],
      phase: 'TIE_BREAK',
      round: 3,
      tiedCandidateIds: ['p0', 'p3'],
    });
  }

  it('chọn bỏ phiếu lại thì quay về pha vote và đánh dấu đã dùng quyền', () => {
    const result = resolveTie(tieBreak(), 'REVOTE', createSeededRng(1));

    expect(result.state.phase).toBe('VOTING');
    expect(result.state.revoteUsed).toBe(true);
    expect(result.state.tiedCandidateIds).toEqual(['p0', 'p3']);
    expect(result.state.round).toBe(3);
    expect(result.events[0].type).toBe('VOTE_OPEN');
  });

  it('chọn không loại ai thì sang vòng nói mới và không ai chết', () => {
    const result = resolveTie(tieBreak(), 'NO_ELIMINATION', createSeededRng(1));

    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.round).toBe(4);
    expect(result.state.aliveIds).toHaveLength(4);
    expect(result.state.eliminations).toHaveLength(0);
    expect(result.state.tiedCandidateIds).toEqual([]);
    expect(result.state.revoteUsed).toBe(false);
    expect(result.events[0].type).toBe('NO_ELIMINATION');
  });

  it('sau khi bỏ phiếu lại, người ngoài danh sách hoà không nhận được phiếu', () => {
    const revoting = resolveTie(tieBreak(), 'REVOTE', createSeededRng(1)).state;

    expect(() => submitVotes(revoting, { p1: 2 }, createSeededRng(1))).toThrow(
      /không hợp lệ/,
    );

    const decided = submitVotes(revoting, { p0: 3, p3: 1 }, createSeededRng(1));
    expect(decided.state.eliminations[0].playerId).toBe('p0');
  });

  it('bỏ phiếu lại rồi vẫn hoà thì tự động không loại ai', () => {
    const revoting = resolveTie(tieBreak(), 'REVOTE', createSeededRng(1)).state;
    const result = submitVotes(revoting, { p0: 2, p3: 2 }, createSeededRng(1));

    expect(result.state.aliveIds).toHaveLength(4);
    expect(result.state.phase).toBe('SPEAKING');
    expect(result.events[0].type).toBe('NO_ELIMINATION');
  });

  it('báo lỗi khi gọi ngoài pha xử hoà', () => {
    const state = makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'] });
    expect(() => resolveTie(state, 'REVOTE', createSeededRng(1))).toThrow(/xử hoà/);
  });
});
```

Cập nhật import:

```ts
import {
  advanceSpeaker,
  buildCard,
  createGame,
  NewGameInput,
  resolveTie,
  revealNextPlayer,
  submitVotes,
} from './game-engine';
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — `resolveTie` chưa được export.

- [ ] **Step 3: Cài đặt**

Thêm vào cuối `src/app/core/engine/game-engine.ts`:

```ts
export type TieChoice = 'REVOTE' | 'NO_ELIMINATION';

export function resolveTie(
  state: GameState,
  choice: TieChoice,
  rng: Rng,
): EngineResult {
  if (state.phase !== 'TIE_BREAK') {
    throw new Error('resolveTie: chỉ gọi được ở pha xử hoà');
  }

  if (choice === 'NO_ELIMINATION') return noElimination(state, rng);

  const next: GameState = { ...state, phase: 'VOTING', revoteUsed: true };
  return {
    state: next,
    events: [
      { type: 'VOTE_OPEN', payload: { village: next.villageName, round: next.round } },
    ],
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `game-engine.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/game-engine.ts src/app/core/engine/game-engine.spec.ts
git commit -m "feat: them xu hoa phieu"
```

---

## Task 14: Engine — mũ trắng đoán từ và kiểm tra kết thúc

Hai hàm cuối khép kín vòng lặp của ván.

**Files:**
- Modify: `src/app/core/engine/game-engine.ts`
- Test: `src/app/core/engine/game-engine.spec.ts`

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `src/app/core/engine/game-engine.spec.ts`:

```ts
describe('submitWhiteGuess', () => {
  function whiteGuessing(aliveIndexes: number[]) {
    return makeState({
      roles: ['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'],
      aliveIndexes,
      phase: 'WHITE_GUESS',
      round: 3,
    });
  }

  it('đoán đúng thì mũ trắng thắng ngay, ván dừng lập tức', () => {
    const result = submitWhiteGuess(whiteGuessing([0, 1, 2]), TEST_CIVILIAN_WORD);

    expect(result.state.phase).toBe('ENDED');
    expect(result.state.outcome).toBe('WHITE');
    expect(result.state.whiteGuess).toEqual({
      text: TEST_CIVILIAN_WORD,
      correct: true,
    });
    expect(result.events.map((event) => event.type)).toEqual([
      'WHITE_GUESS_CORRECT',
      'WHITE_WIN',
    ]);
  });

  it('chấp nhận đoán đúng dù thiếu dấu', () => {
    const result = submitWhiteGuess(
      whiteGuessing([0, 1, 2]),
      'qua thanh long bi mat',
    );

    expect(result.state.outcome).toBe('WHITE');
  });

  it('đoán đúng thắng đè cả lên tình huống gián điệp đang áp đảo', () => {
    // Còn 1 dân và 1 gián điệp: bình thường là gián điệp thắng.
    const result = submitWhiteGuess(whiteGuessing([0, 2]), TEST_CIVILIAN_WORD);

    expect(result.state.outcome).toBe('WHITE');
  });

  it('đoán sai thì rời ván và chuyển sang pha lộ danh tính', () => {
    const result = submitWhiteGuess(whiteGuessing([0, 1, 2]), 'cái bàn gỗ');

    expect(result.state.phase).toBe('REVEAL');
    expect(result.state.outcome).toBeNull();
    expect(result.state.whiteGuess).toEqual({ text: 'cái bàn gỗ', correct: false });
    expect(result.events.map((event) => event.type)).toEqual(['WHITE_GUESS_WRONG']);
  });

  it('báo lỗi khi gọi ngoài pha đoán từ', () => {
    const state = makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'] });
    expect(() => submitWhiteGuess(state, 'gì đó')).toThrow(/đoán từ/);
  });
});

describe('continueAfterReveal', () => {
  function revealed(roles: Role[], aliveIndexes: number[]) {
    return makeState({ roles, aliveIndexes, phase: 'REVEAL', round: 3 });
  }

  it('ván chưa ngã ngũ thì sang vòng nói mới với thứ tự xáo lại', () => {
    const state = revealed(['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1, 3]);
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.round).toBe(4);
    expect(result.state.speakerIndex).toBe(0);
    expect([...result.state.speakingOrder].sort()).toEqual(['p0', 'p1', 'p3']);
    expect(result.events.map((event) => event.type)).toEqual([
      'ROUND_START',
      'SPEAKER_TURN',
    ]);
  });

  it('dân làng thắng thì kết thúc và phát đúng sự kiện', () => {
    const state = revealed(['CIVILIAN', 'CIVILIAN', 'SPY'], [0, 1]);
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.phase).toBe('ENDED');
    expect(result.state.outcome).toBe('CIVILIANS');
    expect(result.events).toEqual([
      { type: 'CIVILIANS_WIN', payload: { village: 'Thử Nghiệm' } },
    ]);
  });

  it('gián điệp thắng thì kết thúc và phát đúng sự kiện', () => {
    const state = revealed(['CIVILIAN', 'CIVILIAN', 'SPY'], [0, 2]);
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.outcome).toBe('SPIES');
    expect(result.events[0].type).toBe('SPIES_WIN');
  });

  it('chỉ còn mũ trắng sống một mình thì mũ trắng thắng', () => {
    const state = revealed(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [3]);
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.outcome).toBe('WHITE');
    expect(result.events[0].type).toBe('WHITE_WIN');
  });

  it('hết gián điệp mà mũ trắng còn sống thì ván tiếp tục', () => {
    const state = revealed(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [0, 1, 3]);
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.outcome).toBeNull();
  });

  it('mũ trắng đoán sai rồi thì trận tiếp tục bình thường', () => {
    const state = {
      ...revealed(['CIVILIAN', 'CIVILIAN', 'SPY', 'WHITE'], [0, 1, 2]),
      whiteGuess: { text: 'sai bét', correct: false },
    };
    const result = continueAfterReveal(state, createSeededRng(9));

    expect(result.state.phase).toBe('SPEAKING');
    expect(result.state.outcome).toBeNull();
  });

  it('báo lỗi khi gọi ngoài pha lộ danh tính', () => {
    const state = makeState({ roles: ['CIVILIAN', 'CIVILIAN', 'CIVILIAN', 'SPY'] });
    expect(() => continueAfterReveal(state, createSeededRng(9))).toThrow(
      /lộ danh tính/,
    );
  });
});
```

Cập nhật import:

```ts
import {
  advanceSpeaker,
  buildCard,
  continueAfterReveal,
  createGame,
  NewGameInput,
  resolveTie,
  revealNextPlayer,
  submitVotes,
  submitWhiteGuess,
} from './game-engine';
import { createSeededRng } from './rng';
import { makeState, TEST_CIVILIAN_WORD } from './testing/make-state';
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — `submitWhiteGuess` và `continueAfterReveal` chưa được export.

- [ ] **Step 3: Cài đặt**

Thêm import vào đầu `src/app/core/engine/game-engine.ts`:

```ts
import { isGuessCorrect } from './guess-matcher';
import { evaluateOutcome } from './win-conditions';
```

Và thêm vào cuối file, cùng với kiểu `NarrationEventType` trong danh sách import từ `../models`:

```ts
export function submitWhiteGuess(state: GameState, text: string): EngineResult {
  if (state.phase !== 'WHITE_GUESS') {
    throw new Error('submitWhiteGuess: chỉ gọi được ở pha mũ trắng đoán từ');
  }

  const correct = isGuessCorrect(text, state.civilianWord);
  const guessed: GameState = { ...state, whiteGuess: { text, correct } };

  if (correct) {
    const next: GameState = { ...guessed, phase: 'ENDED', outcome: 'WHITE' };
    return {
      state: next,
      events: [
        { type: 'WHITE_GUESS_CORRECT', payload: { village: next.villageName } },
        { type: 'WHITE_WIN', payload: { village: next.villageName } },
      ],
    };
  }

  return {
    state: { ...guessed, phase: 'REVEAL' },
    events: [
      { type: 'WHITE_GUESS_WRONG', payload: { village: guessed.villageName } },
    ],
  };
}

const WIN_EVENT: Record<string, NarrationEventType> = {
  CIVILIANS: 'CIVILIANS_WIN',
  SPIES: 'SPIES_WIN',
  WHITE: 'WHITE_WIN',
};

export function continueAfterReveal(state: GameState, rng: Rng): EngineResult {
  if (state.phase !== 'REVEAL') {
    throw new Error('continueAfterReveal: chỉ gọi được ở pha lộ danh tính');
  }

  const outcome = evaluateOutcome(state);
  if (outcome === null) {
    return startRound({ ...state, round: state.round + 1 }, rng);
  }

  const next: GameState = { ...state, phase: 'ENDED', outcome };
  return {
    state: next,
    events: [{ type: WIN_EVENT[outcome], payload: { village: next.villageName } }],
  };
}
```

Cập nhật dòng import kiểu ở đầu `game-engine.ts` cho đủ:

```ts
import {
  Assignment,
  CardContent,
  GameConfig,
  GameState,
  NarrationEvent,
  NarrationEventType,
  Player,
  Role,
} from '../models';
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ `game-engine.spec.ts`.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/game-engine.ts src/app/core/engine/game-engine.spec.ts
git commit -m "feat: them mu trang doan tu va kiem tra ket thuc"
```

---

## Task 15: Hai test toàn cục

Đây là hai test quan trọng nhất trong cả bản kế hoạch. Chúng không kiểm một luật lẻ mà kiểm hai tính chất phải đúng trên mọi đường đi của ván.

**Files:**
- Create: `src/app/core/engine/game-engine.invariants.spec.ts`

- [ ] **Step 1: Viết test bất biến**

Khác các task trước, task này không thêm code cài đặt nào. Nếu engine ở Task 9 đến Task 14 đúng thì các test dưới đây xanh ngay lần chạy đầu. Nếu đỏ thì có một nhánh luật sai, và thông báo lỗi được viết để chỉ thẳng ra nhánh đó.

Tạo `src/app/core/engine/game-engine.invariants.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_CONFIG,
  GameConfig,
  GameState,
  NarrationEvent,
  Player,
} from '../models';
import {
  advanceSpeaker,
  continueAfterReveal,
  createGame,
  resolveTie,
  revealNextPlayer,
  submitVotes,
  submitWhiteGuess,
} from './game-engine';
import { createSeededRng, Rng } from './rng';

const CIVILIAN_WORD = 'quả thanh long bí mật';
const SPY_WORD = 'quả vải thiều bí mật';

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    name: `Người ${index}`,
  }));
}

function startGame(playerCount: number, config: Partial<GameConfig>, seed: number) {
  const rng = createSeededRng(seed);
  const result = createGame({
    gameId: 'g',
    villageName: 'Ác Quỷ',
    players: makePlayers(playerCount),
    config: { ...DEFAULT_GAME_CONFIG, ...config },
    pair: { id: 'pair', civilianWord: CIVILIAN_WORD, spyWord: SPY_WORD },
    rng,
  });
  return { result, rng };
}

interface PlayOptions {
  /** Chọn người bị loại trong số ứng viên. Mặc định lấy người đầu danh sách. */
  chooseTarget?: (candidates: string[], state: GameState) => string;
  /** Chọn cách xử khi hoà phiếu. */
  tieChoice?: 'REVOTE' | 'NO_ELIMINATION';
  /** Mũ trắng đoán đúng hay sai. */
  whiteGuessesRight?: boolean;
  /**
   * Ép hoà cho `forceTieCount` lượt vote đầu tiên, sau đó vote dứt khoát.
   *
   * Cố tình KHÔNG có tuỳ chọn "hoà mãi mãi". Nếu cả bàn quyết định hoà ở mọi
   * lượt vote thì không ai bị loại và ván không bao giờ kết thúc — nhưng đó là
   * lựa chọn của người chơi chứ không phải lỗi của engine, và luật ở mục 3.7
   * cho phép "không loại ai" một cách có chủ đích. Engine chỉ có nghĩa vụ kết
   * thúc khi các lượt vote rốt cuộc có phân định.
   */
  forceTieCount?: number;
}

/**
 * Chơi tự động tới khi ván kết thúc, thu lại mọi sự kiện dẫn chuyện.
 * Có bộ đếm chặn để test thất bại rõ ràng thay vì treo mãi nếu engine lặp.
 */
function playToEnd(
  state: GameState,
  rng: Rng,
  options: PlayOptions = {},
): { state: GameState; events: NarrationEvent[] } {
  const chooseTarget =
    options.chooseTarget ?? ((candidates: string[]) => candidates[0]);
  let current = state;
  const events: NarrationEvent[] = [];
  let steps = 0;
  let votesCast = 0;

  while (current.phase !== 'ENDED') {
    if (++steps > 1000) {
      throw new Error(
        `Ván không kết thúc sau 1000 bước. Pha hiện tại: ${current.phase}, ` +
          `còn sống: ${current.aliveIds.length}`,
      );
    }

    switch (current.phase) {
      case 'DEALING': {
        const step = revealNextPlayer(current, rng);
        current = step.state;
        events.push(...step.events);
        break;
      }
      case 'SPEAKING': {
        const step = advanceSpeaker(current, rng);
        current = step.state;
        events.push(...step.events);
        break;
      }
      case 'VOTING': {
        const candidates =
          current.tiedCandidateIds.length > 0
            ? current.tiedCandidateIds
            : current.aliveIds;

        const tally: Record<string, number> = {};
        const shouldTie =
          votesCast < (options.forceTieCount ?? 0) && candidates.length >= 2;
        votesCast++;

        if (shouldTie) {
          tally[candidates[0]] = 1;
          tally[candidates[1]] = 1;
        } else {
          tally[chooseTarget([...candidates], current)] = 1;
        }

        const step = submitVotes(current, tally, rng);
        current = step.state;
        events.push(...step.events);
        break;
      }
      case 'TIE_BREAK': {
        const step = resolveTie(current, options.tieChoice ?? 'NO_ELIMINATION', rng);
        current = step.state;
        events.push(...step.events);
        break;
      }
      case 'WHITE_GUESS': {
        const guess = options.whiteGuessesRight ? CIVILIAN_WORD : 'hoàn toàn sai';
        const step = submitWhiteGuess(current, guess);
        current = step.state;
        events.push(...step.events);
        break;
      }
      case 'REVEAL': {
        const step = continueAfterReveal(current, rng);
        current = step.state;
        events.push(...step.events);
        break;
      }
    }
  }

  return { state: current, events };
}

describe('bất biến: ván luôn kết thúc', () => {
  it('đội hình 4 người có mũ trắng: mọi thứ tự loại người đều kết thúc', () => {
    const ids = ['p0', 'p1', 'p2', 'p3'];
    const orders: string[][] = [];
    for (const a of ids)
      for (const b of ids)
        for (const c of ids)
          for (const d of ids)
            if (new Set([a, b, c, d]).size === 4) orders.push([a, b, c, d]);

    expect(orders).toHaveLength(24);

    for (const order of orders) {
      for (const whiteGuessesRight of [false, true]) {
        const { result, rng } = startGame(4, { spyCount: 1, hasWhite: true }, 1);
        let cursor = 0;

        const ended = playToEnd(result.state, rng, {
          whiteGuessesRight,
          chooseTarget: (candidates) => {
            while (cursor < order.length && !candidates.includes(order[cursor])) {
              cursor++;
            }
            return cursor < order.length ? order[cursor++] : candidates[0];
          },
        });

        expect(ended.state.phase).toBe('ENDED');
        expect(['CIVILIANS', 'SPIES', 'WHITE']).toContain(ended.state.outcome);
      }
    }
  });

  it('mọi sĩ số và cấu hình hợp lệ đều kết thúc', () => {
    for (let players = 4; players <= 12; players++) {
      for (const hasWhite of [false, true]) {
        for (let spyCount = 1; spyCount <= 3; spyCount++) {
          const contested = hasWhite ? players - 1 : players;
          if (spyCount > Math.ceil(contested / 2) - 1) continue;

          for (let seed = 0; seed < 3; seed++) {
            const { result, rng } = startGame(
              players,
              { spyCount, hasWhite },
              seed,
            );
            const ended = playToEnd(result.state, rng);
            expect(ended.state.phase).toBe('ENDED');
            expect(ended.state.outcome).not.toBeNull();
          }
        }
      }
    }
  });

  it('một chuỗi hoà dài rồi vote dứt khoát thì vẫn kết thúc', () => {
    for (const tieChoice of ['REVOTE', 'NO_ELIMINATION'] as const) {
      for (let players = 4; players <= 7; players++) {
        const { result, rng } = startGame(
          players,
          { spyCount: 1, hasWhite: true },
          players,
        );
        const ended = playToEnd(result.state, rng, {
          forceTieCount: 8,
          tieChoice,
        });

        expect(ended.state.phase).toBe('ENDED');
        expect(ended.state.outcome).not.toBeNull();
      }
    }
  });

  it('chuỗi hoà không làm hỏng trạng thái: không ai chết, vòng vẫn tăng', () => {
    const { result, rng } = startGame(6, { spyCount: 1, hasWhite: true }, 3);

    // Chơi tới lượt vote đầu tiên rồi ép hoà và chọn không loại ai.
    let current = result.state;
    for (let i = 0; i < 6; i++) current = revealNextPlayer(current, rng).state;
    while (current.phase === 'SPEAKING') {
      current = advanceSpeaker(current, rng).state;
    }
    expect(current.phase).toBe('VOTING');

    const roundBeforeTie = current.round;
    const tied = submitVotes(current, { p0: 1, p1: 1 }, rng).state;
    expect(tied.phase).toBe('TIE_BREAK');

    const after = resolveTie(tied, 'NO_ELIMINATION', rng).state;
    expect(after.aliveIds).toHaveLength(6);
    expect(after.eliminations).toHaveLength(0);
    expect(after.round).toBe(roundBeforeTie + 1);
    expect(after.phase).toBe('SPEAKING');
    expect(after.revoteUsed).toBe(false);
    expect(after.tiedCandidateIds).toEqual([]);
  });

  it('kết quả cuối cùng luôn nhất quán với trạng thái người sống', () => {
    for (let seed = 0; seed < 25; seed++) {
      const { result, rng } = startGame(5, { spyCount: 1, hasWhite: true }, seed);
      const ended = playToEnd(result.state, rng);
      const { state } = ended;

      const roleOf = (id: string) => state.assignments[id].role;
      const aliveSpies = state.aliveIds.filter((id) => roleOf(id) === 'SPY').length;
      const aliveWhites = state.aliveIds.filter((id) => roleOf(id) === 'WHITE').length;
      const aliveCivilians = state.aliveIds.filter(
        (id) => roleOf(id) === 'CIVILIAN',
      ).length;

      expect(state.outcome).not.toBeNull();

      if (state.outcome === 'CIVILIANS') {
        expect(aliveSpies).toBe(0);
        expect(aliveWhites).toBe(0);
      } else if (state.outcome === 'SPIES') {
        expect(aliveSpies).toBeGreaterThanOrEqual(aliveCivilians + aliveWhites);
      } else {
        // Mũ trắng thắng: hoặc đoán trúng từ, hoặc là người sống sót cuối cùng.
        const guessedRight = state.whiteGuess?.correct === true;
        const lastOneStanding =
          aliveWhites === 1 && aliveCivilians === 0 && aliveSpies === 0;
        expect(guessedRight || lastOneStanding).toBe(true);
      }
    }
  });
});

describe('bất biến: không rò rỉ từ bí mật', () => {
  it('không sự kiện dẫn chuyện nào chứa từ của dân làng hay của gián điệp', () => {
    for (let players = 4; players <= 8; players++) {
      for (const hasWhite of [false, true]) {
        for (const revealSpyToSpy of [false, true]) {
          for (const whiteGuessesRight of [false, true]) {
            const { result, rng } = startGame(
              players,
              { spyCount: 1, hasWhite, revealSpyToSpy },
              players,
            );
            const ended = playToEnd(result.state, rng, { whiteGuessesRight });

            const serialized = JSON.stringify([
              ...result.events,
              ...ended.events,
            ]);

            expect(serialized).not.toContain(CIVILIAN_WORD);
            expect(serialized).not.toContain(SPY_WORD);
            expect(serialized).not.toContain('thanh long');
            expect(serialized).not.toContain('vải thiều');
          }
        }
      }
    }
  });

  it('payload sự kiện chỉ chứa đúng ba khoá được phép', () => {
    const allowed = new Set(['village', 'player', 'round']);
    const { result, rng } = startGame(6, { spyCount: 2, hasWhite: true }, 42);
    const ended = playToEnd(result.state, rng);

    for (const event of [...result.events, ...ended.events]) {
      for (const key of Object.keys(event.payload)) {
        expect(allowed.has(key)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Chạy test**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS. Nếu test "ván luôn kết thúc" báo lỗi *"Ván không kết thúc sau 1000 bước"* thì đó là engine có nhánh lặp thật, không phải test viết sai — dùng thông tin pha và số người còn sống trong thông báo lỗi để lần ra nhánh nào.

- [ ] **Step 3: Chạy toàn bộ bộ test một lượt cuối**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS toàn bộ, không có test nào bị bỏ qua.

- [ ] **Step 4: Kiểm tra dự án vẫn build được**

```bash
cd /c/SRC/ai-la-gian-diep
npx ng build
```

Expected: build thành công.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/game-engine.invariants.spec.ts
git commit -m "test: them bat bien van luon ket thuc va khong ro ri tu bi mat"
```

---

## Xong bản kế hoạch này thì có gì

- Workspace Angular 21 chạy được, build được, test được.
- Engine luật chơi hoàn chỉnh dưới dạng TypeScript thuần, không phụ thuộc Angular.
- Bộ test phủ toàn bộ mục 3 và mục 11 của đặc tả, gồm hai bất biến quan trọng nhất: ván luôn kết thúc trên mọi nhánh, và không sự kiện dẫn chuyện nào làm lộ từ bí mật.

## Bản kế hoạch tiếp theo

Bản số 2 sẽ làm kho từ và lưu trữ trên máy: file `word-bank.json`, quy tắc bốc cặp từ ở mục 7 gồm cả chống lặp và hoán đổi ngẫu nhiên, và các repository đọc ghi qua Capacitor Preferences ở mục 9.
