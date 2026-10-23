import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from './core/auth.service';
import { guestOnly, requireRole } from './core/guards';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const auth = inject(AuthService);
      return auth.user() ? auth.home() : '/login';
    },
  },
  { path: 'login', canActivate: [guestOnly], loadComponent: () => import('./pages/auth/login').then((m) => m.Login) },
  { path: 'registro', canActivate: [guestOnly], loadComponent: () => import('./pages/auth/register').then((m) => m.Register) },
  { path: 'sin-acceso', loadComponent: () => import('./pages/auth/no-access').then((m) => m.NoAccess) },

  // Panel del psicólogo.
  {
    path: '',
    component: Shell,
    canActivate: [requireRole('PSYCHOLOGIST')],
    children: [
      { path: 'inicio', title: 'Inicio · Florece', loadComponent: () => import('./pages/psy/dashboard').then((m) => m.PsyDashboard) },
      { path: 'pacientes', title: 'Pacientes · Florece', loadComponent: () => import('./pages/psy/patients').then((m) => m.Patients) },
      {
        path: 'pacientes/:patientId',
        title: 'Paciente · Florece',
        loadComponent: () => import('./pages/psy/patient-detail').then((m) => m.PatientDetailPage),
      },
      { path: 'agenda', title: 'Agenda · Florece', loadComponent: () => import('./pages/psy/agenda').then((m) => m.Agenda) },
      { path: 'perfil', title: 'Mi perfil · Florece', loadComponent: () => import('./pages/psy/profile').then((m) => m.Profile) },
    ],
  },

  // Administración.
  {
    path: 'admin',
    component: Shell,
    canActivate: [requireRole('ADMIN')],
    children: [
      { path: '', title: 'Resumen · Florece', loadComponent: () => import('./pages/admin/overview').then((m) => m.AdminOverview) },
      {
        path: 'psicologos',
        title: 'Psicólogos · Florece',
        loadComponent: () => import('./pages/admin/psychologists').then((m) => m.AdminPsychologists),
      },
      { path: 'retos', title: 'Catálogo de retos · Florece', loadComponent: () => import('./pages/admin/challenges').then((m) => m.AdminChallenges) },
      {
        path: 'lineas-de-ayuda',
        title: 'Líneas de ayuda · Florece',
        loadComponent: () => import('./pages/admin/crisis').then((m) => m.AdminCrisis),
      },
      { path: 'alertas', title: 'Alertas · Florece', loadComponent: () => import('./pages/admin/alerts').then((m) => m.AdminAlerts) },
    ],
  },

  {
    path: '**',
    redirectTo: () => {
      const auth = inject(AuthService);
      return auth.user() ? auth.home() : '/login';
    },
  },
];
