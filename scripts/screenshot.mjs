/**
 * Chụp và ĐO bố cục ở kích thước điện thoại.
 *
 * Vì sao cần: lỗi bố cục không bài kiểm đơn vị nào bắt được — jsdom không
 * tính layout, nên `scrollWidth` với `clientWidth` ở đó luôn bằng nhau. Cách
 * duy nhất biết màn hình có tràn hay không là dựng thật rồi đo thật.
 *
 * Con số quan trọng hơn ảnh: tràn ngang dù chỉ 1px cũng đẻ ra thanh cuộn
 * ngang, mà nhìn ảnh thì không phải lúc nào cũng nhận ra.
 *
 * Cần dev server chạy sẵn:
 *   npm start          (cửa sổ khác)
 *   npm run shots
 *
 * Dùng playwright-core với trình duyệt có sẵn trong máy, cố ý không dùng gói
 * `playwright` đầy đủ vì gói đó kéo về bộ Chromium riêng gần 150MB.
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const BROWSERS = [
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = BROWSERS.find((p) => existsSync(p));
if (!executablePath) {
  console.error('Khong tim thay Chrome hay Edge trong may.');
  process.exit(1);
}

const URL = process.env.APP_URL ?? 'http://localhost:4200/';
const OUT = 'shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage({
  // Cỡ một máy Android tầm trung.
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

let failures = 0;

async function measure(label) {
  const m = await page.evaluate(() => {
    const d = document.documentElement;
    const btn = document.querySelector('.screen__actions .btn, .btn--primary');
    const r = btn?.getBoundingClientRect() ?? null;
    return {
      viewport: [d.clientWidth, d.clientHeight],
      scroll: [d.scrollWidth, d.scrollHeight],
      button: btn
        ? { text: btn.textContent.trim().slice(0, 24), bottom: Math.round(r.bottom) }
        : null,
    };
  });

  const overflowX = m.scroll[0] - m.viewport[0];
  const overflowY = m.scroll[1] - m.viewport[1];
  if (overflowX > 0) failures++;

  console.log(`\n--- ${label} ---`);
  console.log(`  khung nhin : ${m.viewport[0]} x ${m.viewport[1]}`);
  console.log(`  vung cuon  : ${m.scroll[0]} x ${m.scroll[1]}`);
  console.log(`  tran ngang : ${overflowX}px ${overflowX > 0 ? '<-- LOI, sinh thanh cuon ngang' : '(khong)'}`);
  console.log(`  tran doc   : ${overflowY}px ${overflowY > 0 ? '(phai cuon xuong)' : '(khong)'}`);
  if (m.button) {
    const inView = m.button.bottom <= m.viewport[1];
    console.log(`  nut "${m.button.text}": day o ${m.button.bottom}px ${inView ? '-> trong man' : '-> BI KHUAT'}`);
  }

  await page.screenshot({ path: `${OUT}/${label}.png` });
}

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.btn--primary');
await measure('1-home');

await page.getByRole('button', { name: 'Ván mới' }).click();
await page.waitForTimeout(600);
await measure('2-nguoi-choi');

for (const ten of ['Bo', 'Minh', 'Lan', 'Đức']) {
  await page.fill('.input', ten);
  await page.getByRole('button', { name: 'Thêm' }).click();
  await page.waitForTimeout(150);
}
await measure('3-du-nguoi');

await page.getByRole('button', { name: 'Tiếp tục' }).click();
await page.waitForTimeout(600);
// Màn này tràn dọc là bình thường: nó có tên làng, số gián điệp, hai công tắc
// và cả loạt chủ đề — nhiều hơn một màn thật, nên cuộn là đúng.
await measure('4-thiet-lap');

await page.locator('.screen__actions .btn--primary').first().click();
await page.waitForTimeout(900);
await measure('5-chia-bai');

// Xác nhận đúng người rồi mới lòi lá bài ra — đây mới là màn cao nhất của
// luồng, nên nếu chỗ nào tràn thì tràn ở đây.
await page.locator('.screen__actions .btn--primary').first().click();
await page.waitForTimeout(500);
await measure('6-la-bai');

// Nhấn giữ để lật, chụp cả mặt sau lẫn mặt trước.
const card = page.locator('.secret-card');
await card.dispatchEvent('pointerdown');
await page.waitForTimeout(350);
await measure('7-la-bai-mo');
await card.dispatchEvent('pointerup');

// Chia nốt bài cho ba người còn lại để tới vòng nói. Mỗi người hai nhịp:
// "Tôi là X" rồi "Tôi đã xem".
for (let i = 0; i < 7; i++) {
  await page.locator('.screen__actions .btn--primary').first().click();
  await page.waitForTimeout(400);
}
await measure('8-vong-noi');

console.log('\nloi console:', errors.length ? errors : 'khong co');
console.log(failures === 0 ? '\nKHONG man nao tran ngang.' : `\n${failures} man TRAN NGANG.`);

await browser.close();
process.exit(failures === 0 ? 0 : 1);
