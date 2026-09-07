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
