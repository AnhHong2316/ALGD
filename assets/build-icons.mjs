/**
 * Sinh bộ icon Android từ `assets/logo-algd.png`.
 *
 * Vì sao không dùng thẳng `capacitor-assets generate`: công cụ đó xuất lớp
 * icon thích ứng ở 192×192 cho xxxhdpi, trong khi đặc tả Android quy định lớp
 * này là 108dp — tức 432×432 ở xxxhdpi. Hệ điều hành sẽ kéo ảnh 192px lên cho
 * vừa khung, và icon nhoè. Bản logo gốc cao 255px, vừa đủ cho khung 432px ở
 * mức 60%, nên tự sinh thì gần như không phải phóng to lần nào.
 *
 * Chạy: npm run icons
 */
import sharp from 'sharp';
import { mkdir, rm, writeFile } from 'node:fs/promises';

// Chạy từ gốc dự án (qua npm run icons), nên đường dẫn tương đối là đủ.
const SRC = 'assets/logo-algd.png';
const RES = 'android/app/src/main/res';

/** Nền vàng đèn, cùng màu --lamp-500 của giao diện. */
const BG = { r: 0xf2, g: 0xa6, b: 0x5a, alpha: 1 };

/** Bao quanh nét mực trong ảnh nguồn, bỏ phần lề trong suốt. */
const BOX = { left: 8, top: 19, width: 235, height: 255 };

/**
 * Hình chiếm bao nhiêu phần bề rộng khung.
 *
 * Lớp icon thích ứng rộng 108dp nhưng trình khởi chạy chỉ cho thấy 72dp ở
 * giữa — hai phần ba. Icon đời cũ không bị mặt nạ cắt nên cho hình to hơn.
 *
 * 0,52 khung tức hình chiếm 78% đường kính vùng thấy được. Đã dựng thử và so
 * ba mức: 0,6 thì vành mũ gần chạm mép vòng tròn, nhìn chật; 0,46 thoáng
 * nhưng thu về 48px thì bắt đầu bé. 0,52 vừa đậm để đọc được ở cỡ thật vừa
 * còn khoảng thở.
 */
const RATIO_ADAPTIVE = 0.52;
const RATIO_LEGACY = 0.72;

const DENSITIES = [
  ['ldpi', 0.75],
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];

/** Nét mực đã cắt lề, cao `height` điểm ảnh. */
async function mark(height) {
  const buf = await sharp(SRC)
    .extract(BOX)
    .resize({ height, fit: 'inside', kernel: 'lanczos3' })
    .png()
    .toBuffer();
  return { buf, meta: await sharp(buf).metadata() };
}

/** Khung vuông cạnh `size`, hình đặt giữa, nền tuỳ chọn. */
async function tile(size, ratio, background) {
  const { buf, meta } = await mark(Math.round(size * ratio));
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([
      {
        input: buf,
        left: Math.round((size - meta.width) / 2),
        top: Math.round((size - meta.height) / 2),
      },
    ])
    .png();
}

/** Cắt tròn, dùng cho ic_launcher_round của máy đời cũ. */
async function circle(size, ratio, background) {
  const square = await (await tile(size, ratio, background)).toBuffer();
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  return sharp(square).composite([{ input: mask, blend: 'dest-in' }]).png();
}

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
let count = 0;

for (const [name, scale] of DENSITIES) {
  const dir = `${RES}/mipmap-${name}`;
  await mkdir(dir, { recursive: true });

  const adaptive = Math.round(108 * scale);
  const legacy = Math.round(48 * scale);

  // Lớp nền phủ kín cả 108dp: phần ngoài vùng thấy được là mép tràn, để trình
  // khởi chạy còn chỗ xê dịch khi nó làm hiệu ứng nghiêng icon.
  await sharp({ create: { width: adaptive, height: adaptive, channels: 4, background: BG } })
    .png()
    .toFile(`${dir}/ic_launcher_background.png`);

  await (await tile(adaptive, RATIO_ADAPTIVE, CLEAR)).toFile(
    `${dir}/ic_launcher_foreground.png`,
  );
  await (await tile(legacy, RATIO_LEGACY, BG)).toFile(`${dir}/ic_launcher.png`);
  await (await circle(legacy, RATIO_LEGACY, BG)).toFile(`${dir}/ic_launcher_round.png`);

  count += 4;
  console.log(`mipmap-${name.padEnd(8)} nen+truoc ${adaptive}px, icon cu ${legacy}px`);
}

// Không đặt inset: khoảng đệm đã nằm sẵn trong ảnh, chồng thêm một lần nữa
// chỉ làm hình bé lại và cắt cụt mép tràn của lớp nền.
const XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
await mkdir(`${RES}/mipmap-anydpi-v26`, { recursive: true });
for (const f of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  await writeFile(`${RES}/mipmap-anydpi-v26/${f}`, XML, 'utf8');
}

// Vector robot xanh mặc định của Android Studio, giờ không ai trỏ tới nữa.
for (const dead of ['drawable-v24/ic_launcher_foreground.xml', 'drawable/ic_launcher_background.xml']) {
  await rm(`${RES}/${dead}`, { force: true });
}

// Bản web. Dùng PNG chứ không dựng lại .ico: trình duyệt nào cũng nhận PNG từ
// lâu rồi, mà đóng gói .ico thì phải kéo thêm một thư viện chỉ để làm mỗi việc đó.
await (await tile(48, RATIO_LEGACY, BG)).toFile('public/favicon.png');
await (await tile(180, RATIO_LEGACY, BG)).toFile('public/apple-touch-icon.png');
await rm('public/favicon.ico', { force: true });

console.log(`\nxong: ${count} anh Android + 2 xml + 2 anh web, da xoa 2 vector mac dinh`);
