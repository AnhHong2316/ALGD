import { NarrationEvent, NarrationEventType, NarrationPayload } from '../models';
import { Rng, pickIndex } from '../engine/rng';

/**
 * Kịch bản thoại: mỗi loại sự kiện có một danh sách biến thể.
 *
 * Dùng Record đầy đủ chứ không phải Partial: trình biên dịch sẽ bắt lỗi ngay
 * nếu ai đó thêm loại sự kiện mới mà quên viết thoại cho nó.
 */
export type NarrationScript = Record<NarrationEventType, readonly string[]>;

/**
 * Bốc một biến thể rồi điền chỗ giữ chỗ.
 *
 * Hàm này CHỈ đọc ba trường trong payload. Nó không nhận GameState và không
 * có đường nào để biết từ bí mật của ván — thứ nó không biết thì nó không
 * thể làm lộ.
 */
export function pickLine(
  event: NarrationEvent,
  script: NarrationScript,
  rng: Rng,
): string {
  const variants = script[event.type] ?? [];
  if (variants.length === 0) return '';

  return fill(variants[pickIndex(rng, variants.length)], event.payload);
}

function fill(line: string, payload: NarrationPayload): string {
  const village = payload.village?.trim();
  const player = payload.player?.trim() ?? '';
  const round = payload.round === undefined ? '' : String(payload.round);

  return (
    line
      // Làng chưa đặt tên thì gọi là "làng ta", nghe tự nhiên hơn là bỏ trống.
      .replace(/\{village\}/g, village === undefined || village === '' ? 'ta' : village)
      .replace(/\{player\}/g, player)
      .replace(/\{round\}/g, round)
      // Bỏ chỗ giữ chỗ đi thường để lại khoảng trắng đôi. Gom lại, nếu không
      // giọng đọc sẽ ngắt một nhịp thừa ngay giữa câu.
      .replace(/\s+/g, ' ')
      .trim()
  );
}
