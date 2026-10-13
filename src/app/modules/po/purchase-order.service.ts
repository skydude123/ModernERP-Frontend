import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { API_BASE_URL } from '../../core/tokens/api-base-url.token';
import {
  BranchLookup,
  ItemLookup,
  LookupUM,
  PagedResult,
  PurchaseOrderGetResponse,
  PurchaseOrderListItem,
  PurchaseOrderListQuery,
  PurchaseOrderReverseApprovalRequest,
  PurchaseOrderSaveRequest,
  PurchaseOrderSaveResponse,
  PurchaseOrderStatusActionRequest,
  PurchaseOrderStatusActionResult,
  SoVerification,
  SupplierLookup,
  TermLookup,
} from './purchase-order.model';

@Injectable({
  providedIn: 'root'
})
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl: string;

  constructor(@Inject(API_BASE_URL) apiBaseUrl: string) {
    this.apiBaseUrl = this.buildPurchaseOrderBaseUrl(apiBaseUrl);
  }

  private buildPurchaseOrderBaseUrl(apiBaseUrl: string): string {
    const cleanBaseUrl = String(apiBaseUrl || '').replace(/\/+$/, '');

    if (
      cleanBaseUrl.endsWith('/api/purchase-orders') ||
      cleanBaseUrl.endsWith('/api/purchase-order')
    ) {
      return cleanBaseUrl;
    }

    if (cleanBaseUrl.endsWith('/api')) {
      return `${cleanBaseUrl}/purchase-orders`;
    }

    return `${cleanBaseUrl}/api/purchase-orders`;
  }

  getSuppliers(search: string = ''): Observable<SupplierLookup[]> {
    const params = this.createSearchParams(search);

    return this.http.get<SupplierLookup[]>(
      `${this.apiBaseUrl}/lookups/suppliers`,
      { params }
    );
  }

  getBranches(search: string = ''): Observable<BranchLookup[]> {
    const params = this.createSearchParams(search);

    return this.http.get<BranchLookup[]>(
      `${this.apiBaseUrl}/lookups/branches`,
      { params }
    );
  }

  getTerms(search: string = ''): Observable<TermLookup[]> {
    const params = this.createSearchParams(search);

    return this.http.get<TermLookup[]>(
      `${this.apiBaseUrl}/lookups/terms`,
      { params }
    );
  }


  getItems(search: string = ''): Observable<ItemLookup[]> {
    const params = this.createSearchParams(search);

    return this.http.get<ItemLookup[]>(
      `${this.apiBaseUrl}/lookups/items`,
      { params }
    );
  }

  verifySoNo(soNo: string): Observable<SoVerification[]> {
    const cleanSoNo = String(soNo || '').trim();

    if (!cleanSoNo) {
      return of([]);
    }

    return this.http.get<SoVerification[]>(
      `${this.apiBaseUrl}/lookups/so-verify/${encodeURIComponent(cleanSoNo)}`
    );
  }

  getByNo(poNo: string): Observable<PurchaseOrderGetResponse> {
    return this.http.get<PurchaseOrderGetResponse>(
      `${this.apiBaseUrl}/${encodeURIComponent(poNo)}`
    );
  }

  save(request: PurchaseOrderSaveRequest): Observable<PurchaseOrderSaveResponse> {
    return this.http.post<PurchaseOrderSaveResponse>(
      `${this.apiBaseUrl}/save`,
      request
    );
  }

  getListPage(query: PurchaseOrderListQuery): Observable<PagedResult<PurchaseOrderListItem>> {
    // The list endpoint keeps branch/status/search as normal filters, while
    // quick date buttons only change fromDate and toDate in the caller.
    let params = new HttpParams()
      .set('status', query.status || 'ALL')
      .set('skip', String(query.skip ?? 0))
      .set('take', String(query.take ?? 50))
      .set('sortField', query.sortField || 'poDate')
      .set('sortDir', query.sortDir || 'desc')
      .set('userId', query.userId || '');

    if (query.fromDate) {
      params = params.set('fromDate', query.fromDate);
    }

    if (query.toDate) {
      params = params.set('toDate', query.toDate);
    }

    if (query.branchName) {
      params = params.set('branchName', query.branchName);
    }

    if (query.search) {
      params = params.set('search', query.search);
    }

    return this.http.get<PagedResult<PurchaseOrderListItem>>(
      this.apiBaseUrl,
      { params }
    );
  }

  postPo(
    poNo: string,
    request: PurchaseOrderStatusActionRequest
  ): Observable<PurchaseOrderStatusActionResult> {
    return this.http.post<PurchaseOrderStatusActionResult>(
      `${this.apiBaseUrl}/${encodeURIComponent(poNo)}/post`,
      request
    );
  }

  approvePo(
    poNo: string,
    request: PurchaseOrderStatusActionRequest
  ): Observable<PurchaseOrderStatusActionResult> {
    return this.http.post<PurchaseOrderStatusActionResult>(
      `${this.apiBaseUrl}/${encodeURIComponent(poNo)}/approve`,
      request
    );
  }

  reopenPo(
    poNo: string,
    request: PurchaseOrderStatusActionRequest
  ): Observable<PurchaseOrderStatusActionResult> {
    return this.http.post<PurchaseOrderStatusActionResult>(
      `${this.apiBaseUrl}/${encodeURIComponent(poNo)}/reopen`,
      request
    );
  }

  reversePo(
    poNo: string,
    request: PurchaseOrderStatusActionRequest
  ): Observable<PurchaseOrderStatusActionResult> {
    return this.http.post<PurchaseOrderStatusActionResult>(
      `${this.apiBaseUrl}/${encodeURIComponent(poNo)}/reverse`,
      request
    );
  }

  reverseApproval(
    request: PurchaseOrderReverseApprovalRequest
  ): Observable<PurchaseOrderStatusActionResult> {
    return this.http.post<PurchaseOrderStatusActionResult>(
      `${this.apiBaseUrl}/reverse-approval`,
      request
    );
  }

  private createSearchParams(search: string): HttpParams {
    let params = new HttpParams();

    const cleanSearch = String(search || '').trim();

    if (cleanSearch) {
      params = params.set('search', cleanSearch);
    }

    return params;
  }

  getItemLookup(search: string): Observable<ItemLookup[]> {
    const params = this.createSearchParams(search);

    return this.http.get<ItemLookup[]>(
      `${this.apiBaseUrl}/lookups/items`,
      { params }
    );
  }

  getUM(search: string = ''): Observable<LookupUM[]> {
    const params = this.createSearchParams(search);

    return this.http.get<LookupUM[]>(`${this.apiBaseUrl}/lookups/um`, { params }).pipe(
      map(rows =>
        rows.map(row => ({
          // Keep lookup values clean before Kendo binds primitive umCode into detail poUm.
          umCode: String(row.umCode ?? '').trim(),
          umDesc: String(row.umDesc ?? '').trim()
        }))
      )
    );
  }

}
