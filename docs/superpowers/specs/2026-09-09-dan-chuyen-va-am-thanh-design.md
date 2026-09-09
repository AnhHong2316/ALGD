# Dẫn chuyện và âm thanh — Thiết kế

Ngày 09/09/2026. Bản đặc tả này khai triển mục 8 của
`2026-09-07-ai-la-gian-diep-design.md`, phần duy nhất trong đặc tả gốc chưa
từng được chia thành công việc để làm.

---

## 1. Vì sao cần bản này

Bốn bản kế hoạch đã thi hành cho tới nay phủ nền móng, engine, kho từ, lưu
trữ, giao diện chuẩn bị và vòng chơi. Không bản nào nhận phần dẫn chuyện.
Hậu quả là app chạy được trọn một ván nhưng im lặng hoàn toàn.

Thứ đang có sẵn, và sẽ dùng lại nguyên vẹn:

| Thứ | Ở đâu | Trạng thái |
|---|---|---|
| 18 loại `NarrationEventType` | `core/models/narration-event.ts` | Đủ dùng, không sửa |
| Engine phát `events` sau mỗi hành động | `core/engine/game-engine.ts` | Không sửa |
| Signal `events` trên kho phiên | `state/game-session.store.ts:65` | Đã phơi ra, chưa ai đọc |
| `soundLevel`, `speechRate` | `data/repositories/settings.repository.ts` | Lưu được, chưa ai dùng |
| `Rng`, `pickIndex` | `core/engine/rng.ts` | Dùng lại cho việc bốc câu thoại |

Sợi dây đã nối sẵn từ engine ra tới kho phiên. Bản này chỉ nối nốt đầu còn lại.

### Ngoài phạm vi

Hiệu ứng hình ảnh và chuyển động, sửa luật tính điểm trong màn Cài đặt, thu
giọng thật, đa ngôn ngữ. Phần hình ảnh và chuyển động sẽ có bản đặc tả riêng
ngay sau bản này.

---

## 2. Kiến trúc

Nguyên tắc của mục 4 đặc tả gốc giữ nguyên: **luật chơi tách hoàn toàn khỏi
âm thanh.** Engine vẫn thuần, không import Angular, không phát tiếng. Tầng
dẫn chuyện chỉ *tiêu thụ* `events`; không có đường nào gọi ngược lại engine.

### 2.1 Cấu trúc file

Tầng phát tiếng sao y khuôn cổng/bản-cài mà `data/storage/` đang dùng. Đó là
lý do nó test được mà không cần trình duyệt thật.

```
src/app/audio/                 phát tiếng, không biết gì về luật chơi
  speech-port.ts               giao diện đọc
  speech.token.ts              thẻ tiêm SPEECH_PORT
  capacitor-speech.ts          bản thật, bọc @capacitor-community/text-to-speech
  silent-speech.ts             bản câm, chỉ dùng cho test
  sfx-port.ts                  giao diện phát tiếng động
  sfx.token.ts                 thẻ tiêm SFX_PORT
  web-audio-sfx.ts             tổng hợp bằng Web Audio, không dùng file
  silent-sfx.ts

src/app/core/narration/
  line-picker.ts               hàm thuần, không phụ thuộc Angular

src/app/data/narration/
  narration.vi.ts              kịch bản thoại

src/app/state/
  narration.store.ts           nối events sang chữ và lệnh phát tiếng

src/app/shell/
  app-bar.ts                   thanh trên cùng, chứa nút loa và nút cài đặt
  narration-strip.ts           dải chữ dẫn, nằm ngay dưới thanh

src/app/features/settings/
  settings.page.ts             tuyến /cai-dat
```

### 2.2 Các cổng

```ts
export type SfxName = 'knock' | 'tick' | 'toll' | 'chime';

export interface SpeechPort {
  /** Resolve khi đọc xong. Chính điều này làm hàng đợi chạy tuần tự được. */
  speak(text: string, rate: number): Promise<void>;
  stop(): Promise<void>;
  hasVietnameseVoice(): Promise<boolean>;
}

export interface SfxPort {
  play(name: SfxName): void;
}
```

`speak` phải resolve khi đọc xong chứ không phải khi bắt đầu đọc. Nếu resolve
sớm thì hàng đợi vô nghĩa và các câu sẽ chồng lên nhau.

