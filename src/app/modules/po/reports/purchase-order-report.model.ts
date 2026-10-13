export type PurchaseOrderReportType =
  | 'PO_SUMMARY'
  | 'PO_TRACKING'
  | 'PO_BALANCE_SUPPLIER'
  | 'PO_SUMMARY_ITEM'
  | 'PO_RR'
  | 'PO_BALANCE';
export type SupplierMode = 'ALL' | 'SELECTED' | 'NONE';

export interface PurchaseOrderReportQuery {
  reportType: PurchaseOrderReportType;
  poDateFrom: string | null;
  poDateTo: string | null;
  deliveryDateFrom: string | null;
  deliveryDateTo: string | null;
  poStatus: string;
  balanceStatus: string;
  poType: string;
  itemCode: string | null;
  itemDesc: string | null;
  poNo: string | null;
  purchaser: string | null;
  branchName: string | null;
  supplierMode: SupplierMode;
  supplierCodes: string | null;
  skip: number;
  take: number;
}
export interface PurchaseOrderReportRow {
  reportType: PurchaseOrderReportType;
  poNo?: string;
  poDate?: string;
  poDeliveryDate?: string;
  poType?: string;
  poStatus?: string;
  poStatusName?: string;
  suppCode?: string;
  suppName?: string;
  branchName?: string;
  purchaser?: string;
  poLineNo?: number;
  lineCount?: number;
  poCount?: number;
  itemCode?: string;
  itemDesc?: string;
  poUm?: string;
  qtyPo?: number;
  qtyFulfilled?: number;
  balanceQty?: number;
  unitPrice?: number;
  poAmount?: number;
  fulfilledAmount?: number;
  balanceAmount?: number;
  balanceStatus?: string;
}
export interface PagedPurchaseOrderReport {
  data: PurchaseOrderReportRow[];
  total: number;
}
export interface SupplierLookup {
  suppCode: string;
  suppName: string;
}
