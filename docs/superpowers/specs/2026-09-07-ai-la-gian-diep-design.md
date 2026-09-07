# Ai Là Gián Điệp — Đặc tả thiết kế (v1)

Ngày: 2026-09-07

## 1. Tổng quan

### Mục tiêu

Một app điện thoại đóng vai **người quản trò** cho trò "Ai là gián điệp" khi cả nhóm ngồi chơi trực tiếp với nhau. App gánh toàn bộ phần việc thủ công đang làm bằng giấy: nghĩ cặp từ, bốc thăm danh tính, phát từ bí mật, đếm vòng, mở vote, xử kết quả, cộng điểm.

### Bối cảnh sử dụng

Cả nhóm ngồi chung một bàn. Dùng **một điện thoại duy nhất, chuyền tay nhau**. Không cần mạng, không cần đăng nhập, không có backend.

### Ngoài phạm vi v1

Chế độ nhiều máy có phòng · xuất/nhập kho từ · thống kê nâng cao · thu giọng thật · đa ngôn ngữ · đồng bộ đám mây · tài khoản người dùng.

---

## 2. Các quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Mô hình chơi | Một máy chuyền tay (pass-and-play), offline hoàn toàn |
| Nguồn cặp từ | Kho đóng gói sẵn trong app + cho phép người dùng tự thêm |
| Mức độ trọng tài | App dẫn đầy đủ từng bước và tự xử lý luật |
| Tính điểm | Theo vai, sửa được trong Cài đặt |
| Công nghệ | Angular (standalone components) + Capacitor → xuất APK Android |
| Giọng đọc | TTS sẵn có của thiết bị (vi-VN) + một vài file hiệu ứng ngắn |

---

## 3. Luật chơi chuẩn hoá

Phần này là nguồn chân lý duy nhất cho engine. Mọi câu ở đây phải rõ tới mức không thể hiểu theo hai nghĩa.

### 3.1 Vai

- **Dân làng** — nhận từ A.
- **Gián điệp** — nhận từ B (tương đồng với A). Gián điệp *có từ*, nhưng không biết mình là gián điệp và không biết từ của dân làng.
- **Mũ trắng** — không nhận từ nào. Biết mình là mũ trắng.

Số mũ trắng tối đa là 1, và có thể tắt.

### 3.2 Ràng buộc đội hình

- Tối thiểu 4 người chơi. Nếu bật mũ trắng thì tối thiểu 5.
- Tối đa 12 người chơi.
- `soDan = tongSoNguoi - soGianDiep - (coMuTrang ? 1 : 0)`
- Bắt buộc `soGianDiep >= 1` và `soDan > soGianDiep`.

Số gián điệp tối đa suy ra trực tiếp từ ràng buộc `soDan > soGianDiep`:

- Không có mũ trắng: `spyMax = ceil(n / 2) - 1`
- Có mũ trắng: `spyMax = ceil((n - 1) / 2) - 1`

| Sĩ số | Gợi ý | Tối đa (không mũ trắng) | Tối đa (có mũ trắng) |
|---|---|---|---|
| 4 | 1 | 1 | — (không đủ người) |
| 5 | 1 | 2 | 1 |
| 6 | 1 | 2 | 2 |
| 7 | 2 | 3 | 2 |
| 8 | 2 | 3 | 3 |
| 9 | 2 | 4 | 3 |
| 10 | 2 | 4 | 4 |
| 11 | 3 | 5 | 4 |
| 12 | 3 | 5 | 5 |

Cột "Gợi ý" là giá trị app điền sẵn cho vui và cân bằng, không phải giới hạn. Người chơi chọn bất kỳ giá trị nào tới mức tối đa đều được.

App tự tính lại giá trị hợp lệ mỗi khi sĩ số hoặc công tắc mũ trắng thay đổi. Nếu số gián điệp đang chọn vượt mức tối đa mới thì app tự kéo về mức tối đa và báo cho người dùng biết. Nút "Bắt đầu" bị vô hiệu khi cấu hình sai.

### 3.3 Diễn tiến ván

1. **Chia bài** — mỗi người lần lượt cầm máy xem vai và từ của mình.
2. **Vòng nói** — app random thứ tự nói trong số người còn sống, random lại ở mỗi vòng. Mỗi người nói một câu mô tả từ của mình.
3. **Vote** — người bị nhiều phiếu nhất bị loại.