### 2.3 Hàm bốc câu

```ts
export function pickLine(
  event: NarrationEvent,
  script: NarrationScript,
  rng: Rng,
): string;

export type NarrationScript = Record<NarrationEventType, readonly string[]>;
```

Hàm thuần, nhận `rng` truyền vào theo từng lời gọi, đúng như engine đang làm.
Nhờ vậy test cắm được hạt giống và khẳng định sự kiện nào ra đúng câu nào.

Thay ba chỗ giữ chỗ `{village}`, `{player}`, `{round}` bằng giá trị trong
`payload`. Khi `village` rỗng hoặc vắng, thay bằng `"ta"`. Chỗ giữ chỗ nào
không có giá trị tương ứng thì để nguyên phần còn lại của câu và bỏ chỗ giữ
chỗ đó đi, không được để lộ chuỗi `{player}` ra màn hình.

### 2.4 Luồng chạy

Người chơi bấm nút → kho phiên gọi engine → engine trả `{state, events}` →
kho phiên đặt signal `events` → `narration.store` có một `effect()` theo dõi
signal đó → với mỗi sự kiện: gọi `pickLine` lấy câu, đẩy ra signal cho
`narration-strip` hiện chữ, xếp vào hàng đợi để đọc và phát tiếng động.

Không trang nào phải gọi `narrate()`. Các trang giữ nguyên như hiện tại.
Thanh trên cùng và dải chữ nằm ở vỏ ứng dụng, bọc ngoài `<router-outlet>`
trong `app.ts`.

### 2.5 Hàng đợi

Bắt buộc, không phải tuỳ chọn. Một hành động có thể trả nhiều sự kiện cùng
lúc — bỏ phiếu xong có thể trả `SPY_CAUGHT` rồi `CIVILIANS_WIN`. Gọi `speak`
hai lần liên tiếp thì câu sau cắt ngang câu trước.

Quy tắc:

- Đọc tuần tự, câu trước xong mới tới câu sau.
- Khi có đợt sự kiện mới tới, **cắt** hàng đợi cũ: gọi `stop()` rồi đọc đợt
  mới. Ván đã sang pha khác thì câu của pha cũ không còn đúng nữa.
- Chữ trên `narration-strip` chạy theo hàng đợi: mỗi khi tới lượt một câu,
  chữ đổi sang câu đó ngay, không đợi đọc xong.

Mức `OFF` và `SFX_ONLY` không đọc, nên không có gì để định nhịp cho hàng đợi.
Ở hai mức đó mỗi câu hiện **2.2 giây** rồi sang câu kế. Không có nhịp này thì
cả đợt nhiều sự kiện sẽ nháy qua trong một khung hình và người chơi chỉ kịp
thấy câu cuối.

Mức `OFF` được xử lý bằng cách kho không phát lệnh đọc, **không** phải bằng
cách tráo sang bản câm. Chỉ có một bản cài thật chạy trong app.

---

## 3. Kịch bản thoại

Nằm trong `data/narration/narration.vi.ts`. Mỗi loại sự kiện có nhiều biến
thể để bốc ngẫu nhiên, tránh nghe lặp khi chơi liên tiếp nhiều ván.

```ts
export const NARRATION_VI: NarrationScript = {
  VOTE_OPEN: [
    'Tới giờ vote rồi người dân của làng {village} ơi',
    'Làng {village} nghi ngờ ai, chỉ mặt đặt tên đi',
  ],
  CIVILIAN_KILLED: [
    'Tèo teo, một người dân vô tội đã đi bán muối',
    '{player} ra đi trong oan ức, làng {village} mất một người tốt',
  ],
  // ... đủ 18 loại
};
```

Kiểu `Record<NarrationEventType, readonly string[]>` khiến trình biên dịch
bắt lỗi ngay nếu thiếu một loại sự kiện. Thêm câu mới chỉ sửa file này.

---

## 4. Tiếng động

Tổng hợp bằng Web Audio, không dùng file. Không có giấy phép phải theo dõi,
APK không phình, và dự án hiện chưa có đường ống tài nguyên nào để phải dựng
thêm — `public/` mới chỉ có `favicon.ico`.

