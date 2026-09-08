/**
 * Chuẩn hoá để so sánh: viết thường, bỏ dấu, bỏ ký tự không phải chữ số,
 * gộp khoảng trắng. Chữ đ phải xử lý riêng vì NFD không tách nó ra.
 */
export function normalizeVi(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Khoảng cách sửa đổi, cài theo kiểu cuộn hai hàng cho gọn bộ nhớ. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }

  return previous[b.length];
}

/**
 * Mức sai lệch tối đa còn được chấp nhận cho một đáp án đã chuẩn hoá.
 * Từ ngắn thì chặt hơn, vì một ký tự sai trong từ ba chữ đã là một từ khác.
 */
export function guessThreshold(normalizedAnswer: string): number {
  return normalizedAnswer.length <= 8 ? 1 : 2;
}

/**
 * Ngưỡng theo độ dài đáp án: đáp án tối đa 8 ký tự thì cho sai 1,
 * dài hơn thì cho sai 2. Tránh việc từ ngắn bị nhận nhầm sang từ khác.
 */
export function isGuessCorrect(guess: string, answer: string): boolean {
  const normalizedGuess = normalizeVi(guess);
  const normalizedAnswer = normalizeVi(answer);

  if (normalizedGuess.length === 0 || normalizedAnswer.length === 0) return false;
  if (normalizedGuess === normalizedAnswer) return true;

  const threshold = guessThreshold(normalizedAnswer);
  return levenshtein(normalizedGuess, normalizedAnswer) <= threshold;
}
