import { Routes } from '@angular/router';

export const SERVICE_ACCEPTANCE_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./components/service-acceptance-list.component').then(x => x.ServiceAcceptanceListComponent) },
  { path: 'new', loadComponent: () => import('./components/service-acceptance-entry.component').then(x => x.ServiceAcceptanceEntryComponent) },
  { path: ':serviceAcceptanceNo', loadComponent: () => import('./components/service-acceptance-entry.component').then(x => x.ServiceAcceptanceEntryComponent) },
];
