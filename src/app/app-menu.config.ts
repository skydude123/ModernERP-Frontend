// import {
//   homeIcon,
//   uploadIcon,
//   calendarIcon,
//   cartIcon,
//   SVGIcon,
// } from '@progress/kendo-svg-icons';

import {
  SVGIcon,

  // Main navigation
  homeIcon,
  packageIcon,
  userIcon,
  clipboardIcon,
  truckIcon,
  checkCircleIcon,

  // Entry and listing pages
  uploadSimpleIcon,
  fileAddIcon,
  boxArrowDownIcon,
  clipboardTextIcon,
  calendarDateIcon,
  listUnorderedIcon,
  inboxIcon,
} from '@progress/kendo-svg-icons';

/* UPDATED 04-05-2026 REVISED CODE */

// export interface AppDrawerItem {
//   text?: string;
//   separator?: boolean;
//   svgIcon?: SVGIcon;
//   path?: string;
//   id?: number;
//   parentId?: number;
//   cssStyle?: Record<string, string>;
//   selected?: boolean;
//   roles?: string[];
//   departments?: string[];
// }
/* END OF REVISED CODE */

export interface AppDrawerItem {
  text?: string;
  separator?: boolean;
  svgIcon?: SVGIcon;
  path?: string;
  id?: number;
  parentId?: number;
  cssStyle?: Record<string, string>;
  cssClass?: string;
  selected?: boolean;
  permissionKey?: string;
}

/*
const DEFAULT_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT', 'PURCHASING', 'SALES', ''],
};

const DASHBOARD_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'CROWE', 'USER'],
  departments: ['ACCOUNTING', 'IT', 'PURCHASING', 'SALES'],
};

const HRIS_BIOMETRIX_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER', 'ACCOUNTING', 'CROWE'],
  departments: ['ACCOUNTING', 'IT']
};

const DELIVERY_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'CROWE', 'USER'],
  departments: ['SALES', 'ACCOUNTING', 'IT'],
};

const PURCHASING_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'CROWE', 'USER'],
  departments: ['PURCHASING', 'ACCOUNTING', 'IT'],
};

const SALES_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'CROWE', 'USER'],
  departments: ['SALES', 'ACCOUNTING', 'IT'],
};

const ERRAND_ACCESS = {
  roles: ['SUPER', 'ADMIN', 'USER'],
  departments: ['SALES', 'ACCOUNTING', 'IT', 'PURCHASING'],
};
*/

// export const APP_DRAWER_ITEMS: AppDrawerItem[] = [
//   {
//     text: 'Dashboard',
//     id: 95,
//     path: '/dashboard',
//     permissionKey: 'DASHBOARD',
//     svgIcon: homeIcon,
//     cssClass: 'drawer-dashboard-item drawer-main-item'
//   },

//   {
//     text: 'ITEM MASTER',
//     id: 900,
//     path: '/inventory',
//     permissionKey: 'INVENTORY',
//     svgIcon: cartIcon,
//     cssClass: 'drawer-inventory-parent drawer-main-item'
//   },

//   /*
//   {
//     text: 'Purchasing',
//     id: 100,
//     permissionKey: 'PURCHASING',
//     cssClass: 'drawer-purchasing-item drawer-main-item'
//   },
//   {
//     text: 'Purchase Order',
//     id: 101,
//     parentId: 100,
//     path: '/purchasing/purchase-orders',
//     permissionKey: 'PURCHASE_ORDER'
//   },
//   {
//     text: 'Receiving Report',
//     id: 102,
//     parentId: 100,
//     path: '/purchasing/receiving-reports',
//     permissionKey: 'RECEIVING_REPORT'
//   },

//   {
//     text: 'Sales',
//     id: 200,
//     permissionKey: 'SALES',
//     cssClass: 'drawer-sales-item drawer-main-item'
//   },
//   {
//     text: 'Sales Order',
//     id: 201,
//     parentId: 200,
//     path: '/sales/sales-orders',
//     permissionKey: 'SALES_ORDER'
//   },
//   {
//     text: 'Sales Order List',
//     id: 202,
//     parentId: 200,
//     path: '/sales/sales-list',
//     permissionKey: 'SALES_ORDER_LIST'
//   },

