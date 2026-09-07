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
| Chế độ Bật mí | Công tắc cho gián điệp biết mình là gián điệp. Mặc định tắt. Không cho biết đồng đội |
| Tính điểm | Theo vai, sửa được trong Cài đặt |
| Công nghệ | Angular (standalone components) + Capacitor → xuất APK Android |
| Giọng đọc | TTS sẵn có của thiết bị (vi-VN) + một vài file hiệu ứng ngắn |

---

## 3. Luật chơi chuẩn hoá

Phần này là nguồn chân lý duy nhất cho engine. Mọi câu ở đây phải rõ tới mức không thể hiểu theo hai nghĩa.

### 3.1 Vai

- **Dân làng** — nhận từ A.
- **Gián điệp** — nhận từ B, tương đồng với A. Gián điệp *có từ*, và không bao giờ biết từ của dân làng.
- **Mũ trắng** — không nhận từ nào. Luôn biết mình là mũ trắng, vì không có từ thì không thể không biết.

Số mũ trắng tối đa là 1, và có thể tắt.

### 3.2 Chế độ Bật mí

Một công tắc ở màn cấu hình, quyết định **người chơi có được cho biết vai của mình hay không**. Mặc định tắt.

| | Bật mí **tắt** (mặc định) | Bật mí **bật** |
|---|---|---|
| Thẻ của dân làng | Chỉ hiện từ, không ghi vai | Hiện từ **kèm dòng "Bạn là DÂN LÀNG"** |
| Thẻ của gián điệp | Chỉ hiện từ, không ghi vai | Hiện từ **kèm dòng "Bạn là GIÁN ĐIỆP"** |
| Thẻ của mũ trắng | "Bạn là MŨ TRẮNG — không có từ nào" | Như bên trái |

Khi Bật mí **tắt**, thẻ của dân làng và thẻ của gián điệp phải **giống hệt nhau về mọi mặt** — cùng bố cục, cùng màu, cùng chữ, chỉ khác đúng cái từ. Không được có bất kỳ dấu hiệu nào cho phép suy ra vai: không đổi màu viền, không đổi icon, không khác nhau về thời gian tải. Đây là ràng buộc bắt buộc, vì lộ ở đây là hỏng cả ván.

Khi Bật mí **bật**, thẻ dân làng và thẻ gián điệp vẫn phải giống nhau về bố cục và màu sắc, chỉ khác nội dung chữ ở dòng vai và dòng từ. Lý do: người bên cạnh liếc thấy hình dạng thẻ thì không được suy ra vai, mà phải đọc được chữ mới biết.

**Gián điệp không bao giờ biết đồng đội của mình là ai**, kể cả khi Bật mí đang bật. Ván có 2–3 gián điệp thì họ vẫn có thể vote nhầm nhau.

Chế độ này chỉ đổi phần thông tin lúc chia bài. Nó **không** đổi luật thắng thua, cách vote, hay cách tính điểm.

Ghi chú cân bằng: chế độ này bỏ đi lớp "tự nghi ngờ chính mình" của cả bàn — không ai còn phải mất một hai vòng để đoán xem mình có đang lạc đàn không. Phần lợi nghiêng về gián điệp, vì họ đi lừa được ngay từ câu đầu, trong khi dân làng vốn đã mặc định coi mình là dân nên biết chắc cũng không lợi thêm bao nhiêu. Điểm thưởng của gián điệp vẫn để nguyên mặc định `+2`; nếu nhóm thấy lệch thì hạ xuống `+1` trong Cài đặt.

App ghi nhớ lựa chọn Bật mí của ván gần nhất và điền sẵn cho ván sau.

### 3.3 Ràng buộc đội hình

- Tối thiểu 4 người chơi, kể cả khi bật mũ trắng. Đội hình 4 người nhỏ nhất có mũ trắng là **2 dân làng + 1 gián điệp + 1 mũ trắng**.
- Tối đa 12 người chơi.
- `soDan = tongSoNguoi - soGianDiep - (coMuTrang ? 1 : 0)`
- Bắt buộc `soGianDiep >= 1` và `soDan > soGianDiep`.

Số gián điệp tối đa suy ra trực tiếp từ ràng buộc `soDan > soGianDiep`:

