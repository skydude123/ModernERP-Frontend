import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  ApiResponse,
  FifoPreview,
  IssueDocument,
  IssueQuery,
  IssueSaveRequest,
  IssueSaveResult,
  MaterialLookup,
  Paged,
  IssueListItem,
  SupplierLookup,
  WarehouseLookup,
  SoVerification,
  WorkCenterLookup,
} from '../models/material-issuance.models';

@Injectable({ providedIn: 'root' })
export class MaterialIssuanceService {
  private readonly http = inject(HttpClient);
  private readonly url: string;
  constructor(@Inject(API_BASE_URL) base: string) {
    this.url = `${base.replace(/\/+$/, '').replace(/\/api$/i, '')}/api/inventory/material-issuances`;
  }
  list(q: IssueQuery): Observable<Paged<IssueListItem>> {
    let p = new HttpParams()
      .set('skip', q.skip)
      .set('take', q.take)
      .set('status', q.status)
      .set('sourceType', q.sourceType)
      .set('userId', q.userId);
    if (q.dateFrom) p = p.set('dateFrom', q.dateFrom);
    if (q.dateTo) p = p.set('dateTo', q.dateTo);
    if (q.whseCode) p = p.set('whseCode', q.whseCode);
    if (q.search) p = p.set('search', q.search);
    return this.http
      .get<ApiResponse<Paged<IssueListItem>>>(this.url, { params: p })
      .pipe(map((x) => x.data));
  }
  get(issueNo: string) {
    return this.http
      .get<
        ApiResponse<IssueDocument>
      >(`${this.url}/${encodeURIComponent(issueNo)}`)
      .pipe(map((x) => x.data));
  }
  warehouses(search = '') {
    return this.lookup<WarehouseLookup>(
      'warehouses',
      new HttpParams().set('search', search),
    );
  }
  suppliers(search = '') {
    return this.lookup<SupplierLookup>(
      'suppliers',
      new HttpParams().set('search', search),
    );
  }

  verifySoNo(soNo: string): Observable<SoVerification[]> {
    const value = String(soNo ?? '').trim();

    if (!value) {
      return of([]);
    }

    return this.http
      .get<ApiResponse<SoVerification[]>>(
        `${this.url}/lookups/so-verify/${encodeURIComponent(value)}`,
      )
      .pipe(
        map((response) => response.data ?? []),
      );
  }

  materials(whseCode: string, search = '') {
    return this.lookup<MaterialLookup>(
      'available-materials',
      new HttpParams().set('whseCode', whseCode).set('search', search),
    );
  }
  fifo(whseCode: string, itemCode: string, baseQty: number) {
    return this.lookup<FifoPreview>(
      'fifo-preview',
      new HttpParams()
        .set('whseCode', whseCode)
        .set('itemCode', itemCode)
        .set('baseQty', baseQty),
    );
  }

  // upsert(body: IssueSaveRequest) {
  //   return this.http
  //     .post<ApiResponse<IssueSaveResult>>(`${this.url}/upsert`, body)
  //     .pipe(map((x) => x.data));
  // }

  /*  */

  upsert(
    body: IssueSaveRequest
  ): Observable<IssueSaveResult> {
    const endpoint = `${this.url}/upsert`;

    return this.http
      .post<ApiResponse<IssueSaveResult>>(
        endpoint,
        body
      )
      .pipe(
        map(response => {
          if (!response?.data) {
            throw new Error(
              response?.message ??
              'Invalid API response.'
            );
          }

          return response.data;
        })
      );
  }

  /*  */
  reverse(
    issueNo: string,
    body: { expectedRowVersion: string; reason: string; userId: string | null },
  ) {
    return this.http
      .post<
        ApiResponse<IssueSaveResult>
      >(`${this.url}/${encodeURIComponent(issueNo)}/reverse`, body)
      .pipe(map((x) => x.data));
  }
  private lookup<T>(name: string, params: HttpParams) {
    return this.http
      .get<ApiResponse<T[]>>(`${this.url}/lookups/${name}`, { params })
      .pipe(map((x) => x.data ?? []));
  }

  workCenters(search = '') {
    return this.lookup<WorkCenterLookup>(
      'work-centers',
      new HttpParams().set('search', search)
    );
  }
}
