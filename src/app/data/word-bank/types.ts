import { Difficulty } from '../../core/models';

/**
 * Tám chủ đề chính thức. Khai báo `as const` để mọi file dữ liệu chỉ nhận
 * đúng những chuỗi này — gõ sai tên chủ đề là lỗi biên dịch, không phải lỗi
 * chạy.
 */
export const TOPICS = [
  'Động vật',
  'Đồ ăn thức uống',
  'Nghề nghiệp',
  'Đồ vật trong nhà',
  'Thể thao',
  'Phim và nhân vật',
  'Thiên nhiên',
  'Giao thông',
] as const;

export type Topic = (typeof TOPICS)[number];

/**
 * Cặp từ trong kho đóng gói sẵn. Khác `WordPair` ở chỗ không mang `isCustom`
 * và `hidden` — hai cờ đó là trạng thái lúc chạy, do người dùng đổi, nên
 * không thuộc về dữ liệu tĩnh.
 */
export interface PackagedPair {
  id: string;
  wordA: string;
  wordB: string;
  topic: Topic;
  difficulty: Difficulty;
}
