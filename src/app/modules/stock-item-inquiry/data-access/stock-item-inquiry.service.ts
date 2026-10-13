import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  ApiResponse,
  PagedResult,
  StockCardQuery,
  StockCardRow,
  StockItem,
  StockItemListQuery,
  WarehouseLot,
  WarehouseStock,
} from '../models/stock-item-inquiry.models';

@Injectable({ providedIn: 'root' })
export class StockItemInquiryService {
  private readonly http = inject(HttpClient);
  private readonly url: string;

  constructor(@Inject(API_BASE_URL) baseUrl: string) {
    this.url = `${baseUrl.replace(/\/+$/, '').replace(/\/api$/i, '')}/api/inventory/stock-item-inquiry`;
  }

  items(query: StockItemListQuery): Observable<PagedResult<StockItem>> {
    let params = new HttpParams().set('skip', query.skip).set('take', query.take);
    if (query.search) params = params.set('search', query.search);
    if (query.groupCode) params = params.set('groupCode', query.groupCode);

    return this.http
      .get<ApiResponse<PagedResult<StockItem>>>(`${this.url}/items`, { params })
      .pipe(map((response) => response.data));
  }

  warehouseStocks(itemCode: string): Observable<WarehouseStock[]> {
    return this.http
      .get<ApiResponse<WarehouseStock[]>>(`${this.itemUrl(itemCode)}/warehouses`)
      .pipe(map((response) => response.data ?? []));
  }

  warehouseLots(itemCode: string, whseCode: string, openOnly: boolean): Observable<WarehouseLot[]> {
    return this.http
      .get<ApiResponse<WarehouseLot[]>>(
        `${this.itemUrl(itemCode)}/warehouses/${encodeURIComponent(whseCode)}/lots`,
        { params: new HttpParams().set('openOnly', openOnly) },
      )
      .pipe(map((response) => response.data ?? []));
  }

  stockCard(itemCode: string, whseCode: string, query: StockCardQuery): Observable<StockCardRow[]> {
    const params = new HttpParams().set('dateFrom', query.dateFrom).set('dateTo', query.dateTo);
    return this.http
      .get<ApiResponse<StockCardRow[]>>(
        `${this.itemUrl(itemCode)}/warehouses/${encodeURIComponent(whseCode)}/stock-card`,
        { params },
      )
      .pipe(map((response) => response.data ?? []));
  }

  private itemUrl(itemCode: string): string {
    return `${this.url}/items/${encodeURIComponent(itemCode)}`;
  }
}