Cách đếm vòng, nói rõ để tránh lệch một đơn vị: `round` là **số thứ tự của vòng đang diễn ra**, bắt đầu từ `1`. Khi người cuối cùng trong `speakingOrder` bấm xong lượt, vòng đó coi như đã hoàn tất; nếu ván chưa kết thúc thì `round` tăng lên và thứ tự nói được random lại.

Số vòng đã hoàn tất bằng `round - 1` khi đang ở giữa một vòng, và bằng `round` ngay tại thời điểm vừa kết thúc vòng. Vote **chỉ mở sau khi đã hoàn tất đủ `minRoundsBeforeVote` vòng** (mặc định 3). Nói cách khác, với thiết lập mặc định thì lần vote đầu tiên nằm ở cuối vòng 3, và nút vote hiện ra ngay sau khi người cuối cùng của vòng 3 nói xong.
4. **Lộ danh tính** — lật vai người vừa bị loại.
5. **Kiểm tra kết thúc** — nếu chưa ngã ngũ, quay lại bước 2.

### 3.4 Điều kiện kết thúc

Kiểm tra theo đúng thứ tự này sau mỗi lần loại người:

1. **Mũ trắng thắng** — mũ trắng bị loại và đoán đúng từ của dân làng. Ván dừng ngay lập tức.
2. **Gián điệp thắng** — `soGianDiepConSong >= soNguoiConSongKhongPhaiGianDiep`.
3. **Dân làng thắng** — không còn gián điệp nào sống **và** không còn mũ trắng nào sống.
4. Không thoả điều kiện nào → ván tiếp tục.

Hệ quả cần lưu ý: nếu đã loại hết gián điệp nhưng mũ trắng vẫn còn sống thì ván **chưa** kết thúc, dân làng phải loại nốt mũ trắng.

### 3.5 Mũ trắng đoán từ

Khi mũ trắng bị loại, app mở ngay ô nhập để đoán **từ của dân làng**. Đúng thì mũ trắng thắng một mình và ván dừng ngay, kể cả khi các điều kiện khác cũng đang thoả. Sai thì mũ trắng rời ván, trận đấu tiếp tục.

Mũ trắng chỉ có đúng một lượt đoán trong cả ván.

**Cách chấm:** chuẩn hoá cả từ đoán lẫn đáp án (viết thường, bỏ dấu tiếng Việt, bỏ ký tự không phải chữ/số, gộp khoảng trắng thừa), rồi so sánh:

- Giống hệt sau khi chuẩn hoá → đúng.
- Khoảng cách Levenshtein `<= 1` với chuỗi dài tối đa 8 ký tự, `<= 2` với chuỗi dài hơn → đúng.
- Còn lại → sai.

Ví dụ: `"Con Mèo"`, `"con meo"`, `"con mèo "` đều được chấm đúng cho đáp án `"con mèo"`.

### 3.6 Xử lý hoà phiếu

Khi có từ hai người trở lên cùng số phiếu cao nhất, app cho quản trò chọn một trong hai:

- **Bỏ phiếu lại** chỉ giữa những người đang hoà. Nếu vẫn hoà lần hai thì vòng này không loại ai.
- **Không loại ai** trong vòng này.

Cả hai trường hợp đều quay về vòng nói và `round` tiếp tục tăng, không ai bị loại nên không kiểm tra điều kiện kết thúc.

`revoteUsed` được đặt lại về `false` mỗi khi bước vào một lượt vote mới, nên mỗi lượt vote đều có quyền bỏ phiếu lại một lần. Khi bỏ phiếu lại, chỉ những người trong `tiedCandidateIds` mới được nhận phiếu.

### 3.7 Tính điểm

Điểm mặc định, sửa được trong Cài đặt:

| Kết quả | Điểm |
|---|---|
| Dân làng thắng | +1 cho mỗi dân làng |
| Gián điệp thắng | +2 cho mỗi gián điệp |
| Mũ trắng đoán đúng | +3 cho mũ trắng |

Điểm trao cho **mọi người chơi thuộc phe thắng, kể cả người đã bị loại**. Phe thua không được điểm.

Mũ trắng **không thuộc phe dân làng, cũng không thuộc phe gián điệp**. Mũ trắng chỉ có đúng một cách ghi điểm là tự đoán trúng từ của dân làng. Khi mũ trắng thắng thì chỉ mình mũ trắng được điểm, dân làng và gián điệp đều không được gì. Ngược lại, khi dân làng hoặc gián điệp thắng thì mũ trắng không được điểm.

