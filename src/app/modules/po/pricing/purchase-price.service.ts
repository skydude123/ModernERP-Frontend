import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  ActualPoPriceHistoryRecord,
  PagedResult,
  PurchasePriceHistoryQuery,
  PurchasePriceInquiryResult,
  PurchasePriceItemUm,
  PurchasePriceResolution,
  SupplierPriceHistoryRecord,
  SupplierPriceListItem,
  SupplierPriceRecord,
  SupplierPriceUpsertRequest,
  SupplierPriceUpsertResult,
} from './purchase-price.model';

@Injectable({ providedIn: 'root' })
export class PurchasePriceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl: string;

  constructor(@Inject(API_BASE_URL) apiBaseUrl: string) {
    const clean = String(apiBaseUrl || '').replace(/\/+$/, '');
    const purchaseOrderBase = clean.endsWith('/api/purchase-orders')
      ? clean
      : clean.endsWith('/api')
        ? `${clean}/purchase-orders`
        : `${clean}/api/purchase-orders`;

    this.baseUrl = `${purchaseOrderBase}/pricing`;
  }

  getItemUms(itemCode: string): Observable<PurchasePriceItemUm[]> {
    return this.http.get<PurchasePriceItemUm[]>(
      `${this.baseUrl}/item-uoms/${encodeURIComponent(itemCode)}`,
    );
  }

  getSupplierPriceList(): Observable<SupplierPriceListItem[]> {
  return this.http.get<SupplierPriceListItem[]>(
    `${this.baseUrl}/supplier-price-list`,
  );
}

// getSupplierPriceList(
//   supplierCode: string,
// ): Observable<SupplierPriceListItem[]> {
//   const params = new HttpParams()
//     .set('supplierCode', String(supplierCode ?? '').trim());

//   return this.http.get<SupplierPriceListItem[]>(
//     `${this.baseUrl}/supplier-price-list`,
//     { params },
//   );
// }

  resolve(
    supplierCode: string,
    itemCode: string,
    poUm: string,
  ): Observable<PurchasePriceResolution> {
    const params = new HttpParams()
      .set('supplierCode', supplierCode)
      .set('itemCode', itemCode)
      .set('poUm', poUm);

    return this.http.get<PurchasePriceResolution>(`${this.baseUrl}/resolve`, {
      params,
    });
  }

  getInquiry(
    supplierCode: string,
    itemCode: string,
    poUm: string,
    skip: number,
    take: number,
  ): Observable<PurchasePriceInquiryResult> {
    const params = new HttpParams()
      .set('supplierCode', supplierCode)
      .set('itemCode', itemCode)
      .set('poUm', poUm)
      .set('skip', String(skip))
      .set('take', String(take));

    return this.http.get<PurchasePriceInquiryResult>(`${this.baseUrl}/inquiry`, {
      params,
    });
  }

  getCurrent(
    supplierCode: string,
    itemCode: string,
    poUm: string,
    skip = 0,
    take = 50,
  ): Observable<PagedResult<SupplierPriceRecord>> {
    const params = new HttpParams()
      .set('supplierCode', supplierCode)
      .set('itemCode', itemCode)
      .set('poUm', poUm)
      .set('active', 'ALL')
      .set('skip', String(skip))
      .set('take', String(take));

    return this.http.get<PagedResult<SupplierPriceRecord>>(
      `${this.baseUrl}/current`,
      { params },
    );
  }

  upsertCurrent(
    request: SupplierPriceUpsertRequest,
  ): Observable<SupplierPriceUpsertResult> {
    return this.http.put<SupplierPriceUpsertResult>(
      `${this.baseUrl}/current`,
      request,
    );
  }

  getMasterHistory(
    query: PurchasePriceHistoryQuery,
  ): Observable<PagedResult<SupplierPriceHistoryRecord>> {
    return this.http.get<PagedResult<SupplierPriceHistoryRecord>>(
      `${this.baseUrl}/history/master`,
      { params: this.historyParams(query) },
    );
  }

  getActualPoHistory(
    query: PurchasePriceHistoryQuery,
  ): Observable<PagedResult<ActualPoPriceHistoryRecord>> {
    return this.http.get<PagedResult<ActualPoPriceHistoryRecord>>(
      `${this.baseUrl}/history/actual-po`,
      { params: this.historyParams(query) },
    );
  }

  private historyParams(query: PurchasePriceHistoryQuery): HttpParams {
    let params = new HttpParams()
      .set('itemCode', query.itemCode)
      .set('poUm', query.poUm)
      .set('skip', String(query.skip))
      .set('take', String(query.take));

    if (query.supplierCode) {
      params = params.set('supplierCode', query.supplierCode);
    }
    if (query.fromDate) {
      params = params.set('fromDate', query.fromDate);
    }
    if (query.toDate) {
      params = params.set('toDate', query.toDate);
    }

    return params;
  }
}
