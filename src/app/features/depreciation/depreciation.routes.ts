import { Routes } from '@angular/router';

export const DEPRECIATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/depreciation-listing/depreciation-listing.component')
      .then(m => m.DepreciationListingComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/depreciation-entry/depreciation-entry.component')
      .then(m => m.DepreciationEntryComponent)
  },
  {
    path: ':depRunNo',
    loadComponent: () => import('./pages/depreciation-entry/depreciation-entry.component')
      .then(m => m.DepreciationEntryComponent)
  }
];