---

## 4. Kiến trúc

Nguyên tắc chủ đạo: **luật chơi tách hoàn toàn khỏi giao diện và khỏi âm thanh.**

```
src/app/
├─ core/
│  ├─ models/          WordPair, Player, Role, GameConfig, GameState, NarrationEvent
│  └─ engine/
│     ├─ game-engine.ts        máy trạng thái thuần, không phụ thuộc Angular
│     ├─ team-rules.ts         validate đội hình, gợi ý số gián điệp
│     ├─ win-conditions.ts     kiểm tra điều kiện kết thúc
│     ├─ vote-resolver.ts      đếm phiếu, xử hoà
│     └─ guess-matcher.ts      chuẩn hoá + Levenshtein cho đoán từ
├─ data/
│  ├─ word-bank.json           kho cặp từ đóng gói sẵn
│  ├─ narration.vi.json        kịch bản thoại
│  └─ repositories/            đọc/ghi Capacitor Preferences
├─ features/
│  ├─ home/  setup/  deal/  round/  vote/  reveal/  result/
│  └─ scoreboard/  word-bank/  settings/
└─ ui/                          component "câm" tái sử dụng
```

### 4.1 Engine

`game-engine.ts` là hàm thuần. Mỗi hành động nhận state hiện tại, trả về state mới **và danh sách event dẫn chuyện**:

```ts
interface EngineResult {
  state: GameState;
  events: NarrationEvent[];
}

createGame(input: NewGameInput): EngineResult
revealNextPlayer(state): EngineResult        // chia bài, chuyển sang người kế
startRound(state, rng): EngineResult         // random thứ tự nói
advanceSpeaker(state): EngineResult
openVoting(state): EngineResult
submitVotes(state, tally: Record<string, number>): EngineResult
resolveTie(state, choice: 'REVOTE' | 'NO_ELIMINATION'): EngineResult
submitWhiteGuess(state, text: string): EngineResult
continueAfterReveal(state): EngineResult
```

Engine không import gì từ Angular, không đụng tới `localStorage`, không phát ra âm thanh. Điều này khiến toàn bộ luật ở mục 3 test được bằng unit test thuần.

Nguồn ngẫu nhiên (`rng`) được truyền vào từ ngoài để test có thể cắm hàm giả và cho kết quả lặp lại được.

### 4.2 Tầng dẫn chuyện

`NarrationService` lắng nghe `events` mà engine trả về, tra `narration.vi.json`, bốc ngẫu nhiên một biến thể câu thoại, thay các chỗ giữ chỗ, rồi đọc qua TTS và hiện chữ lên màn hình. Tắt tiếng đi thì engine chạy y hệt.

---

## 5. Mô hình dữ liệu

```ts
type Role = 'CIVILIAN' | 'SPY' | 'WHITE';

type GamePhase =
  | 'SETUP' | 'DEALING' | 'SPEAKING' | 'VOTING'
  | 'TIE_BREAK' | 'REVEAL' | 'WHITE_GUESS' | 'ENDED';

type Outcome = 'CIVILIANS' | 'SPIES' | 'WHITE';

interface WordPair {
  id: string;
  wordA: string;
  wordB: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isCustom: boolean;
  hidden: boolean;          // cặp gốc chỉ được ẩn, không xoá
}

interface Player {
  id: string;
  name: string;             // đã khử trùng lặp
}

interface GameConfig {
  spyCount: number;
  hasWhite: boolean;
  topics: string[];         // rỗng = tất cả chủ đề đang bật
  difficulties: WordPair['difficulty'][];
  timerSeconds: number | null;   // null = tắt đồng hồ
  minRoundsBeforeVote: number;   // mặc định 3
}

interface Assignment {
  playerId: string;
  role: Role;
  word: string | null;      // null khi là mũ trắng
}

interface Elimination {
  round: number;
  playerId: string;
  role: Role;
}

interface GameState {
  id: string;
  villageName: string;           // rỗng thì hiển thị "làng ta"
  config: GameConfig;
  pairId: string;
  civilianWord: string;
  spyWord: string;
  players: Player[];
  assignments: Record<string, Assignment>;
  dealtCount: number;
  round: number;                 // bắt đầu từ 1
  speakingOrder: string[];
  speakerIndex: number;
  aliveIds: string[];
  eliminations: Elimination[];
  tiedCandidateIds: string[];    // chỉ có giá trị ở phase TIE_BREAK
  revoteUsed: boolean;
  whiteGuess: { text: string; correct: boolean } | null;
  phase: GamePhase;
  outcome: Outcome | null;
}
```

