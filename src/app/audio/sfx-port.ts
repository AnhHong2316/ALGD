export type SfxName = 'knock' | 'tick' | 'toll' | 'chime';

/**
 * Cổng phát tiếng động ngắn.
 *
 * `play` không trả Promise: tiếng động là thứ điểm xuyết, không ai phải chờ
 * nó xong mới làm việc tiếp. Trả Promise ở đây chỉ mời gọi người sau await
 * nhầm rồi làm ván chơi khựng lại.
 */
export interface SfxPort {
  play(name: SfxName): void;
}
