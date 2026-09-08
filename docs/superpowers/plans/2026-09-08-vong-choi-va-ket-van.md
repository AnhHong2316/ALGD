# Vòng chơi và kết ván — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nối nốt phần còn thiếu để chơi trọn một ván: vòng nói có đồng hồ, vote, xử hoà, lộ danh tính, mũ trắng đoán từ, và màn kết ván có ghi điểm.

**Architecture:** Engine đã có sẵn toàn bộ luật chơi và đã được kiểm kỹ ở kế hoạch 1 — bản kế hoạch này **không đụng vào luật chơi**, chỉ bọc engine bằng màn hình. Mỗi pha của ván là một component riêng, và `GamePage` chọn component theo `state.phase` chứ không theo địa chỉ URL. Ngoại lệ duy nhất là Task 1: sửa hàm tính điểm sẵn có ở tầng lõi cho khoá theo tên người chơi thay vì theo id.

**Tech Stack:** Angular 21 standalone + zoneless + signals, Vitest, `@angular/build:unit-test`.

---

## Bối cảnh cần biết trước khi bắt đầu

### Đang có gì

Nhánh `feat/ui-play`, tách từ `main` sau khi gộp kế hoạch 3A. **288 test xanh trên 28 file.**

Chạy được tới hết pha chia bài: trang chủ → danh sách người chơi → cấu hình ván → chia bài chuyền tay. Chia xong người cuối thì engine tự chuyển sang pha `SPEAKING`, và `GamePage` hiện một màn giữ chỗ ghi "Chia bài xong". Bản kế hoạch này thay màn giữ chỗ đó bằng phần chơi thật.

### Engine đã có sẵn những gì

Đọc kỹ danh sách này. **Không viết lại luật trong component.** Mọi quyết định về luật đều đã nằm trong engine và đã có test:

```ts
// src/app/core/engine/game-engine.ts
advanceSpeaker(state, rng): EngineResult
submitVotes(state, tally: VoteTally, rng): EngineResult
resolveTie(state, choice: TieChoice, rng): EngineResult   // TieChoice = 'REVOTE' | 'NO_ELIMINATION'
submitWhiteGuess(state, text): EngineResult               // KHÔNG nhận rng
continueAfterReveal(state, rng): EngineResult
```

Mỗi hàm ném lỗi nếu gọi sai pha. Mỗi hàm trả về `{ state, events }`.

Những hành vi engine tự lo, component **không được** làm lại:

- `advanceSpeaker` tự biết khi nào hết người nói: chưa đủ `minRoundsBeforeVote` thì sang vòng mới, đủ rồi thì mở pha `VOTING`.
- `submitVotes` tự phân định: một người nhiều phiếu nhất thì loại người đó; hoà thì sang pha `TIE_BREAK`; **hoà mà chỉ còn đúng 2 người sống thì bốc ngẫu nhiên một người để loại, không qua pha `TIE_BREAK`**; hoà lần hai (đã dùng quyền bỏ phiếu lại) thì không loại ai.
- `submitVotes` ném lỗi nếu bảng phiếu không hợp lệ. Hợp lệ nghĩa là: chỉ chứa người được phép nhận phiếu, mọi số phiếu là số nguyên không âm, và tổng phiếu nằm trong khoảng `1 … số người còn sống`.
- Loại trúng mũ trắng thì pha kế là `WHITE_GUESS`, loại trúng người khác thì pha kế là `REVEAL`.
- `submitWhiteGuess` chấm từ có sai số (bỏ dấu, cho lệch 1–2 ký tự). Đoán đúng thì ván kết thúc ngay với `outcome: 'WHITE'`.
- `continueAfterReveal` kiểm điều kiện kết thúc. Chưa kết thúc thì sang vòng nói mới.

### Ba chỗ dễ làm sai

**1. Bảng phiếu ở lượt bỏ phiếu lại.** Khi `state.tiedCandidateIds` không rỗng, chỉ những người trong đó mới được nhận phiếu, nhưng **số người bỏ phiếu vẫn là toàn bộ người còn sống**. Màn vote phải hiện đúng tập ứng viên đó, không phải toàn bộ người sống.

**2. Ghi bảng điểm hai lần.** Ván kết thúc → ghi điểm vào bảng. Nhưng `ENDED` là một trạng thái được lưu xuống máy như mọi trạng thái khác, nên mở lại app ở màn kết ván sẽ chạy lại đoạn ghi điểm. Task 2 làm cho việc ghi trở nên **bất biến theo `gameId`**, nhờ vậy gọi bao nhiêu lần cũng chỉ tính một lần. Đây cũng là cách vá luôn ca ngược lại: app bị đóng ngay sau khi ván kết thúc mà chưa kịp ghi thì lần mở sau vẫn ghi được.

**3. Đồng hồ đếm ngược phải được dọn.** `setInterval` không tự dừng khi component biến mất. Vòng nói đổi người liên tục, mỗi lần đổi mà quên dọn là một cái đồng hồ chạy nền vĩnh viễn. Dùng `DestroyRef` và dọn tường minh.

### Quy ước sẵn có phải theo

- Component standalone, `imports` khai trong `@Component`, không có `NgModule`.
- Dùng `@if` / `@for` / `@switch` / `@let`, không dùng `*ngIf` / `*ngFor`.
- State trong component là `signal`, dẫn xuất là `computed`.
- Lớp CSS dùng lại hệ thống thiết kế ở `src/styles.scss`: `.screen`, `.screen__eyebrow`, `.screen__title`, `.screen__spacer`, `.screen__actions`, `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--quiet`, `.field`, `.field__label`, `.input`, `.muted`, `.warning`, `.lamp`. Biến màu: `--ink-900/800/700/600`, `--lamp-500/400`, `--lamp-glow`, `--paper-100/400`, `--blood-500`. Khoảng cách `--space-1..6`, bo góc `--radius-md/lg`, vùng chạm tối thiểu `--tap`.
- Tiếng Việt trong giao diện có dấu đầy đủ. Thông điệp lỗi cũng tiếng Việt.
- Commit message tiếng Việt **không dấu**.

### Cảnh báo về bộ nhớ máy

Máy này hay hết RAM. Nếu `npm test` bị giết với **exit code 137**, hoặc output dừng ngay sau `Building...`, hoặc số test báo về thấp bất thường (ví dụ "46 tests" trong khi đang có 288), đó là hệ điều hành giết tiến trình vì thiếu bộ nhớ, **không phải lỗi code**. Chạy lại. Đừng đi sửa code, đừng sửa test, đừng kết luận là mất test.

---

## Cấu trúc file

**Tạo mới ở tầng lõi:**

| File | Trách nhiệm |
|---|---|
| `src/app/core/engine/scoring.ts` | Hàm thuần tính điểm một ván từ `GameState` + `ScoreRules`. |

**Tạo mới ở tầng màn hình** (`src/app/features/game/`):

| File | Trách nhiệm |
|---|---|
| `speaking.page.ts` | Vòng nói: số vòng, người đang nói, đồng hồ, thứ tự nói. |
| `vote.page.ts` | Nhập phiếu cho từng ứng viên, kiểm tổng phiếu, gửi. |
| `tie.page.ts` | Chọn bỏ phiếu lại hay không loại ai. |
| `reveal.page.ts` | Lật vai người vừa bị loại. |
| `white-guess.page.ts` | Ô nhập cho mũ trắng đoán từ, hiện kết quả. |
| `end.page.ts` | Lật hết vai, hiện hai từ gốc, điểm ván này và điểm tích luỹ. |

**Sửa:**

| File | Sửa gì |
|---|---|
| `src/app/data/repositories/scoreboard.repository.ts` | Thêm `gameId` vào `GameRecord`, `recordGame` bỏ qua ván đã ghi. |
| `src/app/data/repositories/scoreboard.repository.spec.ts` | Thêm `gameId` vào các bản ghi mẫu, thêm test bất biến. |
| `src/app/state/game-session.store.ts` | Thêm các hành động trong ván và phần ghi bảng điểm. |
| `src/app/features/game/game.page.ts` | `@switch` đủ mọi pha. |

Không thêm tuyến đường mới. Mọi màn trong ván đều nằm dưới `/van`, chọn theo `phase`.

---

## Task 1: Hàm tính điểm

> **Đính chính sau khi làm xong.** Task này viết ra với giả định `scoring.ts`
> chưa tồn tại. Sai: nó đã có từ kế hoạch 1 (commit `d9be074`), và bản cũ khoá
> kết quả theo `player.id`. Nhưng `ScoreboardRepository` cộng dồn điểm theo
> **tên** qua nhiều ván, mà id chỉ sống trong đúng một ván — nên nếu để nguyên,
> Task 4 sẽ làm vỡ vụn mọi tổng điểm ngay khi nó nối `awardPoints` vào
> `recordGame`. Task này do đó là một bản viết lại, không phải tạo mới, và số
> test không tăng: 6 test cũ bị thay bằng 6 test mới, tổng vẫn là **288**.

**Files:**
- Modify: `src/app/core/engine/scoring.ts` (viết lại: khoá theo tên thay vì theo id)
- Test: `src/app/core/engine/scoring.spec.ts` (viết lại)

Luật ở mục 3.8 của bản thiết kế. Hai điểm dễ bỏ sót: điểm trao cho **mọi người thuộc phe thắng kể cả người đã bị loại**, nên phải duyệt `players` chứ không duyệt `aliveIds`; và **mũ trắng không thuộc phe nào**, mũ trắng thắng thì chỉ mình mũ trắng có điểm.

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/core/engine/scoring.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_RULES, GameState, Outcome, Role } from '../models';
import { awardPoints } from './scoring';

/** Dựng một GameState tối giản, chỉ đủ những trường mà awardPoints đọc tới. */
function stateWith(roles: Record<string, Role>, outcome: Outcome | null): GameState {
  const names = Object.keys(roles);
  return {
    id: 'g-1',
    villageName: 'Ác Quỷ',
    config: {
      spyCount: 1,
      hasWhite: true,
      revealSpyToSpy: false,
      topics: [],
      difficulties: ['EASY'],
      timerSeconds: null,
      minRoundsBeforeVote: 3,
    },
    pairId: 'dv-01',
    civilianWord: 'con mèo',
    spyWord: 'con chó',
    players: names.map((name) => ({ id: `p-${name}`, name })),
    assignments: Object.fromEntries(
      names.map((name) => [`p-${name}`, { playerId: `p-${name}`, role: roles[name], word: null }]),
    ),
    dealtCount: names.length,
    round: 3,
    speakingOrder: [],
    speakerIndex: 0,
    // Cố tình để chỉ một người còn sống: điểm phải không phụ thuộc vào đây.
    aliveIds: [`p-${names[0]}`],
    eliminations: [],
    tiedCandidateIds: [],
    revoteUsed: false,
    whiteGuess: null,
    phase: 'ENDED',
    outcome,
  };
}

