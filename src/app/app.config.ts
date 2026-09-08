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
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    // Trên máy thật dùng Capacitor Preferences; test tự cắm MemoryStorage.
    { provide: STORAGE_PORT, useClass: PreferencesStorage },

    PlayersRepository,
    SettingsRepository,
    WordBankRepository,
    ScoreboardRepository,
    ActiveGameRepository,

    NewGameDraftStore,
    GameSessionStore,
  ],
};
