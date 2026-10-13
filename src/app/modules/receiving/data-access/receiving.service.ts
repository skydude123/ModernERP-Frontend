import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

import {
  ApiResponse,
  BranchLookup,
  OpenPoLineLookup,
  PagedResult,
  ReceivingDocumentApi,
  ReceivingGetResponse,
  ReceivingListApiItem,
  ReceivingListItem,
  ReceivingListQuery,
  ReceivingReverseRequest,
  ReceivingSaveRequest,
  ReceivingSaveResponse,
  ReceivingStatus,
  ReceivingType,
  SupplierLookup,
  WarehouseLookup,
  ReceivingItemLookup
} from '../models/receiving.models';

@Injectable({
  providedIn: 'root',
})
export class ReceivingService {
  private readonly http = inject(HttpClient);

  private readonly apiBaseUrl: string;

  constructor(
    @Inject(API_BASE_URL)
    apiBaseUrl: string,
  ) {
    this.apiBaseUrl = this.buildReceivingBaseUrl(apiBaseUrl);
  }

  /*
  |--------------------------------------------------------------------------
  | Status name
  |--------------------------------------------------------------------------
  |
  | N = Draft
  | U = Approved / Posted
  | C = Cancelled
  |
  */

  private getStatusName(status: ReceivingStatus): string {
    switch (status) {
      case 'N':
        return 'DRAFT';

      case 'U':
        return 'APPROVED';

      case 'C':
        return 'CANCELLED';

      default:
        return '';
    }
  }

  /*
  |--------------------------------------------------------------------------
  | GET: api/receiving
  |--------------------------------------------------------------------------
  */

  getListPage(
    query: ReceivingListQuery,
  ): Observable<PagedResult<ReceivingListItem>> {
    let params = new HttpParams()
      .set('skip', String(query.skip ?? 0))
      .set('take', String(query.take ?? 50))
      .set('userId', String(query.userId || '').trim());

    const status = String(query.status || '')
      .trim()
      .toUpperCase();

    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }

    const transType = String(query.transType || '')
      .trim()
      .toUpperCase();

    if (transType && transType !== 'ALL') {
      params = params.set('transType', transType);
    }

    if (query.fromDate) {
      params = params.set('dateFrom', query.fromDate);
    }

    if (query.toDate) {
      params = params.set('dateTo', query.toDate);
    }

    if (query.branchname) {
      params = params.set('branchname', query.branchname.trim());
    }

    if (query.whseCode) {
      params = params.set('whseCode', query.whseCode.trim());
    }

    if (query.suppCode) {
      params = params.set('suppCode', query.suppCode.trim());
    }

    if (query.search) {
      params = params.set('search', query.search.trim());
    }

    if (query.sortField) {
      params = params.set('sortField', query.sortField.trim());
    }

    if (query.sortDir) {
      params = params.set('sortDir', query.sortDir.trim());
    }