describe('awardPoints', () => {
  it('dân làng thắng thì mọi dân làng có điểm, kể cả người đã bị loại', () => {
    const state = stateWith(
      { Minh: 'CIVILIAN', Hùng: 'CIVILIAN', Lan: 'SPY', Đức: 'WHITE' },
      'CIVILIANS',
    );

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      Minh: 1,
      Hùng: 1,
      Lan: 0,
      Đức: 0,
    });
  });

  it('gián điệp thắng thì mọi gián điệp có điểm', () => {
    const state = stateWith(
      { Minh: 'CIVILIAN', Hùng: 'SPY', Lan: 'SPY', Đức: 'WHITE' },
      'SPIES',
    );

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      Minh: 0,
      Hùng: 2,
      Lan: 2,
      Đức: 0,
    });
  });

  it('mũ trắng thắng thì chỉ mình mũ trắng có điểm', () => {
    const state = stateWith(
      { Minh: 'CIVILIAN', Hùng: 'CIVILIAN', Lan: 'SPY', Đức: 'WHITE' },
      'WHITE',
    );

    expect(awardPoints(state, DEFAULT_SCORE_RULES)).toEqual({
      Minh: 0,
      Hùng: 0,
      Lan: 0,
      Đức: 3,
    });
  });

  it('mọi người đều có mặt trong bảng, kể cả phe thua', () => {
    const state = stateWith({ Minh: 'CIVILIAN', Lan: 'SPY' }, 'SPIES');

    // Phe thua vẫn có khoá với giá trị 0, để họ hiện trên bảng điểm chứ không
    // biến mất chỉ vì thua.
    expect(Object.keys(awardPoints(state, DEFAULT_SCORE_RULES)).sort()).toEqual([
      'Lan',
      'Minh',
    ]);
  });

  it('dùng đúng luật điểm được truyền vào, không dùng mặc định', () => {
    const state = stateWith({ Minh: 'CIVILIAN', Lan: 'SPY' }, 'CIVILIANS');

    expect(awardPoints(state, { civilianWin: 10, spyWin: 20, whiteWin: 30 })).toEqual({
      Minh: 10,
      Lan: 0,
    });
  });

  it('ván chưa kết thúc thì ném lỗi', () => {
    const state = stateWith({ Minh: 'CIVILIAN', Lan: 'SPY' }, null);

    expect(() => awardPoints(state, DEFAULT_SCORE_RULES)).toThrow(/chưa kết thúc/);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — 6 test đỏ. Không phải lỗi "không phân giải được module": file đã tồn tại, nên nó đỏ vì khoá sai (`p-Minh` thay vì `Minh`) và vì bản cũ không ném lỗi khi ván chưa kết thúc.

- [ ] **Step 3: Viết hàm tính điểm**

Tạo `src/app/core/engine/scoring.ts`:

```ts
import { GameState, Role, ScoreRules } from '../models';

/** Phe thắng nào thì vai nào được điểm. Mũ trắng đứng riêng, không theo phe nào. */
const WINNING_ROLE: Record<string, Role> = {
  CIVILIANS: 'CIVILIAN',
  SPIES: 'SPY',
  WHITE: 'WHITE',
};

/**
 * Điểm cộng của một ván, khoá theo TÊN người chơi.
 *
 * Khoá theo tên chứ không theo id vì bảng điểm cộng dồn qua nhiều ván, mà id
 * chỉ sống trong đúng một ván. Tên đã được khử trùng lặp từ lúc lập danh sách
 * nên không có hai người cùng tên trong một ván.
 *
 * Duyệt `players` chứ không duyệt `aliveIds`: người bị loại giữa chừng vẫn
 * được điểm nếu phe của họ thắng.
 *
 * Người thua vẫn có mặt trong bảng với 0 điểm, để họ hiện trên bảng điểm tích
 * luỹ thay vì biến mất.
 */
export function awardPoints(state: GameState, rules: ScoreRules): Record<string, number> {
  if (state.outcome === null) {
    throw new Error('awardPoints: ván chưa kết thúc, chưa tính điểm được');
  }

  const winningRole = WINNING_ROLE[state.outcome];
  const reward: Record<string, number> = {
    CIVILIAN: rules.civilianWin,
    SPY: rules.spyWin,
    WHITE: rules.whiteWin,
  };

  const points: Record<string, number> = {};
  for (const player of state.players) {
    const role = state.assignments[player.id].role;
    points[player.name] = role === winningRole ? reward[role] : 0;
  }

  return points;
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — vẫn **288**. Sáu test cũ bị thay bằng sáu test mới nên tổng không đổi.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/core/engine/scoring.ts src/app/core/engine/scoring.spec.ts
git commit -m "feat: them ham tinh diem mot van"
```

---

## Task 2: Ghi bảng điểm đúng một lần cho mỗi ván

**Files:**
- Modify: `src/app/data/repositories/scoreboard.repository.ts`
- Test: `src/app/data/repositories/scoreboard.repository.spec.ts`

Ván kết thúc là một trạng thái được lưu xuống máy. Mở lại app ở màn kết ván sẽ chạy lại đoạn ghi điểm, và người chơi được cộng điểm lần hai. Cách chắc chắn nhất là làm cho phép ghi trở nên bất biến: gắn `gameId` vào bản ghi, ghi rồi thì lần sau bỏ qua.

Đổi lại còn được một cái lợi: đoạn ghi có thể gọi ở **mọi** lần vào pha `ENDED`, kể cả sau khi khôi phục ván — nên app bị đóng ngay lúc ván vừa kết thúc thì lần mở sau vẫn ghi được điểm.

- [ ] **Step 1: Sửa test cho khớp kiểu mới và thêm test bất biến**

Trong `src/app/data/repositories/scoreboard.repository.spec.ts`, thêm `gameId` vào **cả bốn** lời gọi `recordGame` đang có. Cụ thể:

- Test `'cộng điểm cho người mới'`: thêm `gameId: 'g-1',` làm dòng đầu trong object.
- Test `'cộng dồn qua nhiều ván'`: lời gọi thứ nhất thêm `gameId: 'g-1',`, lời gọi thứ hai thêm `gameId: 'g-2',`.
- Test `'xoá sạch bảng điểm'`: thêm `gameId: 'g-1',`.

Rồi thêm test mới này vào cuối `describe`, ngay trước dấu `});` đóng khối:

```ts
  it('ghi lại cùng một ván nhiều lần chỉ tính điểm một lần', async () => {
    const record = {
      gameId: 'g-1',
      villageName: 'Ác Quỷ',
      playedAt: '2026-09-08T10:00:00.000Z',
      outcome: 'CIVILIANS' as const,
      points: { Minh: 1 },
    };

    await repository.recordGame(record);
    // Mở lại app ở màn kết ván thì đoạn ghi chạy lại. Không được cộng nữa.
    await repository.recordGame(record);

    const board = await repository.load();
    expect(board.totals['Minh']).toBe(1);
    expect(board.history).toHaveLength(1);
  });

  it('bản ghi cũ chưa có gameId thì không chặn ván mới', async () => {
    // Bảng điểm đã lưu từ phiên bản trước, các bản ghi không có gameId.
    await storage.set(
      'scoreboard',
      JSON.stringify({
        totals: { Minh: 5 },
        history: [
          {
            villageName: 'Làng Cũ',
            playedAt: '2026-09-01T10:00:00.000Z',
            outcome: 'SPIES',
            points: { Minh: 5 },
          },
        ],
      }),
    );

    await repository.recordGame({
      gameId: 'g-9',
      villageName: 'Ác Quỷ',
      playedAt: '2026-09-08T10:00:00.000Z',
      outcome: 'CIVILIANS',
      points: { Minh: 1 },
    });

    const board = await repository.load();
    expect(board.totals['Minh']).toBe(6);
    expect(board.history).toHaveLength(2);
  });
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — lỗi kiểu `TS2353` vì `gameId` chưa có trong `GameRecord`, và test bất biến báo `Minh` bằng 2 thay vì 1.

- [ ] **Step 3: Thêm gameId và phép bỏ qua**

Trong `src/app/data/repositories/scoreboard.repository.ts`, sửa `GameRecord` thành:

```ts
export interface GameRecord {
  /**
   * Id của ván. Có mặt để ghi điểm trở thành thao tác bất biến: màn kết ván
   * được mở lại bao nhiêu lần cũng chỉ cộng điểm một lần.
   */
  gameId: string;
  villageName: string;
  /** Chuỗi ISO. Truyền vào từ ngoài để tầng này vẫn thuần. */
  playedAt: string;
  outcome: Outcome;
  /** Điểm cộng của ván này, khoá là tên người chơi. */
  points: Record<string, number>;
}
```

Và sửa `recordGame` thành:

```ts
  async recordGame(record: GameRecord): Promise<void> {
    const board = await this.load();

    // Ván này ghi rồi thì thôi. Bản ghi cũ chưa có gameId sẽ không khớp với
    // bất kỳ id thật nào, nên chúng không chặn ván mới.
    if (board.history.some((saved) => saved.gameId === record.gameId)) return;

    const totals = { ...board.totals };
    for (const [name, points] of Object.entries(record.points)) {
      totals[name] = (totals[name] ?? 0) + points;
    }

    await this.store.write({ totals, history: [...board.history, record] });
  }
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 288 cộng 2 mới, thành **290**. Báo lại con số thật.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/data/repositories/scoreboard.repository.ts src/app/data/repositories/scoreboard.repository.spec.ts
git commit -m "feat: ghi bang diem bat bien theo gameId"
```

---

## Task 3: Kho phiên — các hành động trong ván

**Files:**
- Modify: `src/app/state/game-session.store.ts`
- Test: `src/app/state/game-session.store.spec.ts`

Bọc năm hàm engine còn lại thành phương thức của kho phiên, và thêm vài dẫn xuất mà màn hình cần. Mỗi hành động đi qua `apply()` sẵn có, nên vẫn tự lưu xuống máy sau mỗi bước.

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `src/app/state/game-session.store.spec.ts`, ngay trước dấu `});` đóng khối `describe` ngoài cùng:

```ts
  /** Chia bài cho hết người để ván bước vào pha nói. */
  async function dealAll(): Promise<void> {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, minRoundsBeforeVote: 1 },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await store.revealNext();
    }
  }

  it('chia xong thì có người nói đầu tiên', async () => {
    await dealAll();

    expect(store.state()?.phase).toBe('SPEAKING');
    expect(store.currentSpeakerName()).not.toBeNull();
    expect(NAMES).toContain(store.currentSpeakerName());
  });

  it('xong lượt thì sang người kế', async () => {
    await dealAll();
    const first = store.currentSpeakerName();

    await store.nextSpeaker();

    expect(store.currentSpeakerName()).not.toBe(first);
  });

  it('hết người nói và đủ số vòng thì mở pha vote', async () => {
    await dealAll();
    for (let i = 0; i < NAMES.length; i++) {
      await store.nextSpeaker();
    }

    expect(store.state()?.phase).toBe('VOTING');
  });

  it('vote tập trung vào một người thì người đó bị loại', async () => {
    await dealAll();
    for (let i = 0; i < NAMES.length; i++) {
      await store.nextSpeaker();
    }
    const target = store.state()!.aliveIds[0];

    await store.vote({ [target]: 3 });

    expect(store.state()?.aliveIds).not.toContain(target);
    expect(store.lastEliminatedName()).toBe(
      store.state()!.players.find((p) => p.id === target)!.name,
    );
  });

  it('còn bao nhiêu vòng nữa mới được vote', async () => {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, minRoundsBeforeVote: 3 },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await store.revealNext();
    }

    // Đang ở vòng 1, cần tới hết vòng 3 mới mở vote.
    expect(store.roundsLeftBeforeVote()).toBe(2);
  });

  it('người còn sống là tập con của toàn bộ người chơi', async () => {
    await dealAll();

    expect(store.alivePlayers()).toHaveLength(NAMES.length);
    expect(store.alivePlayers().map((p) => p.name).sort()).toEqual([...NAMES].sort());
  });

  it('chưa có ván thì các dẫn xuất trong ván đều rỗng', () => {
    expect(store.currentSpeakerName()).toBeNull();
    expect(store.lastEliminatedName()).toBeNull();
    expect(store.alivePlayers()).toEqual([]);
    expect(store.roundsLeftBeforeVote()).toBe(0);
  });
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — `currentSpeakerName`, `nextSpeaker`, `vote`, `lastEliminatedName`, `roundsLeftBeforeVote`, `alivePlayers` chưa tồn tại.

