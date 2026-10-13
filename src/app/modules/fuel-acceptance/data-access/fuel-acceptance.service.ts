import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';

import {
  inject,
  Injectable,
} from '@angular/core';

import {
  map,
  Observable,
} from 'rxjs';

import {
  API_BASE_URL,
} from '../../../core/tokens/api-base-url.token';

import {
  ApiResponse,
  FuelAcceptanceCommandResponse,
  FuelAcceptanceDocument,
  FuelAcceptanceListItem,
  FuelAcceptanceListQuery,
  FuelAcceptanceSaveRequest,
  FuelAcceptanceWorkflowRequest,
  FuelBranchLookup,
  FuelPoLineLookup,
  FuelSupplierLookup,
  FuelTaxSchemeLookup,
  FuelVpSource,
  PagedResult,
} from '../models/fuel-acceptance.models';


@Injectable({
  providedIn: 'root',
})
export class FuelAcceptanceService {
  private readonly http =
    inject(HttpClient);

  private readonly baseUrl =
    this.buildBaseUrl(
      inject(API_BASE_URL),
    );


  /* ============================================================
     LIST
     ============================================================ */

  getList(
    query: FuelAcceptanceListQuery,
  ): Observable<
    PagedResult<FuelAcceptanceListItem>
  > {
    let params =
      new HttpParams()
        .set(
          'status',
          query.status,
        )
        .set(
          'skip',
          query.skip,
        )
        .set(
          'take',
          query.take,
        )
        .set(
          'sortField',
          query.sortField,
        )
        .set(
          'sortDir',
          query.sortDir,
        );


    params =
      this.optional(
        params,
        'fromDate',
        query.fromDate,
      );


    params =
      this.optional(
        params,
        'toDate',
        query.toDate,
      );


    params =
      this.optional(
        params,
        'branchName',
        query.branchName,
      );


    params =
      this.optional(
        params,
        'search',
        query.search,
      );


    return this.http
      .get<
        ApiResponse<
          PagedResult<FuelAcceptanceListItem>
        >
      >(
        this.baseUrl,
        {
          params,
        },
      )
      .pipe(
        map(
          (response) =>
            this.unwrap(
              response,
              'Unable to load Fuel Acceptances.',
            ),
        ),
      );
  }


  /* ============================================================
     DOCUMENT
     ============================================================ */

  getDocument(
    fuelAcceptanceNo: string,
  ): Observable<FuelAcceptanceDocument> {
    return this.http
      .get<
        ApiResponse<FuelAcceptanceDocument>
      >(
        `${this.baseUrl}/${encodeURIComponent(
          fuelAcceptanceNo,
        )}`,
      )
      .pipe(
        map(
          (response) =>
            this.unwrap(
              response,
              'Unable to load Fuel Acceptance.',
            ),
        ),
      );
  }


  /* ============================================================
     NEW:
     OPEN PO LINES BY SUPPLIER

     API:
     /lookups/open-po-lines
       ?suppCode=XXX
       &excludeAcceptanceNo=XXX
       &search=XXX
     ============================================================ */

  getOpenPoLines(
    suppCode: string,
    excludeAcceptanceNo?: string | null,
    search?: string | null,
  ): Observable<FuelPoLineLookup[]> {
    let params =
      new HttpParams()
        .set(
          'suppCode',
          suppCode.trim(),
        );


    params =
      this.optional(
        params,
        'excludeAcceptanceNo',
        excludeAcceptanceNo,
      );


    params =
      this.optional(
        params,
        'search',
        search,
      );


    return this.http
      .get<
        ApiResponse<FuelPoLineLookup[]>
      >(
        `${this.baseUrl}/lookups/open-po-lines`,
        {
          params,
        },
      )
      .pipe(
        map(
          (response) =>
            this.unwrap(
              response,
              'Unable to load open Fuel PO lines.',
            ),
        ),
      );
  }


  /* ============================================================
     SUPPLIERS
     ============================================================ */

  getSuppliers(
    search = '',
  ): Observable<FuelSupplierLookup[]> {
    return this.lookup<
      FuelSupplierLookup
    >(
      'suppliers',
      search,
    );
  }


  /* ============================================================
     BRANCHES
     ============================================================ */

  getBranches(
    search = '',
  ): Observable<FuelBranchLookup[]> {
    return this.lookup<
      FuelBranchLookup
    >(
      'branches',
      search,
    );
  }


  /* ============================================================
     TAX SCHEMES
     ============================================================ */

