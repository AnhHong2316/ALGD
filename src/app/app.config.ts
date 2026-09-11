import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { ActiveGameRepository } from './data/repositories/active-game.repository';
import { PlayersRepository } from './data/repositories/players.repository';
import { ScoreboardRepository } from './data/repositories/scoreboard.repository';
import { SettingsRepository } from './data/repositories/settings.repository';
import { WordBankRepository } from './data/repositories/word-bank.repository';
import { PreferencesStorage } from './data/storage/preferences-storage';
import { STORAGE_PORT } from './data/storage/storage.token';
import { GameSessionStore } from './state/game-session.store';
import { NewGameDraftStore } from './state/new-game-draft.store';
import { CapacitorSpeech } from './audio/capacitor-speech';
import { SPEECH_PORT } from './audio/speech.token';
import { SFX_PORT } from './audio/sfx.token';
import { WebAudioSfx } from './audio/web-audio-sfx';
import { NarrationStore } from './state/narration.store';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    // Trên máy thật dùng Capacitor Preferences; test tự cắm MemoryStorage.
    { provide: STORAGE_PORT, useClass: PreferencesStorage },

    // Trên máy thật đọc bằng TTS hệ thống và tổng hợp tiếng bằng Web Audio;
    // test tự cắm SilentSpeech và SilentSfx.
    { provide: SPEECH_PORT, useClass: CapacitorSpeech },
    { provide: SFX_PORT, useClass: WebAudioSfx },

    PlayersRepository,
    SettingsRepository,
    WordBankRepository,
    ScoreboardRepository,
    ActiveGameRepository,

    NewGameDraftStore,
    GameSessionStore,
    NarrationStore,
  ],
};