- Không có mũ trắng: `spyMax = ceil(n / 2) - 1`
- Có mũ trắng: `spyMax = ceil((n - 1) / 2) - 1`

| Sĩ số | Gợi ý | Tối đa (không mũ trắng) | Tối đa (có mũ trắng) |
|---|---|---|---|
| 4 | 1 | 1 | 1 |
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

### 3.4 Diễn tiến ván

1. **Chia bài** — mỗi người lần lượt cầm máy xem vai và từ của mình.
2. **Vòng nói** — app random thứ tự nói trong số người còn sống, random lại ở mỗi vòng. Mỗi người nói một câu mô tả từ của mình.
3. **Vote** — người bị nhiều phiếu nhất bị loại.

Cách đếm vòng, nói rõ để tránh lệch một đơn vị: `round` là **số thứ tự của vòng đang diễn ra**, bắt đầu từ `1`. Khi người cuối cùng trong `speakingOrder` bấm xong lượt, vòng đó coi như đã hoàn tất; nếu ván chưa kết thúc thì `round` tăng lên và thứ tự nói được random lại.

Số vòng đã hoàn tất bằng `round - 1` khi đang ở giữa một vòng, và bằng `round` ngay tại thời điểm vừa kết thúc vòng. Vote **chỉ mở sau khi đã hoàn tất đủ `minRoundsBeforeVote` vòng** (mặc định 3). Nói cách khác, với thiết lập mặc định thì lần vote đầu tiên nằm ở cuối vòng 3, và nút vote hiện ra ngay sau khi người cuối cùng của vòng 3 nói xong.
4. **Lộ danh tính** — lật vai người vừa bị loại.
5. **Kiểm tra kết thúc** — nếu chưa ngã ngũ, quay lại bước 2.

### 3.5 Điều kiện kết thúc

Kiểm tra theo đúng thứ tự này sau mỗi lần loại người:

1. **Mũ trắng thắng bằng đoán từ** — mũ trắng bị loại và đoán đúng từ của dân làng. Ván dừng ngay lập tức.
2. **Mũ trắng thắng bằng sống sót** — mũ trắng là người duy nhất còn sống.
3. **Gián điệp thắng** — `soGianDiepConSong >= soNguoiConSongKhongPhaiGianDiep`.
4. **Dân làng thắng** — không còn gián điệp nào sống **và** không còn mũ trắng nào sống.
5. Không thoả điều kiện nào → ván tiếp tục.

Hệ quả cần lưu ý: nếu đã loại hết gián điệp nhưng mũ trắng vẫn còn sống thì ván **chưa** kết thúc, dân làng phải loại nốt mũ trắng.

Điều kiện 2 tồn tại để bịt một nhánh treo có thật. Khi chỉ còn 1 dân làng và 1 mũ trắng, luật bốc ngẫu nhiên ở mục 3.7 có thể loại đúng người dân, để lại mình mũ trắng còn sống. Lúc đó điều kiện 3 không thoả vì không còn gián điệp nào, điều kiện 4 cũng không thoả vì mũ trắng vẫn sống, và ván sẽ kẹt vĩnh viễn với đúng một người. Cho mũ trắng thắng ở đây vừa hợp lý về mặt trò chơi — sống sót tới cuối cùng thì xứng đáng — vừa đảm bảo mọi nhánh đều kết thúc.

Kết hợp lại, sau mỗi lần loại người thì trạng thái còn đúng một người sống luôn kết thúc ván: người đó là gián điệp thì điều kiện 3 thoả, là dân làng thì điều kiện 4 thoả, là mũ trắng thì điều kiện 2 thoả.

### 3.6 Mũ trắng đoán từ

Khi mũ trắng bị loại, app mở ngay ô nhập để đoán **từ của dân làng**. Đúng thì mũ trắng thắng một mình và ván dừng ngay, kể cả khi các điều kiện khác cũng đang thoả. Sai thì mũ trắng rời ván, trận đấu tiếp tục.

Mũ trắng chỉ có đúng một lượt đoán trong cả ván.

**Cách chấm:** chuẩn hoá cả từ đoán lẫn đáp án (viết thường, bỏ dấu tiếng Việt, bỏ ký tự không phải chữ/số, gộp khoảng trắng thừa), rồi so sánh:

