import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, finalize, Observable, of, throwError } from 'rxjs';

import {
  PagedResult,
  StockTransferDocument,
  StockTransferListItem,
  StockTransferQuery,
  StockTransferSaveRequest,
  StockTransferSaveResult,
  StockTransferReverseRequest,
  StockTransferReverseResult
} from '../models/stock-transfer.models';
import { StockTransferService } from './stock-transfer.service';

@Injectable()
export class StockTransferFacade {
  private readonly api = inject(StockTransferService);

  readonly query = signal<StockTransferQuery>({
    dateFrom: this.dateOnly(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    dateTo: this.dateOnly(new Date()),
    status: 'ALL',
    sourceWhseCode: null,
    destinationWhseCode: null,
    search: null,
    skip: 0,
    take: 50,
  });
  readonly sourceItemRequest = signal({ sourceWhseCode: '', search: '' });
  readonly documentNo = signal('');
  readonly busy = signal(false);

  private readonly listResource =
    rxResource<
      PagedResult<StockTransferListItem>,
      StockTransferQuery
    >({
      params: () =>
        this.query(),

      stream: ({ params }) =>
        this.api.list(params),

      defaultValue: {
        data: [],
        total: 0,
      },
    });

  private readonly warehouseResource =
    rxResource({
      stream: () =>
        this.api.warehouses(),

      defaultValue: [],
    });

  private readonly sourceItemResource =
    rxResource({
      params: () =>
        this.sourceItemRequest(),

      stream: ({ params }) =>
        params.sourceWhseCode
          ? this.api.sourceItems(
            params.sourceWhseCode,
            params.search,
          )
          : of([]),

      defaultValue: [],
    });


  private readonly documentResource =
    rxResource<
      StockTransferDocument | null,
      string
    >({
      params: () =>
        this.documentNo(),

      stream: ({ params }) =>
        params
          ? this.api.get(params)
          : of(null),

      defaultValue: null,
    });

  readonly rows = computed(() => this.listResource.value().data);
  readonly total = computed(() => this.listResource.value().total);
  readonly listLoading = computed(() => this.listResource.isLoading());
  readonly warehouses = computed(() => this.warehouseResource.value());
  readonly sourceItems = computed(() => this.sourceItemResource.value());
  readonly sourceItemsLoading = computed(() => this.sourceItemResource.isLoading());
  readonly document = computed(() => this.documentResource.value());
  readonly documentLoading = computed(() => this.documentResource.isLoading());

  updateQuery(patch: Partial<StockTransferQuery>): void {
    this.query.update((query) => ({ ...query, ...patch }));
  }

  reloadList(): void {
    this.listResource.reload();
  }

  setSourceItems(sourceWhseCode: string, search = ''): void {
    this.sourceItemRequest.set({ sourceWhseCode, search });
  }

  setDocumentNo(stNo: string): void {
    if (this.documentNo() === stNo) {
      this.documentResource.reload();
    } else {
      this.documentNo.set(stNo);
    }
  }

  reloadDocument(): void {
    if (this.documentNo()) this.documentResource.reload();
  }

  upsert(request: StockTransferSaveRequest): Observable<StockTransferSaveResult> {
    this.busy.set(true);
    return this.api.upsert(request).pipe(
      catchError((error) => throwError(() => error)),
      finalize(() => this.busy.set(false)),
    );
  }

  message(error: unknown): string {
    const value = error as { error?: { detail?: string; message?: string }; message?: string };
    return value.error?.detail || value.error?.message || value.message || 'Unable to process the stock transfer.';
  }

  dateOnly(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  reverse(
    stNo: string,
    request: StockTransferReverseRequest,
  ): Observable<StockTransferReverseResult> {
    this.busy.set(true);

    return this.api
      .reverse(stNo, request)
      .pipe(
        catchError((error) =>
          throwError(() => error),
        ),

        finalize(() =>
          this.busy.set(false),
        ),
      );
  }
}
