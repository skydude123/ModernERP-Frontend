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
  PagedResult,
  ServiceAcceptanceCommandResponse,
  ServiceAcceptanceDocument,
  ServiceAcceptanceListItem,
  ServiceAcceptanceListQuery,
  ServiceAcceptanceSaveRequest,
  ServiceAcceptanceWorkflowRequest,
  ServiceBranchLookup,
  ServiceOpenPoLineLookup,
  ServiceSupplierLookup,
  ServiceTaxSchemeLookup,
  ServiceVpSource,
} from '../models/service-acceptance.models';


@Injectable({
  providedIn: 'root',
})
export class ServiceAcceptanceService {
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
    query:
      ServiceAcceptanceListQuery,
  ): Observable<
    PagedResult<
      ServiceAcceptanceListItem
    >
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
          PagedResult<
            ServiceAcceptanceListItem
          >
        >
      >(
        this.baseUrl,
        {
          params,
        },
      )
      .pipe(
        map(
          (
            response,
          ) =>
            this.unwrap(
              response,
              'Unable to load Service Acceptances.',
            ),
        ),
      );
  }


  /* ============================================================
     DOCUMENT
     ============================================================ */

  getDocument(
    documentNo:
      string,
  ): Observable<
    ServiceAcceptanceDocument
  > {
    return this.http
      .get<
        ApiResponse<
          ServiceAcceptanceDocument
        >
      >(
        `${this.baseUrl}/${encodeURIComponent(
          documentNo,
        )}`,
      )
      .pipe(
        map(
          (
            response,
          ) =>
            this.unwrap(
              response,
              'Unable to load Service Acceptance.',
            ),
        ),
      );
  }


  /* ============================================================
     OPEN PO LINES BY SUPPLIER
     ============================================================ */

  getOpenPoLines(
    suppCode:
      string,

    branchName?:
      string |
      null,

    excludeAcceptanceNo?:
      string |
      null,

    search?:
      string |
      null,
  ): Observable<
    ServiceOpenPoLineLookup[]
  > {
    let params =
      new HttpParams()
        .set(
          'suppCode',
          suppCode.trim(),
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
        ApiResponse<
          ServiceOpenPoLineLookup[]
        >
      >(
        `${this.baseUrl}/lookups/open-po-lines`,
        {
          params,
        },
      )
      .pipe(
        map(
          (
            response,
          ) =>
            this.unwrap(
              response,
              'Unable to load open Service PO lines.',
            ),
        ),
      );
  }


  /* ============================================================
     SUPPLIERS
     ============================================================ */

  getSuppliers(
    search =
      '',
  ): Observable<
    ServiceSupplierLookup[]
  > {
    const params =
      this.optional(
        new HttpParams(),
        'search',
        search,
      );


    return this.http
      .get<
        ApiResponse<
          ServiceSupplierLookup[]
        >
      >(
        `${this.baseUrl}/lookups/suppliers`,
        {
          params,
        },
      )
      .pipe(
        map(
          (
            response,
          ) =>
            this.unwrap(
              response,
              'Unable to load suppliers.',
            ),
        ),
      );
  }


  /* ============================================================
     BRANCH
     ============================================================ */

  getBranches():
    Observable<
      ServiceBranchLookup[]
    > {
    return this.http
      .get<
        ApiResponse<
          ServiceBranchLookup[]
        >
      >(
        `${this.baseUrl}/lookups/branches`,
      )
      .pipe(
        map(
          (
            response,
          ) =>
            this.unwrap(
              response,
              'Unable to load branches.',
            ),
        ),
      );
  }


  /* ============================================================
     TAX
     ============================================================ */

  getTaxSchemes():
    Observable<
      ServiceTaxSchemeLookup[]
    > {
    return this.http
      .get<
        ApiResponse<
          ServiceTaxSchemeLookup[]
        >
      >(
        `${this.baseUrl}/lookups/tax-schemes`,
      )
      .pipe(
        map(
          (
            response,
          ) =>
            this.unwrap(
              response,
              'Unable to load Tax Schemes.',
            ),
        ),
      );
  }


  /* ============================================================
     VP
     ============================================================ */

  getVpSources(
    supplierCode?:
      string,

    branchName?:
      string,

    search?:
      string,
  ): Observable<
    ServiceVpSource[]
  > {
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
        ApiResponse<
          ServiceVpSource[]
        >
      >(
        `${this.baseUrl}/vp-sources`,
        {
          params,
        },
      )
      .pipe(
        map(
          (
            response,
          ) =>
            this.unwrap(
              response,
              'Unable to load VP sources.',
            ),
        ),
      );
  }


  /* ============================================================
     SAVE
     ============================================================ */

  save(
    request:
      ServiceAcceptanceSaveRequest,
  ): Observable<
    ServiceAcceptanceCommandResponse
  > {
    return this.http
      .post<
        ApiResponse<
          ServiceAcceptanceCommandResponse
        >
      >(
        this.baseUrl,
        request,
      )
      .pipe(
        map(
          (
            response,
          ) =>
            this.unwrap(
              response,
              'Unable to save Service Acceptance.',
            ),
        ),
      );
  }


  /* ============================================================
     WORKFLOW
     ============================================================ */

  transition(
    documentNo:
      string,

    action:
      'accept'
      | 'post'
      | 'reverse',

    request:
      ServiceAcceptanceWorkflowRequest,
  ): Observable<
    ServiceAcceptanceCommandResponse
  > {
    return this.http
      .post<
        ApiResponse<
          ServiceAcceptanceCommandResponse
        >
      >(
        `${this.baseUrl}/${encodeURIComponent(
          documentNo,
        )}/${action}`,
        request,
      )
      .pipe(
        map(
          (
            response,
          ) =>
            this.unwrap(
              response,
              `Unable to ${action} Service Acceptance.`,
            ),
        ),
      );
  }


  /* ============================================================
     UNWRAP
     ============================================================ */

  private unwrap<T>(
    response:
      ApiResponse<T>,

    fallback:
      string,
  ): T {
    if (
      !response?.success

      ||

      response.data ==
      null
    ) {
      throw new Error(
        response?.error
        ||
        response?.message
        ||
        fallback,
      );
    }


    return response.data;
  }


  /* ============================================================
     OPTIONAL PARAM
     ============================================================ */

  private optional(
    params:
      HttpParams,

    key:
      string,

    value:
      unknown,
  ): HttpParams {
    const clean =
      String(
        value ??
        '',
      ).trim();


    return clean
      ? params.set(
          key,
          clean,
        )
      : params;
  }


  private buildBaseUrl(
    value:
      string,
  ): string {
    const root =
      String(
        value ??
        '',
      )
        .trim()
        .replace(
          /\/+$/,
          '',
        )
        .replace(
          /\/api\/service-acceptances$/i,
          '',
        );


    return root
      .toLowerCase()
      .endsWith('/api')
      ? `${root}/service-acceptances`
      : `${root}/api/service-acceptances`;
  }
}