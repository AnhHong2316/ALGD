import { describe, expect, it } from 'vitest';
import { SilentSfx } from './silent-sfx';
import { SilentSpeech } from './silent-speech';

describe('SilentSpeech', () => {
  it('ghi lại câu đã đọc kèm tốc độ', async () => {
    const speech = new SilentSpeech();

    await speech.speak('Tới giờ vote rồi', 1.2);

    expect(speech.spoken).toEqual([{ text: 'Tới giờ vote rồi', rate: 1.2 }]);
  });

  it('đếm số lần bị cắt', async () => {
    const speech = new SilentSpeech();

    await speech.stop();
    await speech.stop();

    expect(speech.stopCount).toBe(2);
  });

  it('mặc định coi như máy có giọng tiếng Việt', async () => {
    expect(await new SilentSpeech().hasVietnameseVoice()).toBe(true);
  });

  it('giả lập được máy thiếu giọng tiếng Việt', async () => {
    const speech = new SilentSpeech();
    speech.vietnameseVoice = false;

    expect(await speech.hasVietnameseVoice()).toBe(false);
  });
});

describe('SilentSfx', () => {
  it('ghi lại tên tiếng đã phát, đúng thứ tự', () => {
    const sfx = new SilentSfx();

    sfx.play('knock');
    sfx.play('toll');

    expect(sfx.played).toEqual(['knock', 'toll']);
  });
});
