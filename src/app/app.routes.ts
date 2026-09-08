import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'nguoi-choi',
    loadComponent: () =>
      import('./features/setup/players.page').then((m) => m.PlayersPage),
  },
  {
    path: 'cau-hinh',
    loadComponent: () => import('./features/setup/config.page').then((m) => m.ConfigPage),
  },
  { path: '**', redirectTo: '' },
];
