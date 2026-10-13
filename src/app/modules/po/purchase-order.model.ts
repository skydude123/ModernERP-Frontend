
export interface ItemLookup {
  itemCode: string;
  itemDesc: string;
  // Lookup U/M code from dbo.a_unitmeasures; item selection copies this into detail poUm.
  umCode: string;
  unitPrice?: number;
  poConvFactor?: number;
}

export interface SupplierLookup {
  suppCode: string;
  suppName: string;
}

export interface BranchLookup {
  branchName: string;
}

export interface TermLookup {
  termCode: string;
  termDescription: string;
  //termDesc?: string;
}



export interface SoVerification {
  soNo: string;
  customerId: number;
  custName: string;
}

export interface PurchaseOrderDetailRow {
  lineNo: number;

  /*
   * Existing database PO sequence.
   * NULL for newly added rows.
   */
  poLineNo: number | null;

  itemCode: string;
  itemDesc: string;
  qtyPo: number;
  poUm: string;
  poConvFactor: number;
  unitPrice: number;
  lineAmount: number;
}

// export interface PurchaseOrderDetailRow {
//   lineNo: number;
//   itemCode: string;
//   itemDesc: string;
//   qtyPo: number;

//     poLineNo: number | null;
//   // PO detail value saved as details[].poUm; backend can map this to po_um.
//   poUm: string;
//   poConvFactor: number;
//   unitPrice: number;
//   lineAmount: number;
// }

export interface PurchaseOrderDetailSave {
  rowNo: number;
  poLineNo: number | null;
  itemCode: string;
  itemDesc: string | null;
  qtyPo: number;
  poUm: string | null;
  poConvFactor: number;
  unitPrice: number;
}

// export interface PurchaseOrderDetailSave {
//   lineNo: number;
//    poLineNo: number | null;
//   itemCode: string;
//   itemDesc: string | null;
//   qtyPo: number;
//   poUm: string | null;
//   poConvFactor: number;
//   unitPrice: number;
// }

export interface PurchaseOrderSaveRequest {
  poNo: string | null;
  poDate: string;
  poDelDate: string | null;
  poType: string;
  termCode: string;
  status: string;
  vatType: string;
  chequeType: string | null;
  suppCode: string;
  branchName: string;
  soNo: string | null;
  remarks: string | null;
  custId: number | null;
  userId: string;
  replaceDetails: boolean;
  details: PurchaseOrderDetailSave[];

}

export interface PurchaseOrderDetailSaveResponse {
  poLineNo: number;
  poNo: string;
  itemCode: string;
  itemDesc: string;
  qtyPo: number;
  poUm: string;
  unitPrice: number;
  poConvFactor: number;
  userId: string;
}

export interface PurchaseOrderSaveResponse {
  poNo: string;
  returnPONumber: string;
  resultMessage: string;
  details: PurchaseOrderDetailSaveResponse[];
}

export interface PurchaseOrderHeader {
  poNo: string;
  poDate: string;
  poDelDate: string | null;
  poType: string;
  termCode: string;
  status: string;
  vatType: string;
  chequeType: string | null;
  suppCode: string;
  branchName: string;
  soNo: string | null;
  remarks: string | null;
  custId: number | null;
  userId: string;
  clientName?: string | null;
  hasReceiving?: boolean;
  custName: string | null;
}

export interface PurchaseOrderGetResponse {
  header: PurchaseOrderHeader | null;
  details: PurchaseOrderDetailSaveResponse[];
}

export type PurchaseOrderSaveResult = PurchaseOrderSaveResponse;
export type PurchaseOrderDetailResult = PurchaseOrderDetailSaveResponse;

export type QuickDateKey =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'LAST_YEAR';

export interface PurchaseOrderListQuery {
  fromDate: string | null;
  toDate: string | null;
  status: string;
  branchName: string | null;
  search: string | null;
  skip: number;
  take: number;
  sortField: string;
  sortDir: string;
  userId: string;
}

export interface PurchaseOrderListItem {
  poNo: string;
  poDate: string;
  poDelDate: string | null;
  poType: string;
  termCode: string;
  termDescription: string;
  status: string;
  statusName: string;
  vatType: string;
  taxName: string;
  chequeType: string;
  chequeTypeName: string;
  suppCode: string;
  suppName: string;
  branchName: string;
  soNo: string;
  remarks: string;
  custId: number | null;
  userId: string;
  dateChanged: string | null;
  lineCount: number;
  totalAmount: number;
  totalCount: number;
  hasReceiving?: boolean;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
}

export interface PurchaseOrderStatusActionRequest {
  poNo: string;
  action: 'POST' | 'APPROVE' | 'REOPEN' | 'REVERSE';
  userId: string;
  remarks: string | null;
}

export interface PurchaseOrderReverseApprovalRequest {
  poNo: string;
  userId: string;
  remarks: string | null;
}

export interface PurchaseOrderStatusActionResult {
  poNo: string;
  status: string;
  statusName: string;
  approvedBy: string;
  dateApproved: string | null;
  userId: string;
  dateChanged: string | null;
    remarks?: string | null;
  resultMessage?: string;
}

export interface PoTypeOption {
  code: string;
  name: string;
}

export interface VatTypeOption {
  vcode: string;
  vname: string;
}

export interface LookupUM {
  // Lookup source value from SELECT umCode, umDesc FROM dbo.a_unitmeasures.
  umCode: string;
  // Lookup display text used by the MultiColumnComboBox and grid cell display.
  umDesc: string;
}



