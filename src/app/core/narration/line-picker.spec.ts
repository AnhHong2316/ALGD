import { describe, expect, it } from 'vitest';
import { NARRATION_EVENT_TYPES } from '../models';
import { Rng } from '../engine/rng';
import { NarrationScript, pickLine } from './line-picker';

/** Rng luôn trả 0 nên luôn bốc biến thể đầu. Test không cần may rủi. */
const first: Rng = () => 0;

/** Rng trả gần 1 nên luôn bốc biến thể cuối. */
const last: Rng = () => 0.999;

/**
 * Dựng một kịch bản đủ mọi loại sự kiện, rồi ghi đè loại đang cần thử.
 *
 * Phải liệt kê đủ vì NarrationScript là Record đầy đủ, không phải Partial.
 */
function scriptWith(overrides: Partial<NarrationScript>): NarrationScript {
  const base = NARRATION_EVENT_TYPES.reduce((acc, type) => {
    acc[type] = ['câu mặc định'];
    return acc;
  }, {} as NarrationScript);

  return { ...base, ...overrides };
}

describe('pickLine', () => {
  it('bốc biến thể theo nguồn ngẫu nhiên truyền vào', () => {
    const script = scriptWith({ VOTE_OPEN: ['câu một', 'câu hai'] });

    expect(pickLine({ type: 'VOTE_OPEN', payload: {} }, script, first)).toBe('câu một');
    expect(pickLine({ type: 'VOTE_OPEN', payload: {} }, script, last)).toBe('câu hai');
  });

  it('thay tên người và số vòng vào chỗ giữ chỗ', () => {
    const script = scriptWith({
      SPEAKER_TURN: ['Vòng {round}, tới lượt {player}'],
    });

    const line = pickLine(
      { type: 'SPEAKER_TURN', payload: { player: 'Minh', round: 2 } },
      script,
      first,
    );

    expect(line).toBe('Vòng 2, tới lượt Minh');
  });

  it('tên làng rỗng thì thay bằng "ta"', () => {
    const script = scriptWith({ VOTE_OPEN: ['Làng {village} bỏ phiếu đi'] });

    expect(pickLine({ type: 'VOTE_OPEN', payload: { village: '' } }, script, first)).toBe(
      'Làng ta bỏ phiếu đi',
    );
    expect(pickLine({ type: 'VOTE_OPEN', payload: {} }, script, first)).toBe(
      'Làng ta bỏ phiếu đi',
    );
  });

  it('tên làng chỉ toàn khoảng trắng cũng coi như rỗng', () => {
    const script = scriptWith({ VOTE_OPEN: ['Làng {village} ơi'] });

    expect(
      pickLine({ type: 'VOTE_OPEN', payload: { village: '   ' } }, script, first),
    ).toBe('Làng ta ơi');
  });

  it('thiếu tên người thì bỏ chỗ giữ chỗ đi chứ không để lộ ra màn hình', () => {
    const script = scriptWith({ CIVILIAN_KILLED: ['{player} đã ra đi'] });

    const line = pickLine({ type: 'CIVILIAN_KILLED', payload: {} }, script, first);

    expect(line).not.toContain('{');
    expect(line).toBe('đã ra đi');
  });

  it('không để lại khoảng trắng đôi sau khi bỏ chỗ giữ chỗ', () => {
    const script = scriptWith({ CIVILIAN_KILLED: ['Thương thay {player} nhé'] });

    expect(pickLine({ type: 'CIVILIAN_KILLED', payload: {} }, script, first)).toBe(
      'Thương thay nhé',
    );
  });

  it('loại sự kiện không có biến thể nào thì trả chuỗi rỗng, không ném lỗi', () => {
    const script = scriptWith({ ROUND_START: [] });

    expect(pickLine({ type: 'ROUND_START', payload: {} }, script, first)).toBe('');
  });

  it('tên có ký tự $ không bị diễn giải thành mẫu thay thế', () => {
    const script = scriptWith({ SPEAKER_TURN: ['Tới lượt {player}'] });

    expect(
      pickLine({ type: 'SPEAKER_TURN', payload: { player: 'Minh$&Anh' } }, script, first),
    ).toBe('Tới lượt Minh$&Anh');
  });

  it('giá trị vừa thay vào không bị lượt thay sau đó quét lại', () => {
    const script = scriptWith({ VOTE_OPEN: ['Làng {village} chào {player}'] });

    const line = pickLine(
      { type: 'VOTE_OPEN', payload: { village: '{player}', player: 'Minh' } },
      script,
      first,
    );

    expect(line).toBe('Làng {player} chào Minh');
  });

  it('một chỗ giữ chỗ xuất hiện hai lần thì thay cả hai', () => {
    const script = scriptWith({ SPEAKER_TURN: ['{player} ơi, {player} nói đi'] });

    expect(
      pickLine({ type: 'SPEAKER_TURN', payload: { player: 'Lan' } }, script, first),
    ).toBe('Lan ơi, Lan nói đi');
  });

  it('tên làng thừa khoảng trắng thì cắt gọn chứ không mất', () => {
    const script = scriptWith({ VOTE_OPEN: ['Làng {village} ơi'] });

    expect(
      pickLine({ type: 'VOTE_OPEN', payload: { village: '  Đà Nẵng  ' } }, script, first),
    ).toBe('Làng Đà Nẵng ơi');
  });

  it('vòng số 0 vẫn hiện là 0, khác hẳn với vắng mặt', () => {
    const script = scriptWith({ ROUND_START: ['Vòng {round}'] });

    expect(pickLine({ type: 'ROUND_START', payload: { round: 0 } }, script, first)).toBe(
      'Vòng 0',
    );
    expect(pickLine({ type: 'ROUND_START', payload: {} }, script, first)).toBe('Vòng');
  });
});
