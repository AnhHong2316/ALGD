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
}

export function defaultSettings(): AppSettings {
  return {
    scoreRules: { ...DEFAULT_SCORE_RULES },
    soundLevel: 'FULL',
    speechRate: 1,
    timerSeconds: 30,
    minRoundsBeforeVote: 3,
    lastRevealSpyToSpy: false,
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

function isAppSettings(value: unknown): value is AppSettings {
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
    typeof candidate['lastRevealSpyToSpy'] === 'boolean'
  );
}

@Injectable()
export class SettingsRepository {
  private readonly store: JsonStore<AppSettings>;

  constructor(@Inject(STORAGE_PORT) storage: StoragePort) {
    this.store = new JsonStore(storage, 'settings', isAppSettings, defaultSettings);
  }

  load(): Promise<AppSettings> {
    return this.store.read();
  }

  save(settings: AppSettings): Promise<void> {
    return this.store.write(settings);
  }
}
