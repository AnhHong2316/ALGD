/** Hàm sinh số ngẫu nhiên trong nửa khoảng [0, 1), cùng dạng với Math.random. */
export type Rng = () => number;

/**
 * Thuật toán mulberry32. Chọn nó vì ngắn, không phụ thuộc thư viện ngoài,
 * và cùng một hạt giống luôn cho cùng một dãy — điều kiện cần để test lặp lại được.
 *
 * Hạt giống bị ép qua `seed >>> 0`, nên: số thập phân bị cắt phần lẻ, số âm
 * quấn theo bù hai, còn NaN và Infinity đều thành 0. Đây là hành vi có chủ
 * đích và có test khoá lại, không phải tai nạn.
 *
 * Lưu ý cho người viết engine ở các task sau: Rng là closure CÓ TRẠNG THÁI,
 * nên số lần gọi rng() bên trong một hành động là một phần hành vi quan sát
 * được của hành động đó. Thêm một nhánh chỉ thỉnh thoảng gọi rng() sẽ làm
 * lệch toàn bộ dãy số mà mọi thứ phía sau nhận được với cùng hạt giống, và
 * không có test nào đỏ lên vì chuyện đó.
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

/**
 * Bốc một chỉ số trong khoảng [0, exclusiveMax).
 *
 * Việc kẹp lại ở exclusiveMax - 1 là phòng thủ chứ không phải phép toán cần
 * thiết: với một Rng đúng hợp đồng [0, 1) thì tích không bao giờ chạm tới
 * exclusiveMax. Gom vào đây để mọi chỗ bốc chỉ số trong engine đi qua đúng
 * một hàm, thay vì mỗi nơi tự viết Math.floor(rng() * n) rồi nơi kẹp nơi không.
 */
function randomIndex(rng: Rng, exclusiveMax: number): number {
  return Math.min(exclusiveMax - 1, Math.floor(rng() * exclusiveMax));
}

export function pickIndex(rng: Rng, length: number): number {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('pickIndex: độ dài phải là số nguyên lớn hơn 0');
  }
  return randomIndex(rng, length);
}

/** Xáo Fisher-Yates. Trả về mảng mới, không sửa mảng đầu vào. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndex(rng, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