### Sự kiện dẫn chuyện

```ts
type NarrationEventType =
  | 'GAME_START' | 'PASS_DEVICE' | 'ROUND_START' | 'SPEAKER_TURN'
  | 'TIME_ALMOST_UP' | 'VOTE_OPEN' | 'VOTE_TIE' | 'NO_ELIMINATION'
  | 'CIVILIAN_KILLED' | 'SPY_CAUGHT' | 'WHITE_REVEALED'
  | 'WHITE_GUESS_CORRECT' | 'WHITE_GUESS_WRONG'
  | 'CIVILIANS_WIN' | 'SPIES_WIN';

interface NarrationEvent {
  type: NarrationEventType;
  payload: {
    village?: string;
    player?: string;
    round?: number;
  };
}
```

**Ràng buộc an toàn bắt buộc:** `payload` chỉ được chứa ba trường trên. Không bao giờ chứa từ bí mật. Kiểu dữ liệu chặn ở mức compile-time, và có unit test chạy hết mọi nhánh của engine để khẳng định không event nào chứa `civilianWord` hoặc `spyWord`.

---

## 6. Luồng màn hình

### 6.1 Trang chủ

Bốn lối vào: **Ván mới** · **Bảng điểm** · **Kho từ** · **Cài đặt**. Nếu có ván đang dở thì hiện thêm dải "Tiếp tục ván đang dở".

### 6.2 Lập danh sách người chơi

Nhập tên từng người, kéo thả để đổi thứ tự, xoá. Có nút gọi lại nhóm đã lưu lần trước. Tên trùng nhau được tự thêm hậu tố (`Minh`, `Minh 2`).

### 6.3 Cấu hình ván

- **Tên làng** — ô nhập tuỳ chọn, kèm nút 🎲 bốc ngẫu nhiên từ danh sách vui có sẵn. Có công tắc "giữ tên này cho ván sau".
- **Số gián điệp** — bộ chọn, tự giới hạn theo bảng ở mục 3.2, hiện rõ lý do khi một giá trị bị chặn.
- **Mũ trắng** — công tắc bật/tắt.
- **Chủ đề và độ khó** — chọn nhiều.
- **Đồng hồ mỗi lượt nói** — mặc định 30 giây, tắt được.

Nút "Bắt đầu" bị vô hiệu khi cấu hình chưa hợp lệ.

### 6.4 Chia bài

Đây là màn hình nhạy cảm nhất về mặt lộ thông tin.

- Hiện to **"Chuyền máy cho Minh"**, chờ đúng người đó bấm "Tôi là Minh".
- Từ và vai chỉ hiện khi **nhấn giữ** vào thẻ. Thả tay ra là che lại ngay lập tức.
- Bấm "Tôi đã xem" để chuyển sang người tiếp theo.
- **Không cho quay lui.** Nút back của hệ thống bị chặn ở màn này.
- Với mũ trắng, thẻ hiện "Bạn là MŨ TRẮNG — không có từ nào".

### 6.5 Vòng nói

Hiện số vòng hiện tại, tên người đang tới lượt, và đồng hồ đếm ngược nếu bật. Nút "Xong lượt" chuyển người kế. Có thanh nhỏ hiện thứ tự nói của cả vòng.

Khi chưa đủ số vòng tối thiểu, app hiện rõ "Còn N vòng nữa mới được vote".

### 6.6 Vote

Danh sách người còn sống, mỗi người một bộ đếm phiếu để quản trò nhập số phiếu. App tự tổng hợp, cảnh báo khi tổng phiếu vượt số người còn sống.

Hoà phiếu thì mở hộp thoại chọn giữa bỏ phiếu lại và không loại ai.

### 6.7 Lộ danh tính

Lật vai người vừa bị loại kèm hiệu ứng và câu thoại tương ứng. Nếu là mũ trắng thì chuyển thẳng sang màn đoán từ.

### 6.8 Đoán từ của mũ trắng

Một ô nhập, một nút gửi, không cho sửa sau khi gửi. Kết quả hiện ngay.

### 6.9 Kết ván

Lật toàn bộ vai của mọi người, hiện hai từ gốc, hiện điểm cộng của ván này và bảng điểm tích luỹ sau khi cộng. Hai nút: **Chơi ván nữa** (giữ nguyên danh sách người chơi) và **Về trang chủ**.