- [ ] **Step 3: Thêm hành động và dẫn xuất vào kho phiên**

Trong `src/app/state/game-session.store.ts`, sửa dòng `import` engine thành:

```ts
import {
  TieChoice,
  advanceSpeaker,
  buildCard,
  continueAfterReveal,
  resolveTie,
  revealNextPlayer,
  submitVotes,
  submitWhiteGuess,
} from '../core/engine/game-engine';
import { VoteTally } from '../core/engine/vote-resolver';
```

Sửa dòng import models thành:

```ts
import {
  CardContent,
  GameConfig,
  GameState,
  NarrationEvent,
  Player,
} from '../core/models';
```

Thêm các dẫn xuất này ngay sau `currentDealName`:

```ts
  /** Người đang tới lượt nói. null khi không ở pha nói. */
  readonly currentSpeakerName = computed<string | null>(() => {
    const state = this._state();
    if (state === null || state.phase !== 'SPEAKING') return null;
    const id = state.speakingOrder[state.speakerIndex];
    return state.players.find((player) => player.id === id)?.name ?? null;
  });

  /** Thứ tự nói của cả vòng, để hiện thanh nhỏ trên màn vòng nói. */
  readonly speakingNames = computed<string[]>(() => {
    const state = this._state();
    if (state === null) return [];
    return state.speakingOrder.map(
      (id) => state.players.find((player) => player.id === id)?.name ?? '',
    );
  });

  readonly alivePlayers = computed<Player[]>(() => {
    const state = this._state();
    if (state === null) return [];
    return state.players.filter((player) => state.aliveIds.includes(player.id));
  });

  /**
   * Những người được nhận phiếu ở lượt vote hiện tại. Ở lượt bỏ phiếu lại thì
   * chỉ còn những người đang hoà, chứ không phải toàn bộ người sống.
   */
  readonly voteCandidates = computed<Player[]>(() => {
    const state = this._state();
    if (state === null) return [];
    const ids =
      state.tiedCandidateIds.length > 0 ? state.tiedCandidateIds : state.aliveIds;
    return state.players.filter((player) => ids.includes(player.id));
  });

  readonly lastEliminatedName = computed<string | null>(() => {
    const state = this._state();
    if (state === null || state.eliminations.length === 0) return null;
    const last = state.eliminations[state.eliminations.length - 1];
    return state.players.find((player) => player.id === last.playerId)?.name ?? null;
  });

  /**
   * Còn mấy vòng nữa mới được vote. `round` đếm từ 1 và là số thứ tự vòng
   * ĐANG diễn ra, nên ở vòng 1 với ngưỡng 3 thì còn 2 vòng nữa.
   */
  readonly roundsLeftBeforeVote = computed<number>(() => {
    const state = this._state();
    if (state === null) return 0;
    return Math.max(0, state.config.minRoundsBeforeVote - state.round);
  });
```

Thêm các hành động này ngay sau `revealNext()`:

```ts
  async nextSpeaker(): Promise<void> {
    const result = advanceSpeaker(this.require(), this.rng);
    await this.apply(result.state, result.events);
  }

  async vote(tally: VoteTally): Promise<void> {
    const result = submitVotes(this.require(), tally, this.rng);
    await this.apply(result.state, result.events);
  }

  async breakTie(choice: TieChoice): Promise<void> {
    const result = resolveTie(this.require(), choice, this.rng);
    await this.apply(result.state, result.events);
  }

  async guessCivilianWord(text: string): Promise<void> {
    const result = submitWhiteGuess(this.require(), text);
    await this.apply(result.state, result.events);
  }

  async afterReveal(): Promise<void> {
    const result = continueAfterReveal(this.require(), this.rng);
    await this.apply(result.state, result.events);
  }
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 290 cộng 7 mới, thành **297**. Báo lại con số thật.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/state/game-session.store.ts src/app/state/game-session.store.spec.ts
git commit -m "feat: kho phien boc cac hanh dong trong van"
```

---

## Task 4: Ghi bảng điểm khi ván kết thúc

**Files:**
- Modify: `src/app/state/game-session.store.ts`
- Test: `src/app/state/game-session.store.spec.ts`

Kho phiên tự ghi điểm mỗi khi trạng thái rơi vào pha `ENDED`. Nhờ Task 2 làm phép ghi bất biến nên gọi thừa không hại gì.

> **Đính chính sau khi làm xong.** Bản đầu của task này còn gọi thêm `recordIfEnded` trong `resume()`, với lý lẽ "app có thể bị đóng ngay lúc ván vừa kết thúc, trước khi kịp ghi điểm". Nhánh đó là **code chết**: `ActiveGameRepository.load()` cố ý trả `null` cho ván đã kết thúc (thiết kế từ kế hoạch 2), nên `resume()` không bao giờ nhìn thấy một ván `ENDED` để mà ghi. Đã bỏ nhánh đó.
>
> Thay vào đó `apply()` **ghi bảng điểm trước rồi mới lưu ván**. Đóng app giữa hai dòng đó thì ván còn nằm ở bước trước, người chơi bấm tiếp một cái là tới pha kết lần nữa, và phép ghi bất biến lo phần không cộng đúp. Để thứ tự ngược lại thì ván kết thúc đã nằm trên máy nhưng điểm mất hẳn, vì kho ván đang dở không trả nó về.
>
> Kèm theo: test tên `'khôi phục ván đã kết thúc thì không cộng điểm lần nữa'` **xanh rỗng ruột** — nó không chạm được vào đường đi mà tên nó nói tới, vì `resume()` trả về `null`. Đã đổi thành `'ván đã kết thúc thì không còn là ván đang dở, và điểm không cộng thêm'`, có thêm `expect(store.hasGame()).toBe(false)` để ghi đúng hành vi thật.

**Thứ tự quan trọng:** ghi bảng điểm xong rồi `apply()` mới trả về. Màn kết ván đọc bảng điểm sau đó, nên số nó đọc được là số đã cộng, không phải số cũ.

- [ ] **Step 1: Viết test đỏ**

Ở đầu `src/app/state/game-session.store.spec.ts`, thêm vào phần import:

```ts
import { ScoreboardRepository } from '../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../data/repositories/settings.repository';
```

Và thêm hai repository đó vào mảng `providers` của `TestBed.configureTestingModule` trong file này.

**Quan trọng — ba file test khác cũng phải sửa.** Step 3 thêm hai `inject()` mới vào `GameSessionStore`, nên **mọi** test dựng kho phiên đều phải có sẵn hai repository đó, nếu không Angular ném `NullInjectorError`. Ngoài file trên, còn ba file nữa đang tự dựng kho phiên:

- `src/app/features/game/deal.page.spec.ts`
- `src/app/features/game/game.page.spec.ts`
- `src/app/features/home/home.page.spec.ts`

Ở **cả ba** file đó, thêm hai dòng import:

```ts
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
```

và thêm `ScoreboardRepository,` cùng `SettingsRepository,` vào mảng `providers`, đặt ngay trước `GameSessionStore,`.

Đây là sửa cơ khí, không đổi hành vi test nào. Nếu sau khi sửa mà có test nào đỏ vì lý do khác, **báo lại chứ đừng sửa tiếp** — nghĩa là có thứ gì đó ngoài dự tính.

Rồi thêm test này vào cuối khối `describe`:

```ts
  it('ván kết thúc thì tự ghi vào bảng điểm', async () => {
    // Đội hình 4 người, 1 gián điệp, không mũ trắng, vote mở ngay từ vòng 1.
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: {
        ...DEFAULT_GAME_CONFIG,
        spyCount: 1,
        hasWhite: false,
        minRoundsBeforeVote: 1,
      },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await store.revealNext();
    }
    for (let i = 0; i < NAMES.length; i++) {
      await store.nextSpeaker();
    }

    // Loại đúng gián điệp: hết gián điệp, không có mũ trắng, dân làng thắng.
    const state = store.state()!;
    const spyId = state.aliveIds.find((id) => state.assignments[id].role === 'SPY')!;
    await store.vote({ [spyId]: 3 });
    await store.afterReveal();

    expect(store.state()?.phase).toBe('ENDED');
    expect(store.state()?.outcome).toBe('CIVILIANS');

    const board = await TestBed.inject(ScoreboardRepository).load();
    expect(board.history).toHaveLength(1);
    expect(board.history[0].gameId).toBe(state.id);
    // Ba dân làng mỗi người 1 điểm, gián điệp 0.
    expect(Object.values(board.totals).filter((point) => point === 1)).toHaveLength(3);
  });

  it('khôi phục ván đã kết thúc thì không cộng điểm lần nữa', async () => {
    await store.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: {
        ...DEFAULT_GAME_CONFIG,
        spyCount: 1,
        hasWhite: false,
        minRoundsBeforeVote: 1,
      },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await store.revealNext();
    }
    for (let i = 0; i < NAMES.length; i++) {
      await store.nextSpeaker();
    }
    const state = store.state()!;
    const spyId = state.aliveIds.find((id) => state.assignments[id].role === 'SPY')!;
    await store.vote({ [spyId]: 3 });
    await store.afterReveal();

    const before = await TestBed.inject(ScoreboardRepository).load();

    // Người chơi tắt app ở màn kết ván rồi mở lại.
    store.clearInMemory();
    await store.resume();

    const after = await TestBed.inject(ScoreboardRepository).load();
    expect(after.totals).toEqual(before.totals);
    expect(after.history).toHaveLength(1);
  });
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — bảng điểm rỗng vì chưa có ai ghi.

- [ ] **Step 3: Ghi bảng điểm trong kho phiên**

Trong `src/app/state/game-session.store.ts`, thêm vào phần import:

```ts
import { awardPoints } from '../core/engine/scoring';
import { ScoreboardRepository } from '../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../data/repositories/settings.repository';
```

Thêm hai phụ thuộc, ngay dưới `activeGame`:

```ts
  private readonly scoreboard = inject(ScoreboardRepository);
  private readonly settings = inject(SettingsRepository);
