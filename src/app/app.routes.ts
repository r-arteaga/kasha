import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage) },
  { path: 'listen', loadComponent: () => import('./pages/listen/listen-page').then((m) => m.ListenPage) },
  {
    path: 'lesson/new',
    loadComponent: () => import('./pages/lesson-edit/lesson-edit-page').then((m) => m.LessonEditPage),
  },
  { path: 'folder/:id', loadComponent: () => import('./pages/folder/folder-page').then((m) => m.FolderPage) },
  { path: 'lesson/:id', loadComponent: () => import('./pages/lesson/lesson-page').then((m) => m.LessonPage) },
  {
    path: 'lesson/:id/edit',
    loadComponent: () => import('./pages/lesson-edit/lesson-edit-page').then((m) => m.LessonEditPage),
  },
  {
    path: 'lesson/:id/kasha/new',
    loadComponent: () => import('./pages/new-kasha/new-kasha-page').then((m) => m.NewKashaPage),
  },
  { path: 'kasha/:id', loadComponent: () => import('./pages/player/player-page').then((m) => m.PlayerPage) },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings-page').then((m) => m.SettingsPage) },
  { path: '**', redirectTo: '' },
];
