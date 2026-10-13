export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string | null;
}

export type ReceivingType = 'RPO' | 'RWP';
export type ReceivingStatus =
  | 'N' // Draft
  | 'U' // Approved / Posted
  | 'C'; // Cancelled

export type QuickDateKey =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'LAST_YEAR';

  export interface ReceivingItemLookup {
  itemCode: string;
  itemDesc: string;
  baseUm: string;
  poUm?: string | null;
  poConvFactor?: number | null;
  unitPrice?: number | null;
}

export interface SupplierLookup {
  suppCode: string;
  suppName: string;
}

export interface BranchLookup {
  branchname: string;
}

export interface WarehouseLookup {
  whseCode: string;
  whseDesc: string;
}

export interface OpenPoLineLookup {
  poNo: string;
  poLineNo: number | null;
  poSeq: number | null;
  suppCode: string;
  suppName: string;
  itemCode: string;
  itemDesc: string;
  qtyPo: number;
  qtyRcv: number;
  openQty: number;
  poUm: string;
  baseUm: string;
  poConvFactor: number;
  unitPrice: number;
  whseCode: string;
}

export interface ReceivingDetailRow {
  //lineNo: number;
  rrSeq: number | null;
  poNo: string | null;
  poLineNo: number | null;
  poSeq: number | null;
  itemCode: string;
  itemDesc: string;
  qtyRcv: number;
  poUm: string;
  baseUm: string;
  poConvFactor: number;
  unitPrice: number;
  orderedQty?: number | null;
  cumulativeReceivedQty?: number | null;
  openQty?: number | null;
}

export interface ReceivingDetailSave {
  //lineNo: number;
  rrSeq: number | null;
  poNo: string | null;
  poLineNo: number | null;
  //poSeq: number | null;
  itemCode: string;
  itemDesc: string | null;
  qtyRcv: number;
  poUm: string | null;
  baseUm: string | null;
  poConvFactor: number;
  unitPrice: number;
}

export interface ReceivingHeader {
  rrNo: string;
  rrDate: string;
  transType: ReceivingType;
  status: ReceivingStatus;
  branchname: string;
  whseCode: string;
  whseDesc: string | null;
  suppCode: string;
  suppName: string;
  reference: string | null;
  remarks: string | null;
  userId: string | null;
  rowVersion: string;
}

export interface ReceivingGetResponse {
  header: ReceivingHeader | null;
  details: ReceivingDetailRow[];
}

export interface ReceivingSaveRequest {
  rrNo: string | null;
  rowVersion: string | null;
  rrDate: string;
  transType: ReceivingType;
  targetStatus: 'N' | 'U';
  branchname: string;
  whseCode: string;
  suppCode: string;
  reference: string | null;
  remarks: string | null;
  userId: string;
  details: ReceivingDetailSave[];
}

export interface ReceivingSaveResponse {
  rrNo: string;
  status: ReceivingStatus;
  rowVersion: string;
  message: string;
}

export interface ReceivingReverseRequest {
  rowVersion: string;
  reason: string;
  userId: string;
}

export interface ReceivingListQuery {
  fromDate: string | null;
  toDate: string | null;
  status: string;
  transType: string;
  branchname: string | null;
  whseCode: string | null;
  suppCode: string | null;
  search: string | null;
  skip: number;
  take: number;
  sortField: string;
  sortDir: string;
  userId: string;
}

export interface ReceivingListItem {
  rrNo: string;
  rrDate: string;
  poNo: string;
  status: ReceivingStatus;
  statusName: string;
  transType: ReceivingType;
  branchname: string;
  whseCode: string;
  whseDesc: string;
  reference: string;
  suppCode: string;
  suppName: string;
  lineCount: number;
  totalQty: number;
  totalAmount: number;
  userId: string;
  remarks: string;
  totalCount: number;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
}

export interface ReceivingDocumentApi {
  rrNo: string | null;
  rrDate: string | null;
  branchname: string | null;
  whseCode: string | null;

  fiscalYear: number | null;
  fiscalPeriod: string | null;

  reference: string | null;

  suppCode: string | null;
  suppName: string | null;

  status: ReceivingStatus | null;
  transType: ReceivingType | null;

  userId: string | null;
  remarks: string | null;

  dateChanged: string | null;
  updatedBy: string | null;
  updatedDate: string | null;

  noOfReversal: number | null;
  reversedBy: string | null;
  reversedWhen: string | null;
  reversalRemarks: string | null;

  rowVersion: string | null;

  details: ReceivingDetailApi[];
}

export interface ReceivingDetailApi {
  rrLineNo: number | null;
  rrNo: string | null;
  rrSeq: number | null;

  poLineNo: number | null;
  poNo: string | null;

  itemCode: string | null;
  itemDesc: string | null;

  qtyRcv: number | null;

  baseUm: string | null;
  poUm: string | null;

  poConvFactor: number | null;
  unitPrice: number | null;

  lineAmount: number | null;
  baseQty: number | null;

  userId: string | null;
  dateChanged: string | null;
}

/*
|--------------------------------------------------------------------------
| Raw API listing model
|--------------------------------------------------------------------------
*/

export interface ReceivingListApiItem {
  rrNo: string | null;
  rrDate: string | null;
  poNo: string | null;

  branchname: string | null;

  whseCode: string | null;
  whseDesc: string | null;

  reference: string | null;

  suppCode: string | null;
  suppName: string | null;

  status: ReceivingStatus | null;
  transType: ReceivingType | null;

  userId: string | null;
  remarks: string | null;

  noOfLines: number | null;
  totalQty: number | null;
  totalAmount: number | null;

  noOfReversal: number | null;
  reversedBy: string | null;
  reversedWhen: string | null;
}