import { HttpClient, HttpParams } from '@angular/common/http';

import { inject, Injectable } from '@angular/core';

import { Observable, map, of } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

import {
  // ==========================================================
  // OLD CODE
  // ApiEnvelope,
  // ==========================================================

  ApiResponse,
  AssetAcceptanceCommandResponse,
  AssetAcceptanceDocument,
  AssetAcceptanceListItem,
  AssetAcceptanceListQuery,
  AssetAcceptanceSaveRequest,
  AssetAccountLookupDto,
  AssetAccountPurpose,
  BranchLookup,
  CodeNameLookup,
  FixedAssetPoLineLookup,
  FixedAssetPoLookup,
  PagedResult,
  SupplierLookup,
  WorkflowRequest,
} from '../models/asset-acceptance.models';

@Injectable({
  providedIn: 'root',
})
export class AssetAcceptanceService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = this.buildBaseUrl(inject(API_BASE_URL));

  // ============================================================
  // LIST
  // ============================================================

  getList(
    query: AssetAcceptanceListQuery,
  ): Observable<PagedResult<AssetAcceptanceListItem>> {
    let params = new HttpParams()
      .set('status', query.status || 'ALL')
      .set('skip', String(Math.max(0, query.skip)))
      .set('take', String(Math.max(1, query.take)))
      .set('sortField', query.sortField || 'acceptanceDate')
      .set('sortDir', query.sortDir || 'desc');

    params = this.setOptional(params, 'fromDate', query.fromDate);

    params = this.setOptional(params, 'toDate', query.toDate);

    params = this.setOptional(params, 'branchName', query.branchName);

    params = this.setOptional(
      params,
      'assetCategoryCode',
      query.assetCategoryCode,
    );

    params = this.setOptional(params, 'search', query.search);

    return this.http
      .get<ApiResponse<PagedResult<AssetAcceptanceListItem>>>(this.baseUrl, {
        params,
      })
      .pipe(
        map((response) =>
          this.unwrap(response, 'Unable to load asset acceptances.'),
        ),
      );
  }

  // ============================================================
  // GET DOCUMENT
  // ============================================================

  getDocument(documentNo: string): Observable<AssetAcceptanceDocument> {
    const cleanedDocumentNo = String(documentNo ?? '').trim();

    const url = `${this.baseUrl}/` + `${encodeURIComponent(cleanedDocumentNo)}`;

    return this.http
      .get<ApiResponse<AssetAcceptanceDocument>>(url)
      .pipe(
        map((response) =>
          this.unwrap(response, 'Unable to load asset acceptance.'),
        ),
      );
  }

  // ============================================================
  // FIXED ASSET PURCHASE ORDERS
  // ============================================================

  getFixedAssetPos(
    search: string,
    excludeAcceptanceNo?: string | null,
  ): Observable<FixedAssetPoLookup[]> {
    let params = this.searchParams(search);

    params = this.setOptional(
      params,
      'excludeAcceptanceNo',
      excludeAcceptanceNo,
    );

    return this.http
      .get<ApiResponse<FixedAssetPoLookup[]>>(
        `${this.baseUrl}/lookups/fixed-asset-pos`,
        {
          params,
        },
      )
      .pipe(
        map((response) =>
          this.unwrap(response, 'Unable to load fixed-asset purchase orders.'),
        ),
      );
  }

  // ============================================================
  // FIXED ASSET PURCHASE ORDER LINES
  // ============================================================

  getFixedAssetPoLines(
    poNo: string,
    excludeAcceptanceNo?: string | null,
  ): Observable<FixedAssetPoLineLookup[]> {
    const cleanedPoNo = String(poNo ?? '').trim();

    if (!cleanedPoNo) {
      return of([]);
    }

    let params = new HttpParams();

    params = this.setOptional(
      params,
      'excludeAcceptanceNo',
      excludeAcceptanceNo,
    );

    const url =
      `${this.baseUrl}/lookups/fixed-asset-pos/` +
      `${encodeURIComponent(cleanedPoNo)}/lines`;

    return this.http
      .get<ApiResponse<FixedAssetPoLineLookup[]>>(url, {
        params,
      })
      .pipe(
        map((response) =>
          this.unwrap(response, 'Unable to load fixed-asset PO lines.'),
        ),
      );
  }

  // ============================================================
  // SUPPLIERS
  // ============================================================

  getSuppliers(search: string): Observable<SupplierLookup[]> {
    return this.getLookup<SupplierLookup>('suppliers', search);
  }

  // ============================================================
  // BRANCHES
  // ============================================================

  getBranches(search: string): Observable<BranchLookup[]> {
    return this.getLookup<BranchLookup>('branches', search);
  }

  // ============================================================
  // CATEGORIES
  // ============================================================

  getCategories(search: string): Observable<CodeNameLookup[]> {
    return this.getLookup<CodeNameLookup>('categories', search);
  }

  // ============================================================
  // DEPRECIATION METHODS
  // ============================================================

  getDepreciationMethods(search: string): Observable<CodeNameLookup[]> {
    return this.getLookup<CodeNameLookup>('depreciation-methods', search);
  }

  // ============================================================
  // LOCATIONS
  // ============================================================

  getLocations(search: string): Observable<CodeNameLookup[]> {
    return this.getLookup<CodeNameLookup>('locations', search);
  }

  // ============================================================
  // CUSTODIANS
  // ============================================================

  getCustodians(search: string): Observable<CodeNameLookup[]> {
    return this.getLookup<CodeNameLookup>('custodians', search);
  }

  // ============================================================
  // OLD ACCOUNTS LOOKUP
  // COMMENTED ONLY
  // ============================================================

  // getAccounts(
  //   search: string,
  // ): Observable<CodeNameLookup[]> {
  //   return this.getLookup<CodeNameLookup>(
  //     'accounts',
  //     search,
  //   );
  // }

  // ============================================================
  // NEW ACCOUNTS LOOKUP
  // ============================================================

  getAccounts(
    purpose: AssetAccountPurpose,
    search = '',
    take = 100,
  ): Observable<AssetAccountLookupDto[]> {
    const normalizedPurpose: AssetAccountPurpose = purpose;

    const normalizedTake = Math.min(Math.max(Number(take) || 100, 1), 500);

    let params = new HttpParams()
      .set('purpose', normalizedPurpose)
      .set('take', String(normalizedTake));

    const normalizedSearch = String(search ?? '').trim();

    if (normalizedSearch) {
      params = params.set('search', normalizedSearch);
    }

    return this.http
      .get<ApiResponse<AssetAccountLookupDto[]>>(
        `${this.baseUrl}/lookups/accounts`,
        {
          params,
        },
      )
      .pipe(
        map((response) =>
          this.unwrap(response, 'Unable to load asset accounts.'),
        ),
      );
  }

  // ============================================================
  // CREATE
  // ============================================================

  // create(
  //   request: AssetAcceptanceSaveRequest,
  // ): Observable<AssetAcceptanceCommandResponse> {
  //   return this.command(
  //     this.http.post<ApiResponse<AssetAcceptanceCommandResponse>>(
  //       this.baseUrl,
  //       request,
  //     ),
  //   );
  // }

  create(
    request: AssetAcceptanceSaveRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.http
      .post<ApiResponse<AssetAcceptanceCommandResponse>>(this.baseUrl, request)
      .pipe(
        map((response) =>
          this.unwrap(response, 'Unable to create asset acceptance.'),
        ),
      );
  }

  // ============================================================
  // UPDATE
  // ============================================================

  // update(
  //   documentNo: string,
  //   request: AssetAcceptanceSaveRequest,
  // ): Observable<AssetAcceptanceCommandResponse> {
  //   const cleanedDocumentNo = String(documentNo ?? '').trim();

  //   return this.command(
  //     this.http.put<ApiResponse<AssetAcceptanceCommandResponse>>(
  //       `${this.baseUrl}/` + `${encodeURIComponent(cleanedDocumentNo)}`,
  //       request,
  //     ),
  //   );
  // }

  update(
    documentNo: string,
    request: AssetAcceptanceSaveRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    const cleanedDocumentNo = String(documentNo ?? '').trim();

    const url = `${this.baseUrl}/` + encodeURIComponent(cleanedDocumentNo);

    return this.http
      .put<ApiResponse<AssetAcceptanceCommandResponse>>(url, request)
      .pipe(
        map((response) =>
          this.unwrap(response, 'Unable to update asset acceptance.'),
        ),
      );
  }

  // ============================================================
  // DELETE
  // ============================================================

  delete(
    documentNo: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.workflow(documentNo, 'delete', request);
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  submit(
    documentNo: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.workflow(documentNo, 'submit', request);
  }

  // ============================================================
  // ACCEPT
  // ============================================================

  accept(
    documentNo: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.workflow(documentNo, 'accept', request);
  }

  // ============================================================
  // POST
  // ============================================================

  post(
    documentNo: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.workflow(documentNo, 'post', request);
  }

  // ============================================================
  // CANCEL
  // ============================================================

  cancel(
    documentNo: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.workflow(documentNo, 'cancel', request);
  }

  // ============================================================
  // WORKFLOW REQUEST
  // ============================================================

  private workflow(
    documentNo: string,
    action: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    const cleanedDocumentNo = String(documentNo ?? '').trim();

    const cleanedAction = String(action ?? '').trim();

    const url =
      `${this.baseUrl}/` +
      `${encodeURIComponent(cleanedDocumentNo)}/` +
      `${encodeURIComponent(cleanedAction)}`;

    return this.command(
      this.http.post<ApiResponse<AssetAcceptanceCommandResponse>>(url, request),
    );
  }

  // ============================================================
  // GENERIC LOOKUP
  // ============================================================

  private getLookup<T>(path: string, search: string): Observable<T[]> {
    const params = this.searchParams(search);

    return this.http
      .get<ApiResponse<T[]>>(`${this.baseUrl}/lookups/${path}`, {
        params,
      })
      .pipe(
        map((response) => this.unwrap(response, `Unable to load ${path}.`)),
      );
  }

  // ============================================================
  // COMMAND RESPONSE
  // ============================================================

  private command(
    source: Observable<ApiResponse<AssetAcceptanceCommandResponse>>,
  ): Observable<AssetAcceptanceCommandResponse> {
    return source.pipe(
      map((response) =>
        this.unwrap(response, 'Unable to process asset acceptance.'),
      ),
    );
  }

  // ============================================================
  // API RESPONSE UNWRAPPER
  // ============================================================

  private unwrap<T>(response: ApiResponse<T>, fallback: string): T {
    if (!response?.success || response.data == null) {
      throw new Error(response?.error || response?.message || fallback);
    }

    return response.data;
  }

  // ============================================================
  // SEARCH PARAMETERS
  // ============================================================

  private searchParams(search: string): HttpParams {
    const cleaned = String(search ?? '').trim();

    return cleaned ? new HttpParams().set('search', cleaned) : new HttpParams();
  }

  // ============================================================
  // OPTIONAL PARAMETER
  // ============================================================

  private setOptional(
    params: HttpParams,
    name: string,
    value: string | null | undefined,
  ): HttpParams {
    const cleaned = String(value ?? '').trim();

    return cleaned ? params.set(name, cleaned) : params;
  }

  // ============================================================
  // BUILD API BASE URL
  // ============================================================

  private buildBaseUrl(value: string): string {
    const root = String(value || '')
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/api\/asset-acceptances$/i, '');

    return root.toLowerCase().endsWith('/api')
      ? `${root}/asset-acceptances`
      : `${root}/api/asset-acceptances`;
  }
}