```

Sửa `resume()` thành:

```ts
  async resume(): Promise<void> {
    const saved = await this.activeGame.load();
    this._state.set(saved);
    this._events.set([]);

    // App có thể đã bị đóng ngay lúc ván vừa kết thúc, trước khi kịp ghi điểm.
    // Gọi lại ở đây là an toàn vì phép ghi bất biến theo gameId.
    if (saved !== null) await this.recordIfEnded(saved);
  }
```

Sửa `apply()` thành:

```ts
  private async apply(state: GameState, events: NarrationEvent[]): Promise<void> {
    this._state.set(state);
    this._events.set(events);
    await this.activeGame.save(state);
    await this.recordIfEnded(state);
  }
```

Và thêm phương thức riêng này ngay dưới `apply`:

```ts
  /**
   * Ghi kết quả ván vào bảng điểm. Gọi được nhiều lần cho cùng một ván: kho
   * bảng điểm bỏ qua ván đã ghi dựa theo `gameId`.
   */
  private async recordIfEnded(state: GameState): Promise<void> {
    if (state.phase !== 'ENDED' || state.outcome === null) return;

    const settings = await this.settings.load();
    await this.scoreboard.recordGame({
      gameId: state.id,
      villageName: state.villageName,
      playedAt: new Date().toISOString(),
      outcome: state.outcome,
      points: awardPoints(state, settings.scoreRules),
    });
  }
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 297 cộng 2 mới, thành **299**. Báo lại con số thật.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/state/game-session.store.ts src/app/state/game-session.store.spec.ts
git commit -m "feat: ghi bang diem khi van ket thuc"
```

---

## Task 5: Màn vòng nói

**Files:**
- Create: `src/app/features/game/speaking.page.ts`
- Test: `src/app/features/game/speaking.page.spec.ts`

Đồng hồ **không tự chuyển người** khi hết giờ. Hết giờ chỉ đổi màu và ghi "Hết giờ" — quyết định vẫn thuộc về quản trò, vì ngoài đời người ta hay nói nốt câu dở.

`setInterval` phải được dọn bằng `DestroyRef`. Màn này bị dựng lại mỗi vòng; quên dọn là để lại một cái đồng hồ chạy nền vĩnh viễn.

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/features/game/speaking.page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GAME_CONFIG, GameConfig } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { SpeakingPage } from './speaking.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

async function setup(config: Partial<GameConfig> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SpeakingPage],
    providers: [
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
    ],
  });

  const session = TestBed.inject(GameSessionStore);
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: NAMES,
    config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, ...config },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }

  const fixture = TestBed.createComponent(SpeakingPage);
  fixture.detectChanges();
  return { session, fixture };
}

describe('SpeakingPage', () => {
  beforeEach(() => TestBed.resetTestingModule());
  afterEach(() => vi.useRealTimers());

  it('hiện vòng hiện tại và người đang nói', async () => {
    const { session, fixture } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vòng 1');
    expect(text).toContain(session.currentSpeakerName()!);
  });

  it('hiện thứ tự nói của cả vòng', async () => {
    const { fixture } = await setup();

    const chips = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.speaking__chip',
    );
    expect(chips).toHaveLength(NAMES.length);
    expect(
      Array.from(chips)
        .map((chip) => chip.textContent!.trim())
        .sort(),
    ).toEqual([...NAMES].sort());
  });

  it('nhắc còn mấy vòng nữa mới được vote', async () => {
    const { fixture } = await setup({ minRoundsBeforeVote: 3 });

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Còn 2 vòng nữa',
    );
  });

  it('đủ vòng rồi thì không nhắc nữa', async () => {
    const { fixture } = await setup({ minRoundsBeforeVote: 1 });

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'vòng nữa',
    );
  });

  it('xong lượt thì sang người kế', async () => {
    const { session, fixture } = await setup();
    const first = session.currentSpeakerName();

    await fixture.componentInstance.done();
    fixture.detectChanges();

    expect(session.currentSpeakerName()).not.toBe(first);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      session.currentSpeakerName()!,
    );
  });

  it('đồng hồ đếm ngược theo thời gian thật', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: 30 });

    expect(fixture.componentInstance.secondsLeft()).toBe(30);

    vi.advanceTimersByTime(3000);
    fixture.detectChanges();

    expect(fixture.componentInstance.secondsLeft()).toBe(27);
  });

  it('đồng hồ dừng ở 0, không đi xuống số âm', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: 2 });

    vi.advanceTimersByTime(10000);
    fixture.detectChanges();

    expect(fixture.componentInstance.secondsLeft()).toBe(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Hết giờ');
  });

  it('sang người kế thì đồng hồ chạy lại từ đầu', async () => {
    vi.useFakeTimers();
    const { fixture } = await setup({ timerSeconds: 30 });

    vi.advanceTimersByTime(5000);
    await fixture.componentInstance.done();
    fixture.detectChanges();

    expect(fixture.componentInstance.secondsLeft()).toBe(30);
  });

  it('tắt đồng hồ thì không hiện đồng hồ', async () => {
    const { fixture } = await setup({ timerSeconds: null });

    expect(fixture.componentInstance.secondsLeft()).toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.speaking__clock'),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./speaking.page`.

- [ ] **Step 3: Viết màn vòng nói**

Tạo `src/app/features/game/speaking.page.ts`:

```ts
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { GameSessionStore } from '../../state/game-session.store';

/**
 * Vòng nói.
 *
 * Đồng hồ chỉ để nhắc, hết giờ KHÔNG tự chuyển người: ngoài đời người ta hay
 * nói nốt câu dở, và cắt ngang giữa câu khó chịu hơn là chạy quá vài giây.
 */
@Component({
  selector: 'app-speaking-page',
  template: `
    <div class="screen lamp speaking">
      <p class="screen__eyebrow">Vòng {{ round() }}</p>

      <div class="speaking__who">
        <p class="speaking__lead">Tới lượt</p>
        <h1 class="speaking__name">{{ name() }}</h1>
      </div>

      @if (secondsLeft() !== null) {
        <p class="speaking__clock" [class.speaking__clock--out]="secondsLeft() === 0">
          @if (secondsLeft() === 0) {
            Hết giờ
          } @else {
            {{ secondsLeft() }}
          }
        </p>
      }

      <div class="speaking__order">
        @for (person of order(); track $index) {
          <span class="speaking__chip" [class.speaking__chip--on]="$index === index()">
            {{ person }}
          </span>
        }
      </div>

      <div class="screen__spacer"></div>

      @if (roundsLeft() > 0) {
        <p class="muted">Còn {{ roundsLeft() }} vòng nữa mới được vote.</p>
      }

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" (click)="done()">Xong lượt</button>
      </div>
    </div>
  `,
  styles: [
    `
      .speaking {
        text-align: center;
      }

      .speaking__who {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .speaking__lead {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.25rem;
        color: var(--paper-400);
      }

      .speaking__name {
        font-size: 2.75rem;
        color: var(--lamp-500);
        word-break: break-word;
      }

      .speaking__clock {
        margin: 0;
        font-family: var(--font-display);
        font-size: 3.5rem;
        line-height: 1;
        color: var(--paper-100);
      }

      .speaking__clock--out {
        font-size: 2rem;
        color: var(--blood-500);
      }

      .speaking__order {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        justify-content: center;
      }

      .speaking__chip {
        padding: var(--space-1) var(--space-3);
        border-radius: 999px;
        background: var(--ink-800);
        color: var(--paper-400);
        font-size: 0.875rem;
      }

      .speaking__chip--on {
        background: var(--lamp-glow);
        color: var(--lamp-400);
      }
    `,
  ],
})
export class SpeakingPage {
  private readonly session = inject(GameSessionStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly name = computed(() => this.session.currentSpeakerName() ?? '');
  readonly order = computed(() => this.session.speakingNames());
  readonly index = computed(() => this.session.state()?.speakerIndex ?? 0);
  readonly round = computed(() => this.session.state()?.round ?? 1);
  readonly roundsLeft = computed(() => this.session.roundsLeftBeforeVote());

  /** null nghĩa là ván này tắt đồng hồ. */
  private readonly _secondsLeft = signal<number | null>(null);
  readonly secondsLeft = this._secondsLeft.asReadonly();

  private handle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.restartClock();
    // setInterval không tự dừng khi component biến mất.
    this.destroyRef.onDestroy(() => this.stopClock());
  }

  async done(): Promise<void> {
    await this.session.nextSpeaker();
    this.restartClock();
  }

  private restartClock(): void {
    this.stopClock();

    const seconds = this.session.state()?.config.timerSeconds ?? null;
    this._secondsLeft.set(seconds);
    if (seconds === null) return;

    this.handle = setInterval(() => {
      const left = this._secondsLeft();
      if (left === null || left <= 0) {
        this.stopClock();
        return;
      }
      this._secondsLeft.set(left - 1);
    }, 1000);
  }

  private stopClock(): void {
    if (this.handle !== null) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 299 cộng 9 mới, thành **308**. Báo lại con số thật.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/game/speaking.page.ts src/app/features/game/speaking.page.spec.ts
git commit -m "feat: them man vong noi co dong ho"
```

---

## Task 6: Màn vote

**Files:**
- Create: `src/app/features/game/vote.page.ts`
- Test: `src/app/features/game/vote.page.spec.ts`

Engine ném lỗi khi bảng phiếu không hợp lệ, nên màn này phải chặn trước: tổng phiếu phải nằm trong khoảng `1 … số người còn sống`.

**Ở lượt bỏ phiếu lại chỉ những người đang hoà mới được nhận phiếu, nhưng số người bỏ phiếu vẫn là toàn bộ người còn sống.** Dùng `session.voteCandidates()` cho danh sách, `session.alivePlayers().length` cho trần tổng phiếu. Lấy nhầm một trong hai là sai luật.

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/features/game/vote.page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { VotePage } from './vote.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

/** Chia bài rồi nói hết một vòng để ván mở pha vote. */
async function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [VotePage],
    providers: [
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
    ],
  });

  const session = TestBed.inject(GameSessionStore);
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: NAMES,
    config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, minRoundsBeforeVote: 1 },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }
  for (let i = 0; i < NAMES.length; i++) {
    await session.nextSpeaker();
  }

  const fixture = TestBed.createComponent(VotePage);
  fixture.detectChanges();
  return { session, fixture };
}

