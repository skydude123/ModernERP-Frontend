export interface PagedResult<T> {
  data: T[];
  total: number;
}

export interface PurchasePriceItemUm {
  itemCode: string;
  poUm: string;
  umDescription: string;
  conversionFactor: number;
  baseUm: string;
}

export interface SupplierPriceListItem {
  supplierCode: string;
  supplierName: string;
  itemCode: string;
  itemDescription: string;
  poUm: string;
  baseUm: string;
  poConvFactor: number;
  unitPrice: number;
  effectiveDate: string;
  dateChanged: string;
  isActive: boolean;
}

export interface SupplierPriceRecord {
  supplierCode: string;
  supplierName: string;
  itemCode: string;
  itemDescription: string;
  poUm: string;
  unitPrice: number;
  effectiveDate: string;
  isActive: boolean;
  remarks: string | null;
  createdBy: string;
  createdAt: string;
  modifiedBy: string;
  modifiedAt: string;
  rowVersion: string;
}

export interface SupplierPriceUpsertRequest {
  supplierCode: string;
  itemCode: string;
  poUm: string;
  unitPrice: number;
  effectiveDate: string;
  isActive: boolean;
  remarks: string | null;
  sourceReference: string | null;
  expectedRowVersion: string | null;
}

export interface SupplierPriceUpsertResult extends SupplierPriceRecord {
  wasChanged: boolean;
}

export interface PurchasePriceResolution {
  supplierCode: string;
  itemCode: string;
  itemDescription: string;
  poUm: string;
  poConvFactor: number | null;
  baseUm: string | null;
  isUmValid: boolean;
  suggestedPrice: number | null;
  suggestedSource: 'SUPPLIER_MASTER' | 'LEGACY_DEFAULT' | 'LAST_ACTUAL_PO' | 'NONE' | 'INVALID_UM';
  currentSupplierMasterPrice: number | null;
  currentSupplierEffectiveDate: string | null;
  currentSupplierRowVersion: string | null;
  configuredSupplierMasterPrice: number | null;
  configuredSupplierEffectiveDate: string | null;
  configuredSupplierIsActive: boolean | null;
  configuredSupplierRemarks: string | null;
  configuredSupplierRowVersion: string | null;
  lastActualPoPrice: number | null;
  lastActualPoNo: string | null;
  lastActualPoDate: string | null;
  legacyPrice: number | null;
  legacyConvertedPrice: number | null;
  isLegacyUmCompatible: boolean;
}

export interface SupplierPriceComparison {
  supplierCode: string;
  supplierName: string;
  itemCode: string;
  poUm: string;
  unitPrice: number;
  effectiveDate: string;
  modifiedAt: string;
  isActive: boolean;
  isCurrent: boolean;
  isSelectedSupplier: boolean;
}

export interface PurchasePriceInquiryResult {
  resolution: PurchasePriceResolution;
  configuredPrices: SupplierPriceComparison[];
  total: number;
  lowestConfiguredPrice: number | null;
  highestConfiguredPrice: number | null;
}

export interface SupplierPriceHistoryRecord {
  historyId: number;
  supplierCode: string;
  supplierName: string;
  itemCode: string;
  poUm: string;
  oldPrice: number | null;
  newPrice: number;
  effectiveDate: string;
  sourceType: string;
  sourceReference: string | null;
  remarks: string | null;
  oldIsActive: boolean | null;
  newIsActive: boolean;
  changedBy: string;
  changedAt: string;
}

export interface ActualPoPriceHistoryRecord {
  poNo: string;
  poLineNo: number;
  poDate: string;
  supplierCode: string;
  supplierName: string;
  itemCode: string;
  itemDescription: string;
  poUm: string;
  poConvFactor: number;
  qtyPo: number;
  unitPrice: number;
  status: string;
  changedBy: string;
  changedAt: string;
}

export interface PurchasePriceHistoryQuery {
  supplierCode: string | null;
  itemCode: string;
  poUm: string;
  fromDate: string | null;
  toDate: string | null;
  skip: number;
  take: number;
}

export interface PurchasePriceDialogContext {
  poNo: string | null;
  supplierCode: string;
  supplierName: string;
  itemCode: string;
  itemDescription: string;
  poUm: string;
  poConvFactor: number;
  actualUnitPrice: number;
  editable: boolean;
}
