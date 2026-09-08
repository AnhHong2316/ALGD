import { WordPair } from '../../core/models';
import { ANIMAL_PAIRS } from './animals';
import { FOOD_PAIRS } from './food';
import { HOUSEHOLD_PAIRS } from './household';
import { JOB_PAIRS } from './jobs';
import { MOVIE_PAIRS } from './movies';
import { NATURE_PAIRS } from './nature';
import { SPORT_PAIRS } from './sports';
import { TRANSPORT_PAIRS } from './transport';
import { PackagedPair } from './types';

export * from './types';

/**
 * Toàn bộ kho đóng gói sẵn. Thêm chủ đề mới thì import file rồi nối vào đây;
 * bộ test kiểm kho tự động phủ luôn, không phải sửa test.
 */
export const PACKAGED_PAIRS: readonly PackagedPair[] = [
  ...ANIMAL_PAIRS,
  ...FOOD_PAIRS,
  ...JOB_PAIRS,
  ...HOUSEHOLD_PAIRS,
  ...SPORT_PAIRS,
  ...MOVIE_PAIRS,
  ...NATURE_PAIRS,
  ...TRANSPORT_PAIRS,
];

/** Gắn hai cờ trạng thái mặc định để biến dữ liệu tĩnh thành WordPair dùng được. */
export function toWordPair(pair: PackagedPair): WordPair {
  return { ...pair, isCustom: false, hidden: false };
}
