import {
  HttpClient,
  HttpErrorResponse,
  HttpParams
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

import {
  ApiResponse,
  AssetHistory,
  CommandRequest,
  CommandResult,
  DepreciationLine,
  DepreciationPreview,
  DepreciationRun,
  DepreciationRunListItem,
  DepreciationRunQuery,
  Lookup,
  PagedResult,
  PreviewRequest,
  ReverseRequest,
  SaveRequest
} from '../models/depreciation.models';

@Injectable({
  providedIn: 'root'
})
export class DepreciationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = this.url(inject(API_BASE_URL));

  query(
    query: DepreciationRunQuery
  ): Observable<PagedResult<DepreciationRunListItem>> {
    let params = new HttpParams()
      .set('status', query.status)
      .set('skip', query.skip)
      .set('take', query.take)
      .set('sortField', query.sortField)
      .set('sortDir', query.sortDir);

    const optionalParams: Record<string, string | null | undefined> = {
      periodFrom: query.periodFrom,
      periodTo: query.periodTo,
      runDateFrom: query.runDateFrom,
      runDateTo: query.runDateTo,
      branchCode: query.branchCode,
      assetCategoryCode: query.assetCategoryCode,
      methodCode: query.methodCode,
      search: query.search
    };

    for (const [key, value] of Object.entries(optionalParams)) {
      if (value) {
        params = params.set(key, value);
      }
    }

    return this.unwrap(
      this.http.get<
        ApiResponse<PagedResult<DepreciationRunListItem>>
      >(this.baseUrl, { params })
    );
  }

  get(depRunNo: string): Observable<DepreciationRun> {
    return this.unwrap(
      this.http.get<ApiResponse<DepreciationRun>>(
        `${this.baseUrl}/${encodeURIComponent(depRunNo)}`
      )
    );
  }

  preview(request: PreviewRequest): Observable<DepreciationPreview> {
    return this.unwrap(
      this.http.post<ApiResponse<DepreciationPreview>>(
        `${this.baseUrl}/preview`,
        request
      )
    );
  }

  create(request: SaveRequest): Observable<CommandResult> {
    return this.command(
      this.http.post<ApiResponse<CommandResult>>(
        this.baseUrl,
        request
      )
    );
  }

  update(
    depRunNo: string,
    request: SaveRequest
  ): Observable<CommandResult> {
    return this.command(
      this.http.put<ApiResponse<CommandResult>>(
        `${this.baseUrl}/${encodeURIComponent(depRunNo)}`,
        request
      )
    );
  }

  delete(
    depRunNo: string,
    request: CommandRequest
  ): Observable<CommandResult> {
    return this.command(
      this.http.delete<ApiResponse<CommandResult>>(
        `${this.baseUrl}/${encodeURIComponent(depRunNo)}`,
        {
          body: request
        }
      )
    );
  }

  transition(
    depRunNo: string,
    action: string,
    request: CommandRequest
  ): Observable<CommandResult> {
    const normalizedAction = action
      .trim()
      .toLowerCase();

    return this.command(
      this.http.post<ApiResponse<CommandResult>>(
        `${this.baseUrl}/${encodeURIComponent(depRunNo)}/${normalizedAction}`,
        request
      )
    );
  }

  reverse(
    depRunNo: string,
    request: ReverseRequest
  ): Observable<CommandResult> {
    return this.transition(
      depRunNo,
      'reverse',
      request
    );
  }

  lookup(
    name: string,
    search = ''
  ): Observable<Lookup[]> {
    const params = search.trim()
      ? new HttpParams().set('search', search.trim())
      : undefined;

    return this.unwrap(
      this.http.get<ApiResponse<Lookup[]>>(
        `${this.baseUrl}/lookups/${name}`,
        { params }
      )
    );
  }

  eligible(
    request: PreviewRequest
  ): Observable<DepreciationLine[]> {
    let params = new HttpParams()
      .set('periodKey', request.periodKey)
      .set('convention', request.convention)
      .set(
        'includeZeroAmount',
        String(request.includeZeroAmount)
      );

    if (request.branchCode) {
      params = params.set(
        'branchCode',
        request.branchCode
      );
    }

    if (request.assetCategoryCode) {
      params = params.set(
        'assetCategoryCode',
        request.assetCategoryCode
      );
    }

    if (request.methodCode) {
      params = params.set(
        'methodCode',
        request.methodCode
      );
    }

    return this.unwrap(
      this.http.get<ApiResponse<DepreciationLine[]>>(
        `${this.baseUrl}/eligible-assets`,
        { params }
      )
    );
  }

  history(assetId: number): Observable<AssetHistory[]> {
    return this.unwrap(
      this.http.get<ApiResponse<AssetHistory[]>>(
        `${this.baseUrl}/assets/${assetId}/history`
      )
    );
  }

  private command(
    source: Observable<ApiResponse<CommandResult>>
  ): Observable<CommandResult> {
    return this.unwrap(source);
  }

  private unwrap<T>(
    source: Observable<ApiResponse<T>>
  ): Observable<T> {
    return source.pipe(
      map(response => {
        if (!response.success) {
          throw new Error(
            response.error?.trim() ||
            response.message?.trim() ||
            'The server rejected the request.'
          );
        }

        if (response.data == null) {
          throw new Error(
            response.message?.trim() ||
            'The server returned an empty response.'
          );
        }

        return response.data;
      }),

      // MODIFIED:
      // Kuhaon ang actual message gikan sa HTTP 400/409/500 response.
      catchError((error: unknown) => {
        return throwError(
          () => new Error(
            this.getErrorMessage(error)
          )
        );
      })
    );
  }

  // MODIFIED:
  // Handles ApiResponse, ProblemDetails, plain text,
  // SQL THROW messages, ug normal HttpErrorResponse.
  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;

      if (typeof body === 'string') {
        const text = body.trim();

        if (text) {
          try {
            const parsed = JSON.parse(text);
            const parsedMessage =
              this.extractMessage(parsed);

            if (parsedMessage) {
              return parsedMessage;
            }
          } catch {
            return text;
          }
        }
      }

      const bodyMessage =
        this.extractMessage(body);

      if (bodyMessage) {
        return bodyMessage;
      }

      if (error.status === 0) {
        return (
          'Unable to connect to the depreciation API. ' +
          'Check whether the API is running and accessible.'
        );
      }

      if (error.status === 400) {
        return (
          error.message ||
          'The depreciation request is invalid.'
        );
      }

      if (error.status === 401) {
        return 'Your login session is unauthorized or has expired.';
      }

      if (error.status === 403) {
        return 'You do not have permission to perform this action.';
      }

      if (error.status === 404) {
        return 'The depreciation run or API endpoint was not found.';
      }

      if (error.status === 409) {
        return (
          'The depreciation run was changed by another process. ' +
          'Reload the document and try again.'
        );
      }

      if (error.status === 500) {
        return (
          'The server encountered an internal error while processing ' +
          'the depreciation transaction.'
        );
      }

      return (
        error.message ||
        `The request failed with HTTP status ${error.status}.`
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'The depreciation request failed.';
  }

  private extractMessage(
    value: unknown
  ): string | null {
    if (
      !value ||
      typeof value !== 'object'
    ) {
      return null;
    }

    const body = value as Record<string, unknown>;

    const candidates = [
      body['error'],
      body['message'],
      body['detail'],
      body['title']
    ];

    for (const candidate of candidates) {
      if (
        typeof candidate === 'string' &&
        candidate.trim()
      ) {
        return candidate.trim();
      }
    }

    const errors = body['errors'];

    if (
      errors &&
      typeof errors === 'object'
    ) {
      const messages = Object.values(
        errors as Record<string, unknown>
      )
        .flatMap(item =>
          Array.isArray(item)
            ? item
            : [item]
        )
        .filter(
          (item): item is string =>
            typeof item === 'string' &&
            item.trim().length > 0
        );

      if (messages.length) {
        return messages.join('\n');
      }
    }

    return null;
  }

  private url(value: string): string {
    const root = value
      .trim()
      .replace(/\/+$/, '')
      .replace(
        /\/api\/accounting\/depreciation-runs$/i,
        ''
      );

    return root
      .toLowerCase()
      .endsWith('/api')
      ? `${root}/accounting/depreciation-runs`
      : `${root}/api/accounting/depreciation-runs`;
  }
}