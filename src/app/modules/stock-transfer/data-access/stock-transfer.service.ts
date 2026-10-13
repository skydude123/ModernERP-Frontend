import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  ApiResponse,
  PagedResult,
  SourceItemLookup,
  StockTransferDocument,
  StockTransferListItem,
  StockTransferQuery,
  StockTransferSaveRequest,
  StockTransferSaveResult,
  WarehouseLookup,
  StockTransferReverseRequest,
StockTransferReverseResult,
} from '../models/stock-transfer.models';

@Injectable({ providedIn: 'root' })
export class StockTransferService {
  private readonly http = inject(HttpClient);
  private readonly url: string;

  constructor(@Inject(API_BASE_URL) baseUrl: string) {
    this.url = `${baseUrl.replace(/\/+$/, '').replace(/\/api$/i, '')}/api/inventory/stock-transfers`;
  }

  list(query: StockTransferQuery): Observable<PagedResult<StockTransferListItem>> {
    let params = new HttpParams()
      .set('status', query.status)
      .set('skip', query.skip)
      .set('take', query.take);

    if (query.dateFrom) params = params.set('dateFrom', query.dateFrom);
    if (query.dateTo) params = params.set('dateTo', query.dateTo);
    if (query.sourceWhseCode) params = params.set('sourceWhseCode', query.sourceWhseCode);
    if (query.destinationWhseCode) params = params.set('destinationWhseCode', query.destinationWhseCode);
    if (query.search) params = params.set('search', query.search);

    return this.http
      .get<ApiResponse<PagedResult<StockTransferListItem>>>(this.url, { params })
      .pipe(map((response) => response.data));
  }

  get(stNo: string): Observable<StockTransferDocument> {
    return this.http
      .get<ApiResponse<StockTransferDocument>>(`${this.url}/${encodeURIComponent(stNo)}`)
      .pipe(map((response) => response.data));
  }

  warehouses(search = ''): Observable<WarehouseLookup[]> {
    return this.http
      .get<ApiResponse<WarehouseLookup[]>>(`${this.url}/lookups/warehouses`, {
        params: new HttpParams().set('search', search),
      })
      .pipe(map((response) => response.data ?? []));
  }

  sourceItems(sourceWhseCode: string, search = ''): Observable<SourceItemLookup[]> {
    return this.http
      .get<ApiResponse<SourceItemLookup[]>>(`${this.url}/lookups/source-items`, {
        params: new HttpParams()
          .set('sourceWhseCode', sourceWhseCode)
          .set('search', search),
      })
      .pipe(map((response) => response.data ?? []));
  }

  upsert(request: StockTransferSaveRequest): Observable<StockTransferSaveResult> {
    return this.http
      .post<ApiResponse<StockTransferSaveResult>>(`${this.url}/upsert`, request)
      .pipe(map((response) => response.data));
  }

  reverse(
  stNo: string,
  request: StockTransferReverseRequest,
): Observable<StockTransferReverseResult> {
  return this.http
    .post<ApiResponse<StockTransferReverseResult>>(
      `${this.url}/${encodeURIComponent(stNo)}/reverse`,
      request,
    )
    .pipe(
      map((response) => response.data),
    );
}
}
