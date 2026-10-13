import { Routes } from '@angular/router';

export const STOCK_ITEM_INQUIRY_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/stock-item-inquiry.component').then((m) => m.StockItemInquiryComponent),
  },
];
