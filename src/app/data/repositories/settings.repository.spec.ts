import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_RULES } from '../../core/models';
import { MemoryStorage } from '../storage/memory-storage';
import { SettingsRepository } from './settings.repository';

describe('SettingsRepository', () => {
  let storage: MemoryStorage;
  let repository: SettingsRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new SettingsRepository(storage);
  });

  it('mặc định khớp với đặc tả', async () => {
    const settings = await repository.load();

    expect(settings.scoreRules).toEqual(DEFAULT_SCORE_RULES);
    expect(settings.soundLevel).toBe('FULL');
    expect(settings.speechRate).toBe(1);
    expect(settings.timerSeconds).toBe(30);
    expect(settings.minRoundsBeforeVote).toBe(3);
    expect(settings.lastRevealSpyToSpy).toBe(false);
  });

  it('lưu rồi đọc lại đúng giá trị', async () => {
    await repository.save({
      scoreRules: { civilianWin: 2, spyWin: 3, whiteWin: 5 },
      soundLevel: 'SFX_ONLY',
      speechRate: 1.4,
      timerSeconds: null,
      minRoundsBeforeVote: 2,
      lastRevealSpyToSpy: true,
      voiceNoticeDismissed: false,
    });

    const settings = await repository.load();
    expect(settings.scoreRules.spyWin).toBe(3);
    expect(settings.soundLevel).toBe('SFX_ONLY');
    expect(settings.timerSeconds).toBeNull();
    expect(settings.lastRevealSpyToSpy).toBe(true);
  });

  it('dữ liệu hỏng thì rơi về mặc định thay vì làm sập app', async () => {
    await storage.set('settings', '{"soundLevel":');

    expect((await repository.load()).soundLevel).toBe('FULL');
  });

  it('mức âm thanh lạ thì coi như hỏng', async () => {
    await storage.set(
      'settings',
      JSON.stringify({
        scoreRules: DEFAULT_SCORE_RULES,
        soundLevel: 'RAT_TO',
        speechRate: 1,
        timerSeconds: 30,
        minRoundsBeforeVote: 3,
        lastRevealSpyToSpy: false,
      }),
    );

    expect((await repository.load()).soundLevel).toBe('FULL');
  });

  it('mặc định là chưa tắt lời nhắc thiếu giọng', async () => {
    expect((await repository.load()).voiceNoticeDismissed).toBe(false);
  });

  it('nhớ được là người dùng đã bảo đừng nhắc nữa', async () => {
    const settings = await repository.load();
    await repository.save({ ...settings, voiceNoticeDismissed: true });

    expect((await repository.load()).voiceNoticeDismissed).toBe(true);
  });

  it('dữ liệu lưu từ bản cũ, chưa có trường mới, vẫn đọc nguyên vẹn', async () => {
    // Đây là bản ghi thật của bản trước: đủ mọi trường CŨ, không có
    // voiceNoticeDismissed. Nếu kiểm hình dạng đòi trường mới thì luật tính
    // điểm người dùng tự sửa dưới đây sẽ bị xoá sạch trong im lặng.
    await storage.set(
      'settings',
      JSON.stringify({
        scoreRules: { civilianWin: 7, spyWin: 9, whiteWin: 11 },
        soundLevel: 'SFX_ONLY',
        speechRate: 1.3,
        timerSeconds: 45,
        minRoundsBeforeVote: 2,
        lastRevealSpyToSpy: true,
      }),
    );

    const settings = await repository.load();

    expect(settings.scoreRules).toEqual({ civilianWin: 7, spyWin: 9, whiteWin: 11 });
    expect(settings.soundLevel).toBe('SFX_ONLY');
    expect(settings.speechRate).toBe(1.3);
    expect(settings.timerSeconds).toBe(45);
    expect(settings.minRoundsBeforeVote).toBe(2);
    expect(settings.lastRevealSpyToSpy).toBe(true);
    // Trường mới vắng mặt thì lấy mặc định, không được làm hỏng bản ghi.
    expect(settings.voiceNoticeDismissed).toBe(false);
  });
});