describe('VotePage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('liệt kê mọi người còn sống', async () => {
    const { fixture } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const name of NAMES) {
      expect(text).toContain(name);
    }
  });

  it('chưa ai có phiếu thì chưa gửi được', async () => {
    const { fixture } = await setup();

    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('cộng phiếu cho một người thì gửi được', async () => {
    const { session, fixture } = await setup();
    const target = session.alivePlayers()[0];

    fixture.componentInstance.add(target.id, 2);
    fixture.detectChanges();

    expect(fixture.componentInstance.total()).toBe(2);
    expect(fixture.componentInstance.canSubmit()).toBe(true);
  });

  it('tổng phiếu vượt số người còn sống thì cảnh báo và chặn gửi', async () => {
    const { session, fixture } = await setup();
    const target = session.alivePlayers()[0];

    for (let i = 0; i < 5; i++) {
      fixture.componentInstance.add(target.id, 1);
    }
    fixture.detectChanges();

    expect(fixture.componentInstance.canSubmit()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'nhiều hơn số người còn sống',
    );
  });

  it('không cho trừ xuống dưới 0', async () => {
    const { session, fixture } = await setup();
    const target = session.alivePlayers()[0];

    fixture.componentInstance.add(target.id, -3);

    expect(fixture.componentInstance.votesFor(target.id)).toBe(0);
  });

  it('gửi phiếu thì người nhiều phiếu nhất bị loại', async () => {
    const { session, fixture } = await setup();
    const target = session.alivePlayers()[0];

    fixture.componentInstance.add(target.id, 3);
    await fixture.componentInstance.submit();

    expect(session.state()?.aliveIds).not.toContain(target.id);
  });

  it('ở lượt bỏ phiếu lại chỉ hiện những người đang hoà', async () => {
    const { session, fixture } = await setup();
    const [a, b, c] = session.alivePlayers();

    fixture.componentInstance.add(a.id, 1);
    fixture.componentInstance.add(b.id, 1);
    await fixture.componentInstance.submit();
    expect(session.state()?.phase).toBe('TIE_BREAK');

    await session.breakTie('REVOTE');
    const revote = TestBed.createComponent(VotePage);
    revote.detectChanges();

    const text = (revote.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(a.name);
    expect(text).toContain(b.name);
    expect(text).not.toContain(c.name);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./vote.page`.

- [ ] **Step 3: Viết màn vote**

Tạo `src/app/features/game/vote.page.ts`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { VoteTally } from '../../core/engine/vote-resolver';
import { GameSessionStore } from '../../state/game-session.store';

/**
 * Nhập phiếu.
 *
 * Quản trò đếm tay rồi gõ số vào, app không bỏ phiếu hộ ai. Engine từ chối
 * bảng phiếu sai luật bằng cách ném lỗi, nên màn này chặn từ trước.
 *
 * Ở lượt bỏ phiếu lại, danh sách ứng viên rút lại còn những người đang hoà,
 * nhưng TRẦN tổng phiếu vẫn là toàn bộ người còn sống, vì tất cả họ đều bỏ
 * phiếu lại chứ không chỉ hai người đang hoà.
 */
@Component({
  selector: 'app-vote-page',
  template: `
    <div class="screen vote">
      <div>
        <p class="screen__eyebrow">Vòng {{ round() }}</p>
        <h1 class="screen__title">Ai là gián điệp?</h1>
      </div>

      @if (isRevote()) {
        <p class="muted">Bỏ phiếu lại giữa {{ candidates().length }} người đang hoà.</p>
      }

      <div class="vote__list">
        @for (person of candidates(); track person.id) {
          <div class="vote__row">
            <span class="vote__name">{{ person.name }}</span>
            <div class="vote__counter">
              <button type="button" class="vote__step" (click)="add(person.id, -1)">−</button>
              <span class="vote__count">{{ votesFor(person.id) }}</span>
              <button type="button" class="vote__step" (click)="add(person.id, 1)">+</button>
            </div>
          </div>
        }
      </div>

      <p class="muted">Tổng phiếu: {{ total() }} / {{ voterCount() }}</p>

      <div class="screen__spacer"></div>

      @if (tooMany()) {
        <p class="warning">Tổng phiếu đang nhiều hơn số người còn sống.</p>
      }

      <div class="screen__actions">
        <button
          type="button"
          class="btn btn--primary"
          [disabled]="!canSubmit()"
          (click)="submit()"
        >
          Chốt phiếu
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .vote__list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .vote__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        background: var(--ink-800);
        border-radius: var(--radius-md);
      }

      .vote__name {
        font-size: 1.125rem;
        word-break: break-word;
      }

      .vote__counter {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }

      .vote__step {
        width: var(--tap);
        height: var(--tap);
        background: var(--ink-700);
        border: 1px solid var(--ink-600);
        border-radius: var(--radius-md);
        color: var(--paper-100);
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
      }

      .vote__count {
        min-width: 1.5rem;
        text-align: center;
        font-family: var(--font-display);
        font-size: 1.5rem;
        color: var(--lamp-500);
      }
    `,
  ],
})
export class VotePage {
  private readonly session = inject(GameSessionStore);

  private readonly tally = signal<VoteTally>({});

  readonly candidates = computed(() => this.session.voteCandidates());
  readonly round = computed(() => this.session.state()?.round ?? 1);
  readonly isRevote = computed(
    () => (this.session.state()?.tiedCandidateIds.length ?? 0) > 0,
  );

  /** Trần tổng phiếu: mọi người còn sống đều bỏ phiếu, kể cả ở lượt bỏ lại. */
  readonly voterCount = computed(() => this.session.alivePlayers().length);

  readonly total = computed(() =>
    Object.values(this.tally()).reduce((sum, votes) => sum + votes, 0),
  );

  readonly tooMany = computed(() => this.total() > this.voterCount());
  readonly canSubmit = computed(() => this.total() >= 1 && !this.tooMany());

  votesFor(playerId: string): number {
    return this.tally()[playerId] ?? 0;
  }

  add(playerId: string, delta: number): void {
    this.tally.update((current) => ({
      ...current,
      [playerId]: Math.max(0, (current[playerId] ?? 0) + delta),
    }));
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    await this.session.vote(this.tally());
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 308 cộng 7 mới, thành **315**. Báo lại con số thật.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/game/vote.page.ts src/app/features/game/vote.page.spec.ts
git commit -m "feat: them man vote"
```

---

## Task 7: Màn xử hoà

**Files:**
- Create: `src/app/features/game/tie.page.ts`
- Test: `src/app/features/game/tie.page.spec.ts`

Màn này **không cần** lo ca chỉ còn 2 người sống. Engine không bao giờ đưa ván vào pha `TIE_BREAK` ở trạng thái đó: nó bốc ngẫu nhiên ngay trong `submitVotes` rồi nhảy thẳng sang pha lộ danh tính. Đừng viết thêm nhánh cho ca đó ở đây.

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/features/game/tie.page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { TiePage } from './tie.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

/** Đưa ván vào pha xử hoà bằng một lượt vote hoà 1–1. */
async function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TiePage],
    providers: [
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
    ],
  });

  const session = TestBed.inject(GameSessionStore);
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: NAMES,
    config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, minRoundsBeforeVote: 1 },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }
  for (let i = 0; i < NAMES.length; i++) {
    await session.nextSpeaker();
  }

  const [a, b] = session.alivePlayers();
  await session.vote({ [a.id]: 1, [b.id]: 1 });

  const fixture = TestBed.createComponent(TiePage);
  fixture.detectChanges();
  return { session, fixture, tied: [a, b] };
}

