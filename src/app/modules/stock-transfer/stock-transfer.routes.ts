import { Routes } from '@angular/router';

export const STOCK_TRANSFER_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/stock-transfer-list.component').then((m) => m.StockTransferListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/stock-transfer-entry.component').then((m) => m.StockTransferEntryComponent),
  },
  {
    path: ':stNo',
    loadComponent: () =>
      import('./pages/stock-transfer-entry.component').then((m) => m.StockTransferEntryComponent),
  },
];