  getTaxSchemes():
    Observable<FuelTaxSchemeLookup[]> {
    return this.http
      .get<
        ApiResponse<
          FuelTaxSchemeLookup[]
        >
      >(
        `${this.baseUrl}/lookups/tax-schemes`,
      )
      .pipe(
        map(
          (response) =>
            this.unwrap(
              response,
              'Unable to load Tax Schemes.',
            ),
        ),
      );
  }


  /* ============================================================
     OPEN FOR VP
     ============================================================ */

  getOpenForVp(
    supplierCode?: string,
    branchName?: string,
    search?: string,
  ): Observable<FuelVpSource[]> {
    let params =
      new HttpParams();


    params =
      this.optional(
        params,
        'supplierCode',
        supplierCode,
      );


    params =
      this.optional(
        params,
        'branchName',
        branchName,
      );


    params =
      this.optional(
        params,
        'search',
        search,
      );


    return this.http
      .get<
        ApiResponse<FuelVpSource[]>
      >(
        `${this.baseUrl}/open-for-vp`,
        {
          params,
        },
      )
      .pipe(
        map(
          (response) =>
            this.unwrap(
              response,
              'Unable to load Fuel Acceptance VP sources.',
            ),
        ),
      );
  }


  /* ============================================================
     SAVE
     ============================================================ */

  save(
    request: FuelAcceptanceSaveRequest,
  ): Observable<FuelAcceptanceCommandResponse> {
    return this.http
      .post<
        ApiResponse<
          FuelAcceptanceCommandResponse
        >
      >(
        this.baseUrl,
        request,
      )
      .pipe(
        map(
          (response) =>
            this.unwrap(
              response,
              'Unable to save Fuel Acceptance.',
            ),
        ),
      );
  }


  /* ============================================================
     POST
     ============================================================ */

  post(
    fuelAcceptanceNo: string,
    request: FuelAcceptanceWorkflowRequest,
  ): Observable<FuelAcceptanceCommandResponse> {
    return this.command(
      fuelAcceptanceNo,
      'post',
      request,
    );
  }


  /* ============================================================
     REVERSE
     ============================================================ */

  reverse(
    fuelAcceptanceNo: string,
    request: FuelAcceptanceWorkflowRequest,
  ): Observable<FuelAcceptanceCommandResponse> {
    return this.command(
      fuelAcceptanceNo,
      'reverse',
      request,
    );
  }


  /* ============================================================
     WORKFLOW COMMAND
     ============================================================ */

  private command(
    fuelAcceptanceNo: string,
    action: 'post' | 'reverse',
    request: FuelAcceptanceWorkflowRequest,
  ): Observable<FuelAcceptanceCommandResponse> {
    return this.http
      .post<
        ApiResponse<
          FuelAcceptanceCommandResponse
        >
      >(
        `${this.baseUrl}/${encodeURIComponent(
          fuelAcceptanceNo,
        )}/${action}`,
        request,
      )
      .pipe(
        map(
          (response) =>
            this.unwrap(
              response,
              `Unable to ${action} Fuel Acceptance.`,
            ),
        ),
      );
  }


  /* ============================================================
     GENERIC LOOKUP
     ============================================================ */

  private lookup<T>(
    name: string,
    search: string,
  ): Observable<T[]> {
    const params =
      this.optional(
        new HttpParams(),
        'search',
        search,
      );


    return this.http
      .get<ApiResponse<T[]>>(
        `${this.baseUrl}/lookups/${name}`,
        {
          params,
        },
      )
      .pipe(
        map(
          (response) =>
            this.unwrap(
              response,
              `Unable to load ${name}.`,
            ),
        ),
      );
  }


  /* ============================================================
     UNWRAP
     ============================================================ */

  private unwrap<T>(
    response: ApiResponse<T>,
    fallback: string,
  ): T {
    if (
      !response?.success ||
      response.data == null
    ) {
      throw new Error(
        response?.error ||
        response?.message ||
        fallback,
      );
    }


    return response.data;
  }


  /* ============================================================
     OPTIONAL PARAM
     ============================================================ */

  private optional(
    params: HttpParams,
    key: string,
    value:
      | string
      | null
      | undefined,
  ): HttpParams {
    const cleaned =
      String(
        value ?? '',
      ).trim();


    return cleaned
      ? params.set(
        key,
        cleaned,
      )
      : params;
  }


  /* ============================================================
     BASE URL
     ============================================================ */

  private buildBaseUrl(
    apiBaseUrl: string,
  ): string {
    const root =
      String(
        apiBaseUrl ?? '',
      )
        .trim()
        .replace(
          /\/+$/,
          '',
        );


    return root
      .toLowerCase()
      .endsWith('/api')
      ? `${root}/fuel-acceptances`
      : `${root}/api/fuel-acceptances`;
  }
}