//   {
//     text: 'Delivery',
//     id: 300,
//     permissionKey: 'DELIVERY',
//     cssClass: 'drawer-delivery-item drawer-main-item'
//   },
//   {
//     text: 'Delivery Order',
//     id: 301,
//     parentId: 300,
//     path: '/delivery/delivery-orders',
//     permissionKey: 'DELIVERY_ORDER'
//   },
//   {
//     text: 'Delivery Order List',
//     id: 302,
//     parentId: 300,
//     path: '/delivery/delivery-list',
//     permissionKey: 'DELIVERY_ORDER_LIST',
//     svgIcon: cartIcon
//   },

//   {
//     text: 'Errands',
//     id: 600,
//     permissionKey: 'ERRANDS',
//     cssClass: 'drawer-errands-item drawer-main-item'
//   },
//   {
//     text: 'Request Errand',
//     id: 601,
//     parentId: 600,
//     path: '/request-errand',
//     permissionKey: 'REQUEST_ERRAND'
//   },
//   {
//     text: 'Errand List',
//     id: 602,
//     parentId: 600,
//     path: '/request-errand-list',
//     permissionKey: 'REQUEST_ERRAND_LIST',
//     svgIcon: cartIcon
//   },
//   */

//   // PARENT / DROPDOWN:
//   // BIOMETRIX
//   {
//     text: 'BIOMETRIX',
//     id: 700,
//     permissionKey: 'HRIS_BIOMETRIX',
//     svgIcon: uploadIcon,
//     cssClass: 'drawer-biometrix-parent drawer-main-item'
//   },

//   {
//     text: 'HRIS Biometrix',
//     id: 701,
//     parentId: 700,
//     path: '/hris-biometrix',
//     permissionKey: 'HRIS_BIOMETRIX',
//     svgIcon: uploadIcon,
//     cssClass: 'drawer-hris-item drawer-child-item'
//   },

//   {
//     text: 'DTR Listing',
//     id: 702,
//     parentId: 700,
//     path: '/hris-biometrix/dtr-listing',
//     permissionKey: 'HRIS_BIOMETRIX_DTR_LISTING',
//     svgIcon: calendarIcon,
//     cssClass: 'drawer-dtr-item drawer-child-item'
//   },

//   // PARENT / DROPDOWN:
//   // ORDER
//   {
//     text: 'P.O Module',
//     id: 800,
//     permissionKey: 'ORDER',
//     svgIcon: cartIcon,
//     cssClass: 'drawer-order-parent drawer-main-item'
//   },

//   {
//     text: 'P.O Entry',
//     id: 801,
//     parentId: 800,
//     path: '/order/purchase-order-entry',
//     permissionKey: 'PURCHASE_ORDER_ENTRY',
//     svgIcon: uploadIcon,
//     cssClass: 'drawer-po-entry-item drawer-child-item'
//   },

//   {
//     text: 'P.O Listing',
//     id: 802,
//     parentId: 800,
//     path: '/order/po-listing',
//     permissionKey: 'PO_LISTING',
//     svgIcon: calendarIcon,
//     cssClass: 'drawer-po-listing-item drawer-child-item'
//   },

//   {
//     text: 'RECEIVING',
//     id: 850,
//     permissionKey: 'RECEIVING',
//     svgIcon: cartIcon,
//     cssClass: 'drawer-receiving-parent drawer-main-item'
//   },

//   {
//     text: 'Receiving Entry',
//     id: 851,
//     parentId: 850,
//     path: '/receiving/new',
//     permissionKey: 'RECEIVING_ENTRY',
//     svgIcon: uploadIcon,
//     cssClass: 'drawer-receiving-entry-item drawer-child-item'
//   },

//   {
//     text: 'Receiving Register',
//     id: 852,
//     parentId: 850,
//     path: '/receiving',
//     permissionKey: 'RECEIVING_REGISTER',
//     svgIcon: calendarIcon,
//     cssClass: 'drawer-receiving-register-item drawer-child-item'
//   },

//   // MAIN MODULE:
//   // INVENTORY is NOT a child/subfolder.

