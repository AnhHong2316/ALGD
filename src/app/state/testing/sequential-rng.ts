import { Rng } from '../../core/engine/rng';

/**
 * Bốc lần lượt biến thể 0, 1, 2 rồi quay lại — không dùng Math.random thật.
 *
 * Kịch bản thoại cố ý có câu mang {village}/{player} xen giữa câu không mang,
 * để đỡ nghe lặp. Test nào so khớp chữ mà bốc bằng ngẫu nhiên thật sẽ đỏ tuỳ
 * vận may: đo được là đúng một test đỏ mỗi lần chạy. Mỗi test phải gọi hàm
 * này để lấy một nguồn riêng, đừng dùng chung một nguồn giữa các test.
 */
export function sequentialRng(): Rng {
  let i = 0;
  return () => {
    const value = (i % 3) / 3;
    i += 1;
    return value;
  };
}
