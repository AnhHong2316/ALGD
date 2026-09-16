# Đóng gói APK cho Android

Ngày 13/09/2026. Ghi lại nguyên bộ công cụ và các bước để dựng ra file APK
cài được lên điện thoại, cùng ba cái bẫy của Windows đã vấp phải trong lần
dựng đầu tiên.

---

## 1. Bộ công cụ

Máy dựng cần ba thứ mà một máy lập trình web thuần không có sẵn:

| Thứ | Bản | Ở đâu |
| --- | --- | --- |
| JDK | Temurin 21 | `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` |
| Android SDK | platform 36, build-tools 36.0.0, platform-tools | `%LOCALAPPDATA%\Android\Sdk` |
| Capacitor Android | `@capacitor/android` 8.5.x | `node_modules` |

Vì sao đúng những bản này: `android/build.gradle` ghim AGP 8.13.0 và trình
bao Gradle 8.14.3 — cả hai đòi JDK tối thiểu 17, Capacitor 8 khuyên 21.
`android/variables.gradle` đặt `compileSdkVersion = 36`, nên thiếu platform
36 là Gradle dừng ngay.

Cài JDK bằng `winget install --id EclipseAdoptium.Temurin.21.JDK --exact`.
Android SDK thì tải `commandlinetools-win-*_latest.zip` từ
`dl.google.com/android/repository`, bung vào `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest`
rồi gọi `sdkmanager` kéo ba gói kể trên. Không cần Android Studio.

Hai biến môi trường `JAVA_HOME` và `ANDROID_HOME` đã được đặt sẵn ở phạm vi
User. `android/local.properties` trỏ `sdk.dir` tới SDK — file này nằm trong
`.gitignore` vì nó phụ thuộc từng máy.

---

## 2. Dựng lại sau khi sửa mã

```bash
npm run apk
```

Lệnh này gộp ba bước, phải chạy đúng thứ tự đó:

1. `ng build` — dựng bản web vào `dist/ai-la-gian-diep/browser`
2. `cap sync android` — chép bản web vừa dựng vào
   `android/app/src/main/assets/public` và cập nhật danh sách plugin
3. `gradlew assembleDebug` — gói thành APK

**Quên bước 2 là nguy hiểm nhất.** Gradle vẫn dựng thành công, nhưng gói
lại đúng bản web của lần trước. APK ra bình thường, chạy bình thường, chỉ
là không có thay đổi vừa sửa — không có thông báo lỗi nào để nhận ra.

