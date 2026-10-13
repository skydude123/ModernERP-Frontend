import { Routes } from '@angular/router';

export const RECEIVING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/receiving-list/receiving-list.component').then(m => m.ReceivingListComponent)
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./components/receiving-entry/receiving-entry.component').then(m => m.ReceivingEntryComponent)
  },
  {
    path: 'report/:rrNo',
    loadComponent: () =>
      import('./components/receiving-report/receiving-report.component').then(m => m.ReceivingReportComponent)
  },
  {
    path: ':rrNo',
    loadComponent: () =>
      import('./components/receiving-entry/receiving-entry.component').then(m => m.ReceivingEntryComponent)
  }
];
