import { DEFAULT_SCORE_RULES, ScoreRules } from '../../core/models';
import { JsonStore } from '../json-store';
import { StoragePort } from '../storage/storage-port';
import { Inject, Injectable } from '@angular/core';
import { STORAGE_PORT } from '../storage/storage.token';

export type SoundLevel = 'OFF' | 'SFX_ONLY' | 'FULL';

const SOUND_LEVELS: readonly SoundLevel[] = ['OFF', 'SFX_ONLY', 'FULL'];

export interface AppSettings {
  scoreRules: ScoreRules;
  soundLevel: SoundLevel;
  /** Tốc độ đọc, 1 là bình thường. */
  speechRate: number;
  /** null nghĩa là tắt đồng hồ. */
  timerSeconds: number | null;
  minRoundsBeforeVote: number;
  /** Lựa chọn Bật mí của ván gần nhất, để điền sẵn cho ván sau. */
  lastRevealSpyToSpy: boolean;
  /** Người dùng đã bấm "không nhắc lại" ở thông báo thiếu giọng tiếng Việt. */
  voiceNoticeDismissed: boolean;
}

export function defaultSettings(): AppSettings {
  return {
    scoreRules: { ...DEFAULT_SCORE_RULES },
    soundLevel: 'FULL',
    speechRate: 1,
    timerSeconds: 30,
    minRoundsBeforeVote: 3,
    lastRevealSpyToSpy: false,
    voiceNoticeDismissed: false,
  };
}

function isScoreRules(value: unknown): value is ScoreRules {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['civilianWin'] === 'number' &&
    typeof candidate['spyWin'] === 'number' &&
    typeof candidate['whiteWin'] === 'number'
  );
}

/**
 * Kiểm hình dạng bản ghi đọc từ máy.
 *
 * Quy tắc cho người thêm trường về sau: trường MỚI phải là tuỳ chọn ở đây và
 * được điền mặc định trong withDefaults. Bắt buộc nó nghĩa là mọi bản ghi
 * người dùng lưu từ phiên bản trước đều trượt kiểm và bị thay bằng mặc định
 * trong im lặng — mất luôn cả luật tính điểm họ tự sửa.
 *
 * withDefaults chỉ trải MỘT tầng, nên quy tắc này áp dụng cho cả object lồng
 * bên trong: thêm trường bắt buộc vào ScoreRules cũng xoá sạch bản ghi cũ y
 * như thêm vào AppSettings.
 */
function isAppSettings(value: unknown): value is Partial<AppSettings> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    isScoreRules(candidate['scoreRules']) &&
    typeof candidate['soundLevel'] === 'string' &&
    SOUND_LEVELS.includes(candidate['soundLevel'] as SoundLevel) &&
    typeof candidate['speechRate'] === 'number' &&
    (candidate['timerSeconds'] === null ||
      typeof candidate['timerSeconds'] === 'number') &&
    typeof candidate['minRoundsBeforeVote'] === 'number' &&
    typeof candidate['lastRevealSpyToSpy'] === 'boolean' &&
    // Tuỳ chọn: vắng mặt là hợp lệ, có mặt thì phải đúng kiểu.
    (candidate['voiceNoticeDismissed'] === undefined ||
      typeof candidate['voiceNoticeDismissed'] === 'boolean')
  );
}

/** Điền mặc định cho những trường mà bản ghi cũ chưa có. */
function withDefaults(stored: Partial<AppSettings>): AppSettings {
  return { ...defaultSettings(), ...stored };
}

@Injectable()
export class SettingsRepository {
  private readonly store: JsonStore<Partial<AppSettings>>;

  constructor(@Inject(STORAGE_PORT) storage: StoragePort) {
    this.store = new JsonStore(storage, 'settings', isAppSettings, defaultSettings);
  }

  async load(): Promise<AppSettings> {
    return withDefaults(await this.store.read());
  }

  save(settings: AppSettings): Promise<void> {
    return this.store.write(settings);
  }
}