- Giống hệt sau khi chuẩn hoá → đúng.
- Khoảng cách Levenshtein `<= 1` với chuỗi dài tối đa 8 ký tự, `<= 2` với chuỗi dài hơn → đúng.
- Còn lại → sai.

Ví dụ: `"Con Mèo"`, `"con meo"`, `"con mèo "` đều được chấm đúng cho đáp án `"con mèo"`.

### 3.7 Xử lý hoà phiếu

Khi có từ hai người trở lên cùng số phiếu cao nhất, app cho quản trò chọn một trong hai:

- **Bỏ phiếu lại** chỉ giữa những người đang hoà. Nếu vẫn hoà lần hai thì vòng này không loại ai.
- **Không loại ai** trong vòng này.

Cả hai trường hợp đều quay về vòng nói và `round` tiếp tục tăng, không ai bị loại nên không kiểm tra điều kiện kết thúc.

`revoteUsed` được đặt lại về `false` mỗi khi bước vào một lượt vote mới, nên mỗi lượt vote đều có quyền bỏ phiếu lại một lần. Khi bỏ phiếu lại, chỉ những người trong `tiedCandidateIds` mới được nhận phiếu.

**Ngoại lệ khi chỉ còn 2 người sống.** Ở trạng thái này, vote hoà 1–1 là chuyện gần như chắc chắn, và "không loại ai" sẽ khiến ván lặp vô tận vì số người sống không bao giờ giảm. Nên khi `aliveIds.length === 2` mà vote hoà, app **bốc ngẫu nhiên một trong hai người để loại**, không cho chọn bỏ phiếu lại và không cho chọn không loại ai. Màn hình nói rõ đây là bốc ngẫu nhiên để phân định.

Trạng thái này chỉ xuất hiện khi đã loại hết gián điệp mà mũ trắng còn sống — vì nếu còn gián điệp trong hai người cuối thì điều kiện "gián điệp thắng" ở mục 3.5 đã kích hoạt trước rồi. Nó là đường đi có thật, dễ gặp nhất ở đội hình 4 người có mũ trắng.

### 3.8 Tính điểm

Điểm mặc định, sửa được trong Cài đặt:

| Kết quả | Điểm |
|---|---|
| Dân làng thắng | +1 cho mỗi dân làng |
| Gián điệp thắng | +2 cho mỗi gián điệp |
| Mũ trắng thắng, bằng đoán từ hoặc bằng sống sót | +3 cho mũ trắng |

Điểm trao cho **mọi người chơi thuộc phe thắng, kể cả người đã bị loại**. Phe thua không được điểm.

Mũ trắng **không thuộc phe dân làng, cũng không thuộc phe gián điệp**. Mũ trắng ghi điểm theo đúng một cách: `outcome` của ván là `WHITE`, bất kể thắng bằng đoán trúng từ hay bằng sống sót tới cuối. Khi mũ trắng thắng thì chỉ mình mũ trắng được điểm, dân làng và gián điệp đều không được gì. Ngược lại, khi dân làng hoặc gián điệp thắng thì mũ trắng không được điểm.

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
buildCard(state, playerId): CardContent                       // mục 6.4
revealNextPlayer(state, rng): EngineResult                    // chia bài, chuyển người kế
advanceSpeaker(state, rng): EngineResult                      // hết vòng thì tự mở vote nếu đủ điều kiện
submitVotes(state, tally: Record<string, number>, rng): EngineResult
resolveTie(state, choice: 'REVOTE' | 'NO_ELIMINATION', rng): EngineResult
submitWhiteGuess(state, text: string): EngineResult
continueAfterReveal(state, rng): EngineResult
```

Engine không import gì từ Angular, không đụng tới `localStorage`, không phát ra âm thanh. Điều này khiến toàn bộ luật ở mục 3 test được bằng unit test thuần.

Nguồn ngẫu nhiên (`rng`) được truyền vào theo từng lời gọi thay vì giữ trong state, để engine vẫn là hàm thuần và test cắm được nguồn ngẫu nhiên có hạt giống cho kết quả lặp lại được.

Không có hành động `openVoting` riêng. Việc mở vote là hệ quả tất yếu của việc người cuối cùng nói xong ở một vòng đã đủ điều kiện, nên `advanceSpeaker` tự chuyển sang `VOTING`. Thêm một hành động riêng chỉ tạo thêm một trạng thái trung gian mà không ai cần.

### 4.2 Tầng dẫn chuyện

`NarrationService` lắng nghe `events` mà engine trả về, tra `narration.vi.json`, bốc ngẫu nhiên một biến thể câu thoại, thay các chỗ giữ chỗ, rồi đọc qua TTS và hiện chữ lên màn hình. Tắt tiếng đi thì engine chạy y hệt.

---

## 5. Mô hình dữ liệu

```ts
type Role = 'CIVILIAN' | 'SPY' | 'WHITE';

