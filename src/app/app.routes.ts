import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

const ERP_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT', 'PURCHASING', 'SALES', ''],
};

const HRIS_BIOMETRIX_ACCESS = {
  roles: ['SUPER', 'ADMIN'],
  departments: ['ACCOUNTING', 'IT'],
};

const INVENTORY_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT', 'PURCHASING', 'PURCHASING2', 'SALES', '',],
};

const ORDER_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'ACCTG', 'ACCTG1', 'IT', 'PURCHASING', 'PURCHASING5', 'PURCHASING9', 'SALES', ''],
};

const RECEIVING_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'ACCTG', 'ACCTG1', 'IT', 'PURCHASING', 'PURCHASING2', 'PURCHASING3', 'PURCHASING4',
    'PURCHASING5', 'PURCH6', 'PURCHASING9', 'SALES', '',],
};

const MATERIAL_ISSUANCE_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT', 'PURCHASING', 'PURCH7', 'PURCH10', 'PURCH11', 'PURCH12', 'PURCH13', 'SALES', ''],
};

const ACCEPTANCE_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: [
    'ACCOUNTING',
    'IT',
    'PURCHASING',
    'PURCHASING2',
    'PURCHASING3',
    'SALES',
    '',
  ],
};

const FUEL_ACCEPTANCE_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT', 'PURCHASING', 'PURCHASING3', 'PURCHASING4', ''],
};

const SERVICE_ACCEPTANCE_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT', 'PURCHASING', 'PURCHASING3', ''],
};

const DEPRECIATION_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT', ''],
};

const STOCK_TRANSFER_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: [

    'IT', 'PURCHASING', 'PURCHASING2', 'PURCHASING4', 'PURCH6', 'SALES', '',
  ],
};


const STOCK_ITEM_INQUIRY_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT', 'PURCHASING', 'SALES', 'PURCHASING2', 'PURCHASING4', 'PURCH7', 'PURCH10', 'PURCH11', 'PURCH12', 'PURCH13', ''],
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
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },

  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent,
      ),
  },

  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        data: ERP_ACCESS,
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
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
          title: 'HRIS Biometrix',
        },
        loadComponent: () =>
          import('./features/biometrix-attlog/biometrix-attlog.component').then(
            (m) => m.BiometrixAttlogComponent,
          ),
      },

      {
        path: 'hris-biometrix/dtr-listing',
        data: {
          ...HRIS_BIOMETRIX_ACCESS,
          title: 'Processed Attendance',
        },
        loadComponent: () =>
          import('./features/biometrix-attlog/dtr-listing/biometrix-dtr-listing.component').then(
            (m) => m.BiometrixDtrListingComponent,
          ),
      },

      {
        path: 'biometrix-dtr-listing',
        pathMatch: 'full',
        redirectTo: 'hris-biometrix/dtr-listing',
      },

      {
        path: 'hris-biometrix-dtr-listing',
        pathMatch: 'full',
        redirectTo: 'hris-biometrix/dtr-listing',
      },

      // ORDER - Purchase Order Entry
      // NOTE:
      // purchase-order-entry.component.ts is directly under ./features/po/
      {
        path: 'order/purchase-order-entry',
        data: {
          ...ORDER_ACCESS,
          title: 'Purchase Order Entry',
        },
        loadComponent: () =>
          import('./modules/po/purchase-order-entry.component').then(
            (m) => m.PurchaseOrderEntryComponent,
          ),
      },

      // ORDER - PO Listing
      // NOTE:
      // po-listing.component.ts is under ./features/po/po-listing/

      {
        path: 'order/purchase-order-entry/:poNo',
        data: {
          ...ORDER_ACCESS,
          title: 'Purchase Order Entry',
        },
        loadComponent: () =>
          import('./modules/po/purchase-order-entry.component').then(
            (m) => m.PurchaseOrderEntryComponent,
          ),
      },
      {
        path: 'order/po-listing',
        data: {
          ...ORDER_ACCESS,
          title: 'PO Listing',
        },
        loadComponent: () =>
          import('./modules/po/po-listing/po-listing.component').then(
            (m) => m.PoListingComponent,
          ),
      },
      // {
      //   path: 'order/purchase-order-reports',
      //   data: { ...ORDER_ACCESS, title: 'Purchase Order Reports' },
      //   loadComponent: () => import('./modules/po/reports/purchase-order-report.component').then((m) => m.PurchaseOrderReportComponent),
      // },
      // {
      //   path: 'order/purchase-order-reports/viewer',
      //   data: { ...ORDER_ACCESS, title: 'Purchase Order Report Viewer' },
      //   loadComponent: () => import('./modules/po/reports/purchase-order-report-viewer.component').then((m) => m.PurchaseOrderReportViewerComponent),
      // },

      {
  path: 'inquiry/po-reports',
  data: {
    ...ORDER_ACCESS,
    title: 'Purchase Order Reports',
    permissionKey: 'PO_REPORTS',
  },
  loadComponent: () =>
    import('./modules/po/reports/purchase-order-report.component').then(
      (m) => m.PurchaseOrderReportComponent,
    ),
},

