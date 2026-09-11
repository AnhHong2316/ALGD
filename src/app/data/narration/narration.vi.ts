import { NarrationScript } from '../../core/narration/line-picker';

/**
 * Kịch bản thoại tiếng Việt.
 *
 * Mỗi loại sự kiện có nhiều biến thể để bốc ngẫu nhiên, tránh nghe lặp khi
 * chơi liên tiếp nhiều ván. Giọng văn cố ý hơi bỗ bã kiểu bàn nhậu, vì trò
 * này chơi quanh bàn chứ không phải trong rạp.
 *
 * Thêm câu mới chỉ cần sửa file này. Chỉ được dùng ba chỗ giữ chỗ:
 * {village}, {player}, {round}. Có test khoá lại chuyện đó.
 */
export const NARRATION_VI: NarrationScript = {
  GAME_START: [
    'Đêm xuống rồi, làng {village} bắt đầu một ván mới',
    'Làng {village} vào ván. Ai gian ai ngay, lát nữa khắc rõ',
    'Ván mới của làng {village} bắt đầu. Chúc mọi người tỉnh táo',
  ],

  PASS_DEVICE: [
    'Chuyền máy cho {player} nào',
    'Tới lượt {player} cầm máy. Mấy người khác ngó đi chỗ khác giùm',
    '{player} ơi, tới lượt bạn xem thẻ',
  ],

  ROUND_START: [
    'Vòng {round} bắt đầu',
    'Bước sang vòng {round}',
    'Vòng {round}. Nghe cho kỹ nhé bà con',
  ],

  SPEAKER_TURN: [
    'Tới lượt {player} nói',
    'Mời {player} cho một từ gợi ý',
    '{player} nói đi, cả làng đang nghe',
  ],

  TIME_ALMOST_UP: [
    'Sắp hết giờ rồi',
    'Còn chút xíu nữa thôi',
    'Nhanh lên, hết giờ tới nơi rồi',
  ],

  VOTE_OPEN: [
    'Tới giờ vote rồi người dân của làng {village} ơi',
    'Làng {village} nghi ngờ ai, chỉ mặt đặt tên đi',
    'Bỏ phiếu thôi bà con. Ai thấy khả nghi thì cứ chỉ',
  ],

  VOTE_TIE: [
    'Hoà phiếu rồi, làng {village} tính sao đây',
    'Không ai chịu ai. Cùng số phiếu cao nhất',
    'Hoà rồi. Làng {village} phải chọn cách xử',
  ],

  NO_ELIMINATION: [
    'Vòng này không ai bị loại. Làng {village} tha cho hết',
    'Không loại ai cả, ván tiếp tục',
    'Làng {village} quyết định không xử ai vòng này',
  ],

  RANDOM_TIE_BREAK: [
    'Chỉ còn hai người, bốc thăm cho nhanh',
    'Không phân định được thì để số phận quyết',
    'Bốc ngẫu nhiên đây, đừng trách ai',
  ],

  CIVILIAN_KILLED: [
    'Tèo teo, một người dân vô tội đã đi bán muối',
    '{player} ra đi trong oan ức, làng {village} mất một người tốt',
    'Ối giời, {player} là dân thường. Làng {village} xử oan rồi',
  ],

  SPY_CAUGHT: [
    'Tóm được rồi. {player} đúng là gián điệp',
    '{player} lộ mặt gián điệp. Làng {village} tinh mắt thật',
    'Không thoát được đâu. {player} chính là gián điệp',
  ],

  WHITE_REVEALED: [
    '{player} là mũ trắng. Cho một cơ hội đoán từ',
    'Lộ rồi, {player} là mũ trắng đấy',
    'Hoá ra {player} là mũ trắng. Giờ tới lượt đoán',
  ],

  WHITE_GUESS_CORRECT: [
    'Đoán trúng phóc. Mũ trắng lật ngược cả ván',
    'Chính xác. Một mình mũ trắng thắng cả làng {village}',
    'Trúng rồi. {player} gỡ lại tất cả trong một câu',
  ],

  WHITE_GUESS_WRONG: [
    'Trật lất. Mũ trắng đi về',
    'Sai rồi. Đoán trượt là hết cơ hội',
    'Không phải từ đó đâu {player} ơi',
  ],

  CIVILIANS_WIN: [
    'Chúc mừng dân làng chiến thắng',
    'Làng {village} sạch bóng gián điệp rồi',
    'Dân làng thắng. Bắt hết gián điệp rồi bà con ơi',
  ],

  SPIES_WIN: [
    'Gián điệp mưu mô đã lên nắm quyền',
    'Làng {village} thất thủ rồi bà con ơi',
    'Gián điệp thắng. Làng {village} bị qua mặt hoàn toàn',
  ],

  WHITE_WIN: [
    'Mũ trắng thắng một mình. Cao tay thật',
    'Một mình một ngựa, mũ trắng ôm trọn ván này',
    'Không phe nào ngờ tới. Mũ trắng thắng',
  ],
};
