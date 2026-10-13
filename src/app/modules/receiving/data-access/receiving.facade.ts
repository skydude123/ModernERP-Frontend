import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, catchError, finalize, of, tap, throwError } from 'rxjs';

import { ReceivingService } from './receiving.service';
import {
  BranchLookup,
  OpenPoLineLookup,
  PagedResult,
  QuickDateKey,
  ReceivingListItem,
  ReceivingListQuery,
  ReceivingReverseRequest,
  ReceivingSaveRequest,
  ReceivingSaveResponse,
  SupplierLookup,
  WarehouseLookup,
  ReceivingItemLookup
} from '../models/receiving.models';
import { AuthFacadeService } from '../../../core/services/auth-facade.service';

@Injectable()
export class ReceivingFacade {
  private readonly api = inject(ReceivingService);
  private readonly authFacade = inject(AuthFacadeService);

  readonly supplierSearch = signal('');
  readonly branchSearch = signal('');
  readonly warehouseSearch = signal('');
  readonly openPoSearch = signal('');
  readonly itemSearch = signal('');

  readonly openPoSupplierCode = signal<string | null>(null);

  readonly listQuery = signal<ReceivingListQuery>({
    fromDate: this.toDateOnly(new Date(new Date().getFullYear(), 0, 1)),
    toDate: this.toDateOnly(new Date()),
    status: 'ALL',
    transType: 'ALL',
    branchname: null,
    whseCode: null,
    suppCode: null,
    search: null,
    skip: 0,
    take: 50,
    sortField: 'rrDate',
    sortDir: 'desc',
    userId: this.authFacade.userId()
  });

  private readonly commandBusyState = signal(false);
  private readonly commandErrorState = signal<string | null>(null);
  readonly lastCommand = signal<ReceivingSaveResponse | null>(null);

  readonly commandBusy = computed(() => this.commandBusyState());
  readonly commandError = computed(() => this.commandErrorState());

  private readonly suppliersResource =
  rxResource<SupplierLookup[], string>({
    params: () =>
      this.supplierSearch(),

    stream: ({ params }) =>
      this.api.getSuppliers(params),

    defaultValue: [],
  });

  private readonly branchesResource =
  rxResource<BranchLookup[], string>({
    params: () =>
      this.branchSearch(),

    stream: ({ params }) =>
      this.api.getBranches(params),

    defaultValue: [],
  });

 private readonly warehousesResource =
  rxResource<WarehouseLookup[], string>({
    params: () =>
      this.warehouseSearch(),

    stream: ({ params }) =>
      this.api.getWarehouses(params),

    defaultValue: [],
  });

  private readonly itemsResource =
  rxResource<ReceivingItemLookup[], string>({
    params: () =>
      this.itemSearch(),

    stream: ({ params }) =>
      this.api.getItems(params),

    defaultValue: [],
  });

private readonly openPoLinesResource =
  rxResource<
    OpenPoLineLookup[],
    {
      suppCode: string | null;
      search: string;
    }
  >({
    params: () => ({
      suppCode:
        this.openPoSupplierCode(),

      search:
        this.openPoSearch(),
    }),

    stream: ({ params }) => {
      const suppCode =
        String(
          params.suppCode ?? '',
        ).trim();

      if (!suppCode) {
        return of([]);
      }

      return this.api.getOpenPoLines(
        suppCode,
        params.search,
      );
    },

    defaultValue: [],
  });

  private readonly listResource =
  rxResource<
    PagedResult<ReceivingListItem>,
    ReceivingListQuery
  >({
    params: () =>
      this.listQuery(),

    stream: ({ params }) =>
      this.api.getListPage(params),

    defaultValue: {
      data: [],
      total: 0,
    },
  });

  readonly suppliers = computed(() => this.suppliersResource.value());
  readonly branches = computed(() => this.branchesResource.value());
  readonly warehouses = computed(() => this.warehousesResource.value());
  readonly items = computed(() => this.itemsResource.value());

readonly itemsLoading = computed(() =>
  this.itemsResource.isLoading(),
);
  readonly openPoLines = computed(() => this.openPoLinesResource.value());
  readonly openPoLinesLoading = computed(() => this.openPoLinesResource.isLoading());

