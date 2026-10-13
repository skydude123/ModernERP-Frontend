import { Routes } from '@angular/router';

export const FUEL_ACCEPTANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/fuel-acceptance-list.component')
      .then(m => m.FuelAcceptanceListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./components/fuel-acceptance-entry.component')
      .then(m => m.FuelAcceptanceEntryComponent),
  },
  {
    path: ':fuelAcceptanceNo',
    loadComponent: () => import('./components/fuel-acceptance-entry.component')
      .then(m => m.FuelAcceptanceEntryComponent),
  },
];
