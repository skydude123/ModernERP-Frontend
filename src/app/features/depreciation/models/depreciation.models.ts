export type DepreciationStatus =
  | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'POSTED' | 'REVERSED' | 'CANCELLED';
export type DepreciationMethod = 'SL' | 'DDB' | 'NONDEP';
export type DepreciationConvention = 'FULL_MONTH' | 'NEXT_MONTH';

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
  error?: string | null;
}

export interface PagedResult<T> { data: T[]; total: number; }
export interface Lookup { code: string; name: string; }

export interface DepreciationRunQuery {
  periodFrom: string | null; periodTo: string | null;
  runDateFrom: string | null; runDateTo: string | null;
  status: string; branchCode: string | null; assetCategoryCode: string | null;
  methodCode: string | null; search: string | null;
  skip: number; take: number; sortField: string; sortDir: string;
}

export interface DepreciationRunListItem {
  depRunNo: string; periodKey: string; runDate: string;
  branchCode?: string | null; assetCategoryCode?: string | null; methodCode?: string | null;
  status: DepreciationStatus; assetCount: number; totalAcquisitionCost: number;
  totalCurrentDepreciation: number; totalClosingNetBookValue: number;
  journalNo?: string | null; preparedBy: string; approvedBy?: string | null;
  postedBy?: string | null; postedAt?: string | null; reversalJournalNo?: string | null;
  remarks?: string | null; totalCount: number;
}

export interface DepreciationRunHeader {
  depRunNo: string; periodKey: string; periodStart: string; periodEnd: string; runDate: string;
  branchCode?: string | null; assetCategoryCode?: string | null; methodCode?: string | null;
  depreciationConvention: DepreciationConvention; includeZeroAmount: boolean;
  status: DepreciationStatus; assetCount: number; totalAcquisitionCost: number;
  totalOpeningAccumulatedDepreciation: number; totalCurrentDepreciation: number;
  totalClosingAccumulatedDepreciation: number; totalClosingNetBookValue: number;
  journalNo?: string | null; reversalJournalNo?: string | null; remarks?: string | null;
  preparedBy: string; submittedBy?: string | null; approvedBy?: string | null;
  postedBy?: string | null; reversedBy?: string | null; createdAt: string;
  submittedAt?: string | null; approvedAt?: string | null; postedAt?: string | null;
  reversedAt?: string | null; rowVersion?: string | null;
}

export interface DepreciationLine {
  lineNo: number; assetId: number; assetCode: string; assetDescription: string;
  assetCategoryCode?: string | null; branchCode?: string | null; locationCode?: string | null;
  custodianCode?: string | null; acquisitionDate?: string | null; inServiceDate?: string | null;
  depreciationStartDate?: string | null; methodCode: string; convention: string;
  acquisitionCost: number; residualValue: number; usefulLifeMonths: number;
  periodsDepreciatedBefore: number; openingAccumulatedDepreciation: number;
  openingNetBookValue: number; depreciationRate: number; currentDepreciation: number;
  closingAccumulatedDepreciation: number; closingNetBookValue: number;
  assetCostAccount?: string | null; depreciationExpenseAccount?: string | null;
  accumulatedDepreciationAccount?: string | null; isSelected: boolean;
  eligibilityStatus: string; eligibilityMessage?: string | null;
  postingStatus?: string | null; journalLineReference?: string | null;
}

export interface GlLine {
  lineNo: number; branchCode?: string | null; accountCode: string; accountName: string;
  debit: number; credit: number; reference: string; narration: string;
}
export interface DepreciationValidation {
  assetId?: number | null; assetCode?: string | null; severity: string; code: string; message: string;
}
export interface DepreciationPreview {
  lines: DepreciationLine[]; glLines: GlLine[]; validations: DepreciationValidation[];
  eligibleAssetCount: number; selectedAssetCount: number; totalAcquisitionCost: number;
  totalOpeningAccumulatedDepreciation: number; totalCurrentDepreciation: number;
  totalClosingAccumulatedDepreciation: number; totalClosingNetBookValue: number; glDifference: number;
}
export interface DepreciationRun {
  header: DepreciationRunHeader; details: DepreciationLine[];
  glLines: GlLine[]; validations: DepreciationValidation[];
}
export interface PreviewRequest {
  periodKey: string; branchCode?: string | null; assetCategoryCode?: string | null;
  methodCode?: string | null; convention: DepreciationConvention;
  includeZeroAmount: boolean; selectedAssetIds: number[];
}
export interface SaveRequest {
  depRunNo?: string | null; setup: PreviewRequest; runDate: string;
  remarks?: string | null; rowVersion?: string | null; lines: DepreciationLine[];
}
export interface CommandRequest { rowVersion: string; reason?: string | null; }
export interface ReverseRequest extends CommandRequest { reason: string; }
export interface CommandResult {
  depRunNo: string; status: DepreciationStatus | 'DELETED'; rowVersion?: string | null;
  journalNo?: string | null; reversalJournalNo?: string | null; message: string;
}
export interface AssetHistory {
  assetId: number; depRunNo: string; periodKey: string; status: string;
  currentDepreciation: number; closingAccumulatedDepreciation: number;
  closingNetBookValue: number; journalNo?: string | null; postedAt?: string | null;
}
