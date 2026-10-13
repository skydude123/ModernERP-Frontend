export type AssetAcceptanceStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'POSTED'
  | 'CANCELLED';

export type TrackingMode = 'INDIVIDUAL' | 'GROUPED';
export type AcquisitionMode = 'NORMAL AP' | 'FINANCED';

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data: T;
  error?: string | null;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
}

export interface CodeNameLookup {
  code: string;
  name: string;
}

export interface BranchLookup {
  branchName: string;
}

export interface SupplierLookup {
  suppCode: string;
  suppName: string;
}

export interface FixedAssetPoLookup {
  poNo: string;
  poDate: string;
  suppCode: string;
  suppName: string;
  branchName: string;
  openLineCount: number;
  openAmount: number;
}

export interface FixedAssetPoLineLookup {
  poNo: string;
  poSeq: number;
  assetCode: string;
  description: string;
  orderedQty: number;
  acceptedQty: number;
  openQty: number;
  unitCost: number;
  assetCategoryCode: string | null;
}

export interface AssetAcceptanceDetail {
  lineNo: number;
  poSeq: number;
  assetCode: string;
  description: string;
  qty: number;

  /**
   * Total quantity still available for this PO line after excluding
   * other non-cancelled acceptance documents. The current document is
   * excluded from the backend usage calculation when editing.
   *
   * This field is display/validation data only. It is not sent to the API.
   */
  openPoQty: number;

  unitCost: number;
  trackingMode: TrackingMode;
  serialNo: string;
  engineNo: string;
  chassisNo: string;
  plateNo: string;
  warrantyInfo: string;
  conditionStatus: string;
  remarks: string;
  depreciationMethodCode: string;
  usefulLifeMonths: number;
  residualValue: number;
  depreciationStartDate: string;
  assetCostAccount: string;
  depreciationExpenseAccount: string;
  accumulatedDepreciationAccount: string;
  custodianCode: string;
  assetLocationCode: string;
}

export type AssetAcceptanceSaveDetail =
  Omit<AssetAcceptanceDetail, 'openPoQty'>;

export interface AssetAcceptanceHeader {
  assetAcceptanceNo: string;
  acceptanceDate: string;
  poNo: string;
  suppCode: string;
  suppName: string;
  assetCategoryCode: string;
  branchName: string;
  department: string;
  receivedBy: string;
  acceptedBy: string;
  inServiceDate: string;
  assetLocationCode: string;
  acquisitionMode: AcquisitionMode;
  downpaymentAmount: number;
  financedAmount: number;
  financingCompany: string | null;
  loanReference: string | null;
  status: AssetAcceptanceStatus;
  remarks: string | null;
  userId: string;
  rowVersion: string | null;
}

export interface AssetAcceptanceSaveHeader {
  assetAcceptanceNo: string;
  acceptanceDate: string;
  poNo: string;
  suppCode: string;
  assetCategoryCode: string;
  branchName: string;
  department: string;
  receivedBy: string;
  acceptedBy: string;
  inServiceDate: string;
  assetLocationCode: string;
  acquisitionMode: AcquisitionMode;
  downpaymentAmount: number;
  financedAmount: number;
  financingCompany: string | null;
  loanReference: string | null;
  remarks: string | null;
  userId: string;
  rowVersion: string | null;
}

export interface AssetAcceptanceDocument {
  header: AssetAcceptanceHeader;
  details: AssetAcceptanceDetail[];
}

export interface AssetAcceptanceSaveRequest {
  header: AssetAcceptanceSaveHeader;
  details: AssetAcceptanceSaveDetail[];
}

export interface AssetAcceptanceCommandResponse {
  assetAcceptanceNo: string;
  status: AssetAcceptanceStatus;
  rowVersion: string | null;
  message: string;
  assetCardsCreated?: number | null;
}

export interface AssetAcceptanceListQuery {
  fromDate: string | null;
  toDate: string | null;
  status: string;
  branchName: string | null;
  assetCategoryCode: string | null;
  search: string | null;
  skip: number;
  take: number;
  sortField: string;
  sortDir: string;
}

export interface AssetAcceptanceListItem {
  assetAcceptanceNo: string;
  acceptanceDate: string;
  poNo: string;
  suppCode: string;
  suppName: string;
  assetCategoryCode: string;
  branchName: string;
  status: AssetAcceptanceStatus;
  lineCount: number;
  totalCost: number;
  remarks: string | null;
}

export interface WorkflowRequest {
  userId: string;
  rowVersion: string | null;
  reason?: string | null;
}

export type AssetAccountPurpose =
  | 'ASSET_COST'
  | 'ACCUMULATED_DEPRECIATION'
  | 'DEPRECIATION_EXPENSE';

export interface AssetAccountLookupDto {
  accountId: string;
  accountName: string;
  displayText: string;
  accountType: string;
  normalBalance: 'D' | 'C' | string;
  fsGroup: string;
  fsSubGroup: string;
  reportOrder: number;
  isPosting: boolean;
  accountPurpose: AssetAccountPurpose;
  isRecommended: boolean;
  policyNote?: string | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}
