import {
  homeIcon,
  uploadIcon,
  calendarIcon,
  // bellIcon,
  // cartIcon,
  // listRomanBigIcon,
  // filterAddExpressionIcon,
  SVGIcon,
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

/* Updated 04-05-2026 */
export const APP_DRAWER_ITEMS: AppDrawerItem[] = [
  {
    text: 'Dashboard',
    id: 95,
    path: '/dashboard',
    permissionKey: 'DASHBOARD',
    svgIcon: homeIcon,
    cssClass: 'drawer-dashboard-item'
  },

  /*
  {
    text: 'Purchasing',
    id: 100,
    permissionKey: 'PURCHASING',
    cssClass: 'drawer-purchasing-item'
  },
  {
    text: 'Purchase Order',
    id: 101,
    parentId: 100,
    path: '/purchasing/purchase-orders',
    permissionKey: 'PURCHASE_ORDER'
  },
  {
    text: 'Receiving Report',
    id: 102,
    parentId: 100,
    path: '/purchasing/receiving-reports',
    permissionKey: 'RECEIVING_REPORT'
  },

  {
    text: 'Sales',
    id: 200,
    permissionKey: 'SALES',
    cssClass: 'drawer-sales-item'
  },
  {
    text: 'Sales Order',
    id: 201,
    parentId: 200,
    path: '/sales/sales-orders',
    permissionKey: 'SALES_ORDER'
  },
  {
    text: 'Sales Order List',
    id: 202,
    parentId: 200,
    path: '/sales/sales-list',
    permissionKey: 'SALES_ORDER_LIST'
  },

  {
    text: 'Delivery',
    id: 300,
    permissionKey: 'DELIVERY',
    cssClass: 'drawer-delivery-item'
  },
  {
    text: 'Delivery Order',
    id: 301,
    parentId: 300,
    path: '/delivery/delivery-orders',
    permissionKey: 'DELIVERY_ORDER'
  },
  {
    text: 'Delivery Order List',
    id: 302,
    parentId: 300,
    path: '/delivery/delivery-list',
    permissionKey: 'DELIVERY_ORDER_LIST',
    svgIcon: cartIcon
  },

  {
    text: 'Errands',
    id: 600,
    permissionKey: 'ERRANDS',
    cssClass: 'drawer-errands-item'
  },
  {
    text: 'Request Errand',
    id: 601,
    parentId: 600,
    path: '/request-errand',
    permissionKey: 'REQUEST_ERRAND',
    svgIcon: bellIcon
  },
  {
    text: 'Errand List',
    id: 602,
    parentId: 600,
    path: '/request-errand-list',
    permissionKey: 'REQUEST_ERRAND_LIST',
    svgIcon: cartIcon
  },
  */

  // PARENT / DROPDOWN:
  // BIOMETRIX is the parent menu only.
  {
    text: 'BIOMETRIX',
    id: 700,
    permissionKey: 'HRIS_BIOMETRIX',
    svgIcon: uploadIcon,
    cssClass: 'drawer-biometrix-parent'
  },

  // CHILD:
  // HRIS Biometrix Upload page.
  {
    text: 'HRIS Biometrix',
    id: 701,
    parentId: 700,
    path: '/hris-biometrix',
    permissionKey: 'HRIS_BIOMETRIX',
    svgIcon: uploadIcon,
    cssClass: 'drawer-hris-item drawer-child-item'
  },

  // CHILD:
  // DTR Listing page.
  {
    text: 'DTR Listing',
    id: 702,
    parentId: 700,
    path: '/hris-biometrix/dtr-listing',
    permissionKey: 'HRIS_BIOMETRIX_DTR_LISTING',
    svgIcon: calendarIcon,
    cssClass: 'drawer-dtr-item drawer-child-item'
  }
];
/* End of updated */