// Không có 'SETUP': trước khi bấm Bắt đầu thì chưa tồn tại GameState nào,
// nên đó là trạng thái của màn hình chứ không phải của ván.
type GamePhase =
  | 'DEALING' | 'SPEAKING' | 'VOTING'
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
  revealSpyToSpy: boolean;       // chế độ Bật mí, mặc định false
  // readonly + Object.freeze: hằng mặc định bị spread ở nhiều nơi mà spread
  // chỉ copy nông, nên mảng con phải không sửa được.
  topics: readonly string[];               // rỗng = tất cả chủ đề đang bật
  difficulties: readonly WordPair['difficulty'][];
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
  byRandomTieBreak: boolean;   // true khi bị loại do bốc ngẫu nhiên ở mục 3.7
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
  | 'RANDOM_TIE_BREAK'
  | 'CIVILIAN_KILLED' | 'SPY_CAUGHT' | 'WHITE_REVEALED'
  | 'WHITE_GUESS_CORRECT' | 'WHITE_GUESS_WRONG'
  | 'CIVILIANS_WIN' | 'SPIES_WIN' | 'WHITE_WIN';

interface NarrationEvent {
  type: NarrationEventType;
  payload: {
    village?: string;
    player?: string;
    round?: number;
  };
}
```

**Ràng buộc an toàn bắt buộc:** `payload` chỉ được chứa ba trường trên. Không bao giờ chứa từ bí mật.

Cần nói chính xác về mức bảo đảm ở đây, vì dễ tưởng nhầm là đã an toàn tuyệt đối. TypeScript **chỉ** chặn thuộc tính thừa khi payload được viết dưới dạng object literal gán thẳng vào chỗ có kiểu `NarrationPayload`. Nó **không** chặn khi payload đi qua spread, qua một biến có kiểu rộng hơn, hay qua ép kiểu. Toàn bộ code trong engine đều viết payload dưới dạng literal inline nên lớp chặn này có tác dụng, nhưng nó là quy ước được kiểu hỗ trợ chứ không phải hàng rào không thể vượt.

Lớp bảo vệ thật nằm ở unit test: chạy hết mọi nhánh của engine rồi quét toàn bộ sự kiện phát ra để khẳng định không sự kiện nào chứa `civilianWord` hoặc `spyWord`. Đó mới là thứ bắt được lỗi nếu ai đó sau này dựng payload bằng spread.

---

## 6. Luồng màn hình

### 6.1 Trang chủ

Bốn lối vào: **Ván mới** · **Bảng điểm** · **Kho từ** · **Cài đặt**. Nếu có ván đang dở thì hiện thêm dải "Tiếp tục ván đang dở".

### 6.2 Lập danh sách người chơi

Nhập tên từng người, kéo thả để đổi thứ tự, xoá. Có nút gọi lại nhóm đã lưu lần trước. Tên trùng nhau được tự thêm hậu tố (`Minh`, `Minh 2`).

### 6.3 Cấu hình ván

- **Tên làng** — ô nhập tuỳ chọn, kèm nút 🎲 bốc ngẫu nhiên từ danh sách vui có sẵn. Có công tắc "giữ tên này cho ván sau".
- **Số gián điệp** — bộ chọn, tự giới hạn theo bảng ở mục 3.3, hiện rõ lý do khi một giá trị bị chặn.
- **Mũ trắng** — công tắc bật/tắt.
- **Bật mí** — công tắc bật/tắt, kèm một dòng giải thích ngắn ngay dưới: "Mỗi người sẽ biết vai của mình. Ván sẽ dễ hơn cho gián điệp." Điền sẵn theo lựa chọn của ván gần nhất.
- **Chủ đề và độ khó** — chọn nhiều.
- **Đồng hồ mỗi lượt nói** — mặc định 30 giây, tắt được.

Nút "Bắt đầu" bị vô hiệu khi cấu hình chưa hợp lệ.

### 6.4 Chia bài

Đây là màn hình nhạy cảm nhất về mặt lộ thông tin.

- Hiện to **"Chuyền máy cho Minh"**, chờ đúng người đó bấm "Tôi là Minh".
- Từ và vai chỉ hiện khi **nhấn giữ** vào thẻ. Thả tay ra là che lại ngay lập tức.
- Bấm "Tôi đã xem" để chuyển sang người tiếp theo.
- **Không cho quay lui.** Nút back của hệ thống bị chặn ở màn này.

Nội dung thẻ do một hàm thuần trong engine dựng ra, không do component tự quyết định:

```ts
interface CardContent {
  roleLabel: string | null;   // null = không hiện dòng vai nào
  word: string | null;        // null = mũ trắng
  note: string | null;
}

