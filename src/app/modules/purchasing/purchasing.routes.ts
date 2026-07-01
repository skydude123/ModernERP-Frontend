import { Routes } from '@angular/router';

export const PURCHASING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'purchase-orders',
    pathMatch: 'full'
  },
  {
    path: 'purchase-orders',
    loadComponent: () =>
      import('../purchase-order/purchase-order.component').then(m => m.PurchaseOrderComponent),
    data: {
      title: 'Purchase Order'
    }
  },
  // {
  //   // path: 'receiving-reports',
  //   // loadComponent: () =>
  //   //   import('../receiving-report/receiving-report.component').then(m => m.ReceivingReportComponent),
  //   // data: {
  //   //   title: 'Receiving Report'
  //   // }
  // }
];
