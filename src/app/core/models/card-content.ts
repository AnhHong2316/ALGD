/**
 * Nội dung thẻ chia bài. Component render thẻ CHỈ được đọc kiểu này và
 * không được đụng tới Assignment.role, để không thể vô tình tạo ra một
 * khác biệt hiển thị nào theo vai.
 */
export interface CardContent {
  /** null nghĩa là không hiện dòng vai nào. */
  roleLabel: string | null;
  /** null khi là mũ trắng. */
  word: string | null;
  note: string | null;
}
