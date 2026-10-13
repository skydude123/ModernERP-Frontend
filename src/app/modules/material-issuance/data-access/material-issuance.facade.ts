import { computed, inject, Injectable, signal } from '@angular/core';

import { rxResource } from '@angular/core/rxjs-interop';

import { catchError, finalize, of, Observable, throwError } from 'rxjs';

import {
  IssueListItem,
  IssueQuery,
  IssueSaveRequest,
  IssueSaveResult,
  MaterialLookup,
  Paged,
  SupplierLookup,
  WarehouseLookup,
  WorkCenterLookup,
  SoVerification,
} from '../models/material-issuance.models';

import { MaterialIssuanceService } from './material-issuance.service';
import { AuthFacadeService } from '../../../core/services/auth-facade.service';

@Injectable()
export class MaterialIssuanceFacade {
  private readonly api = inject(MaterialIssuanceService);
  private readonly auth = inject(AuthFacadeService);

  readonly query = signal<IssueQuery>({
    dateFrom: this.date(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    dateTo: this.date(new Date()),
    status: 'ALL',
    sourceType: 'ALL',
    whseCode: null,
    search: null,
    skip: 0,
    take: 50,
    userId: this.resolveQueryUserId(),
  });

  readonly materialRequest = signal({
    whseCode: 'WHSE',
    search: '',
  });

  readonly busy = signal(false);

  readonly soSearch = signal('');

  private readonly listResource =
  rxResource<Paged<IssueListItem>, IssueQuery>({
    params: () =>
      this.query(),

    stream: ({ params }) =>
      this.api.list(params),

    defaultValue: {
      data: [],
      total: 0,
    },
  });

 private readonly materialsResource = rxResource<
  MaterialLookup[],
  {
    whseCode: string;
    search: string;
  }
>({
  params: () =>
    this.materialRequest(),

  stream: ({ params }) =>
    this.api.materials(
      params.whseCode,
      params.search,
    ),

  defaultValue: [],
});

  private readonly warehousesResource =
  rxResource<WarehouseLookup[], void>({
    stream: () =>
      this.api.warehouses(),

    defaultValue: [],
  });

 private readonly suppliersResource =
  rxResource<SupplierLookup[], void>({
    stream: () =>
      this.api.suppliers(),

    defaultValue: [],
  });

  // ADDED: Load all active work centers
  private readonly workCentersResource =
  rxResource<WorkCenterLookup[], void>({
    stream: () =>
      this.api.workCenters(),

    defaultValue: [],
  });


 private readonly salesOrdersResource =
  rxResource<SoVerification[], string>({
    params: () =>
      this.soSearch(),

    stream: ({ params }) => {
      const value =
        String(params ?? '').trim();

      if (!value) {
        return of([]);
      }

      return this.api.verifySoNo(value);
    },

    defaultValue: [],
  });

  readonly rows = computed(() => this.listResource.value().data);

  readonly total = computed(() => this.listResource.value().total);

  readonly loading = computed(() => this.listResource.isLoading());

  readonly materials = computed(() => this.materialsResource.value());

  readonly warehouses = computed(() => this.warehousesResource.value());

  readonly suppliers = computed(() => this.suppliersResource.value());

  // ADDED: Expose Work Center lookup to the entry HTML
  readonly workCenters = computed(() => this.workCentersResource.value());


  readonly soResults = computed<SoVerification[]>(
    () => this.salesOrdersResource.value() ?? [],
  );

  readonly loadingSo = computed<boolean>(
    () => this.salesOrdersResource.isLoading(),
  );

  readonly soError = computed<string | null>(() => {
    return this.salesOrdersResource.error()
      ? 'Unable to verify SO number. Please try again.'
      : null;
  });

  update(partial: Partial<IssueQuery>): void {
    this.query.update((query) => ({
      ...query,
      ...partial,

      /*
       * Always use the currently logged-in user.
       */
      userId: this.resolveQueryUserId(),
    }));
  }

  reload(): void {
    this.query.update((query) => ({
      ...query,
      userId: this.resolveQueryUserId(),
    }));

    this.listResource.reload();
  }

  setMaterials(whseCode: string, search = ''): void {
    this.materialRequest.set({
      whseCode,
      search,
    });
  }

  verifySoNo(soNo: string): void {
    const value = String(soNo ?? '').trim();

    if (!value) {
      this.soSearch.set('');
      return;
    }

    if (this.soSearch() === value) {
      this.salesOrdersResource.reload();
      return;
    }

    this.soSearch.set(value);
  }

  upsert(request: IssueSaveRequest): Observable<IssueSaveResult> {
    return this.command(this.api.upsert(request));
  }

  reverse(
    issueNo: string,
    request: {
      expectedRowVersion: string;
      reason: string;
      userId: string | null;
    },
  ): Observable<IssueSaveResult> {
    return this.command(this.api.reverse(issueNo, request));
  }

  // message(error: unknown): string {
  //   const value = error as {
  //     error?: {
  //       detail?: string;
  //       message?: string;
  //     };
  //     message?: string;
  //   };

  //   return (
  //     value.error?.detail ||
  //     value.error?.message ||
  //     value.message ||
  //     'Unable to process material issuance.'
  //   );
  // }

  message(error: unknown): string {
    const value = error as {
      status?: number;
      error?: {
        detail?: string;
        message?: string;
        title?: string;
        errors?: Record<string, string[]>;
      };
      message?: string;
    };

    if (value.error?.detail?.trim()) {
      return value.error.detail.trim();
    }

    if (value.error?.message?.trim()) {
      return value.error.message.trim();
    }

    if (value.error?.errors) {
      const validationMessages = Object.values(
        value.error.errors,
      )
        .flat()
        .filter(Boolean);

      if (validationMessages.length > 0) {
        return validationMessages.join(' ');
      }
    }

    if (value.status === 409) {
      return (
        value.error?.title?.trim() ||
        'The material issuance transaction was rejected.'
      );
    }

    if (value.status === 400) {
      return (
        value.error?.title?.trim() ||
        'Please check the material issuance information.'
      );
    }

    if (value.status === 500) {
      return 'The server could not complete the material issuance transaction.';
    }

    return 'Unable to process material issuance.';
  }

  date(date: Date): string {
    return (
      `${date.getFullYear()}-` +
      `${String(date.getMonth() + 1).padStart(2, '0')}-` +
      `${String(date.getDate()).padStart(2, '0')}`
    );
  }

  private command(
    source: Observable<IssueSaveResult>,
  ): Observable<IssueSaveResult> {
    this.busy.set(true);

    return source.pipe(
      catchError((error) => throwError(() => error)),
      finalize(() => this.busy.set(false)),
    );
  }

  private resolveQueryUserId(): string {
    /*
     * Only userId is sent to the API.
     *
     * No separate administrator or isAdmin parameter
     * is included in the request.
     */
    if (this.auth.isPrivilegedUser()) {
      return 'ADMIN';
    }

    return String(this.auth.userId() ?? '').trim();
  }
}
