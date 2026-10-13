export type ItemMasterActiveFlag = 'Y' | 'N';


/*
 * ============================================================
 * GENERIC API RESULT
 * ============================================================
 */
export interface ApiResult<T> {
  success: boolean;
  message?: string | null;
  data?: T;
  error?: string | null;
}


/*
 * ============================================================
 * UNIT OF MEASURE LOOKUP
 * ============================================================
 */
export interface ItemUmLookup {
  um: string;
  umDesc: string;
}


/*
 * ============================================================
 * ITEM MASTER LIST FILTER
 * SERVER-SIDE PAGING / SEARCH / SORT
 * ============================================================
 */
export interface ItemMasterListFilter {
  search?: string | null;

  groupCode?: string | null;

  itemType?: string | null;

  active?: ItemMasterActiveFlag;

  skip?: number;

  take?: number;

  sortField?: string;

  sortDir?: 'asc' | 'desc';
}


/*
 * ============================================================
 * ITEM MASTER LIST ROW
 * ============================================================
 */
export interface ItemMasterListItem {
  itemCode: string;

  itemDesc: string;

  groupCode: string;

  groupDesc: string;

  itemType: string;

  um: string;

  bufferQty: number;

  unitCost: number;

  lastUnitCost: number;

  active: ItemMasterActiveFlag;
}


/*
 * ============================================================
 * SERVER-SIDE PAGED RESPONSE
 *
 * API example:
 *
 * {
 *   success: true,
 *   message: "...",
 *   data: [...],
 *   total: 6509,
 *   skip: 0,
 *   take: 20
 * }
 * ============================================================
 */
export interface ItemMasterPagedResponse {
  success: boolean;

  message?: string | null;

  data: ItemMasterListItem[];

  total: number;

  skip: number;

  take: number;
}


/*
 * ============================================================
 * ITEM MASTER SAVE REQUEST
 * ============================================================
 */
export interface ItemMasterUpsertRequest {
  itemCode: string;

  itemDesc: string;

  groupCode: string;

  itemType?: string | null;

  um: string;

  bufferQty: number;

  unitCost: number;

  lastUnitCost: number;

  active: ItemMasterActiveFlag;
}


/*
 * ============================================================
 * ITEM MASTER SAVE RESPONSE
 * ============================================================
 */
export interface ItemMasterUpsertResponse {
  success: boolean;

  message?: string | null;

  item?: ItemMasterListItem | null;
}


/*
 * ============================================================
 * WAREHOUSE BALANCE
 * ============================================================
 */
export interface ItemWarehouseBalanceItem {
  warehouseDescription: string;

  itemCode: string;

  itemDescription: string;

  baseUm: string;

  qtyReceived: number;

  qtyIssued: number;

  qtyForIssue: number;

  onHandCost: number;
}


/*
 * ============================================================
 * ITEM GROUP LOOKUP
 * ============================================================
 */
export interface ItemGroupLookup {
  groupCode: string;

  groupDesc: string;

  displayName: string;

  sortOrder: number;
}