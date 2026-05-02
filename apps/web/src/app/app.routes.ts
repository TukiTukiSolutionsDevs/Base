import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'today',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/today/today-page.component').then((m) => m.TodayPageComponent),
  },
  {
    path: 'pipeline',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/pipeline/pipeline-page.component').then((m) => m.PipelinePageComponent),
  },
  {
    path: 'universe',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'today' },
  { path: '**', redirectTo: 'today' },
];
