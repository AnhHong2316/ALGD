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
 * Sắp xếp các chữ trong một chuỗi đã chuẩn hoá, để so sánh mà bỏ qua thứ tự.
 *
 * Tiếng Việt có nhiều cặp đảo chữ mà nghĩa gần như nhau: đảo hoang / hoang
 * đảo, xe đạp / đạp xe. Bắt lỗi mấy ca đó là bắt bẻ chứ không phải chấm đúng
 * sai — mũ trắng rõ ràng đã lần ra khái niệm rồi.
 */
export function sortWords(normalized: string): string {
  return normalized.split(' ').sort().join(' ');
}

/**
 * Ngưỡng theo độ dài đáp án: đáp án tối đa 8 ký tự thì cho sai 1,
 * dài hơn thì cho sai 2. Tránh việc từ ngắn bị nhận nhầm sang từ khác.
 *
 * Thử hai lượt: nguyên thứ tự trước, rồi mới tới lượt đã sắp xếp chữ. Lượt sau
 * vẫn dùng đúng cái ngưỡng đó chứ không nới thêm, nên "đảo chữ" không thành
 * giấy thông hành cho một từ khác hẳn.
 *
 * Đã đo trên toàn bộ kho từ trước khi thêm lượt này: không cặp nào có từ dân
 * và từ gián điệp là đảo chữ của nhau, và không từ gián điệp nào bị nhận nhầm
 * thành từ dân — biên hẹp nhất còn dư 1 ký tự. Tức mũ trắng không thể thắng
 * bằng cách đọc trúng từ của gián điệp. Ai thêm cặp từ mới nên đo lại.
 */
export function isGuessCorrect(guess: string, answer: string): boolean {
  const normalizedGuess = normalizeVi(guess);
  const normalizedAnswer = normalizeVi(answer);

  if (normalizedGuess.length === 0 || normalizedAnswer.length === 0) return false;
  if (normalizedGuess === normalizedAnswer) return true;

  const threshold = guessThreshold(normalizedAnswer);
  if (levenshtein(normalizedGuess, normalizedAnswer) <= threshold) return true;

  return (
    levenshtein(sortWords(normalizedGuess), sortWords(normalizedAnswer)) <= threshold
  );
}
