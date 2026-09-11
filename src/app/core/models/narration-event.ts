/**
 * Nguồn sự thật duy nhất cho danh sách sự kiện. Khai báo thành mảng rồi suy
 * ra kiểu, đúng nếp TOPICS trong data/word-bank/types.ts: test nhập thẳng
 * mảng này nên không thể liệt kê thiếu một loại rồi vẫn xanh.
 */
export const NARRATION_EVENT_TYPES = [
  'GAME_START',
  'PASS_DEVICE',
  'ROUND_START',
  'SPEAKER_TURN',
  'TIME_ALMOST_UP',
  'VOTE_OPEN',
  'VOTE_TIE',
  'NO_ELIMINATION',
  'RANDOM_TIE_BREAK',
  'CIVILIAN_KILLED',
  'SPY_CAUGHT',
  'WHITE_REVEALED',
  'WHITE_GUESS_CORRECT',
  'WHITE_GUESS_WRONG',
  'CIVILIANS_WIN',
  'SPIES_WIN',
  'WHITE_WIN',
] as const;

export type NarrationEventType = (typeof NARRATION_EVENT_TYPES)[number];

/**
 * Ràng buộc an toàn: payload chỉ được chứa đúng ba trường này.
 * Không bao giờ được chứa từ bí mật của ván.
 */
export interface NarrationPayload {
  village?: string;
  player?: string;
  round?: number;
}

export interface NarrationEvent {
  type: NarrationEventType;
  payload: NarrationPayload;
}