//  {
//   text: 'ACCEPTANCE',
//   id: 500,
//   permissionKey: 'ACCEPTANCE',
//   svgIcon: cartIcon,
//   cssClass: 'drawer-acceptance-parent drawer-main-item'
// },

// {
//   text: 'Acceptance Entry',
//   id: 501,
//   parentId: 500,
//   path: '/acceptance/new',
//   permissionKey: 'ACCEPTANCE_ENTRY',
//   svgIcon: uploadIcon,
//   cssClass: 'drawer-acceptance-entry-item drawer-child-item'
// },

// {
//   text: 'Acceptance List',
//   id: 502,
//   parentId: 500,
//   path: '/acceptance',
//   permissionKey: 'ACCEPTANCE_LIST',
//   svgIcon: calendarIcon,
//   cssClass: 'drawer-acceptance-list-item drawer-child-item'
// }

// ];

export const APP_DRAWER_ITEMS: AppDrawerItem[] = [
  /*
    DASHBOARD
    Home icon = main landing page.
  */
  {
    text: 'Dashboard',
    id: 95,
    path: '/dashboard',
    permissionKey: 'DASHBOARD',
    svgIcon: homeIcon,
    cssClass: 'drawer-dashboard-item drawer-main-item',
  },

  /*
    ITEM MASTER
    Package icon = inventory items, materials, supplies, and assets.
  */
  {
    text: 'MASTER TABLES',
    id: 900,
    permissionKey: 'INVENTORY',
    svgIcon: packageIcon,
    cssClass: 'drawer-inventory-parent drawer-main-item',
  },

  {
    text: 'ITEM MASTER LIST',
    id: 901,
    parentId: 900,
    path: '/inventory',
    permissionKey: 'INVENTORY',
    svgIcon: inboxIcon,
    cssClass: 'drawer-material-issuance-item drawer-child-item',
  },


  {
    text: 'SUPPLIER',
    id: 950,
    permissionKey: 'MASTER_DATA',
    svgIcon: packageIcon,
    cssClass: 'drawer-master-data-parent drawer-main-item',
  },

  {
    text: 'Supplier Entry',
    id: 951,
    parentId: 950,
    path: '/master-data/suppliers/new',
    permissionKey: 'SUPPLIER_CREATE',
    svgIcon: fileAddIcon,
    cssClass: 'drawer-supplier-entry-item drawer-child-item',
  },

  {
    text: 'Supplier Listing',
    id: 952,
    parentId: 950,
    path: '/master-data/suppliers',
    permissionKey: 'SUPPLIER_VIEW',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-supplier-list-item drawer-child-item',
  },

  // /*
  //   BIOMETRIX
  //   User icon = employee biometric/attendance module.
  // */
  // {
  //   text: 'BIOMETRIX',
  //   id: 700,
  //   permissionKey: 'HRIS_BIOMETRIX',
  //   svgIcon: userIcon,
  //   cssClass: 'drawer-biometrix-parent drawer-main-item',
  // },

  // /*
  //   BIOMETRIX ENTRY / UPLOAD
  //   Upload icon = uploading attendance logs.
  // */
  // {
  //   text: 'HRIS Biometrix',
  //   id: 701,
  //   parentId: 700,
  //   path: '/hris-biometrix',
  //   permissionKey: 'HRIS_BIOMETRIX',
  //   svgIcon: uploadSimpleIcon,
  //   cssClass: 'drawer-hris-item drawer-child-item',
  // },

  // /*
  //   DTR LISTING
  //   Calendar icon = dated attendance records.
  // */
  // {
  //   text: 'DTR Listing',
  //   id: 702,
  //   parentId: 700,
  //   path: '/hris-biometrix/dtr-listing',
  //   permissionKey: 'HRIS_BIOMETRIX_DTR_LISTING',
  //   svgIcon: calendarDateIcon,
  //   cssClass: 'drawer-dtr-item drawer-child-item',
  // },

  /*
    PURCHASE ORDER
    Clipboard icon = business order/document.
  */
  {
    text: 'P.O Module',
    id: 800,
    permissionKey: 'ORDER',
    svgIcon: clipboardIcon,
    cssClass: 'drawer-order-parent drawer-main-item',
  },

  /*
    P.O ENTRY
    File Add icon = creating a new Purchase Order.
  */
  {
    text: 'P.O Entry',
    id: 801,
    parentId: 800,
    path: '/order/purchase-order-entry',
    permissionKey: 'PURCHASE_ORDER_ENTRY',
    svgIcon: fileAddIcon,
    cssClass: 'drawer-po-entry-item drawer-child-item',
  },

  /*
    P.O LISTING
    List icon = Purchase Order register/list.
  */
  {
    text: 'P.O Listing',
    id: 802,
    parentId: 800,
    path: '/order/po-listing',
    permissionKey: 'PO_LISTING',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-po-listing-item drawer-child-item',
  },


  //   {
  //   text: 'Price Inquiry',
  //   id: 803,
  //   parentId: 800,
  //   path: '/order/price-inquiry',
  //   permissionKey: 'PURCHASE_ORDER_ENTRY',
  //   svgIcon: listUnorderedIcon,
  //   cssClass: 'drawer-price-inquiry-item drawer-child-item',
  // },

  // {
  //   text: 'Price History',
  //   id: 804,
  //   parentId: 800,
  //   path: '/order/price-history',
  //   permissionKey: 'PURCHASE_ORDER_ENTRY',
  //   svgIcon: listUnorderedIcon,
  //   cssClass: 'drawer-price-history-item drawer-child-item',
  // },

  /*
    RECEIVING
    Truck icon = arrival/delivery of purchased items.
  */
  {
    text: 'RECEIVING',
    id: 850,
    permissionKey: 'RECEIVING',
    svgIcon: truckIcon,
    cssClass: 'drawer-receiving-parent drawer-main-item',
  },

  /*
    RECEIVING ENTRY
    Box Arrow Down = items entering the warehouse.
  */
  {
    text: 'Receiving Entry',
    id: 851,
    parentId: 850,
    path: '/receiving/new',
    permissionKey: 'RECEIVING_ENTRY',
    svgIcon: boxArrowDownIcon,
    cssClass: 'drawer-receiving-entry-item drawer-child-item',
  },

  /*
    RECEIVING REGISTER
    List icon = receiving transaction register.
  */
  {
    text: 'Receiving List',
    id: 852,
    parentId: 850,
    path: '/receiving',
    permissionKey: 'RECEIVING_LIST',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-receiving-register-item drawer-child-item',
  },

  {
    text: 'MAT. ISSUE',
    id: 705,
    permissionKey: 'MAT_ISSUE',
    svgIcon: packageIcon,
    cssClass: 'drawer-material-issuance-parent drawer-main-item',
  },

  {
    text: 'Material Issuance Entry',
    id: 706,
    parentId: 705,
    path: '/material-issuance/new',
    permissionKey: 'MAT_ISSUE_ENTRY',
    svgIcon: boxArrowDownIcon,
    cssClass: 'drawer-material-issuance-item drawer-child-item',
  },

  {
    text: 'Material Issuance List',
    id: 707,
    parentId: 705,
    path: '/material-issuance',
    permissionKey: 'MAT_ISSUE_LIST',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-material-issuance-item drawer-child-item',
  },

  {
    text: 'STOCK TRANSFER',
    id: 708,
    permissionKey: 'STOCK_TRANSFER',
    svgIcon: packageIcon,
    cssClass: 'drawer-material-issuance-parent drawer-main-item',
  },

  {
    text: 'Stock Transfer Entry',
    id: 709,
    parentId: 708,
    path: '/stock-transfers/new',
    permissionKey: 'STOCK_TRANSFER_NEW',
    svgIcon: boxArrowDownIcon,
    cssClass: 'drawer-material-issuance-item drawer-child-item',
  },

  {
    text: 'Stock Transfer List',
    id: 710,
    parentId: 708,
    path: '/stock-transfers',
    permissionKey: 'STOCK_TRANSFER_LIST',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-material-issuance-item drawer-child-item',
  },

  /*
    ACCEPTANCE
    Check Circle = verification and formal acceptance.
  */
  {
    text: ' ASSET ACC.',
    id: 500,
    permissionKey: 'ACCEPTANCE',
    svgIcon: checkCircleIcon,
    cssClass: 'drawer-acceptance-parent drawer-main-item',
  },

  /*
    ACCEPTANCE ENTRY
    Clipboard Text = acceptance document entry.
  */
  {
    text: 'Acceptance Entry',
    id: 501,
    parentId: 500,
    path: '/acceptance/new',
    permissionKey: 'ACCEPTANCE_ENTRY',
    svgIcon: clipboardTextIcon,
    cssClass: 'drawer-acceptance-entry-item drawer-child-item',
  },

  /*
    ACCEPTANCE LIST
    List icon = acceptance document register.
  */
  {
    text: 'Acceptance List',
    id: 502,
    parentId: 500,
    path: '/acceptance',
    permissionKey: 'ACCEPTANCE_LIST',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-acceptance-list-item drawer-child-item',
  },

  {
    text: 'FUEL ACC.',
    id: 525,
    permissionKey: 'FUEL_ACCEPTANCE',
    svgIcon: checkCircleIcon,
    cssClass: 'drawer-fuel-acceptance-parent drawer-main-item',
  },
  {
    text: 'Fuel Acceptance Entry',
    id: 526,
    parentId: 525,
    path: '/fuel-acceptance/new',
    permissionKey: 'FUEL_ACCEPTANCE_ENTRY',
    svgIcon: clipboardTextIcon,
    cssClass: 'drawer-fuel-acceptance-entry-item drawer-child-item',
  },
  {
    text: 'Fuel Acceptance List',
    id: 527,
    parentId: 525,
    path: '/fuel-acceptance',
    permissionKey: 'FUEL_ACCEPTANCE_LIST',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-fuel-acceptance-list-item drawer-child-item',
  },

  {
    text: 'SERVICE ACC.',
    id: 530,
    permissionKey: 'SERVICE_ACCEPTANCE',
    svgIcon: checkCircleIcon,
    cssClass: 'drawer-service-acceptance-parent drawer-main-item',
  },
  {
    text: 'Service Acceptance Entry',
    id: 531,
    parentId: 530,
    path: '/service-acceptance/new',
    permissionKey: 'SERVICE_ACCEPTANCE_ENTRY',
    svgIcon: clipboardTextIcon,
    cssClass: 'drawer-service-acceptance-entry-item drawer-child-item',
  },
  {
    text: 'Service Acceptance List',
    id: 532,
    parentId: 530,
    path: '/service-acceptance',
    permissionKey: 'SERVICE_ACCEPTANCE_LIST',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-service-acceptance-list-item drawer-child-item',
  },

  {
    text: 'DEPRECIATION',
    id: 550,
    permissionKey: 'DEPRECIATION_VIEW',
    svgIcon: calendarDateIcon,
    cssClass: 'drawer-depreciation-parent drawer-main-item',
  },
  {
    text: 'Depreciation Register',
    id: 551,
    parentId: 550,
    path: '/depreciation-runs',
    permissionKey: 'DEPRECIATION_VIEW',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-depreciation-list-item drawer-child-item',
  },
  {
    text: 'New Depreciation Run',
    id: 552,
    parentId: 550,
    path: '/depreciation-runs/new',
    permissionKey: 'DEPRECIATION_CREATE',
    svgIcon: fileAddIcon,
    cssClass: 'drawer-depreciation-entry-item drawer-child-item',
  },

  {
    text: 'INQUIRY',
    id: 100,
    permissionKey: 'INQUIRY',
    svgIcon: packageIcon,
    cssClass: 'drawer-inventory-parent drawer-main-item',
  },

  {
    text: 'STOCK ITEM INQUIRY',
    id: 101,
    parentId: 100,
    path: '/stock-item-inquiry',
    permissionKey: 'INQUIRY_STOCK_ITEM',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-stock-item-inquiry-item drawer-child-item',
  },
  {
    text: 'P.O Reports',
    id: 102,
    parentId: 100,
    path: '/inquiry/po-reports',
    permissionKey: 'PO_REPORTS',
    svgIcon: listUnorderedIcon,
    cssClass: 'drawer-po-reports-item drawer-child-item',
  },

];
/* End of updated */
