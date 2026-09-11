import { TextToSpeech } from '@capacitor-community/text-to-speech';
import type { SpeechSynthesisVoice } from '@capacitor-community/text-to-speech';
import { SpeechPort } from './speech-port';

/**
 * Bản đọc thật.
 *
 * Trên Android plugin gọi TTS của hệ thống, trên trình duyệt nó rơi về Web
 * Speech API. Cả hai đường đều không đảm bảo có giọng tiếng Việt, nên
 * hasVietnameseVoice là thứ NarrationStore hỏi lúc khởi động.
 */
export class CapacitorSpeech implements SpeechPort {
  /**
   * Hàm thả lời hứa của câu đang đọc, nếu có.
   *
   * Cần nó vì bản Android của plugin: stop() xoá bảng callback mà không gọi
   * onDone hay onError cho câu vừa bị cắt, nên lời hứa của speak() treo mãi
   * không bao giờ kết thúc. Bản web không bị — cancel() ở đó kích onerror nên
   * lời hứa bị từ chối và try/catch bắt được.
   */
  private settleCurrent: (() => void) | null = null;

  /**
   * Chỉ số giọng tiếng Việt đã tìm được, nhớ lại để khỏi hỏi plugin mỗi câu.
   * null nghĩa là chưa biết (có thể do danh sách rỗng lúc mới khởi động) chứ
   * không phải là đã xác nhận không có — xem findVietnameseVoice.
   */
  private voiceIndex: number | null = null;

  async speak(text: string, rate: number): Promise<void> {
    // NarrationStore.run() đã lọc chuỗi rỗng trước khi gọi tới đây; giữ lại
    // để adapter không phải tin tưởng mù quáng vào người gọi trong tương lai.
    if (text.trim() === '') return;

    try {
      // Bản web của plugin chỉ đặt utterance.voice khi options có khoá voice
      // (so với undefined); chỉ truyền lang thì Chrome dùng giọng mặc định
      // của máy — thường là tiếng Anh — để đọc chữ tiếng Việt. Phải tự tìm
      // và truyền thẳng chỉ số giọng thay vì phó mặc cho nền tảng đoán.
      const index = await this.findVietnameseVoice();
      const options = { text, lang: 'vi-VN', rate };

      // Promise này resolve khi đọc XONG (plugin gọi onDone/utterance.onend
      // trên cả Android lẫn web). Hàng đợi trong NarrationStore dựa hẳn vào
      // điều đó để đọc tuần tự. Đua với settleCurrent để stop() có thể thả
      // lời hứa này ra khi Android không tự làm điều đó.
      await Promise.race([
        TextToSpeech.speak(index === null ? options : { ...options, voice: index }),
        new Promise<void>((resolve) => {
          this.settleCurrent = resolve;
        }),
      ]);
    } catch {
      // Máy không đọc được thì thôi. Chữ vẫn đang hiện trên màn hình nên ván
      // không mất thông tin gì.
    } finally {
      this.settleCurrent = null;
    }
  }

  /**
   * Tìm chỉ số giọng tiếng Việt trong danh sách plugin trả về, để speak()
   * truyền thẳng cho utterance thay vì chỉ đặt lang (xem lý do ở speak).
   *
   * Ưu tiên giọng cài sẵn trong máy (localService true). Trò này chơi offline
   * ("Một máy, chuyền tay, không cần mạng") — trên Chrome/Windows giọng tiếng
   * Việt thường là giọng mạng của Google, ép dùng nó thì hết mạng là hết
   * tiếng. Chỉ khi máy không có giọng nội bộ nào mới đành lấy giọng mạng.
   */
  private async findVietnameseVoice(): Promise<number | null> {
    if (this.voiceIndex !== null) return this.voiceIndex;

    let voices: SpeechSynthesisVoice[];
    try {
      ({ voices } = await TextToSpeech.getSupportedVoices());
    } catch {
      return null;
    }

    // Danh sách rỗng ở Chrome lúc mới tải trang nghĩa là giọng CHƯA nạp
    // xong, không phải là máy không có giọng nào. Không nhớ lại kết quả này
    // để lần gọi speak() kế tiếp — khi giọng đã nạp xong — được thử lại.
    if (voices.length === 0) return null;

    const isVietnamese = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase().startsWith('vi');
    let index = voices.findIndex((voice) => isVietnamese(voice) && voice.localService);
    if (index === -1) index = voices.findIndex(isVietnamese);
    if (index === -1) return null;

    this.voiceIndex = index;
    return index;
  }

  async stop(): Promise<void> {
    try {
      await TextToSpeech.stop();
    } catch {
      // Không có gì đang đọc thì stop ném lỗi trên vài máy. Bỏ qua.
    }

    // Thả câu đang treo, xem phần chú thích ở settleCurrent.
    this.settleCurrent?.();
    this.settleCurrent = null;
  }

  async hasVietnameseVoice(): Promise<boolean> {
    try {
      const { voices } = await TextToSpeech.getSupportedVoices();
      // Danh sách rỗng nghĩa là CHƯA BIẾT — Chrome trả rỗng ở lần hỏi đầu
      // tiên sau khi tải trang, giọng nạp xong sau đó — chứ không phải là
      // máy chắc chắn không có giọng nào. Coi như có, giống cách nhánh catch
      // bên dưới xử lý khi hỏi thất bại, để khỏi tự tắt tiếng oan lúc khởi
      // động trên máy có giọng tiếng Việt đàng hoàng.
      if (voices.length === 0) return true;
      return voices.some((voice) => voice.lang.toLowerCase().startsWith('vi'));
    } catch {
      // Không hỏi được thì đoán là có, để không tự tắt tiếng oan trên máy mà
      // plugin chỉ thiếu hàm liệt kê giọng.
      return true;
    }
  }
}
