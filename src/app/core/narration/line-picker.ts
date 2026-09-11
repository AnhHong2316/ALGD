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
  // script là Record đầy đủ nên script[event.type] không bao giờ undefined
  // qua một lệnh gọi đã được kiểm kiểu. Giữ ?? [] lại làm lớp bảo hiểm cho
  // fixture nào dựng bằng ép kiểu `as` mà lỡ thiếu một khoá — nếu không, nó
  // đọc như code phòng thủ thừa và sẽ bị ai đó xoá đi.
  const variants = script[event.type] ?? [];
  if (variants.length === 0) return '';

  return fill(variants[pickIndex(rng, variants.length)], event.payload);
}

function fill(line: string, payload: NarrationPayload): string {
  const village = payload.village?.trim();

  const values: Record<string, string> = {
    // Làng chưa đặt tên thì gọi là "làng ta", nghe tự nhiên hơn là bỏ trống.
    '{village}': village === undefined || village === '' ? 'ta' : village,
    '{player}': payload.player?.trim() ?? '',
    '{round}': payload.round === undefined ? '' : String(payload.round),
  };

  return (
    line
      // Thay MỘT lượt bằng hàm, không phải ba lượt nối tiếp bằng chuỗi. Hai lý
      // do, đều là lỗi thật: chuỗi thay thế mà chứa $& hay $$ sẽ bị diễn giải
      // thành mẫu, mà tên người chơi là chữ người dùng tự gõ; và thay nối tiếp
      // thì giá trị chèn ở lượt trước bị lượt sau quét lại, nên ai đặt tên làng
      // là "{player}" sẽ bị nuốt mất tên.
      .replace(/\{village\}|\{player\}|\{round\}/g, (match) => values[match] ?? '')
      // Bỏ chỗ giữ chỗ đi thường để lại khoảng trắng đôi. Gom lại, nếu không
      // giọng đọc sẽ ngắt một nhịp thừa ngay giữa câu.
      .replace(/\s+/g, ' ')
      .trim()
  );
}
