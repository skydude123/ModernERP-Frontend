export type FuelAcceptanceStatus = 'N' | 'A' | 'R';

export type FuelTaxSchemeCode =
  | 'NV'
  | 'NV1'
  | 'NV2'
  | 'RV'
  | 'RV1'
  | 'RV2';


export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
  error?: string | null;
}


export interface PagedResult<T> {
  data: T[];
  total: number;
}


export interface FuelAcceptanceListQuery {
  fromDate: string | null;
  toDate: string | null;
  status: 'ALL' | FuelAcceptanceStatus;
  branchName: string | null;
  search: string | null;
  skip: number;
  take: number;
  sortField: string;
  sortDir: 'asc' | 'desc';
}


export interface FuelAcceptanceListItem {
  fuelAcceptanceNo: string;
  acceptanceDate: string;

  /*
   * Legacy/display only.
   * May be null for multi-PO Fuel Acceptance.
   */
  poNo?: string | null;

  suppCode: string;
  suppName: string;
  branchName: string;

  vehicleNo: string;
  plateNo: string;
  driverName: string;

  totalLiters: number;
  totalGross: number;
  totalInputVat: number;
  totalEwt: number;
  totalNet: number;
  noReceiptAmount: number;

  status: FuelAcceptanceStatus;

  totalCount: number;
}


export interface FuelAcceptanceHeader {
  fuelAcceptanceNo: string;

  acceptanceDate: string;

  /*
   * Legacy compatibility only.
   * Actual PO belongs to each detail line.
   */
  poNo?: string | null;

  suppCode: string;
  suppName: string;

  branchName: string;

  reference: string;

  vehicleNo: string;
  plateNo: string;
  driverName: string;

  purpose: string;

  poAmount: number;

  status: FuelAcceptanceStatus;

  totalLiters: number;
  totalGross: number;
  totalBasic: number;
  totalInputVat: number;
  totalEwt: number;
  totalNet: number;
  noReceiptAmount: number;

  remarks?: string | null;

  userId: string;

  createdDate: string;

  modifiedBy?: string | null;
  modifiedDate?: string | null;

  postedBy?: string | null;
  postedDate?: string | null;

  reversedBy?: string | null;
  reversedDate?: string | null;

  reverseReason?: string | null;

  rowVersion: string;
}


/* ================================================================
   DETAIL

   CRITICAL CHANGE:
   poNo now belongs to every detail.
   ================================================================ */

export interface FuelAcceptanceDetail {
  fuelLineNo?: number;

  fuelAcceptanceNo?: string;

  lineSeq: number;


  /* ============================================================
     PO SOURCE
     ============================================================ */

  poNo: string;

  poLineNo?: number | null;

  itemCode?: string | null;

  itemDesc?: string | null;

  qtyPo?: number | null;

  /*
   * Remaining quantity from supplier open-PO lookup.
   */
  openQty?: number | null;

  poUm?: string | null;

  baseUm?: string | null;

  poConvFactor?: number | null;


  /* ============================================================
     INTERNAL FUEL DATA
     ============================================================ */

  fuelDate: string;

  fuelStation: string;

  receiptNo?: string | null;

  hasReceipt: boolean;

  noReceiptReason?: string | null;

  fuelType: string;

  liters: number;

  unitPrice: number;

  grossAmount?: number;

  taxSchemeCode: FuelTaxSchemeCode;

  vatRate?: number;

  ewtRate?: number;

  basicAmount?: number;

  inputVat?: number;

  ewtAmount?: number;

  netAmount?: number;

  remarks?: string | null;

  userId?: string;
}


export interface FuelAcceptanceDocument {
  header: FuelAcceptanceHeader;

  details: FuelAcceptanceDetail[];
}


/* ================================================================
   SAVE REQUEST

   Header PO is optional.
   Supplier is required.
   ================================================================ */

export interface FuelAcceptanceSaveRequest {
  header: {
    fuelAcceptanceNo?: string | null;

    acceptanceDate: string;

    /*
     * Legacy only.
     * New API does not require this.
     */
    poNo?: string | null;

    suppCode: string;

    branchName: string;

    reference: string;

    vehicleNo: string;

    plateNo: string;

    driverName: string;

    purpose: string;

    remarks?: string | null;

    rowVersion?: string | null;
  };

  details: FuelAcceptanceDetail[];
}


export interface FuelAcceptanceWorkflowRequest {
  rowVersion: string;

  reason?: string | null;
}


export interface FuelAcceptanceCommandResponse {
  fuelAcceptanceNo: string;

  status: FuelAcceptanceStatus;

  rowVersion: string;

  message: string;
}


/* ================================================================
   OLD PO HEADER LOOKUP

   Retained only in case another old component imports it.
   New Fuel Acceptance entry no longer uses it.
   ================================================================ */

export interface FuelPoLookup {
  poNo: string;

  poDate: string;

  suppCode: string;

  suppName: string;

  branchName: string;

  vehicleNo: string;

  poAmount: number;
}


/* ================================================================
   SUPPLIER-BASED OPEN PO LINE LOOKUP
   ================================================================ */

export interface FuelPoLineLookup {
  poNo: string;

  poLineNo: number;

  poDate: string;

  suppCode: string;

  suppName: string;

  itemCode: string;

  itemDesc: string;

  qtyPo: number;

  qtyRcv: number;

  fuelUsedQty: number;

  openQty: number;

  poUm: string | null;

  baseUm: string | null;

  poConvFactor: number | null;

  unitPrice: number;

  lineAmount: number;

  fuelType: string;
}


export interface FuelSupplierLookup {
  suppCode: string;

  suppName: string;
}


export interface FuelBranchLookup {
  branchName: string;
}


export interface FuelTaxSchemeLookup {
  taxSchemeCode: FuelTaxSchemeCode;

  taxName: string;

  vatRate: number;

  ewtRate: number;
}


export interface FuelVpSource {
  /*
   * API now returns GAS.
   */
  sourceType: 'GAS';

  sourceNo: string;

  refId: string;

  fuelAcceptanceNo: string;

  acceptanceDate: string;

  /*
   * May display:
   * 066239, 066216, 065944
   */
  poNo?: string | null;

  suppCode: string;

  suppName: string;

  branchName: string;

  grossAmount: number;

  basicAmount: number;

  inputVat: number;

  ewtAmount: number;

  netAmount: number;
}