| Tên | Cách tổng hợp | Cảm giác |
|---|---|---|
| `knock` | Xung ngắn qua bộ lọc dải, tắt trong ~80ms | Gõ nhẹ xuống mặt bàn |
| `tick` | Sóng vuông ~1200Hz, ~30ms | Kim đồng hồ |
| `toll` | Hai sóng sin lệch nhau ~110Hz và ~165Hz, tắt dần ~1.2s | Chuông trầm, nặng |
| `chime` | Ba nốt lên dần, sóng sin, vào êm, tổng ~700ms | Ấm, nhẹ nhõm |

Gắn vào sự kiện:

| Sự kiện | Tiếng |
|---|---|
| `PASS_DEVICE`, `SPEAKER_TURN` | `knock` |
| `TIME_ALMOST_UP` | `tick`, mỗi giây trong 5 giây cuối |
| `VOTE_OPEN`, `VOTE_TIE`, `RANDOM_TIE_BREAK` | `knock` hai lần, cách nhau 140ms |
| `CIVILIAN_KILLED`, `SPY_CAUGHT`, `WHITE_REVEALED`, `WHITE_GUESS_WRONG` | `toll` |
| `CIVILIANS_WIN`, `SPIES_WIN`, `WHITE_WIN`, `WHITE_GUESS_CORRECT` | `chime` |
| `GAME_START`, `ROUND_START`, `NO_ELIMINATION` | im lặng |

Ba sự kiện cuối cố ý không có tiếng. Chúng xảy ra dày; gắn tiếng vào thì
thành ồn nền và làm loãng những mốc thật sự đáng chú ý.

`web-audio-sfx.ts` phải không ném lỗi khi môi trường không có `AudioContext`.
Đó vừa là điều kiện để test chạy được dưới jsdom, vừa là hành vi đúng trên
máy lạ: thiếu tiếng thì im, không phải sập.

---

## 5. Ba mức âm lượng

| Mức | Đọc | Tiếng động | Chữ trên màn |
|---|---|---|---|
| `OFF` | không | không | **có** |
| `SFX_ONLY` | không | có | **có** |
| `FULL` | có | có | **có** |

Cột cuối không đổi ở cả ba mức. Đó là điều kiện để mục 6 dưới đây đứng vững:
chữ là đường chính, tiếng chỉ là thứ tăng thêm.

### Nút loa

Nằm bên phải thanh trên cùng, có mặt trên mọi màn để tắt gấp được giữa ván.
Bấm xoay vòng `FULL → SFX_ONLY → OFF → FULL`, kèm một nhãn ngắn hiện lên cho
biết vừa đổi sang mức nào. Đổi mức ghi xuống kho cài đặt ngay.

Chuyển sang `OFF` phải gọi `stop()` để cắt câu đang đọc dở, không đợi nó đọc
nốt.

### Bố cục

Phương án đã chọn sau khi so ba cách: thanh trên cùng cố định, dải chữ dẫn
nằm ngay dưới nó. Lời dẫn có chỗ ở ổn định, không che nội dung, và người vừa
được chuyền máy tới vẫn đọc được câu vừa phát. Đánh đổi là mất khoảng 70px
chiều cao vĩnh viễn.

Hai cách bị loại: nút loa nổi ở góc (dễ bấm nhầm khi chuyền máy, và lời dẫn
làm nội dung nhảy chỗ), và lời dẫn dạng thẻ trôi lên rồi tự tan (ai ngó vào
muộn thì lỡ mất câu — hỏng đúng với người vừa nhận máy).

---

## 6. Suy giảm êm khi thiếu giọng

Lúc khởi động hỏi `hasVietnameseVoice()`. Không có giọng `vi-VN` thì:

1. Hiện thông báo **một lần duy nhất**, kèm nút "Không nhắc lại".
2. Tự hạ mức xuống `SFX_ONLY`.

Game vẫn chơi được bình thường vì mọi câu thoại luôn hiện bằng chữ.

### Cái bẫy phải tránh khi thêm trường nhớ

Để nhớ "không nhắc lại" phải thêm `voiceNoticeDismissed` vào `AppSettings`.
Nhưng `settings.repository.ts:48` đang kiểm hình dạng theo kiểu được ăn cả
ngã về không: thiếu bất kỳ trường nào là coi như hỏng và rơi về mặc định.

