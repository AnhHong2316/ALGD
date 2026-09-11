import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CapacitorSpeech } from './capacitor-speech';

const speak = vi.fn((_options: unknown) => Promise.resolve());
const stop = vi.fn(() => Promise.resolve());
const getSupportedVoices = vi.fn();

vi.mock('@capacitor-community/text-to-speech', () => ({
  TextToSpeech: {
    speak: (options: unknown) => speak(options),
    stop: () => stop(),
    getSupportedVoices: () => getSupportedVoices(),
  },
}));

/** Dựng một mục giọng đúng hình dạng plugin trả về. */
function voice(lang: string, localService: boolean, name = lang) {
  return { default: false, lang, localService, name, voiceURI: name };
}

describe('CapacitorSpeech', () => {
  beforeEach(() => {
    speak.mockClear();
    stop.mockClear();
    getSupportedVoices.mockReset();
  });

  it('truyền chỉ số giọng tiếng Việt chứ không chỉ truyền lang', async () => {
    getSupportedVoices.mockResolvedValue({
      voices: [voice('en-US', true), voice('vi-VN', true)],
    });

    await new CapacitorSpeech().speak('Tới giờ vote rồi', 1);

    // Bản web của plugin chỉ đặt utterance.voice khi có chỉ số; thiếu nó thì
    // Chrome đọc chữ tiếng Việt bằng giọng mặc định là tiếng Anh.
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ voice: 1 }));
  });

  it('ưu tiên giọng cài trong máy hơn giọng chạy qua mạng', async () => {
    getSupportedVoices.mockResolvedValue({
      voices: [voice('vi-VN', false, 'mang'), voice('vi-VN', true, 'trong may')],
    });

    await new CapacitorSpeech().speak('Xin chào', 1);

    // Trò này chơi offline. Ép dùng giọng mạng là mất mạng mất tiếng.
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ voice: 1 }));
  });

  it('không có giọng tiếng Việt trong máy thì đành dùng giọng mạng', async () => {
    getSupportedVoices.mockResolvedValue({
      voices: [voice('en-US', true), voice('vi-VN', false)],
    });

    await new CapacitorSpeech().speak('Xin chào', 1);

    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ voice: 1 }));
  });

  it('không có giọng tiếng Việt nào thì không ép, để nền tảng tự chọn', async () => {
    getSupportedVoices.mockResolvedValue({ voices: [voice('en-US', true)] });

    await new CapacitorSpeech().speak('Xin chào', 1);

    expect(speak.mock.calls[0][0]).not.toHaveProperty('voice');
  });

  it('danh sách giọng rỗng nghĩa là chưa biết, không phải là không có', async () => {
    getSupportedVoices.mockResolvedValue({ voices: [] });

    // Chrome trả rỗng ở lần gọi đầu sau khi tải trang rồi mới nạp giọng. Coi
    // đó là "không có" thì app tự tắt tiếng oan trên máy có giọng đàng hoàng.
    expect(await new CapacitorSpeech().hasVietnameseVoice()).toBe(true);
  });

  it('có danh sách mà không có giọng tiếng Việt thì báo là không có', async () => {
    getSupportedVoices.mockResolvedValue({ voices: [voice('en-US', true)] });

    expect(await new CapacitorSpeech().hasVietnameseVoice()).toBe(false);
  });

  it('hỏi không được thì đoán là có, để không tự tắt tiếng oan', async () => {
    getSupportedVoices.mockRejectedValue(new Error('khong hoi duoc'));

    expect(await new CapacitorSpeech().hasVietnameseVoice()).toBe(true);
  });
});