    return this.http
      .get<ApiResponse<PagedResult<ReceivingListApiItem>>>(this.apiBaseUrl, {
        params,
      })
      .pipe(
        map((response) => {
          const result = response.data;

          const total = Number(result?.total ?? 0);

          const rows: ReceivingListItem[] = (result?.data ?? []).map((item) => {
            const statusCode = this.normalizeStatus(item.status);

            const receivingType = this.normalizeReceivingType(item.transType);

            return {
              rrNo: String(item.rrNo ?? '').trim(),

              rrDate: item.rrDate ?? '',

              poNo: String(item.poNo ?? '').trim(),

              status: statusCode,

              statusName: this.getStatusName(statusCode),

              transType: receivingType,

              branchname: String(item.branchname ?? '').trim(),

              whseCode: String(item.whseCode ?? '').trim(),

              whseDesc: String(item.whseDesc ?? item.whseCode ?? '').trim(),

              reference: String(item.reference ?? '').trim(),

              suppCode: String(item.suppCode ?? '').trim(),

              suppName: String(item.suppName ?? '').trim(),

              lineCount: Number(item.noOfLines ?? 0),

              totalQty: Number(item.totalQty ?? 0),

              totalAmount: Number(item.totalAmount ?? 0),

              userId: String(item.userId ?? '').trim(),

              remarks: String(item.remarks ?? '').trim(),

              totalCount: total,
            };
          });

          return {
            data: rows,
            total,
          };
        }),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | GET: api/receiving/{rrNo}
  |--------------------------------------------------------------------------
  */

  getByNo(rrNo: string): Observable<ReceivingGetResponse> {
    const cleanRrNo = String(rrNo || '').trim();

    return this.http
      .get<
        ApiResponse<ReceivingDocumentApi | null>
      >(`${this.apiBaseUrl}/${encodeURIComponent(cleanRrNo)}`)
      .pipe(
        map((response) => {
          const document = response.data;

          if (!document) {
            return {
              header: null,
              details: [],
            };
          }

          return {
            header: {
              rrNo: String(document.rrNo ?? '').trim(),

              rrDate: document.rrDate ?? '',

              transType: this.normalizeReceivingType(document.transType),

              status: this.normalizeStatus(document.status),

              branchname: String(document.branchname ?? '').trim(),

              whseCode: String(document.whseCode ?? '').trim(),

              whseDesc: null,

              suppCode: String(document.suppCode ?? '').trim(),

              suppName: String(document.suppName ?? '').trim(),

              reference: document.reference
                ? String(document.reference).trim()
                : null,

              remarks: document.remarks
                ? String(document.remarks).trim()
                : null,

              userId: document.userId ? String(document.userId).trim() : null,

              rowVersion: String(document.rowVersion ?? ''),
            },

            details: (document.details ?? []).map((detail, index) => ({
              rrSeq: Number(detail.rrLineNo ?? detail.rrSeq ?? index + 1),

              poNo: detail.poNo ? String(detail.poNo).trim() : null,

              poLineNo: detail.poLineNo ?? null,

              poSeq: detail.rrSeq ?? null,

              itemCode: String(detail.itemCode ?? '').trim(),

              itemDesc: String(detail.itemDesc ?? '').trim(),

              qtyRcv: Number(detail.qtyRcv ?? 0),

              poUm: String(detail.poUm ?? '').trim(),

              baseUm: String(detail.baseUm ?? '').trim(),

              poConvFactor: Number(detail.poConvFactor ?? 1),

              unitPrice: Number(detail.unitPrice ?? 0),

              orderedQty: null,

              cumulativeReceivedQty: null,

              openQty: null,
            })),
          };
        }),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | GET: api/receiving/lookups/suppliers
  |--------------------------------------------------------------------------
  */

  getSuppliers(search = ''): Observable<SupplierLookup[]> {
    return this.http
      .get<ApiResponse<SupplierLookup[]>>(
        `${this.apiBaseUrl}/lookups/suppliers`,
        {
          params: this.createSearchParams(search),
        },
      )
      .pipe(map((response) => response.data ?? []));
  }

  /*
  |--------------------------------------------------------------------------
  | GET: api/receiving/lookups/branches
  |--------------------------------------------------------------------------
  */

  getBranches(search = ''): Observable<BranchLookup[]> {
    return this.http
      .get<ApiResponse<BranchLookup[]>>(`${this.apiBaseUrl}/lookups/branches`, {
        params: this.createSearchParams(search),
      })
      .pipe(map((response) => response.data ?? []));
  }

  /*
  |--------------------------------------------------------------------------
  | GET: api/receiving/lookups/warehouses
  |--------------------------------------------------------------------------
  */

  getWarehouses(search = ''): Observable<WarehouseLookup[]> {
    return this.http
      .get<ApiResponse<WarehouseLookup[]>>(
        `${this.apiBaseUrl}/lookups/warehouses`,
        {
          params: this.createSearchParams(search),
        },
      )
      .pipe(map((response) => response.data ?? []));
  }

  /*
|--------------------------------------------------------------------------
| GET: api/receiving/lookups/items
|--------------------------------------------------------------------------
*/

  getItems(search = ''): Observable<ReceivingItemLookup[]> {
    return this.http
      .get<ApiResponse<ReceivingItemLookup[]>>(
        `${this.apiBaseUrl}/lookups/items`,
        {
          params: this.createSearchParams(search),
        },
      )
      .pipe(map((response) => response.data ?? []));
  }

  /*
  |--------------------------------------------------------------------------
  | GET: api/receiving/lookups/open-po-lines
  |--------------------------------------------------------------------------
  */

  getOpenPoLines(
    suppCode: string | null,
    search = '',
  ): Observable<OpenPoLineLookup[]> {
    let params = this.createSearchParams(search)
      .set('skip', '0')
      .set('take', '200');

    const cleanSuppCode = String(suppCode || '').trim();

    if (cleanSuppCode) {
      params = params.set('suppCode', cleanSuppCode);
    }

    return this.http
      .get<ApiResponse<PagedResult<OpenPoLineLookup>>>(
        `${this.apiBaseUrl}/lookups/open-po-lines`,
        {
          params,
        },
      )
      .pipe(map((response) => response.data?.data ?? []));
  }

  /*
  |--------------------------------------------------------------------------
  | POST: api/receiving/upsert
  |--------------------------------------------------------------------------
  |
  | N = Save Draft
  | U = Approve / Post
  |
  */

  upsert(request: ReceivingSaveRequest): Observable<ReceivingSaveResponse> {
    const payload = {
      rrNo: request.rrNo,

      rrDate: request.rrDate,

      branchname: request.branchname,

      whseCode: request.whseCode,

      reference: request.reference ?? '',

      suppCode: request.suppCode || null,

      targetStatus: request.targetStatus,

      transType: request.transType,

      userId: request.userId,

      remarks: request.remarks,

      expectedRowVersion: request.rowVersion || null,

      details: request.details.map((detail, index) => ({
        rrSeq: Number(detail.rrSeq ?? index + 1),

        poLineNo: detail.poLineNo ?? null,

        poNo: detail.poNo ?? null,

        itemCode: detail.itemCode,

        itemDesc: detail.itemDesc ?? '',

        qtyRcv: Number(detail.qtyRcv || 0),

        baseUm: detail.baseUm ?? '',

        poUm: detail.poUm ?? '',

        poConvFactor: Number(detail.poConvFactor || 1),

        unitPrice: Number(detail.unitPrice || 0),
      })),
    };

    return this.http
      .post<
        ApiResponse<ReceivingSaveResponse>
      >(`${this.apiBaseUrl}/upsert`, payload)
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(
              response.error ||
              response.message ||
              'Failed to save receiving transaction.',
            );
          }

          return {
            ...response.data,

            status: request.targetStatus,
          };
        }),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | POST: api/receiving/{rrNo}/reverse
  |--------------------------------------------------------------------------
  |
  | Endpoint name remains /reverse, but its actual behavior is:
  |
  | U → N
  |
  | The transaction is unposted and becomes editable again.
  |
  */

  reverse(
    rrNo: string,
    request: ReceivingReverseRequest,
  ): Observable<ReceivingSaveResponse> {
    const cleanRrNo = String(rrNo || '').trim();

    if (!cleanRrNo) {
      throw new Error('Receiving number is required.');
    }

    const payload = {
      userId: request.userId,

      reason: request.reason,

      expectedRowVersion: request.rowVersion,
    };

    return this.http
      .post<
        ApiResponse<ReceivingSaveResponse>
      >(`${this.apiBaseUrl}/${encodeURIComponent(cleanRrNo)}/reverse`, payload)
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(
              response.error ||
              response.message ||
              'Failed to unpost receiving transaction.',
            );
          }

          return {
            ...response.data,

            status: this.normalizeStatus(response.data.status),
          };
        }),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Normalize receiving status
  |--------------------------------------------------------------------------
  |
  | Only these statuses are supported:
  |
  | N = Draft
  | U = Approved / Posted
  | C = Cancelled
  |
  */

  private normalizeStatus(value: unknown): ReceivingStatus {
    const status = String(value ?? '')
      .trim()
      .toUpperCase();

    switch (status) {
      case 'U':
        return 'U';

      case 'C':
        return 'C';

      case 'N':
      default:
        return 'N';
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Normalize receiving type
  |--------------------------------------------------------------------------
  */

  private normalizeReceivingType(value: unknown): ReceivingType {
    const receivingType = String(value ?? '')
      .trim()
      .toUpperCase();

    return receivingType === 'RWP' ? 'RWP' : 'RPO';
  }

  /*
  |--------------------------------------------------------------------------
  | API base URL
  |--------------------------------------------------------------------------
  */

  private buildReceivingBaseUrl(apiBaseUrl: string): string {
    let cleanBaseUrl = String(apiBaseUrl || '')
      .trim()
      .replace(/\/+$/, '');

    cleanBaseUrl = cleanBaseUrl
      .replace(/\/api\/accounting\/receivings$/i, '')
      .replace(/\/api\/receiving$/i, '');

    /*
     * Example:
     * http://localhost:51033/api
     */

    if (cleanBaseUrl.toLowerCase().endsWith('/api')) {
      return `${cleanBaseUrl}/receiving`;
    }

    /*
     * Example:
     * http://localhost:51033
     */

    return `${cleanBaseUrl}/api/receiving`;
  }

  /*
  |--------------------------------------------------------------------------
  | Search parameters
  |--------------------------------------------------------------------------
  */

  private createSearchParams(search: string): HttpParams {
    const cleanSearch = String(search || '').trim();

    if (!cleanSearch) {
      return new HttpParams();
    }

    return new HttpParams().set('search', cleanSearch);
  }
}