{
  path: 'inquiry/po-reports/viewer',
  data: {
    ...ORDER_ACCESS,
    title: 'Purchase Order Report Viewer',
    permissionKey: 'PO_REPORTS',
  },
  loadComponent: () =>
    import('./modules/po/reports/purchase-order-report-viewer.component').then(
      (m) => m.PurchaseOrderReportViewerComponent,
    ),
},

    {
  path: 'order/price-inquiry',
  data: {
    ...ORDER_ACCESS,
    title: 'Price Inquiry',
  },
  loadComponent: () =>
    import('./modules/po/pricing/price-inquiry-dialog.component').then(
      (m) => m.PriceInquiryDialogComponent,
    ),
},

{
  path: 'order/price-history',
  data: {
    ...ORDER_ACCESS,
    title: 'Price History',
  },
  loadComponent: () =>
    import('./modules/po/pricing/price-history-dialog.component').then(
      (m) => m.PriceHistoryDialogComponent,
    ),
},

      {
        path: 'receiving',
        data: {
          ...RECEIVING_ACCESS,
          title: 'Receiving',
        },
        loadChildren: () =>
          import('./modules/receiving/receiving.routes').then(
            (m) => m.RECEIVING_ROUTES,
          ),
        canActivate: [authGuard],
      },

      {
        path: 'acceptance',
        data: {
          ...ACCEPTANCE_ACCESS,
          title: 'Acceptance',
        },
        loadChildren: () =>
          import('./modules/asset-acceptance/asset-acceptance.routes').then(
            (m) => m.ASSET_ACCEPTANCE_ROUTES,
          ),
        canActivate: [authGuard],
      },

      {
        path: 'fuel-acceptance',
        data: {
          ...FUEL_ACCEPTANCE_ACCESS,
          title: 'Fuel Consumption Acceptance',
        },
        loadChildren: () =>
          import('./modules/fuel-acceptance/fuel-acceptance.routes').then(
            (m) => m.FUEL_ACCEPTANCE_ROUTES,
          ),
        canActivate: [authGuard],
      },

      {
        path: 'service-acceptance',
        data: {
          ...SERVICE_ACCEPTANCE_ACCESS,
          title: 'Service Acceptance',
        },
        loadChildren: () =>
          import('./modules/service-acceptance/service-acceptance.routes').then(
            (m) => m.SERVICE_ACCEPTANCE_ROUTES,
          ),
        canActivate: [authGuard],
      },

      {
        path: 'depreciation-runs',
        data: {
          ...DEPRECIATION_ACCESS,
          title: 'Depreciation',
        },
        loadChildren: () =>
          import('./features/depreciation/depreciation.routes').then(
            (m) => m.DEPRECIATION_ROUTES,
          ),
        canActivate: [authGuard],
      },

      // OPTIONAL ALIAS:
      // Para dili mo-balik login kung naa pay old navigation.
      {
        path: 'purchase-orders/new',
        pathMatch: 'full',
        redirectTo: 'order/purchase-order-entry',
      },

      // OPTIONAL ALIAS:
      // Para kung old edit route gamiton, dili siya mo-fall sa login.
      {
        path: 'purchase-orders/:poNo',
        redirectTo: 'order/purchase-order-entry',
      },

      {
        path: 'material-issuance',
        data: {
          ...MATERIAL_ISSUANCE_ACCESS,
          title: 'Material Issuance',
        },
        loadChildren: () =>
          import('./modules/material-issuance/material-issuance.routes').then(
            (m) => m.MATERIAL_ISSUANCE_ROUTES,
          ),
      },

      {
        path: 'stock-transfers',
        data: {
           ...STOCK_TRANSFER_ACCESS,
          title: 'Stock Transfer',
        },
        loadChildren: () =>
          import('./modules/stock-transfer/stock-transfer.routes').then(
            (m) => m.STOCK_TRANSFER_ROUTES,
          ),
      },

      {
        path: 'inventory',
        data: {
          ...INVENTORY_ACCESS,
          title: 'INVENTORY',
        },
        loadComponent: () =>
          import('./modules/item-master/inventory-listing.component').then(
            (m) => m.InventoryListingComponent,
          ),
      },

      {
        path: 'stock-item-inquiry',
        data: {
          ...STOCK_ITEM_INQUIRY_ACCESS,
          title: 'Stock Item Inquiry',
        },
        loadChildren: () =>
          import('./modules/stock-item-inquiry/stock-item-inquiry.routes').then(
            (m) => m.STOCK_ITEM_INQUIRY_ROUTES,
          ),
      },

      {
        path: 'master-data',
        data: {
          title: 'Master Data',
        },
        loadChildren: () =>
          import('./modules/master-data/suppliers/supplier.routes').then(
            (m) => m.SUPPLIER_ROUTES,
          ),
      },

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];