### 6.10 Bảng điểm

Điểm tích luỹ theo từng người, có lịch sử các ván đã chơi (tên làng, ngày, phe thắng). Nút xoá toàn bộ có xác nhận.

### 6.11 Kho từ

Duyệt theo chủ đề, ô tìm kiếm, thêm/sửa/xoá cặp của riêng mình, ẩn/hiện cặp gốc, bật/tắt cả chủ đề.

---

## 7. Kho từ

`word-bank.json` đóng gói sẵn trong app, khoảng vài trăm cặp tiếng Việt.

**Chủ đề:** Động vật · Đồ ăn thức uống · Nghề nghiệp · Đồ vật trong nhà · Thể thao · Phim và nhân vật · Thiên nhiên · Giao thông.

**Độ khó:** `EASY` (chó / mèo) · `MEDIUM` (bút bi / bút chì) · `HARD` (phở / bún bò).

### Quy tắc bốc cặp từ

1. Lọc theo chủ đề và độ khó đang bật, bỏ các cặp `hidden`.
2. Ưu tiên các cặp chưa nằm trong lịch sử đã dùng. Khi mọi cặp đủ điều kiện đều đã dùng thì xoá lịch sử và bắt đầu vòng mới.
3. **Hoán đổi ngẫu nhiên**: tung đồng xu để quyết định `wordA` hay `wordB` làm từ của dân làng. Nhờ vậy chơi lâu không đoán được vai qua thói quen của app.
4. Nếu bộ lọc không còn cặp nào hợp lệ, app báo lỗi rõ ràng và mời nới bộ lọc, không tự ý bỏ qua bộ lọc.

Cặp do người dùng thêm có `isCustom: true` và được xoá thật. Cặp gốc chỉ được đặt `hidden: true`.

---

## 8. Dẫn chuyện và âm thanh

### 8.1 Kịch bản thoại

Nằm trong `narration.vi.json`. Mỗi loại sự kiện có **nhiều biến thể** để bốc ngẫu nhiên, tránh nghe lặp khi chơi liên tiếp nhiều ván. Chỗ giữ chỗ dùng được: `{village}`, `{player}`, `{round}`.

```jsonc
{
  "VOTE_OPEN": [
    "Tới giờ vote rồi người dân của làng {village} ơi",
    "Làng {village} nghi ngờ ai, chỉ mặt đặt tên đi"
  ],
  "CIVILIAN_KILLED": [
    "Tèo teo, một người dân vô tội đã đi bán muối",
    "{player} ra đi trong oan ức, làng {village} mất một người tốt"
  ],
  "SPIES_WIN": [
    "Gián điệp mưu mô đã lên nắm quyền",
    "Làng {village} thất thủ rồi bà con ơi"
  ],
  "CIVILIANS_WIN": [
    "Chúc mừng dân làng chiến thắng"
  ]
}
```

Khi `villageName` rỗng, `{village}` được thay bằng `"ta"`.

Thêm câu thoại mới chỉ cần sửa file JSON này, không đụng tới code.

### 8.2 Phát âm thanh

Dùng plugin Capacitor TTS với ngôn ngữ `vi-VN`. Kèm vài file hiệu ứng ngắn: chuyển lượt, sắp hết giờ, có người bị loại, kết ván.

**Ba mức âm thanh** trong Cài đặt, kèm nút loa ở thanh trên cùng để tắt gấp giữa ván:

| Mức | Hành vi |
|---|---|
| `OFF` | Im lặng hoàn toàn, chỉ hiện chữ |
| `SFX_ONLY` | Chỉ hiệu ứng ngắn, không đọc |
| `FULL` | Đọc đầy đủ kèm hiệu ứng |

Tốc độ đọc chỉnh được.

### 8.3 Suy giảm êm khi thiếu giọng

Khi khởi động, app hỏi thiết bị xem có giọng `vi-VN` không. Nếu không có thì hiện thông báo một lần duy nhất (có nút "không nhắc lại") và tự hạ xuống `SFX_ONLY`. Game vẫn chơi được bình thường vì mọi câu thoại luôn được hiển thị bằng chữ song song với việc đọc.

---

## 9. Lưu trữ

Toàn bộ dữ liệu nằm trên máy qua Capacitor Preferences. Không có gì rời khỏi thiết bị.

