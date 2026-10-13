export type StockTransferStatus = 'N' | 'U';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
}

export interface WarehouseLookup {
  whseCode: string;
  whseDesc: string;
}

export interface SourceItemLookup {
  itemCode: string;
  itemDesc: string;
  sourceWhseCode: string;
  stockOnHand: number;
  baseUm: string;
  unitCost: number;
}

export interface StockTransferQuery {
  dateFrom: string | null;
  dateTo: string | null;
  status: 'ALL' | StockTransferStatus;
  sourceWhseCode: string | null;
  destinationWhseCode: string | null;
  search: string | null;
  skip: number;
  take: number;
}

export interface StockTransferListItem {
  stNo: string;
  stDate: string;
  sourceWhseCode: string;
  sourceWhseDesc: string;
  destinationWhseCode: string;
  destinationWhseDesc: string;
  reference: string;
  remarks: string | null;
  status: StockTransferStatus;
  receivedBy: string | null;
  receivedDate: string | null;
  lineCount: number;
  totalBaseQty: number;
  totalTransferCost: number;
  totalCount: number;
}

export interface StockTransferDetail {
  stSeq: number;
  itemCode: string;
  itemDesc: string;
  qtyIss: number;
  xferUm: string;
  convFactor: number;
  baseUm: string;
  baseQty: number;
  unitCost: number;
  transferCost: number;
  stockOnHand?: number;
}

export interface StockTransferDocument {
  stNo: string;
  stDate: string;
  sourceWhseCode: string;
  sourceWhseDesc: string;
  destinationWhseCode: string;
  destinationWhseDesc: string;
  reference: string;
  remarks: string | null;
  status: StockTransferStatus;
  receivedBy: string | null;
  receivedDate: string | null;
  postedBy: string | null;
  postedAt: string | null;
  fiscalYear: number;
  fiscalPeriod: number;
  userId: string | null;
  rowVersion: string;
  details: StockTransferDetail[];
}

export interface StockTransferSaveRequest {
  stNo: string | null;
  expectedRowVersion: string | null;
  stDate: string;
  sourceWhseCode: string;
  destinationWhseCode: string;
  reference: string;
  receivedBy: string | null;
  receivedDate: string | null;
  remarks: string | null;
  targetStatus: StockTransferStatus;
  userId: string | null;
  details: Array<
    Pick<
      StockTransferDetail,
      'stSeq' | 'itemCode' | 'qtyIss' | 'xferUm' | 'convFactor' | 'baseUm'
    >
  >;
}

export interface StockTransferSaveResult {
  stNo: string;
  status: StockTransferStatus;
  rowVersion: string;
  message: string;
}


export interface StockTransferReverseRequest {
  stNo: string;
  expectedRowVersion: string | null;
  reason: string;
  userId: string | null;
}

export interface StockTransferReverseResult {
  stNo: string;
  status: StockTransferStatus;
  rowVersion: string;
  message: string;
}