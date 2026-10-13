import { Injectable, computed, inject, signal } from '@angular/core';

import { rxResource } from '@angular/core/rxjs-interop';

import {
  Observable,
  catchError,
  defer,
  finalize,
  forkJoin,
  throwError,
} from 'rxjs';

import { SupplierService } from '../data-access/supplier.service';

import {
  SupplierCommandResult,
  SupplierCreateRequest,
  SupplierDetail,
  SupplierListItem,
  SupplierListQuery,
  SupplierLookups,
  SupplierPagedResult,
  SupplierStatusRequest,
  SupplierUpdateRequest,
} from '../models/supplier.models';

const INITIAL_QUERY: SupplierListQuery = {
  search: null,
  supplierGroupCode: null,
  termsCode: null,
  currencyCode: null,
  taxProfileCode: null,
  activeFlag: 'Y',
  skip: 0,
  take: 50,
  sortField: 'supplierName',
  sortDirection: 'asc',
};

@Injectable()
export class SupplierListFacade {
  private readonly api = inject(SupplierService);

  private readonly committedQuery = signal<SupplierListQuery>({
    ...INITIAL_QUERY,
  });

  private readonly detailLoadingState = signal(false);

  private readonly detailErrorState = signal<string | null>(null);

  private readonly commandBusyState = signal(false);

  private readonly commandErrorState = signal<string | null>(null);

  private readonly listResource = rxResource<
  SupplierPagedResult<SupplierListItem>,
  SupplierListQuery
>({
  params: () =>
    this.committedQuery(),

  stream: ({ params }) =>
    this.api.getList(params),

  defaultValue: {
    data: [],
    total: 0,
  },
});

  private readonly lookupsResource =
  rxResource<SupplierLookups, number>({
    params: () => 1,

    stream: () =>
      forkJoin({
        groups: this.api.getGroups(),
        terms: this.api.getTerms(),
        currencies: this.api.getCurrencies(),
        taxProfiles: this.api.getTaxProfiles(),
      }),

    defaultValue: {
      groups: [],
      terms: [],
      currencies: [],
      taxProfiles: [],
    },
  });

  readonly query = this.committedQuery.asReadonly();

  readonly suppliers = computed(() => this.listResource.value().data);

  readonly total = computed(() => this.listResource.value().total);

  readonly loading = computed(() => this.listResource.isLoading());

  readonly error = computed(() => {
    const error = this.listResource.error();

    return error ? this.api.getErrorMessage(error) : null;
  });

  readonly lookups = computed(() => this.lookupsResource.value());

  readonly lookupsLoading = computed(() => this.lookupsResource.isLoading());

  readonly lookupsError = computed(() => {
    const error = this.lookupsResource.error();

    return error ? this.api.getErrorMessage(error) : null;
  });

  readonly detailLoading = this.detailLoadingState.asReadonly();

  readonly detailError = this.detailErrorState.asReadonly();

  readonly commandBusy = this.commandBusyState.asReadonly();

  readonly commandError = this.commandErrorState.asReadonly();

  commitQuery(query: SupplierListQuery): void {
    this.committedQuery.set({
      ...query,
    });
  }

  reload(): void {
    this.listResource.reload();
  }

  reloadLookups(): void {
    this.lookupsResource.reload();
  }

  loadSupplierByCode(supplierCode: string): Observable<SupplierDetail> {
    return defer(() => {
      this.detailLoadingState.set(true);
      this.detailErrorState.set(null);

      return this.api.getByCode(supplierCode.trim().toUpperCase()).pipe(
        catchError((error: unknown) => {
          this.detailErrorState.set(this.api.getErrorMessage(error));

          return throwError(() => error);
        }),

        finalize(() => {
          this.detailLoadingState.set(false);
        }),
      );
    });
  }

  create(request: SupplierCreateRequest): Observable<SupplierCommandResult> {
    return this.execute(() => this.api.create(request));
  }

  update(
    supplierCode: string,
    request: SupplierUpdateRequest,
  ): Observable<SupplierCommandResult> {
    return this.execute(() => this.api.update(supplierCode, request));
  }

  activate(
    supplierCode: string,
    request: SupplierStatusRequest,
  ): Observable<SupplierCommandResult> {
    return this.execute(() => this.api.activate(supplierCode, request));
  }

  deactivate(
    supplierCode: string,
    request: SupplierStatusRequest,
  ): Observable<SupplierCommandResult> {
    return this.execute(() => this.api.deactivate(supplierCode, request));
  }

  clearDialogErrors(): void {
    this.detailErrorState.set(null);
    this.commandErrorState.set(null);
  }

  errorMessage(error: unknown): string {
    return this.api.getErrorMessage(error);
  }

  private execute(
    command: () => Observable<SupplierCommandResult>,
  ): Observable<SupplierCommandResult> {
    return defer(() => {
      this.commandBusyState.set(true);
      this.commandErrorState.set(null);

      return command().pipe(
        catchError((error: unknown) => {
          this.commandErrorState.set(this.api.getErrorMessage(error));

          return throwError(() => error);
        }),

        finalize(() => {
          this.commandBusyState.set(false);
        }),
      );
    });
  }
}