  readonly receivingList = computed(() => this.listResource.value().data);
  readonly receivingTotal = computed(() => this.listResource.value().total);
  readonly receivingListLoading = computed(() => this.listResource.isLoading());

  setItemSearch(search: string): void {
  this.itemSearch.set(search ?? '');
}

  setSupplierSearch(search: string): void {
    this.supplierSearch.set(search ?? '');
  }

  setBranchSearch(search: string): void {
    this.branchSearch.set(search ?? '');
  }

  setWarehouseSearch(search: string): void {
    this.warehouseSearch.set(search ?? '');
  }

  setOpenPoSearch(search: string): void {
    this.openPoSearch.set(search ?? '');
  }

  setOpenPoSupplier(suppCode: string | null): void {
    this.openPoSupplierCode.set(suppCode);
  }

  reloadOpenPoLines(): void {
    this.openPoLinesResource.reload();
  }

  updateQuery(patch: Partial<ReceivingListQuery>): void {
    this.listQuery.update(current => ({
      ...current,
      ...patch
    }));
  }

  reloadList(): void {
    this.listResource.reload();
  }

  applyQuickDate(key: QuickDateKey): void {
    const range = this.getQuickDateRange(key);
    this.updateQuery({
      fromDate: range.fromDate,
      toDate: range.toDate,
      skip: 0
    });
  }

  upsert(request: ReceivingSaveRequest): Observable<ReceivingSaveResponse> {
    this.commandBusyState.set(true);
    this.commandErrorState.set(null);
    this.lastCommand.set(null);

    return this.api.upsert(request).pipe(
      tap(result => this.lastCommand.set(result)),
      catchError((error: unknown) => {
        this.commandErrorState.set(this.getErrorMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.commandBusyState.set(false))
    );
  }

  reverse(rrNo: string, request: ReceivingReverseRequest): Observable<ReceivingSaveResponse> {
    this.commandBusyState.set(true);
    this.commandErrorState.set(null);
    this.lastCommand.set(null);

    return this.api.reverse(rrNo, request).pipe(
      tap(result => {
        this.lastCommand.set(result);
        this.reloadList();
      }),
      catchError((error: unknown) => {
        this.commandErrorState.set(this.getErrorMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.commandBusyState.set(false))
    );
  }

  getErrorMessage(error: unknown): string {
    const err = error as {
      error?: unknown;
      message?: string;
      statusText?: string;
    };

    if (typeof err?.error === 'string') {
      return err.error;
    }

    if (err?.error && typeof err.error === 'object') {
      const problem = err.error as {
        message?: string;
        detail?: string;
        title?: string;
      };

      return problem.message || problem.detail || problem.title || 'Unable to process receiving.';
    }

    return err?.message || err?.statusText || 'Unable to process receiving.';
  }

  toDateOnly(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getQuickDateRange(key: QuickDateKey): { fromDate: string; toDate: string } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    switch (key) {
      case 'TODAY':
        return { fromDate: this.toDateOnly(today), toDate: this.toDateOnly(today) };
      case 'YESTERDAY': {
        const yesterday = new Date(year, month, today.getDate() - 1);
        return { fromDate: this.toDateOnly(yesterday), toDate: this.toDateOnly(yesterday) };
      }
      case 'THIS_MONTH':
        return {
          fromDate: this.toDateOnly(new Date(year, month, 1)),
          toDate: this.toDateOnly(new Date(year, month + 1, 0))
        };
      case 'LAST_MONTH':
        return {
          fromDate: this.toDateOnly(new Date(year, month - 1, 1)),
          toDate: this.toDateOnly(new Date(year, month, 0))
        };
      case 'THIS_YEAR':
        return {
          fromDate: this.toDateOnly(new Date(year, 0, 1)),
          toDate: this.toDateOnly(new Date(year, 11, 31))
        };
      case 'LAST_YEAR':
        return {
          fromDate: this.toDateOnly(new Date(year - 1, 0, 1)),
          toDate: this.toDateOnly(new Date(year - 1, 11, 31))
        };
    }
  }
}
