import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  PagedPurchaseOrderReport,
  PurchaseOrderReportQuery,
  SupplierLookup,
} from './purchase-order-report.model';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderReportService {
  private readonly baseUrl: string;
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) apiBaseUrl: string,
  ) {
    const base = String(apiBaseUrl || '').replace(/\/+$/, '');
    this.baseUrl = base.endsWith('/api')
      ? `${base}/purchase-order-reports`
      : `${base}/api/purchase-order-reports`;
  }
  query(query: PurchaseOrderReportQuery): Observable<PagedPurchaseOrderReport> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== '')
        params = params.set(key, String(value));
    });
    return this.http.get<PagedPurchaseOrderReport>(this.baseUrl, { params });
  }
  suppliers(): Observable<SupplierLookup[]> {
    const poUrl = this.baseUrl.replace(
      /\/purchase-order-reports$/,
      '/purchase-orders',
    );
    return this.http.get<SupplierLookup[]>(`${poUrl}/lookups/suppliers`);
  }
}