describe('TiePage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('gọi tên những người đang hoà', async () => {
    const { fixture, tied } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hoà phiếu');
    expect(text).toContain(tied[0].name);
    expect(text).toContain(tied[1].name);
  });

  it('chọn bỏ phiếu lại thì quay về pha vote', async () => {
    const { session, fixture } = await setup();

    await fixture.componentInstance.revote();

    expect(session.state()?.phase).toBe('VOTING');
    expect(session.state()?.revoteUsed).toBe(true);
  });

  it('chọn không loại ai thì sang vòng nói mới, không ai bị loại', async () => {
    const { session, fixture } = await setup();
    const before = session.state()!.aliveIds.length;

    await fixture.componentInstance.skip();

    expect(session.state()?.phase).toBe('SPEAKING');
    expect(session.state()?.aliveIds).toHaveLength(before);
    expect(session.state()?.round).toBe(2);
  });

  it('hoà lần hai thì engine tự cho qua vòng, không quay lại màn này', async () => {
    const { session, fixture } = await setup();
    await fixture.componentInstance.revote();

    const [a, b] = session.voteCandidates();
    await session.vote({ [a.id]: 1, [b.id]: 1 });

    expect(session.state()?.phase).toBe('SPEAKING');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./tie.page`.

- [ ] **Step 3: Viết màn xử hoà**

Tạo `src/app/features/game/tie.page.ts`:

```ts
import { Component, computed, inject } from '@angular/core';
import { GameSessionStore } from '../../state/game-session.store';

/**
 * Hoà phiếu.
 *
 * Không có nhánh cho ca chỉ còn 2 người sống: ở trạng thái đó engine bốc ngẫu
 * nhiên ngay trong submitVotes và không bao giờ đưa ván vào pha này.
 */
@Component({
  selector: 'app-tie-page',
  template: `
    <div class="screen tie">
      <div>
        <p class="screen__eyebrow">Vòng {{ round() }}</p>
        <h1 class="screen__title">Hoà phiếu rồi</h1>
      </div>

      <p class="tie__names">{{ names() }}</p>
      <p class="muted">Cùng số phiếu cao nhất. Làng chọn cách xử.</p>

      <div class="screen__spacer"></div>

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" (click)="revote()">
          Bỏ phiếu lại giữa họ
        </button>
        <button type="button" class="btn btn--ghost" (click)="skip()">
          Vòng này không loại ai
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .tie {
        text-align: center;
      }

      .tie__names {
        margin: 0;
        font-family: var(--font-display);
        font-size: 2rem;
        color: var(--lamp-500);
        word-break: break-word;
      }
    `,
  ],
})
export class TiePage {
  private readonly session = inject(GameSessionStore);

  readonly round = computed(() => this.session.state()?.round ?? 1);
  readonly names = computed(() =>
    this.session
      .voteCandidates()
      .map((person) => person.name)
      .join('  •  '),
  );

  revote(): Promise<void> {
    return this.session.breakTie('REVOTE');
  }

  skip(): Promise<void> {
    return this.session.breakTie('NO_ELIMINATION');
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 315 cộng 4 mới, thành **319**. Báo lại con số thật.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/game/tie.page.ts src/app/features/game/tie.page.spec.ts
git commit -m "feat: them man xu hoa phieu"
```

---

## Task 8: Màn lộ danh tính

**Files:**
- Create: `src/app/features/game/reveal.page.ts`
- Test: `src/app/features/game/reveal.page.spec.ts`

Màn này phải nói rõ hai chuyện đặc biệt khi chúng xảy ra, vì cả hai đều dễ gây cãi nhau ngoài đời:

- Người này bị loại do **bốc ngẫu nhiên** ở nước cờ hai người cuối, không phải do bị vote.
- Mũ trắng vừa **đoán sai**, nên ván vẫn tiếp tục.

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/features/game/reveal.page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { RevealPage } from './reveal.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

/** Chơi tới lúc vừa loại một người, tuỳ chọn chọn đúng vai muốn loại. */
async function setup(target: 'SPY' | 'CIVILIAN') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RevealPage],
    providers: [
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
    ],
  });

  const session = TestBed.inject(GameSessionStore);
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: NAMES,
    config: {
      ...DEFAULT_GAME_CONFIG,
      spyCount: 1,
      hasWhite: false,
      minRoundsBeforeVote: 1,
    },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }
  for (let i = 0; i < NAMES.length; i++) {
    await session.nextSpeaker();
  }

  const state = session.state()!;
  const victim = state.aliveIds.find((id) => state.assignments[id].role === target)!;
  await session.vote({ [victim]: 3 });

  const fixture = TestBed.createComponent(RevealPage);
  fixture.detectChanges();
  const name = state.players.find((p) => p.id === victim)!.name;
  return { session, fixture, name };
}

describe('RevealPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('gọi tên và lật vai người bị loại', async () => {
    const { fixture, name } = await setup('CIVILIAN');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(name);
    expect(text).toContain('Dân làng');
  });

  it('loại trúng gián điệp thì ghi rõ là gián điệp', async () => {
    const { fixture, name } = await setup('SPY');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(name);
    expect(text).toContain('Gián điệp');
  });

  it('không phải bốc ngẫu nhiên thì không nhắc chuyện bốc', async () => {
    const { fixture } = await setup('CIVILIAN');

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Bốc ngẫu nhiên',
    );
  });

  it('bấm tiếp tục thì ván đi tiếp', async () => {
    const { session, fixture } = await setup('CIVILIAN');

    await fixture.componentInstance.next();

    // Còn gián điệp sống nên ván chưa kết thúc, quay lại vòng nói.
    expect(session.state()?.phase).toBe('SPEAKING');
  });

  it('loại nốt gián điệp cuối thì bấm tiếp tục là kết ván', async () => {
    const { session, fixture } = await setup('SPY');

    await fixture.componentInstance.next();

    expect(session.state()?.phase).toBe('ENDED');
    expect(session.state()?.outcome).toBe('CIVILIANS');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./reveal.page`.

- [ ] **Step 3: Viết màn lộ danh tính**

Tạo `src/app/features/game/reveal.page.ts`:

```ts
import { Component, computed, inject } from '@angular/core';
import { Role } from '../../core/models';
import { GameSessionStore } from '../../state/game-session.store';

const ROLE_LABEL: Record<Role, string> = {
  CIVILIAN: 'Dân làng',
  SPY: 'Gián điệp',
  WHITE: 'Mũ trắng',
};

/**
 * Lật vai người vừa bị loại.
 *
 * Nói rõ hai ca đặc biệt vì cả hai đều dễ gây cãi nhau ngoài đời: bị loại do
 * bốc ngẫu nhiên chứ không phải do bị vote, và mũ trắng vừa đoán sai.
 */
@Component({
  selector: 'app-reveal-page',
  template: `
    <div class="screen lamp reveal">
      <p class="screen__eyebrow">Vòng {{ round() }}</p>

      @if (last(); as elimination) {
        <div class="reveal__who">
          <h1 class="reveal__name">{{ name() }}</h1>
          <p class="reveal__role" [class.reveal__role--spy]="elimination.role === 'SPY'">
            {{ label() }}
          </p>
        </div>

        @if (elimination.byRandomTieBreak) {
          <p class="muted">Bốc ngẫu nhiên để phân định, vì chỉ còn hai người.</p>
        }
      }

      @if (wrongGuess(); as guess) {
        <p class="warning">Mũ trắng đoán "{{ guess }}" — không trúng.</p>
      }

      <div class="screen__spacer"></div>

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" (click)="next()">Tiếp tục</button>
      </div>
    </div>
  `,
  styles: [
    `
      .reveal {
        text-align: center;
      }

      .reveal__who {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .reveal__name {
        font-size: 2.75rem;
        word-break: break-word;
      }

      .reveal__role {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.5rem;
        letter-spacing: 0.06em;
        color: var(--lamp-500);
      }

      .reveal__role--spy {
        color: var(--blood-500);
      }
    `,
  ],
})
export class RevealPage {
  private readonly session = inject(GameSessionStore);

  readonly round = computed(() => this.session.state()?.round ?? 1);
  readonly name = computed(() => this.session.lastEliminatedName() ?? '');

  readonly last = computed(() => {
    const state = this.session.state();
    if (state === null || state.eliminations.length === 0) return null;
    return state.eliminations[state.eliminations.length - 1];
  });

  readonly label = computed(() => {
    const elimination = this.last();
    return elimination === null ? '' : ROLE_LABEL[elimination.role];
  });

  /** Chỉ có giá trị khi mũ trắng vừa đoán và đoán trượt. */
  readonly wrongGuess = computed(() => {
    const guess = this.session.state()?.whiteGuess ?? null;
    return guess === null || guess.correct ? null : guess.text;
  });

  next(): Promise<void> {
    return this.session.afterReveal();
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 319 cộng 5 mới, thành **324**. Báo lại con số thật.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/game/reveal.page.ts src/app/features/game/reveal.page.spec.ts
git commit -m "feat: them man lo danh tinh"
```

---

## Task 9: Màn mũ trắng đoán từ

**Files:**
- Create: `src/app/features/game/white-guess.page.ts`
- Test: `src/app/features/game/white-guess.page.spec.ts`

Mũ trắng chỉ có **đúng một lượt đoán trong cả ván**. Gửi xong là màn này biến mất, nên không cần khoá ô nhập — nhưng phải chặn gửi hai lần trước khi engine kịp đổi pha, vì bấm nút hai lần rất nhanh là chuyện thường.

Engine chấm từ có sai số: bỏ dấu, viết thường, cho lệch 1–2 ký tự. **Không viết lại phép chấm ở đây**, cứ đưa nguyên chuỗi người ta gõ cho `guessCivilianWord`.

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/features/game/white-guess.page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { WhiteGuessPage } from './white-guess.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức', 'Mai'];

/** Chơi tới lúc vừa loại trúng mũ trắng. */
async function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [WhiteGuessPage],
    providers: [
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
    ],
  });

  const session = TestBed.inject(GameSessionStore);
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: NAMES,
    config: {
      ...DEFAULT_GAME_CONFIG,
      spyCount: 1,
      hasWhite: true,
      minRoundsBeforeVote: 1,
    },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }
  for (let i = 0; i < NAMES.length; i++) {
    await session.nextSpeaker();
  }

  const state = session.state()!;
  const white = state.aliveIds.find((id) => state.assignments[id].role === 'WHITE')!;
  await session.vote({ [white]: 4 });
  expect(session.state()?.phase).toBe('WHITE_GUESS');

  const fixture = TestBed.createComponent(WhiteGuessPage);
  fixture.detectChanges();
  return { session, fixture, civilianWord: state.civilianWord };
}

