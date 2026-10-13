import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, catchError, defer, finalize, forkJoin, of, tap, throwError } from 'rxjs';

import { SupplierService } from '../data-access/supplier.service';
import {
  SupplierCommandResult,
  SupplierCreateRequest,
  SupplierDetail,
  SupplierLookups,
  SupplierStatusRequest,
  SupplierUpdateRequest
} from '../models/supplier.models';

@Injectable()
export class SupplierEntryFacade {
  private readonly api = inject(SupplierService);
  private readonly supplierCodeState = signal('');
  private readonly commandBusyState = signal(false);
  private readonly commandErrorState = signal<string | null>(null);

  private readonly supplierResource =
  rxResource<SupplierDetail | null, string>({
    params: () =>
      this.supplierCodeState(),

    stream: ({ params }) =>
      params
        ? this.api.getByCode(params)
        : of(null),

    defaultValue: null,
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

  readonly supplierCode = this.supplierCodeState.asReadonly();
  readonly supplier = computed(() => this.supplierResource.value());
  readonly loading = computed(() => this.supplierResource.isLoading());
  readonly loadError = computed(() => {
    const error = this.supplierResource.error();
    return error ? this.api.getErrorMessage(error) : null;
  });
  readonly lookups = computed(() => this.lookupsResource.value());
  readonly lookupsLoading = computed(() => this.lookupsResource.isLoading());
  readonly lookupsError = computed(() => {
    const error = this.lookupsResource.error();
    return error ? this.api.getErrorMessage(error) : null;
  });
  readonly commandBusy = computed(() => this.commandBusyState());
  readonly commandError = computed(() => this.commandErrorState());

  setSupplierCode(supplierCode: string | null): void {
    this.supplierCodeState.set((supplierCode ?? '').trim().toUpperCase());
  }

  reloadSupplier(): void {
    if (this.supplierCodeState()) {
      this.supplierResource.reload();
    }
  }

  reloadLookups(): void {
    this.lookupsResource.reload();
  }

  create(request: SupplierCreateRequest): Observable<SupplierCommandResult> {
    return this.execute(() => this.api.create(request));
  }

  update(supplierCode: string, request: SupplierUpdateRequest): Observable<SupplierCommandResult> {
    return this.execute(() => this.api.update(supplierCode, request));
  }

  activate(supplierCode: string, request: SupplierStatusRequest): Observable<SupplierCommandResult> {
    return this.execute(() => this.api.activate(supplierCode, request));
  }

  deactivate(supplierCode: string, request: SupplierStatusRequest): Observable<SupplierCommandResult> {
    return this.execute(() => this.api.deactivate(supplierCode, request));
  }

  errorMessage(error: unknown): string {
    return this.api.getErrorMessage(error);
  }

  private execute(
    command: () => Observable<SupplierCommandResult>
  ): Observable<SupplierCommandResult> {
    return defer(() => {
      this.commandBusyState.set(true);
      this.commandErrorState.set(null);

      return command().pipe(
        tap(result => {
          this.supplierCodeState.set(result.supplier.supplierCode);
        }),
        catchError((error: unknown) => {
          this.commandErrorState.set(this.api.getErrorMessage(error));
          return throwError(() => error);
        }),
        finalize(() => this.commandBusyState.set(false))
      );
    });
  }
}
