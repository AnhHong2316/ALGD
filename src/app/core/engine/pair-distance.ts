import { guessThreshold, levenshtein, normalizeVi } from './guess-matcher';

/**
 * Hai từ trong một cặp có đủ xa nhau để hàm chấm đoán từ phân biệt được không.
 *
 * Nếu không, mũ trắng đoán trúng từ của gián điệp vẫn được chấm là đúng và
 * thắng cả ván. Ngưỡng lấy theo từ dài hơn trong hai từ, vì phép chấm có thể
 * chạy theo chiều nào cũng được.
 */
export function isPairFarEnough(wordA: string, wordB: string): boolean {
  const a = normalizeVi(wordA);
  const b = normalizeVi(wordB);

  if (a.length === 0 || b.length === 0) return false;

  const threshold = Math.max(guessThreshold(a), guessThreshold(b));
  return levenshtein(a, b) > threshold;
}

/**
 * Trả về lời giải thích khi cặp không hợp lệ, hoặc null khi cặp ổn.
 * Dùng cho màn hình tự thêm cặp từ, nơi người dùng cần biết vì sao bị từ chối.
 */
export function describePairProblem(wordA: string, wordB: string): string | null {
  const a = normalizeVi(wordA);
  const b = normalizeVi(wordB);

  if (a.length === 0 || b.length === 0) {
    return 'Cả hai từ đều phải có chữ. Một trong hai từ đang rỗng sau khi bỏ dấu và ký tự đặc biệt.';
  }

  if (isPairFarEnough(wordA, wordB)) return null;

  const threshold = Math.max(guessThreshold(a), guessThreshold(b));
  return (
    `Hai từ quá giống nhau sau khi bỏ dấu: "${a}" và "${b}" chỉ cách nhau ` +
    `${levenshtein(a, b)} ký tự, trong khi cần cách nhau hơn ${threshold}. ` +
    `Mũ trắng đoán từ này sẽ được chấm đúng cho cả từ kia.`
  );
}
