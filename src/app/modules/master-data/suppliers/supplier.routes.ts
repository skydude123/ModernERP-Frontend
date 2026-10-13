import { Routes } from '@angular/router';

import { authGuard } from '../../../core/guards/auth.guard';

export const SUPPLIER_ROUTES: Routes = [
  {
    path: 'suppliers',
    canActivate: [authGuard],
    data: {
      title: 'Supplier Listing',
      permissionKey: 'SUPPLIER_VIEW'
    },
    loadComponent: () =>
      import('./pages/supplier-list/supplier-list-page.component').then(
        module => module.SupplierListPageComponent
      )
  },
  {
    path: 'suppliers/new',
    canActivate: [authGuard],
    data: {
      title: 'Supplier Entry',
      permissionKey: 'SUPPLIER_CREATE'
    },
    loadComponent: () =>
      import('./pages/supplier-entry/supplier-entry-page.component').then(
        module => module.SupplierEntryPageComponent
      )
  },
  {
    path: 'suppliers/:supplierCode',
    canActivate: [authGuard],
    data: {
      title: 'Supplier Entry',
      permissionKey: 'SUPPLIER_VIEW'
    },
    loadComponent: () =>
      import('./pages/supplier-entry/supplier-entry-page.component').then(
        module => module.SupplierEntryPageComponent
      )
  }
];
