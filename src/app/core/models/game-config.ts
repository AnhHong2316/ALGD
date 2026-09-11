import { Difficulty } from './word-pair';

export interface GameConfig {
  spyCount: number;
  hasWhite: boolean;
  /** Chế độ Bật mí: mỗi người được cho biết vai của mình. */
  revealSpyToSpy: boolean;
  /** Rỗng nghĩa là lấy tất cả chủ đề đang bật. */
  topics: readonly string[];
  difficulties: readonly Difficulty[];
  /** null nghĩa là tắt đồng hồ. */
  timerSeconds: number | null;
  minRoundsBeforeVote: number;
}

/**
 * Cảnh báo cho người thêm trường vào đây: bản ghi cài đặt đã lưu trên máy
 * người dùng được kiểm hình dạng ở data/repositories/settings.repository.ts,
 * và phép điền mặc định ở đó (withDefaults) chỉ trải MỘT tầng. Thêm một
 * trường bắt buộc vào ScoreRules sẽ khiến mọi bản ghi cũ trượt kiểm và bị xoá
 * sạch trong im lặng — mất luôn cả luật tính điểm người dùng tự chỉnh. Trường
 * mới phải là tuỳ chọn ở isScoreRules và được điền mặc định.
 */
export interface ScoreRules {
  civilianWin: number;
  spyWin: number;
  whiteWin: number;
}

/**
 * Đóng băng cả hằng lẫn mảng con: cấu hình mặc định được spread ở rất nhiều
 * nơi, mà spread chỉ copy nông. Nếu mảng con còn sửa được thì một lần push
 * nhầm sẽ làm hỏng mặc định cho toàn bộ phiên chạy.
 */
export const DEFAULT_SCORE_RULES: ScoreRules = Object.freeze({
  civilianWin: 1,
  spyWin: 2,
  whiteWin: 3,
});

export const DEFAULT_GAME_CONFIG: GameConfig = Object.freeze({
  spyCount: 1,
  hasWhite: false,
  revealSpyToSpy: false,
  topics: Object.freeze([] as string[]),
  difficulties: Object.freeze(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]),
  timerSeconds: 30,
  minRoundsBeforeVote: 3,
});