describe('WhiteGuessPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('chưa gõ gì thì chưa gửi được', async () => {
    const { fixture } = await setup();

    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('gõ toàn khoảng trắng cũng không gửi được', async () => {
    const { fixture } = await setup();

    fixture.componentInstance.text.set('   ');

    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('đoán đúng thì mũ trắng thắng và ván dừng ngay', async () => {
    const { session, fixture, civilianWord } = await setup();

    fixture.componentInstance.text.set(civilianWord);
    await fixture.componentInstance.submit();

    expect(session.state()?.phase).toBe('ENDED');
    expect(session.state()?.outcome).toBe('WHITE');
  });

  it('đoán đúng nhưng viết không dấu vẫn được tính', async () => {
    const { session, fixture, civilianWord } = await setup();

    // Lọc dấu thanh bằng mã ký tự chứ không bằng regex có ký tự tổ hợp: dấu
    // thanh dán thẳng vào regex rất dễ bị trình soạn thảo nuốt mất, và khi mất
    // thì test vẫn chạy nhưng không còn kiểm đúng thứ nó định kiểm.
    const noTone = civilianWord
      .normalize('NFD')
      .split('')
      .filter((ch) => {
        const code = ch.charCodeAt(0);
        return code < 0x0300 || code > 0x036f;
      })
      .join('')
      .replace(/đ/g, 'd')
      .toUpperCase();
    fixture.componentInstance.text.set(noTone);
    await fixture.componentInstance.submit();

    expect(session.state()?.outcome).toBe('WHITE');
  });

  it('đoán sai thì ván tiếp tục, sang pha lộ danh tính', async () => {
    const { session, fixture } = await setup();

    fixture.componentInstance.text.set('một từ chắc chắn không trúng');
    await fixture.componentInstance.submit();

    expect(session.state()?.phase).toBe('REVEAL');
    expect(session.state()?.whiteGuess?.correct).toBe(false);
  });

  it('bấm gửi hai lần chỉ tính một lần đoán', async () => {
    const { session, fixture } = await setup();

    fixture.componentInstance.text.set('một từ chắc chắn không trúng');
    const first = fixture.componentInstance.submit();
    const second = fixture.componentInstance.submit();
    await Promise.all([first, second]);

    // Lần bấm thứ hai không được lọt xuống engine, vì engine chỉ nhận
    // submitWhiteGuess ở pha WHITE_GUESS và sẽ ném lỗi.
    expect(session.state()?.phase).toBe('REVEAL');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./white-guess.page`.

- [ ] **Step 3: Viết màn đoán từ**

Tạo `src/app/features/game/white-guess.page.ts`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameSessionStore } from '../../state/game-session.store';

/**
 * Mũ trắng đoán từ của dân làng. Chỉ đúng một lượt trong cả ván.
 *
 * Không chấm từ ở đây. Engine đã có phép chấm có sai số (bỏ dấu, viết thường,
 * cho lệch 1–2 ký tự); viết lại ở tầng giao diện là tạo ra hai luật khác nhau
 * cho cùng một việc.
 */
@Component({
  selector: 'app-white-guess-page',
  imports: [FormsModule],
  template: `
    <div class="screen guess">
      <div>
        <p class="screen__eyebrow">Mũ trắng lộ diện</p>
        <h1 class="screen__title">{{ name() }} đoán từ của dân làng</h1>
      </div>

      <p class="muted">Đoán trúng thì thắng cả làng. Chỉ có một lượt.</p>

      <div class="field">
        <label class="field__label" for="guess">Từ của dân làng là</label>
        <input
          id="guess"
          class="input"
          type="text"
          autocomplete="off"
          placeholder="gõ từ vào đây"
          [ngModel]="text()"
          (ngModelChange)="text.set($event)"
        />
      </div>

      <div class="screen__spacer"></div>

      <div class="screen__actions">
        <button
          type="button"
          class="btn btn--primary"
          [disabled]="!canSubmit()"
          (click)="submit()"
        >
          Chốt câu trả lời
        </button>
      </div>
    </div>
  `,
})
export class WhiteGuessPage {
  private readonly session = inject(GameSessionStore);

  readonly text = signal('');
  readonly name = computed(() => this.session.lastEliminatedName() ?? '');

  /** Chặn lần bấm thứ hai trước khi engine kịp đổi pha. */
  private sent = false;

  readonly canSubmit = computed(() => this.text().trim().length > 0);

  async submit(): Promise<void> {
    if (!this.canSubmit() || this.sent) return;
    this.sent = true;
    await this.session.guessCivilianWord(this.text().trim());
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 324 cộng 6 mới, thành **330**. Báo lại con số thật.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/game/white-guess.page.ts src/app/features/game/white-guess.page.spec.ts
git commit -m "feat: them man mu trang doan tu"
```

---

## Task 10: Màn kết ván

**Files:**
- Create: `src/app/features/game/end.page.ts`
- Test: `src/app/features/game/end.page.spec.ts`

Điểm đã được kho phiên ghi vào bảng từ lúc ván chuyển sang pha `ENDED` (Task 4), **trước khi** màn này được dựng. Nên màn này chỉ đọc, không ghi. Đừng gọi `recordGame` ở đây.

- [ ] **Step 1: Viết test đỏ**

Tạo `src/app/features/game/end.page.spec.ts`:

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../../core/models';
import { ActiveGameRepository } from '../../data/repositories/active-game.repository';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { SettingsRepository } from '../../data/repositories/settings.repository';
import { WordBankRepository } from '../../data/repositories/word-bank.repository';
import { MemoryStorage } from '../../data/storage/memory-storage';
import { STORAGE_PORT } from '../../data/storage/storage.token';
import { GameSessionStore } from '../../state/game-session.store';
import { EndPage } from './end.page';

const NAMES = ['Minh', 'Hùng', 'Lan', 'Đức'];

@Component({ template: '' })
class StubHomePage {}

/** Chơi trọn một ván cho dân làng thắng. */
async function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [EndPage],
    providers: [
      provideRouter([{ path: '', component: StubHomePage }]),
      { provide: STORAGE_PORT, useValue: new MemoryStorage() },
      WordBankRepository,
      ActiveGameRepository,
      ScoreboardRepository,
      SettingsRepository,
      GameSessionStore,
    ],
  });

  const session = TestBed.inject(GameSessionStore);
  await session.startNew({
    villageName: 'Ác Quỷ',
    playerNames: NAMES,
    config: {
      ...DEFAULT_GAME_CONFIG,
      spyCount: 1,
      hasWhite: false,
      minRoundsBeforeVote: 1,
    },
  });
  for (let i = 0; i < NAMES.length; i++) {
    await session.revealNext();
  }
  for (let i = 0; i < NAMES.length; i++) {
    await session.nextSpeaker();
  }
  const state = session.state()!;
  const spy = state.aliveIds.find((id) => state.assignments[id].role === 'SPY')!;
  await session.vote({ [spy]: 3 });
  await session.afterReveal();

  const fixture = TestBed.createComponent(EndPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { session, fixture, ended: state };
}

describe('EndPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('công bố phe thắng', async () => {
    const { fixture } = await setup();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Dân làng thắng',
    );
  });

  it('lật hết vai của mọi người', async () => {
    const { fixture } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const name of NAMES) {
      expect(text).toContain(name);
    }
    expect(text).toContain('Gián điệp');
    expect(text).toContain('Dân làng');
  });

  it('hiện cả hai từ gốc', async () => {
    const { fixture, ended } = await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(ended.civilianWord);
    expect(text).toContain(ended.spyWord);
  });

  it('hiện điểm tích luỹ đã cộng ván này', async () => {
    const { fixture } = await setup();

    // Ba dân làng mỗi người 1 điểm.
    const board = fixture.componentInstance.totals();
    expect(Object.values(board).filter((point) => point === 1)).toHaveLength(3);
  });

  it('chơi ván nữa thì giữ nguyên danh sách người chơi', async () => {
    const { session, fixture } = await setup();
    const oldId = session.state()!.id;

    await fixture.componentInstance.playAgain();

    expect(session.state()?.id).not.toBe(oldId);
    expect(session.state()?.phase).toBe('DEALING');
    expect(session.state()!.players.map((p) => p.name).sort()).toEqual(
      [...NAMES].sort(),
    );
  });

  it('về trang chủ thì bỏ ván đang lưu', async () => {
    const { session, fixture } = await setup();

    await fixture.componentInstance.goHome();

    expect(session.hasGame()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không phân giải được `./end.page`.

- [ ] **Step 3: Viết màn kết ván**

Tạo `src/app/features/game/end.page.ts`:

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Outcome, Role } from '../../core/models';
import { ScoreboardRepository } from '../../data/repositories/scoreboard.repository';
import { GameSessionStore } from '../../state/game-session.store';

const ROLE_LABEL: Record<Role, string> = {
  CIVILIAN: 'Dân làng',
  SPY: 'Gián điệp',
  WHITE: 'Mũ trắng',
};

const OUTCOME_LABEL: Record<Outcome, string> = {
  CIVILIANS: 'Dân làng thắng',
  SPIES: 'Gián điệp lên nắm quyền',
  WHITE: 'Mũ trắng thắng một mình',
};

/**
 * Kết ván.
 *
 * Chỉ đọc bảng điểm, KHÔNG ghi: kho phiên đã ghi từ lúc ván chuyển sang pha
 * ENDED, trước khi màn này được dựng. Ghi thêm lần nữa ở đây là cộng đúp.
 */
@Component({
  selector: 'app-end-page',
  template: `
    <div class="screen lamp end">
      <div>
        <p class="screen__eyebrow">Làng {{ village() }}</p>
        <h1 class="screen__title">{{ headline() }}</h1>
      </div>

      <div class="end__words">
        <div class="end__word">
          <span class="field__label">Dân làng</span>
          <strong>{{ civilianWord() }}</strong>
        </div>
        <div class="end__word">
          <span class="field__label">Gián điệp</span>
          <strong>{{ spyWord() }}</strong>
        </div>
      </div>

      <div class="end__list">
        @for (row of rows(); track row.name) {
          <div class="end__row">
            <span>{{ row.name }}</span>
            <span class="end__role">{{ row.role }}</span>
            <span class="end__point">+{{ row.earned }}</span>
            <span class="muted">{{ row.total }}</span>
          </div>
        }
      </div>

      <div class="screen__spacer"></div>

      <div class="screen__actions">
        <button type="button" class="btn btn--primary" (click)="playAgain()">
          Chơi ván nữa
        </button>
        <button type="button" class="btn btn--ghost" (click)="goHome()">
          Về trang chủ
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .end__words {
        display: flex;
        gap: var(--space-3);
      }

      .end__word {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-4);
        background: var(--ink-800);
        border-radius: var(--radius-md);
        text-align: center;
      }

      .end__word strong {
        font-family: var(--font-display);
        font-size: 1.5rem;
        color: var(--lamp-500);
        word-break: break-word;
      }

      .end__list {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }

      .end__row {
        display: grid;
        grid-template-columns: 1fr auto 3rem 3rem;
        gap: var(--space-3);
        align-items: baseline;
        padding: var(--space-3) var(--space-4);
        background: var(--ink-800);
        border-radius: var(--radius-md);
      }

      .end__role {
        font-size: 0.875rem;
        color: var(--paper-400);
      }

      .end__point {
        text-align: right;
        font-family: var(--font-display);
        color: var(--lamp-500);
      }
    `,
  ],
})
export class EndPage implements OnInit {
  private readonly session = inject(GameSessionStore);
  private readonly scoreboard = inject(ScoreboardRepository);
  private readonly router = inject(Router);

  readonly totals = signal<Record<string, number>>({});

  readonly village = computed(() => this.session.state()?.villageName || 'ta');
  readonly civilianWord = computed(() => this.session.state()?.civilianWord ?? '');
  readonly spyWord = computed(() => this.session.state()?.spyWord ?? '');

  readonly headline = computed(() => {
    const outcome = this.session.state()?.outcome ?? null;
    return outcome === null ? 'Ván đã xong' : OUTCOME_LABEL[outcome];
  });

  /**
   * Điểm ván này, đọc lại từ bản ghi mà kho phiên vừa đẩy vào bảng điểm.
   *
   * Khai báo TRƯỚC `rows` vì `rows` đọc nó. Hiện tại đảo ngược thứ tự vẫn chạy
   * được do `computed` chỉ chạy khi bị đọc, nhưng đó là loại phụ thuộc ngầm dễ
   * gãy khi có người sửa sau này.
   */
  private readonly earned = signal<Record<string, number>>({});

  readonly rows = computed(() => {
    const state = this.session.state();
    if (state === null) return [];

    const earnedThisGame = this.earned();
    return state.players.map((player) => ({
      name: player.name,
      role: ROLE_LABEL[state.assignments[player.id].role],
      earned: earnedThisGame[player.name] ?? 0,
      total: this.totals()[player.name] ?? 0,
    }));
  });

  async ngOnInit(): Promise<void> {
    const state = this.session.state();
    const board = await this.scoreboard.load();

    this.totals.set(board.totals);
    const record = board.history.find((saved) => saved.gameId === state?.id);
    this.earned.set(record?.points ?? {});
  }

  async playAgain(): Promise<void> {
    const state = this.session.state();
    if (state === null) return;

    await this.session.startNew({
      villageName: state.villageName,
      playerNames: state.players.map((player) => player.name),
      config: state.config,
    });
  }

  async goHome(): Promise<void> {
    await this.session.abandon();
    await this.router.navigate(['/']);
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 330 cộng 6 mới, thành **336**. Báo lại con số thật.

- [ ] **Step 5: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/game/end.page.ts src/app/features/game/end.page.spec.ts
git commit -m "feat: them man ket van"
```

---

## Task 11: Nối mọi pha vào vỏ ván

**Files:**
- Modify: `src/app/features/game/game.page.ts`
- Test: `src/app/features/game/game.page.spec.ts`

Thay nhánh `@default` giữ chỗ bằng đủ sáu pha. Và thêm một test chơi trọn một ván từ đầu tới cuối để chắc rằng không có pha nào rơi vào khoảng trống.

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối khối `describe` trong `src/app/features/game/game.page.spec.ts`:

```ts
  it('chơi trọn một ván, mỗi pha đều có màn tương ứng', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const session = TestBed.inject(GameSessionStore);
    await session.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: {
        ...DEFAULT_GAME_CONFIG,
        spyCount: 1,
        hasWhite: false,
        minRoundsBeforeVote: 1,
      },
    });

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;

    // Chia bài
    fixture.detectChanges();
    expect(html.querySelector('app-deal-page')).not.toBeNull();
    for (let i = 0; i < NAMES.length; i++) {
      await session.revealNext();
    }

    // Vòng nói
    fixture.detectChanges();
    expect(html.querySelector('app-speaking-page')).not.toBeNull();
    for (let i = 0; i < NAMES.length; i++) {
      await session.nextSpeaker();
    }

    // Vote
    fixture.detectChanges();
    expect(html.querySelector('app-vote-page')).not.toBeNull();
    const state = session.state()!;
    const spy = state.aliveIds.find((id) => state.assignments[id].role === 'SPY')!;
    await session.vote({ [spy]: 3 });

    // Lộ danh tính
    fixture.detectChanges();
    expect(html.querySelector('app-reveal-page')).not.toBeNull();
    await session.afterReveal();

    // Kết ván
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(html.querySelector('app-end-page')).not.toBeNull();
    expect(html.textContent).toContain('Dân làng thắng');
  });

  it('pha xử hoà có màn riêng', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const session = TestBed.inject(GameSessionStore);
    await session.startNew({
      villageName: 'Ác Quỷ',
      playerNames: NAMES,
      config: { ...DEFAULT_GAME_CONFIG, spyCount: 1, minRoundsBeforeVote: 1 },
    });
    for (let i = 0; i < NAMES.length; i++) {
      await session.revealNext();
    }
    for (let i = 0; i < NAMES.length; i++) {
      await session.nextSpeaker();
    }
    const [a, b] = session.alivePlayers();
    await session.vote({ [a.id]: 1, [b.id]: 1 });

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-tie-page'),
    ).not.toBeNull();
  });

  it('pha mũ trắng đoán từ có màn riêng', async () => {
    const storage = new MemoryStorage();
    configure(storage);

    const names = [...NAMES, 'Mai'];
    const session = TestBed.inject(GameSessionStore);
    await session.startNew({
      villageName: 'Ác Quỷ',
      playerNames: names,
      config: {
        ...DEFAULT_GAME_CONFIG,
        spyCount: 1,
        hasWhite: true,
        minRoundsBeforeVote: 1,
      },
    });
    for (let i = 0; i < names.length; i++) {
      await session.revealNext();
    }
    for (let i = 0; i < names.length; i++) {
      await session.nextSpeaker();
    }
    const state = session.state()!;
    const white = state.aliveIds.find((id) => state.assignments[id].role === 'WHITE')!;
    await session.vote({ [white]: 4 });

    const fixture = TestBed.createComponent(GamePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-white-guess-page'),
    ).not.toBeNull();
  });
