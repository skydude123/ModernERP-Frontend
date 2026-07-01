import { Routes } from '@angular/router';

export const DELIVERY_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'delivery-orders',
    pathMatch: 'full'
  },
  {
    path: 'delivery-orders',
    loadComponent: () =>
      import('../delivery-order/delivery-order.component').then(m => m.DeliveryOrderComponent),
    data: {
      title: 'Delivery Order'
    }
  },
  {
    path: 'delivery-list',
    loadComponent: () =>
      import('../delivery-order/delivery-order-list/delivery-order-list.component').then(m => m.DeliveryOrderListComponent),
    data: {
      title: 'Delivery Order List'
    }
  }
];
