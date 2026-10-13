import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import {
  ApiResponse,
  SupplierCommandResult,
  SupplierCreateRequest,
  SupplierDetail,
  SupplierListItem,
  SupplierListQuery,
  SupplierLookup,
  SupplierPagedResult,
  SupplierStatusRequest,
  SupplierUpdateRequest
} from '../models/supplier.models';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl: string;

  constructor(@Inject(API_BASE_URL) apiBaseUrl: string) {
    this.baseUrl = this.buildBaseUrl(apiBaseUrl);
  }

  getList(query: SupplierListQuery): Observable<SupplierPagedResult<SupplierListItem>> {
    let params = new HttpParams()
      .set('activeFlag', query.activeFlag)
      .set('skip', String(query.skip))
      .set('take', String(query.take))
      .set('sortField', query.sortField)
      .set('sortDirection', query.sortDirection);

    params = this.appendOptional(params, 'search', query.search);
    params = this.appendOptional(params, 'supplierGroupCode', query.supplierGroupCode);
    params = this.appendOptional(params, 'termsCode', query.termsCode);
    params = this.appendOptional(params, 'currencyCode', query.currencyCode);
    params = this.appendOptional(params, 'taxProfileCode', query.taxProfileCode);

    return this.http
      .get<ApiResponse<SupplierPagedResult<SupplierListItem>>>(this.baseUrl, {
        params,
        withCredentials: true
      })
      .pipe(map(response => this.unwrap(response, 'Unable to load suppliers.')));
  }

  getByCode(supplierCode: string): Observable<SupplierDetail> {
    return this.http
      .get<ApiResponse<SupplierDetail>>(`${this.baseUrl}/${encodeURIComponent(supplierCode.trim())}`, {
        withCredentials: true
      })
      .pipe(map(response => this.unwrap(response, 'Unable to load the supplier.')));
  }

  getGroups(search = ''): Observable<SupplierLookup[]> {
    return this.getLookup('groups', search);
  }

  getTerms(search = ''): Observable<SupplierLookup[]> {
    return this.getLookup('terms', search);
  }

  getCurrencies(search = ''): Observable<SupplierLookup[]> {
    return this.getLookup('currencies', search);
  }

  getTaxProfiles(search = ''): Observable<SupplierLookup[]> {
    return this.getLookup('tax-profiles', search);
  }

  create(request: SupplierCreateRequest): Observable<SupplierCommandResult> {
    return this.http
      .post<ApiResponse<SupplierCommandResult>>(this.baseUrl, request, {
        withCredentials: true
      })
      .pipe(map(response => this.unwrap(response, 'Unable to create the supplier.')));
  }

  update(supplierCode: string, request: SupplierUpdateRequest): Observable<SupplierCommandResult> {
    return this.http
      .put<ApiResponse<SupplierCommandResult>>(
        `${this.baseUrl}/${encodeURIComponent(supplierCode.trim())}`,
        request,
        { withCredentials: true }
      )
      .pipe(map(response => this.unwrap(response, 'Unable to update the supplier.')));
  }

  activate(supplierCode: string, request: SupplierStatusRequest): Observable<SupplierCommandResult> {
    return this.changeStatus(supplierCode, 'activate', request);
  }

  deactivate(supplierCode: string, request: SupplierStatusRequest): Observable<SupplierCommandResult> {
    return this.changeStatus(supplierCode, 'deactivate', request);
  }

  getErrorMessage(error: unknown): string {
    const candidate = error as {
      error?: unknown;
      message?: string;
      statusText?: string;
    };

    if (typeof candidate?.error === 'string' && candidate.error.trim()) {
      return candidate.error;
    }

    if (candidate?.error && typeof candidate.error === 'object') {
      const problem = candidate.error as {
        detail?: string;
        message?: string;
        title?: string;
        errors?: Record<string, string[]>;
      };
      const validationMessage = problem.errors
        ? Object.values(problem.errors).flat().find(message => !!message)
        : undefined;

      return validationMessage || problem.detail || problem.message || problem.title || 'The request failed.';
    }

    return candidate?.message || candidate?.statusText || 'The request failed.';
  }

  private getLookup(type: string, search: string): Observable<SupplierLookup[]> {
    const cleanSearch = search.trim();
    const params = cleanSearch ? new HttpParams().set('search', cleanSearch) : new HttpParams();

    return this.http
      .get<ApiResponse<SupplierLookup[]>>(`${this.baseUrl}/lookups/${type}`, {
        params,
        withCredentials: true
      })
      .pipe(map(response => this.unwrap(response, 'Unable to load supplier lookups.')));
  }

  private changeStatus(
    supplierCode: string,
    action: 'activate' | 'deactivate',
    request: SupplierStatusRequest
  ): Observable<SupplierCommandResult> {
    return this.http
      .post<ApiResponse<SupplierCommandResult>>(
        `${this.baseUrl}/${encodeURIComponent(supplierCode.trim())}/${action}`,
        request,
        { withCredentials: true }
      )
      .pipe(map(response => this.unwrap(response, `Unable to ${action} the supplier.`)));
  }

  private unwrap<T>(response: ApiResponse<T>, fallback: string): T {
    if (!response.success || response.data === null || response.data === undefined) {
      throw new Error(response.error || response.message || fallback);
    }

    return response.data;
  }

  private appendOptional(params: HttpParams, name: string, value: string | null): HttpParams {
    const cleanValue = value?.trim();
    return cleanValue ? params.set(name, cleanValue) : params;
  }

  private buildBaseUrl(apiBaseUrl: string): string {
    const cleanBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');
    return cleanBaseUrl.toLowerCase().endsWith('/api')
      ? `${cleanBaseUrl}/master-data/suppliers`
      : `${cleanBaseUrl}/api/master-data/suppliers`;
  }
}
