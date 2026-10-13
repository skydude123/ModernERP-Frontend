import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiResult, ItemWarehouseBalanceItem } from '../item-master/item-master.model';
import { API_BASE_URL } from '../../core/tokens/api-base-url.token';


@Injectable({
  providedIn: 'root'
})
export class ItemWarehouseApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl: string;

  constructor(@Inject(API_BASE_URL) apiBaseUrl: string) {
  
    this.apiBaseUrl = this.buildItemMasterBaseUrl(apiBaseUrl);
 
  }


      private buildItemMasterBaseUrl(apiBaseUrl: string): string {
    const cleanBaseUrl = String(apiBaseUrl || '').replace(/\/+$/, '');

    if (cleanBaseUrl.endsWith('/api/item-warehouse')) {
      return cleanBaseUrl;
    }

    if (cleanBaseUrl.endsWith('/api')) {
      return `${cleanBaseUrl}/item-warehouse`;
    }

    return `${cleanBaseUrl}/api/item-warehouse`;
  }

  getByItemCode(
    itemCode: string,
    active: 'Y' | 'N' = 'Y'
  ): Observable<ItemWarehouseBalanceItem[]> {
    let params = new HttpParams();
    params = params.set('active', active);

    return this.http
      .get<ApiResult<ItemWarehouseBalanceItem[]> | ItemWarehouseBalanceItem[]>(
        `${this.apiBaseUrl}/by-item-code/${encodeURIComponent(itemCode)}`,
        { params }
      )
      .pipe(
        map((res) => {
          // Supports direct array response.
          if (Array.isArray(res)) {
            return res;
          }

          // Supports wrapped response: { success, message, data }
          if (res?.success === true) {
            return res.data || [];
          }

          throw new Error(res?.message || 'Failed to load warehouse balance.');
        }),
        catchError((err) => {
          console.error('Item warehouse get by item code error:', err);

          return throwError(() => {
            if (err?.status === 0) {
              return new Error(
                'Cannot connect to Item Warehouse API. Please check if backend is running on http://localhost:51033.'
              );
            }

            if (err?.status === 404) {
              return new Error(
                'Item Warehouse API endpoint not found. Please check route api/item-warehouse/by-item-code/{itemCode}.'
              );
            }

            if (err?.status === 500) {
              return new Error(
                err?.error?.message ||
                err?.error?.error ||
                'API server error while loading warehouse balance.'
              );
            }

            return new Error(
              err?.error?.message ||
              err?.message ||
              'Failed to load warehouse balance.'
            );
          });
        })
      );
  }
}