Thêm một trường **bắt buộc** nghĩa là mọi cài đặt người dùng đã lưu từ trước,
kể cả luật tính điểm họ tự sửa, bị xoá sạch trong im lặng ngay lần mở app đầu
tiên sau khi cập nhật.

Nên trường mới phải là **tuỳ chọn**, có giá trị mặc định khi vắng mặt, và
phải có test riêng khẳng định dữ liệu lưu theo dạng cũ vẫn đọc được nguyên
vẹn.

---

## 7. Sự kiện sắp hết giờ

`TIME_ALMOST_UP` được khai báo trong `NarrationEventType` nhưng engine không
nơi nào phát ra nó, và đúng là không thể: engine là hàm thuần, không biết tới
thời gian thực. Đồng hồ nằm ở giao diện, tại `speaking.page.ts:144`.

Vậy đồng hồ sẽ gọi thẳng một phương thức công khai của `narration.store` khi
còn 5 giây, và chỉ bắn **đúng một lần cho mỗi lượt** — đặt lại cờ mỗi khi
đồng hồ khởi động lại.

Đây là ngoại lệ duy nhất so với quy tắc "mọi sự kiện đều đến từ engine". Ghi
rõ ở đây để người sau không tưởng là làm ẩu và đi sửa cho "nhất quán".

---

## 8. Ràng buộc an toàn

Ràng buộc của đặc tả gốc giữ nguyên: `payload` chỉ chứa `village`, `player`,
`round`, không bao giờ chứa từ bí mật. Engine đã có test bất biến quét mọi
nhánh để khẳng định điều này.

Tầng mới không được mở thêm đường rò. Cụ thể: `pickLine` chỉ đọc đúng ba
trường đó và không nhận `GameState`. Nó không có đường nào để biết từ bí mật,
nên không thể làm lộ.

---

## 9. Màn Cài đặt

Tuyến `/cai-dat`, vào bằng nút bánh răng trên thanh trên cùng. Chứa:

- Ba mức âm thanh.
- Thanh trượt tốc độ đọc, từ 0.5 tới 1.5, bước 0.1.
- Nút "Nghe thử" đọc một câu mẫu để chỉnh cho vừa tai.

Luật tính điểm tuy đã có sẵn trong kho cài đặt nhưng để ngoài phạm vi lần
này, tránh phình màn hình và phình bản kế hoạch.

---

## 10. Cách kiểm chứng

| Đơn vị | Test |
|---|---|
| `line-picker` | Cắm hạt giống, khẳng định sự kiện nào ra đúng câu nào. Khẳng định `{village}` rỗng thành `"ta"`. Khẳng định không sót chỗ giữ chỗ nào ra màn hình |
| `narration.vi.ts` | Quét toàn kịch bản: mọi loại sự kiện có ít nhất một biến thể; không biến thể nào chứa chỗ giữ chỗ ngoài ba cái được phép |
| `narration.store` | Dùng bản câm. Khẳng định thứ tự hàng đợi; đợt mới cắt đợt cũ; mức `OFF` không phát lệnh đọc nào nhưng chữ vẫn được đặt |
| `web-audio-sfx` | Không ném lỗi khi vắng `AudioContext` |
| `settings.repository` | Dữ liệu lưu theo dạng cũ, thiếu `voiceNoticeDismissed`, vẫn đọc được nguyên vẹn các trường còn lại |

---

## 11. Những chỗ cố ý lệch khỏi đặc tả gốc

| Đặc tả gốc | Bản này | Lý do |
|---|---|---|
| Kịch bản trong `narration.vi.json` | `narration.vi.ts` | Dự án đã có tiền lệ: kho từ được đặc tả là `word-bank.json` nhưng làm thành tám file `.ts`. Dùng `.ts` thì trình biên dịch bắt được lỗi thiếu sự kiện, và không phải nạp qua HTTP lúc chạy |
| "Kèm vài file hiệu ứng ngắn" | Tổng hợp bằng Web Audio, không file | Không giấy phép phải theo dõi, APK không phình, không phải dựng đường ống tài nguyên |
