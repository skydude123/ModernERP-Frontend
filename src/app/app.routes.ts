import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

const ERP_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT', 'PURCHASING', 'SALES', '']
};

const HRIS_BIOMETRIX_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT']
};

/*
const HRIS_BIOMETRIX_DTR_LISTING_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT']
};
*/

/*
const PURCHASING_ONLY = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['PURCHASING', 'IT', 'ACCOUNTING']
};

const SALES_ONLY = {
  roles: ['SUPER', 'ADMIN', 'USER', 'CROWE'],
  departments: ['SALES', 'IT', 'ACCOUNTING']
};

const DELIVERY_ONLY = {
  roles: ['SUPER', 'ADMIN', 'CROWE'],
  departments: ['IT', 'ACCOUNTING', 'DELIVERY']
};

const ERRAND_ONLY = {
  roles: ['SUPER', 'ADMIN', 'USER'],
  departments: ['SALES', 'ACCOUNTING', 'IT', 'PURCHASING']
};
*/

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },

  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },

  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        data: ERP_ACCESS,
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      /*
      {
        path: 'request-errand',
        data: ERRAND_ONLY,
        loadComponent: () =>
          import('./taskprod/errand-entry/errand-entry.component').then(m => m.ErrandEntryComponent)
      },
      {
        path: 'request-approval',
        data: ERRAND_ONLY,
        loadComponent: () =>
          import('./taskprod/errand-approval/errand-approval.component').then(m => m.ErrandApprovalComponent)
      },
      {
        path: 'request-list',
        data: ERRAND_ONLY,
        loadComponent: () =>
          import('./taskprod/errand-list/errand-list.component').then(m => m.ErrandListComponent)
      },
      {
        path: 'purchasing',
        data: PURCHASING_ONLY,
        loadChildren: () =>
          import('./modules/purchasing/purchasing.routes').then(m => m.PURCHASING_ROUTES),
        canActivate: [authGuard],
      },
      {
        path: 'sales',
        data: SALES_ONLY,
        loadChildren: () =>
          import('./modules/sales/sales.routes').then(m => m.SALES_ROUTES),
        canActivate: [authGuard],
      },
      {
        path: 'delivery',
        data: DELIVERY_ONLY,
        loadChildren: () =>
          import('./modules/delivery/delivery.routes').then(m => m.DELIVERY_ROUTES),
        canActivate: [authGuard],
      },
      */

      {
        path: 'hris-biometrix',
        data: {
          ...HRIS_BIOMETRIX_ACCESS,
          title: 'HRIS Biometrix'
        },
        loadComponent: () =>
          import('./features/biometrix-attlog/biometrix-attlog.component').then(m => m.BiometrixAttlogComponent)
      },

      {
        path: 'hris-biometrix/dtr-listing',
        data: {
          ...HRIS_BIOMETRIX_ACCESS,
          title: 'Processed Attendance'
        },
        loadComponent: () =>
          import('./features/biometrix-attlog/dtr-listing/biometrix-dtr-listing.component').then(m => m.BiometrixDtrListingComponent)
      },

      {
        path: 'biometrix-dtr-listing',
        pathMatch: 'full',
        redirectTo: 'hris-biometrix/dtr-listing'
      },

      {
        path: 'hris-biometrix-dtr-listing',
        pathMatch: 'full',
        redirectTo: 'hris-biometrix/dtr-listing'
      },

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];