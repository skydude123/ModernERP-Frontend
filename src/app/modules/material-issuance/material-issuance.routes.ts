import { Routes } from '@angular/router';

export const MATERIAL_ISSUANCE_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/material-issuance-list.component').then(
        (m) => m.MaterialIssuanceListComponent
      )
  },

  {
    path: 'new',
    loadComponent: () =>
      import('./pages/material-issuance-entry.component').then(
        (m) => m.MaterialIssuanceEntryComponent
      )
  },

  {
    path: 'print/:issueNo',
    loadComponent: () =>
      import('./pages/material-issuance-print.component').then(
        (m) => m.MaterialIssuancePrintComponent
      )
  },

  {
    path: ':issueNo',
    loadComponent: () =>
      import('./pages/material-issuance-entry.component').then(
        (m) => m.MaterialIssuanceEntryComponent
      )
  }
];