APK nằm ở `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 3. Cài lên điện thoại

Chép file APK qua điện thoại (cáp, Zalo, Google Drive) rồi mở ra cài. Android
sẽ hỏi cho phép cài ứng dụng từ nguồn ngoài — đây là bản tự dựng nên không
qua CH Play, phải bật.

Nếu có cắm cáp và đã bật gỡ lỗi USB:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Bản gỡ lỗi, chưa phải bản phát hành

`assembleDebug` ký bằng khóa gỡ lỗi Android tự sinh, nên cài thẳng được mà
không cần chuẩn bị gì. Đổi lại:

- Có cờ `android:debuggable`, mở cổng soi WebView từ Chrome — tiện lúc thử,
  không nên phát cho người lạ.
- Không tối ưu bằng bản phát hành. Phần web bên trong thì vẫn là bản dựng
  production của Angular, nên game chạy không chậm đi; chỉ vỏ native là bản
  gỡ lỗi.
- Không tải lên CH Play được.

Muốn bản phát hành thì phải tự tạo kho khóa (`keytool -genkeypair`), khai
trong `android/app/build.gradle`, rồi `assembleRelease`. Chưa làm vì chưa cần.

---

## 5. Ba cái bẫy đã vấp

Ghi lại để lần sau khỏi mất thì giờ dò lại.

**Chấp nhận license của SDK.** `sdkmanager --licenses` đọc từ stdin. Dồn chữ
`y` qua ống dẫn của PowerShell thì không tới nơi — nó in ra câu hỏi rồi thoát
luôn. Phải chuyển hướng stdin thật bằng `cmd`:

```powershell
cmd /c "sdkmanager.bat --licenses < yes.txt"
```

**`[Environment]::SetEnvironmentVariable(..., 'User')` bị treo.** Sau khi ghi
vào registry nó phát tín hiệu `WM_SETTINGCHANGE` cho mọi cửa sổ đang mở và
chờ từng cái trả lời; chỉ cần một ứng dụng không đáp là treo. Ghi thẳng vào
`HKCU:\Environment` thì không treo, đổi lại phải đăng nhập lại mới có hiệu lực.

**Desktop bị OneDrive chiếm.** `[Environment]::GetFolderPath('Desktop')` trên
máy này trả về thư mục OneDrive của công ty — chép APK vào đó là vô tình đẩy
file lên đám mây của công ty. `Downloads` mới là thư mục nằm trên máy.

**`gradlew.bat` phải viết là `.\gradlew.bat`.** Bình thường `cmd` tìm lệnh
trong thư mục hiện tại trước, nên `gradlew.bat` trống trơn vẫn chạy. Nhưng
môi trường này có đặt `NoDefaultCurrentDirectoryInExePath=1`, tắt đúng thói
quen đó, và `cmd` báo "is not recognized as an internal or external command"
— nghe như chưa cài Gradle chứ không phải sai đường dẫn. Ghi rõ `.\` thì
chạy được ở cả hai kiểu môi trường. Lệnh `npm run apk` đã ghi sẵn như vậy.

**Cửa sổ dòng lệnh đang mở không thấy `JAVA_HOME`.** Hai biến môi trường
được ghi thẳng vào registry (vì cách đặt qua API bị treo, xem bên trên), nên
chỉ tiến trình mở mới sau khi đăng nhập lại mới đọc được. Mở terminal mới mà
`npm run apk` vẫn kêu không tìm thấy Java thì đăng xuất đăng nhập lại một lần
là xong.

---

## 6. Những thứ không phải sửa

- **AndroidManifest cho giọng đọc.** Android 11 trở lên giấu các ứng dụng
  khác khỏi ứng dụng của mình trừ khi khai `<queries>`. Plugin
  `@capacitor-community/text-to-speech` đã tự khai `<queries>` cho
  `TTS_SERVICE` trong manifest của nó, trình gộp manifest tự đưa vào bản
  cuối. Không phải đụng tới.
- **Giọng tiếng Việt trên Android.** Khác với bản web, lớp Java của plugin
  có gọi `tts.setLanguage(locale)` từ khoá `lang`, nên Android chọn đúng
  giọng mà không cần truyền chỉ số giọng. Phần tự dò giọng trong
  `capacitor-speech.ts` là để chữa bản chạy trên trình duyệt; trên điện
  thoại nó chỉ thừa chứ không hại.

---

## 7. Đổi logo ứng dụng

Nguồn duy nhất là `assets/logo-algd.png` — nét mực trên nền trong suốt, đã
cắt bỏ dòng chữ. Đổi logo thì thay đúng file đó rồi chạy:

```bash
npm run icons
```

Lệnh này ghi đè toàn bộ `mipmap-*` của Android, hai file XML icon thích ứng,
và `public/favicon.png` cùng `public/apple-touch-icon.png` của bản web. Sau
đó vẫn phải `npm run apk` mới thấy trên điện thoại.

Ảnh nguồn cần **nền trong suốt** và nên có lề hẹp; `BOX` trong
`assets/build-icons.mjs` đang ghim toạ độ vùng nét mực của ảnh hiện tại, nên
đổi sang ảnh khác khung thì phải đo lại bao quanh.

### Vì sao không dùng `capacitor-assets generate`

Công cụ chính chủ của Capacitor xuất lớp icon thích ứng ở **192×192** cho
xxxhdpi. Đặc tả Android quy định lớp này rộng 108dp, tức **432×432** ở mật độ
đó, nên hệ điều hành phải kéo ảnh lên hơn hai lần và icon nhoè. Nó còn bọc
thêm `android:inset="16.7%"` lên cả hai lớp, khiến hình co thêm một lần nữa
và lớp nền mất luôn phần mép tràn. Bản tự sinh viết đúng cỡ từng mật độ nên
hình 255px của logo gốc gần như không phải phóng to.

### Hai con số đã cân bằng tay

- **Hình chiếm 0,52 bề rộng khung** icon thích ứng. Lớp rộng 108dp nhưng
  trình khởi chạy chỉ cho thấy 72dp ở giữa, nên 0,52 tương đương 78% đường
  kính phần thấy được. Đã dựng thử ba mức rồi nhìn: 0,6 thì vành mũ gần chạm
  mép vòng tròn; 0,46 thoáng nhưng thu về 48px lại bé.
- **Lớp nền phủ kín cả 108dp**, không co lại vừa vùng thấy được. Phần dư ra
  là mép tràn để trình khởi chạy còn chỗ xê dịch khi làm hiệu ứng nghiêng
  icon; co lại cho khít là lòi nền ra ở rìa.

### Bẫy của `sharp`

`sharp` **luôn chạy `resize` trước `composite`**, bất kể xâu chuỗi theo thứ
tự nào. Viết `sharp(anh).composite(matNa).resize(48)` thì ảnh bị thu về 48px
trước, rồi mặt nạ cỡ gốc mới đắp lên, và nó văng lỗi *"Image to composite
must have same dimensions or smaller"* — nghe như lỗi kích thước ảnh đầu vào
chứ không phải lỗi thứ tự. Phải tách hai lượt: ghép xong xuất ra buffer, rồi
mới `sharp(buffer).resize(...)`.

### Cách kiểm

Đừng tin "lệnh chạy xong nghĩa là đẹp". Cách kiểm đã dùng: ghép hai lớp
đúng như Android làm, cắt theo mặt nạ tròn và mặt nạ bo góc, **đặt lên nền
hồng chói** — chỗ nào lòi hồng ra là lớp nền không phủ tới đó. Rồi xem ở
đúng cỡ thật 48px và 16px, vì icon hỏng hay hỏng ở cỡ nhỏ chứ không hỏng ở
cỡ to. Cuối cùng mở bung file APK kiểm lại `res/mipmap-*` bên trong, để chắc
thứ lọt vào máy đúng là thứ vừa sinh ra.

---

## 8. Kiểm bố cục ở cỡ điện thoại

```bash
npm start        # cửa sổ khác
npm run shots
```

Dựng app thật trong Chrome (hoặc Edge) sẵn có của máy ở khung 412×915, đi
hết luồng lập ván tới màn chia bài, mỗi màn **đo rồi mới chụp**. Ảnh vào
`shots/`, thư mục này đã nằm trong `.gitignore`.

Con số đáng tin hơn ảnh. Với mỗi màn, nó so `scrollWidth` với `clientWidth`:
chênh nhau dù chỉ một điểm ảnh là trang đã có thanh cuộn ngang, mà nhìn ảnh
thì rất dễ bỏ sót. Nó cũng báo đáy nút chính nằm ở đâu, để biết nút có bị
đẩy khỏi tầm nhìn không. Tràn ngang thì thoát với mã lỗi khác 0.

Không bài kiểm đơn vị nào thay được việc này: jsdom **không tính bố cục**,
nên trong đó `scrollWidth` luôn bằng `clientWidth` và mọi lỗi tràn đều vô
hình.

### Hai cái bẫy bố cục đã vấp

Cả hai đều làm nút dưới cùng bị đẩy khỏi màn hình, và đều không lộ ra ở màn
hình máy tính rộng rãi.

**Màn tự đặt `min-height: 100dvh`.** Thanh trên cùng và dải dẫn chuyện nằm
trong luồng thường, không cố định. Nên chiều cao tài liệu thành một màn CỘNG
chiều cao hai thứ đó — đo được dư đúng 62px, và hàng nút dưới cùng luôn nằm
ngoài tầm nhìn dù giữa màn còn thừa cả mảng trống. Cách chữa: cho `app-root`
làm một cột cao đúng một màn rồi để nội dung giãn ra chiếm nốt, chứ không
màn con nào được tự đặt chiều cao theo khung nhìn nữa.

**`inset` âm trên lớp trang trí.** Quầng sáng `.lamp::before` để
`inset: -40% -20%`, tức thò ra 20% bề rộng mỗi bên và 40% chiều cao trên
dưới. Phần thò ra bên phải và bên dưới không bị cắt mà **nới rộng luôn vùng
cuộn**: đo được tràn ngang 82px — đúng 20% của 412 — và tràn dọc 428px. Muốn
vệt sáng to hơn khung thì phóng chính cái gradient (`ellipse 100% 90%`) chứ
đừng phóng cái hộp.
