import { describe, expect, it } from 'vitest';
import { NarrationEventType } from '../models';
import { Rng } from '../engine/rng';
import { NarrationScript, pickLine } from './line-picker';

/** Rng luôn trả 0 nên luôn bốc biến thể đầu. Test không cần may rủi. */
const first: Rng = () => 0;

/** Rng trả gần 1 nên luôn bốc biến thể cuối. */
const last: Rng = () => 0.999;

/**
 * Dựng một kịch bản đủ 17 loại sự kiện, rồi ghi đè loại đang cần thử.
 *
 * Phải liệt kê đủ vì NarrationScript là Record đầy đủ, không phải Partial.
 */
function scriptWith(overrides: Partial<NarrationScript>): NarrationScript {
  const types: NarrationEventType[] = [
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
  ];

  const base = types.reduce((acc, type) => {
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
});
