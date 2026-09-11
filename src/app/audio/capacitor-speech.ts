import { TextToSpeech } from '@capacitor-community/text-to-speech';
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

  async speak(text: string, rate: number): Promise<void> {
    // NarrationStore.run() đã lọc chuỗi rỗng trước khi gọi tới đây; giữ lại
    // để adapter không phải tin tưởng mù quáng vào người gọi trong tương lai.
    if (text.trim() === '') return;

    try {
      // Promise này resolve khi đọc XONG (plugin gọi onDone/utterance.onend
      // trên cả Android lẫn web). Hàng đợi trong NarrationStore dựa hẳn vào
      // điều đó để đọc tuần tự. Đua với settleCurrent để stop() có thể thả
      // lời hứa này ra khi Android không tự làm điều đó.
      await Promise.race([
        TextToSpeech.speak({ text, lang: 'vi-VN', rate }),
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
      return voices.some((voice) => voice.lang.toLowerCase().startsWith('vi'));
    } catch {
      // Không hỏi được thì đoán là có, để không tự tắt tiếng oan trên máy mà
      // plugin chỉ thiếu hàm liệt kê giọng.
      return true;
    }
  }
}
