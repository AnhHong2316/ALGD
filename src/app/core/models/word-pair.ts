export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface WordPair {
  id: string;
  wordA: string;
  wordB: string;
  topic: string;
  difficulty: Difficulty;
  /** Cặp do người dùng tự thêm thì xoá được thật; cặp gốc chỉ được ẩn. */
  isCustom: boolean;
  hidden: boolean;
}