| Khoá | Nội dung |
|---|---|
| `players` | Danh sách người chơi hay dùng |
| `customPairs` | Cặp từ người dùng tự thêm |
| `hiddenPairIds` | Id các cặp gốc đã bị ẩn |
| `usedPairIds` | Lịch sử cặp đã dùng, để chống lặp |
| `settings` | Âm thanh, tốc độ đọc, điểm theo vai, đồng hồ, số vòng tối thiểu |
| `scoreboard` | Điểm tích luỹ và lịch sử các ván |
| `activeGame` | State của ván đang dở, để khôi phục |

`activeGame` được ghi lại sau mỗi lần state đổi. Khi mở app, nếu khoá này tồn tại và `phase` khác `ENDED` thì hiện lời mời tiếp tục.

---

## 10. Các ca biên

| Tình huống | Cách xử lý |
|---|---|
| Cấu hình vai không hợp lệ | Chặn tại màn cấu hình, hiện lý do cụ thể, tự đề xuất giá trị hợp lệ gần nhất |
| Sĩ số dưới 4, hoặc dưới 5 khi bật mũ trắng | Vô hiệu nút bắt đầu, giải thích rõ |
| Hoà phiếu | Chọn bỏ phiếu lại hoặc không loại ai. Bỏ phiếu lại vẫn hoà thì không loại ai |
| Tổng phiếu nhập vào vượt số người còn sống | Cảnh báo, không cho gửi |
| Mũ trắng đoán đúng | Ván dừng ngay, mũ trắng thắng một mình, các điều kiện khác bị bỏ qua |
| Mũ trắng đoán sai | Rời ván, trận tiếp tục |
| Hết gián điệp nhưng mũ trắng còn sống | Ván chưa kết thúc |
| Bấm back ở màn chia bài | Chặn hoàn toàn, đã xem là không mở lại được |
| Thoát app giữa ván | Khôi phục từ `activeGame` khi mở lại |
| Thiết bị không có giọng vi-VN | Báo một lần, tự hạ xuống `SFX_ONLY` |
| Tên người chơi trùng nhau | Tự thêm hậu tố phân biệt |
| Bộ lọc chủ đề và độ khó không còn cặp nào | Báo lỗi rõ ràng, mời nới bộ lọc |
| Tất cả cặp hợp lệ đều đã dùng | Xoá lịch sử, bắt đầu vòng mới, không chặn người chơi |

---

## 11. Kiểm thử

Vì engine là TypeScript thuần nên toàn bộ luật ở mục 3 kiểm được bằng unit test, không cần dựng giao diện.

### Bắt buộc phải phủ

- **Điều kiện kết thúc** — cả bốn nhánh ở mục 3.4, gồm cả ca "hết gián điệp nhưng mũ trắng còn sống thì chưa kết thúc" và ca "mũ trắng đoán đúng thắng đè lên mọi điều kiện khác".
- **Validate đội hình** — quét mọi sĩ số từ 4 đến 12, có và không có mũ trắng, khẳng định đúng khớp bảng ở mục 3.2.
- **Xử phiếu** — trường hợp thường, hoà hai người, hoà nhiều người, bỏ phiếu lại vẫn hoà, tổng phiếu không hợp lệ.
- **Chấm đoán từ** — có dấu, không dấu, sai chính tả nhẹ, thừa khoảng trắng, khác hoàn toàn.
- **Bốc cặp từ** — không lặp cho tới khi hết kho, có hoán đổi từ dân/gián điệp, xử đúng khi bộ lọc rỗng.
- **Tính điểm** — cả ba kết quả, và khẳng định người đã bị loại vẫn được điểm nếu phe mình thắng.
- **Rò rỉ từ bí mật** — chạy hết mọi nhánh của engine, khẳng định không `NarrationEvent` nào chứa `civilianWord` hoặc `spyWord`.

### Kiểm thủ công

Luồng chia bài chuyền tay và hành vi nhấn-giữ-để-xem cần thử tay trên máy thật.

---

## 12. Phạm vi bản v1

**Có trong v1:** mọi thứ mô tả trong tài liệu này.

**Để lại lần sau:** xuất/nhập kho từ để chia sẻ · thống kê kiểu "ai hay bị nghi oan nhất" · chế độ nhiều máy có phòng · giọng thu sẵn thay cho TTS · đa ngôn ngữ · bản iOS.

Bản v1 nhằm mục đích chơi thử thực tế rồi mới quyết định bổ sung gì tiếp.