```

- [ ] **Step 2: Chạy test để xác nhận đỏ**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: FAIL — không tìm thấy `app-speaking-page`, vì `GamePage` vẫn đang hiện màn giữ chỗ.

- [ ] **Step 3: Nối đủ sáu pha**

Sửa `src/app/features/game/game.page.ts`. Phần import thành:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameSessionStore } from '../../state/game-session.store';
import { NewGameDraftStore } from '../../state/new-game-draft.store';
import { DealPage } from './deal.page';
import { EndPage } from './end.page';
import { RevealPage } from './reveal.page';
import { SpeakingPage } from './speaking.page';
import { TiePage } from './tie.page';
import { VotePage } from './vote.page';
import { WhiteGuessPage } from './white-guess.page';
```

`imports` của component thành:

```ts
  imports: [
    DealPage,
    SpeakingPage,
    VotePage,
    TiePage,
    RevealPage,
    WhiteGuessPage,
    EndPage,
  ],
```

Và thay toàn bộ khối `@switch` bằng:

```ts
      @switch (state.phase) {
        @case ('DEALING') {
          <app-deal-page />
        }
        @case ('SPEAKING') {
          <app-speaking-page />
        }
        @case ('VOTING') {
          <app-vote-page />
        }
        @case ('TIE_BREAK') {
          <app-tie-page />
        }
        @case ('REVEAL') {
          <app-reveal-page />
        }
        @case ('WHITE_GUESS') {
          <app-white-guess-page />
        }
        @case ('ENDED') {
          <app-end-page />
        }
      }
```

Không còn nhánh `@default`: `GamePhase` có đúng bảy giá trị và cả bảy đều đã liệt kê. Thêm pha mới mà quên nối màn thì màn hình trắng trơn — dễ thấy hơn là một màn giữ chỗ mơ hồ.

- [ ] **Step 4: Chạy test để xác nhận xanh**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
```

Expected: PASS — 336 cộng 3 mới, thành **339**. Báo lại con số thật.

- [ ] **Step 5: Build để chắc mọi chunk lười đều dịch được**

```bash
cd /c/SRC/ai-la-gian-diep
npx ng build
```

Expected: build thành công.

- [ ] **Step 6: Commit**

```bash
cd /c/SRC/ai-la-gian-diep
git add src/app/features/game/game.page.ts src/app/features/game/game.page.spec.ts
git commit -m "feat: noi day du cac pha vao vo van"
```

---

## Task 12: Chạy thử trọn ván trên trình duyệt

**Files:** không sửa file nào trừ khi phát hiện lỗi.

- [ ] **Step 1: Chạy app**

```bash
cd /c/SRC/ai-la-gian-diep
npx ng serve
```

Mở `http://localhost:4200`, bật giả lập điện thoại cỡ 390×844.

- [ ] **Step 2: Chơi trọn một ván 4 người, không mũ trắng**

Ghi lại kết quả từng mục:

1. Lập 4 người, tắt mũ trắng, 1 gián điệp, để số vòng tối thiểu mặc định là 3.
2. Chia bài xong → màn vòng nói hiện "Vòng 1", tên người nói rất to, đồng hồ đếm ngược thật.
3. Có dòng "Còn 2 vòng nữa mới được vote".
4. Bấm **Xong lượt** đủ 4 lần → sang "Vòng 2", đồng hồ chạy lại từ đầu.
5. Để đồng hồ chạy hết → hiện "Hết giờ" màu đỏ, **không** tự chuyển người.
6. Qua hết vòng 3 → màn vote mở ra.
7. Dồn phiếu quá số người còn sống → hiện cảnh báo, nút **Chốt phiếu** mờ đi.
8. Chốt phiếu cho một người → màn lộ danh tính, lật đúng vai.
9. Tiếp tục cho tới khi hết gián điệp → màn kết ván.
10. Màn kết ván hiện đủ: phe thắng, hai từ gốc, vai của cả 4 người, điểm ván này và điểm tích luỹ.

- [ ] **Step 3: Chơi ván thứ hai để kiểm điểm cộng dồn**

1. Bấm **Chơi ván nữa** → về màn chia bài, vẫn đúng 4 người cũ.
2. Chơi cho xong ván hai.
3. Điểm tích luỹ của người thắng cả hai ván phải là tổng của hai lần.

- [ ] **Step 4: Kiểm ca mũ trắng**

1. Ván mới 5 người, bật mũ trắng.
2. Vote loại trúng mũ trắng → hiện màn đoán từ.
3. Gõ từ của dân làng nhưng **viết không dấu** → phải được tính là đúng, mũ trắng thắng.
4. Chơi lại, lần này cho mũ trắng đoán sai → màn lộ danh tính ghi rõ "đoán ... — không trúng", ván tiếp tục.

- [ ] **Step 5: Kiểm khôi phục và chống cộng đúp**

1. Đang chơi **giữa chừng** (chưa xong ván), tải lại trang (F5) → về trang chủ → **Chơi tiếp ván đang dở** → quay lại đúng bước đang dở.
2. Chơi cho xong ván đó.
3. Đang ở màn kết ván, **tải lại trang (F5)**. Trang chủ **KHÔNG** hiện nút "Chơi tiếp ván đang dở" — đúng như thiết kế: ván xong rồi thì không còn là ván đang dở, kết quả đã nằm vĩnh viễn trong bảng điểm.
4. Bắt đầu ván mới và chơi xong. **Điểm tích luỹ phải là tổng của các ván, không có ván nào bị tính hai lần.**

- [ ] **Step 6: Chạy test và build lần cuối**

```bash
cd /c/SRC/ai-la-gian-diep
npm test
npx ng build
```

- [ ] **Step 7: Báo cáo**

Không commit gì ở task này trừ khi phải sửa lỗi. Báo lại từng mục đạt hay không đạt, và bất kỳ chỗ nào chữ tiếng Việt hiển thị sai.

---

## Xong bản kế hoạch này thì có gì

Chơi được trọn ván từ đầu tới cuối, nhiều ván liên tiếp, điểm cộng dồn đúng, đóng app giữa chừng mở lại không mất ván và không cộng đúp điểm.

## Bản kế hoạch tiếp theo

Phần dẫn chuyện: `narration.vi.json`, đọc bằng giọng máy tiếng Việt, vài tiếng động, công tắc bật tắt âm thanh. Kèm màn bảng điểm, màn kho từ, màn cài đặt, và đóng gói APK.

**Một cái bẫy để dành sẵn cho màn bảng điểm.** Task 2 khai `gameId` là trường bắt buộc của `GameRecord`, nhưng phép kiểm hình dạng `isScoreboard` chỉ kiểm `history` là mảng chứ không kiểm từng bản ghi — cố ý, để bảng điểm cũ lưu từ trước không bị xoá sạch. Hệ quả: kiểu dữ liệu nói mọi bản ghi đều có `gameId`, còn thực tế bản ghi cũ đọc lên có `undefined`, và TypeScript không cảnh báo gì. Chỗ nào **đọc** `gameId` ra khỏi `history` — dựng danh sách lịch sử, khử trùng lặp, làm khoá `track` cho `@for` — đều phải coi nó là có thể thiếu. Chỗ chỉ **so sánh** nó thì an toàn.
