export type IssueStatus = 'N' | 'A' | 'R';
export type IssueSource = 'PRD' | 'JOB' | 'PRJ' | 'DPT' | 'JOT' | 'DIR';
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
export interface Paged<T> {
  data: T[];
  total: number;
}
export interface IssueQuery {
  dateFrom: string | null;
  dateTo: string | null;
  status: string;
  sourceType: string;
  whseCode: string | null;
  search: string | null;
  skip: number;
  take: number;
  userId: string;
}
export interface IssueListItem {
  issueNo: string;
  issueDate: string;
  whseCode: string;
  sourceType: IssueSource;
  reference: string;
  sourceNo: string | null;
  status: 'N' | 'A';
  effectiveStatus: IssueStatus;
  lineCount: number;
  totalBaseQty: number;
  totalAmount: number;
  userId: string | null;
  totalCount: number;
}
export interface WarehouseLookup {
  whseCode: string;
  whseDesc: string;
}
export interface SupplierLookup {
  suppCode: string;
  suppName: string;
}

export interface WorkCenterLookup {
  wcCode: string;
  wcDesc: string;
}

export interface SoVerification {
  soNo: string;
  customerId: number;
  custName: string;
}

export interface MaterialLookup {
  itemCode: string;
  itemDesc: string;
  whseCode: string;
  baseUm: string;
  availableQty: number;
  estimatedCost: number;
  debitAccount?: string | null;
  inventoryAccount?: string | null;
}
export interface FifoPreview {
  rrLotRowNo: number;
  rrNo: string;
  receiptDate: string;
  availableQty: number;
  unitCost: number;
  availableValue: number;
}
export interface IssueDetail {
  issueSeq: number;
  itemCode: string;
  itemDesc: string;
  qtyIss: number;
  issueUm: string;
  baseUm: string;
  convFactor: number;
  baseQty: number;
  unitCost: number;
  issueAmount: number;
  remarks: string | null;
  debitAccount?: string | null;
  inventoryAccount?: string | null;
  availableQty?: number;
}
export interface IssueLot {
  issueSeq: number;
  rrLotRowNo: number;
  rrNo: string;
  allocatedBaseQty: number;
  unitCost: number;
  issueValue: number;
  isActive: boolean;
}
export interface GlLine {
  lineNo: number;
  accountCode: string;
  debit: number;
  credit: number;
  reference: string;
  narration: string | null;
}
export interface IssueDocument {
  issueNo: string;
  issueDate: string;
  whseCode: string;
  sourceType: IssueSource;
  reference: string;
  sourceNo: string | null;
  soNo: string | null;
  custId: number | null;
  custName: string | null;
  ccCode: string | null;
  wcCode: string | null;
  suppCode: string | null;
  remarks: string | null;
  status: 'N' | 'A';
  effectiveStatus: IssueStatus;
  fiscalYear: number;
  fiscalPeriod: number;
  userId: string | null;
  postedBy: string | null;
  postedAt: string | null;
  revertedBy: string | null;
  revertedWhen: string | null;
  revertRemarks: string | null;
  noOfReverts: number;
  rowVersion: string;
  details: IssueDetail[];
  lots: IssueLot[];
  glLines: GlLine[];
}
export interface IssueSaveRequest {
  issueNo: string | null;
  expectedRowVersion: string | null;
  issueDate: string;
  whseCode: string;
  sourceType: IssueSource;
  reference: string;
  sourceNo: string | null;
  soNo: string | null;
  custId: number | null;
  ccCode: string | null;
  wcCode: string | null;
  suppCode: string | null;
  remarks: string | null;
  targetStatus: 'N' | 'A';
  userId: string | null;
  details: Array<
    Pick<
      IssueDetail,
      | 'issueSeq'
      | 'itemCode'
      | 'itemDesc'
      | 'qtyIss'
      | 'issueUm'
      | 'baseUm'
      | 'convFactor'
      | 'remarks'
    >
  >;
}
export interface IssueSaveResult {
  issueNo: string;
  status: 'N' | 'A';
  effectiveStatus: IssueStatus;
  rowVersion: string;
  message: string;
}