export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string | null;
}

export type SupplierActiveFlag =
  'Y' | 'N';

export type SupplierActiveFilter =
  SupplierActiveFlag | 'ALL';

export type SupplierSortDirection =
  'asc' | 'desc';


export interface SupplierListQuery {
  search: string | null;
  supplierGroupCode: string | null;
  termsCode: string | null;
  currencyCode: string | null;
  taxProfileCode: string | null;
  activeFlag: SupplierActiveFilter;
  skip: number;
  take: number;
  sortField: string;
  sortDirection: SupplierSortDirection;
}


export interface SupplierListItem {
  supplierCode: string;
  supplierName: string;

  supplierGroupCode: string;
  supplierGroupName: string;

  contactPerson: string | null;
  telephone: string | null;
  email: string | null;
  tinNo: string | null;

  termsCode: string | null;
  termsDescription: string | null;

  currencyCode: string | null;
  currencyDescription: string | null;

  taxProfileCode: string | null;
  taxProfileDescription: string | null;

  activeFlag: SupplierActiveFlag;

  modifiedBy: string;
  modifiedDate: string | null;

  totalCount: number;
}


export interface SupplierDetail {
  supplierCode: string;
  supplierName: string;

  supplierGroupCode: string;
  supplierGroupName: string;

  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;

  contactPerson: string | null;
  positionTitle: string | null;

  telephone: string | null;
  fax: string | null;
  email: string | null;

  tinNo: string | null;

  termsCode: string | null;
  termsDescription: string | null;

  currencyCode: string | null;
  currencyDescription: string | null;

  website: string | null;
  specialties: string | null;

  taxProfileCode: string | null;
  taxProfileDescription: string | null;

  activeFlag: SupplierActiveFlag;

  modifiedBy: string;
  modifiedDate: string;
}


export interface SupplierWriteRequest {
  supplierName: string;
  supplierGroupCode: string;

  addressLine1: string | null;
  addressLine2: string | null;

  addressLine3?: string | null;

  contactPerson: string | null;
  positionTitle: string | null;

  telephone: string | null;
  fax: string | null;
  email: string | null;

  tinNo: string | null;

  termsCode: string | null;

  currencyCode?: string | null;

  website: string | null;

  specialties?: string | null;

  taxProfileCode?: string | null;
}


export interface SupplierCreateRequest
  extends SupplierWriteRequest {

  supplierCode: string;

  /*
    Current logged-in user ID.

    The current backend expects UserId
    inside the request body.

    This value is automatically obtained
    from AuthFacadeService and is not
    manually entered in the form.
  */
  userId: string;
}


export interface SupplierUpdateRequest
  extends SupplierWriteRequest {

  supplierCode: string;

  /*
    Current logged-in user ID.
  */
  userId: string;

  /*
    Retained for the Angular concurrency
    workflow.

    The current API may ignore this if
    backend concurrency is temporarily
    disabled.
  */
  //expectedModifiedDate: string;
}


export type SupplierStatusRequest =
  Record<string, never>;

// export interface SupplierStatusRequest {
//   expectedModifiedDate: string;
// }


export interface SupplierLookup {
  code: string;
  description: string;
  displayName: string;
}


export interface SupplierLookups {
  groups: SupplierLookup[];
  terms: SupplierLookup[];
  currencies: SupplierLookup[];
  taxProfiles: SupplierLookup[];
}


export interface SupplierPagedResult<T> {
  data: T[];
  total: number;
}


export interface SupplierCommandResult {
  supplier: SupplierDetail;
  message: string;
  warningMessage: string | null;
}


export const SUPPLIER_FIELD_LENGTHS = {
  supplierCode: 10,
  supplierName: 100,
  supplierGroupCode: 5,

  addressLine1: 200,
  addressLine2: 35,
  addressLine3: 35,

  contactPerson: 35,
  positionTitle: 25,

  telephone: 30,
  fax: 30,
  email: 45,

  tinNo: 50,

  termsCode: 4,
  currencyCode: 5,

  website: 80,
  specialties: 500,

  taxProfileCode: 15,

  /*
    Must match API and SQL:
    @UserId VARCHAR(10)
  */
  userId: 10
} as const;