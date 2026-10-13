import { Routes } from '@angular/router';

export const ASSET_ACCEPTANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/asset-acceptance-list.component').then(
        (m) => m.AssetAcceptanceListComponent,
      ),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./components/asset-acceptance-entry.component').then(
        (m) => m.AssetAcceptanceEntryComponent,
      ),
  },
  {
    path: ':assetAcceptanceNo',
    loadComponent: () =>
      import('./components/asset-acceptance-entry.component').then(
        (m) => m.AssetAcceptanceEntryComponent,
      ),
  },
];
