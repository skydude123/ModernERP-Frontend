export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  error: string | null;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
}

export interface StockItemListQuery {
  search: string | null;
  groupCode: string | null;
  skip: number;
  take: number;
}

export interface StockCardQuery {
  dateFrom: string;
  dateTo: string;
}

export interface StockItem {
  itemCode: string;
  itemDesc: string;
  groupCode: string;
  groupDesc: string;
  baseUm: string;
  itemType: string;
  shortDesc: string | null;
  lastUnitCost: number;
}

export interface WarehouseStock {
  whseCode: string;
  branchName: string;
  itemCode: string;
  qtyReceived: number;
  qtyIssued: number;
  qtyForIssue: number;
  qtyPo: number;
  onHandQty: number;
  availableQty: number;
  baseUm: string;
  onHandCost: number;
  lastUnitCost: number;
  userId: string | null;
  dateChanged: string | null;
}

export interface WarehouseLot {
  whseCode: string;
  itemCode: string;
  transType: string;
  transNo: string;
  transDate: string;
  transLineNo: number;
  poNo: string | null;
  poLineNo: number | null;
  baseQty: number;
  qtyIssued: number;
  remainingQty: number;
  baseUm: string;
  qtyReceived: number;
  poUm: string | null;
  poConvFactor: number;
  prConvFactor: number;
  unitCost: number;
  unitPrice: number;
  remainingValue: number;
  userId: string | null;
  dateChanged: string | null;
}

export interface StockCardRow {
  rowNo: number;
  transDate: string;
  transType: string | null;
  transNo: string | null;
  transLineNo: number | null;
  reference: string | null;
  poNo: string | null;
  poLineNo: number | null;
  suppCode: string | null;
  whseCode: string;
  itemCode: string;
  beginningQty: number;
  qtyIn: number;
  qtyOut: number;
  transQty: number;
  endingQty: number;
  unitCost: number;
  beginningCost: number;
  movementValue: number;
  baseUm: string | null;
  poUm: string | null;
  poConvFactor: number;
  unitPrice: number;
  rrLotNo: string | null;
  rrLotTransType: string | null;
  workCenter: string | null;
  userId: string | null;
  dateChanged: string | null;
}
