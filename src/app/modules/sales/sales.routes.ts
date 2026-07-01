import { Routes } from '@angular/router';

export const SALES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'sales-orders',
    pathMatch: 'full'
  },
  {
    path: 'sales-orders',
    loadComponent: () =>
      import('../sales-order/sales-order.component').then(m => m.SalesOrderComponent),
    data: {
      title: 'Sales Order'
    }
  },
  {
    path: 'sales-list',
    loadComponent: () =>
      import('../sales-order/sales-order-list/sales-order-list.component').then(m => m.SalesOrderListComponent),
    data: {
      title: 'Sales Order List'
    }
  }
];
