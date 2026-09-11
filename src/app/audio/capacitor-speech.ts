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
  async speak(text: string, rate: number): Promise<void> {
    if (text.trim() === '') return;

    try {
      // Promise này resolve khi đọc XONG (plugin gọi onDone/utterance.onend
      // trên cả Android lẫn web). Hàng đợi trong NarrationStore dựa hẳn vào
      // điều đó để đọc tuần tự.
      await TextToSpeech.speak({ text, lang: 'vi-VN', rate });
    } catch {
      // Máy không đọc được thì thôi. Chữ vẫn đang hiện trên màn hình nên ván
      // không mất thông tin gì.
    }
  }

  async stop(): Promise<void> {
    try {
      await TextToSpeech.stop();
    } catch {
      // Không có gì đang đọc thì stop ném lỗi trên vài máy. Bỏ qua.
    }
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