buildCard(state: GameState, playerId: string): CardContent
```

| Vai | Bật mí tắt | Bật mí bật |
|---|---|---|
| Dân làng | `roleLabel: null`, `word: "con mèo"` | `roleLabel: "Bạn là DÂN LÀNG"`, `word: "con mèo"` |
| Gián điệp | `roleLabel: null`, `word: "con chó"` | `roleLabel: "Bạn là GIÁN ĐIỆP"`, `word: "con chó"` |
| Mũ trắng | `roleLabel: "Bạn là MŨ TRẮNG"`, `word: null`, `note: "Bạn không có từ nào"` | Giống hệt cột trái |

Khi Bật mí tắt, thẻ dân làng và thẻ gián điệp phải giống nhau tới từng chi tiết dựng hình. Component render thẻ **chỉ được đọc `CardContent`**, không được đụng tới `Assignment.role`. Nhờ vậy không thể vô tình thêm một khác biệt nhỏ nào theo vai, và luật che giấu kiểm được bằng unit test thay vì phải soi mắt thường trên giao diện.

Một chi tiết dựng hình cần nhớ khi làm giao diện: hai nhãn vai không dài bằng nhau (`Bạn là DÂN LÀNG` 15 ký tự, `Bạn là GIÁN ĐIỆP` 16 ký tự). Ở chế độ Bật mí bật thì điều đó không làm lộ gì thêm, vì ai cũng đã được cho biết vai của mình. Nhưng người ngồi cạnh liếc qua vẫn có thể suy ra vai từ **bề rộng dòng chữ** mà chưa cần đọc kịp. Vì vậy dòng vai phải nằm trong một khung rộng cố định, căn giữa, để hai thẻ trông giống nhau kể cả khi nhìn thoáng.

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

### Ràng buộc bắt buộc: hai từ phải đủ xa nhau sau khi chuẩn hoá

Cách chấm đoán từ ở mục 3.6 bỏ dấu tiếng Việt rồi chấp nhận sai lệch tới 1 ký tự với đáp án ngắn. Điều đó tạo ra một cái bẫy có thật cho kho từ: nếu hai từ trong một cặp nằm trong khoảng sai lệch cho phép của nhau, thì mũ trắng đoán trúng **từ của gián điệp** vẫn được chấm là đúng và thắng cả ván.

Tiếng Việt đặc biệt dễ dính, vì rất nhiều từ chỉ khác nhau đúng một dấu thanh, mà chuẩn hoá thì xoá sạch dấu thanh:

| Cặp | Sau chuẩn hoá | Khoảng cách | Kết quả |
|---|---|---|---|
| bò / bó | `bo` / `bo` | 0 | Trùng khít, hàm chấm không phân biệt nổi |
| chó / cho | `cho` / `cho` | 0 | Trùng khít |
| mèo / heo | `meo` / `heo` | 1 | Đụng ngưỡng |
| cá / gà | `ca` / `ga` | 1 | Đụng ngưỡng |
| bút bi / bút chì | `but bi` / `but chi` | 2 | An toàn |
| xe máy / xe đạp | `xe may` / `xe dap` | 2 | An toàn |

Yêu cầu mục 7 rằng hai từ phải **tương đồng** càng làm chuyện này dễ xảy ra, vì người soạn kho sẽ tự nhiên chọn những cặp cùng loại như mèo/heo hay cá/gà.

**Quy tắc:** với mọi cặp, khoảng cách Levenshtein giữa hai từ sau khi chuẩn hoá phải **lớn hơn** ngưỡng chấm của cả hai chiều. Cụ thể, gọi `nA` và `nB` là hai dạng chuẩn hoá, cặp chỉ hợp lệ khi:

```
levenshtein(nA, nB) > max(nguong(nA), nguong(nB))
```

trong đó `nguong(s)` là `1` nếu `s.length <= 8` và `2` nếu dài hơn.

Ràng buộc này phải được kiểm ở hai nơi: một test chạy trên toàn bộ `word-bank.json` đóng gói sẵn, và một lần kiểm tra lúc người dùng thêm cặp từ của riêng họ, kèm thông báo giải thích tại sao cặp bị từ chối.

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
| `settings` | Âm thanh, tốc độ đọc, điểm theo vai, đồng hồ, số vòng tối thiểu, lựa chọn Bật mí gần nhất |
| `scoreboard` | Điểm tích luỹ và lịch sử các ván |
| `activeGame` | State của ván đang dở, để khôi phục |

`activeGame` được ghi lại sau mỗi lần state đổi. Khi mở app, nếu khoá này tồn tại và `phase` khác `ENDED` thì hiện lời mời tiếp tục.

---

## 10. Các ca biên

| Tình huống | Cách xử lý |
|---|---|
| Cấu hình vai không hợp lệ | Chặn tại màn cấu hình, hiện lý do cụ thể, tự đề xuất giá trị hợp lệ gần nhất |
| Sĩ số dưới 4 | Vô hiệu nút bắt đầu, giải thích rõ. Mũ trắng không làm tăng mức tối thiểu này |
| Hoà phiếu | Chọn bỏ phiếu lại hoặc không loại ai. Bỏ phiếu lại vẫn hoà thì không loại ai |
| Hoà phiếu khi chỉ còn 2 người sống | Bốc ngẫu nhiên một trong hai để loại, tránh ván lặp vô tận. Không cho bỏ phiếu lại |
| Tổng phiếu nhập vào vượt số người còn sống | Cảnh báo, không cho gửi |
| Mũ trắng đoán đúng | Ván dừng ngay, mũ trắng thắng một mình, các điều kiện khác bị bỏ qua |
| Mũ trắng đoán sai | Rời ván, trận tiếp tục |
| Hết gián điệp nhưng mũ trắng còn sống | Ván chưa kết thúc |
| Chỉ còn mũ trắng sống một mình | Mũ trắng thắng, ván kết thúc. Bịt nhánh treo với đúng một người sống |
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

- **Điều kiện kết thúc** — cả năm nhánh ở mục 3.5, gồm ca "hết gián điệp nhưng mũ trắng còn sống thì chưa kết thúc", ca "mũ trắng đoán đúng thắng đè lên mọi điều kiện khác", và ca "chỉ còn mũ trắng sống một mình thì mũ trắng thắng".
- **Validate đội hình** — quét mọi sĩ số từ 4 đến 12, có và không có mũ trắng, khẳng định đúng khớp bảng ở mục 3.3. Có một test riêng cho đội hình nhỏ nhất **4 người có mũ trắng** (2 dân + 1 gián điệp + 1 mũ trắng), vì đây là ca dễ bị chặn nhầm nhất.
- **Nội dung thẻ chia bài** — với cả hai chế độ Bật mí, kiểm tra nội dung thẻ của từng vai đúng như bảng ở mục 3.2. Đặc biệt: khi Bật mí tắt, thẻ dân làng và thẻ gián điệp phải **giống hệt nhau ngoài đúng cái từ**, khẳng định bằng cách so sánh toàn bộ dữ liệu dựng thẻ chứ không chỉ so phần chữ hiển thị.
- **Xử phiếu** — trường hợp thường, hoà hai người, hoà nhiều người, bỏ phiếu lại vẫn hoà, tổng phiếu không hợp lệ, và ca hoà khi chỉ còn 2 người sống thì phải bốc ngẫu nhiên chứ không được để không loại ai.
- **Ván luôn kết thúc** — chạy mô phỏng đội hình 4 người có mũ trắng qua mọi thứ tự loại người có thể xảy ra, khẳng định không nhánh nào lặp vô tận và mọi nhánh đều dừng ở một `outcome` hợp lệ.
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
