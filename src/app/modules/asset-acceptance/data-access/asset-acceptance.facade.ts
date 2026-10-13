import { computed, inject, Injectable, signal } from '@angular/core';

import { rxResource } from '@angular/core/rxjs-interop';

import { Observable, catchError, finalize, of, tap, throwError } from 'rxjs';

import { AssetAcceptanceService } from './asset-acceptance.service';

import {
  AssetAcceptanceCommandResponse,
  AssetAcceptanceDocument,
  AssetAcceptanceListItem,
  AssetAcceptanceListQuery,
  AssetAcceptanceSaveRequest,
  AssetAccountLookupDto,
  AssetAccountPurpose,
  PagedResult,
  WorkflowRequest,
} from '../models/asset-acceptance.models';

@Injectable()
export class AssetAcceptanceFacade {
  private readonly api = inject(AssetAcceptanceService);

  // ============================================================
  // LIST QUERY
  // ============================================================

  readonly listQuery = signal<AssetAcceptanceListQuery>({
    fromDate: this.dateOnly(new Date(new Date().getFullYear(), 0, 1)),

    toDate: this.dateOnly(new Date()),

    status: 'ALL',

    branchName: null,

    assetCategoryCode: null,

    search: null,

    skip: 0,

    take: 50,

    sortField: 'acceptanceDate',

    sortDir: 'desc',
  });

  // ============================================================
  // SIGNAL STATES
  // ============================================================

  readonly documentNo = signal<string | null>(null);

  readonly poSearch = signal('');

  readonly selectedPoNo = signal('');

  readonly lookupSearch = signal('');

  private readonly busyState = signal(false);

  private readonly errorState = signal<string | null>(null);

  // ============================================================
  // LIST RESOURCE
  // ============================================================

 private readonly listResource = rxResource<
  PagedResult<AssetAcceptanceListItem>,
  AssetAcceptanceListQuery
>({
  params: () => this.listQuery(),

  stream: ({ params }) =>
    this.api.getList(params),

  defaultValue: {
    data: [],
    total: 0,
  },
});

  // ============================================================
  // DOCUMENT RESOURCE
  // ============================================================

  private readonly documentResource = rxResource<
  AssetAcceptanceDocument | null,
  string | null
>({
  params: () => this.documentNo(),

  stream: ({ params }) =>
    params
      ? this.api.getDocument(params)
      : of(null),

  defaultValue: null,
});

  // ============================================================
  // FIXED ASSET PO RESOURCE
  // ============================================================

  private readonly poResource = rxResource({
  params: () => ({
    search: this.poSearch(),
    excludeAcceptanceNo: this.documentNo(),
  }),

  stream: ({ params }) =>
    this.api.getFixedAssetPos(
      params.search,
      params.excludeAcceptanceNo,
    ),

  defaultValue: [],
});

  // ============================================================
  // FIXED ASSET PO LINES RESOURCE
  // ============================================================

 private readonly poLinesResource = rxResource({
  params: () => ({
    poNo: this.selectedPoNo(),
    excludeAcceptanceNo: this.documentNo(),
  }),

  stream: ({ params }) =>
    this.api.getFixedAssetPoLines(
      params.poNo,
      params.excludeAcceptanceNo,
    ),

  defaultValue: [],
});

  // ============================================================
  // SUPPLIERS RESOURCE
  // ============================================================

  private readonly suppliersResource = rxResource({
  params: () => this.lookupSearch(),

  stream: ({ params }) =>
    this.api.getSuppliers(params),

  defaultValue: [],
});

  // ============================================================
  // BRANCHES RESOURCE
  // ============================================================

 private readonly branchesResource = rxResource({
  params: () => this.lookupSearch(),

  stream: ({ params }) =>
    this.api.getBranches(params),

  defaultValue: [],
});

  // ============================================================
  // CATEGORIES RESOURCE
  // ============================================================

private readonly categoriesResource = rxResource({
  params: () => this.lookupSearch(),

  stream: ({ params }) =>
    this.api.getCategories(params),

  defaultValue: [],
});

  // ============================================================
  // DEPRECIATION METHODS RESOURCE
  // ============================================================

private readonly methodsResource = rxResource({
  params: () => this.lookupSearch(),

  stream: ({ params }) =>
    this.api.getDepreciationMethods(params),

  defaultValue: [],
});

  // ============================================================
  // LOCATIONS RESOURCE
  // ============================================================

  private readonly locationsResource = rxResource({
  params: () => this.lookupSearch(),

  stream: ({ params }) =>
    this.api.getLocations(params),

  defaultValue: [],
});

  // ============================================================
  // CUSTODIANS RESOURCE
  // ============================================================

  private readonly custodiansResource = rxResource({
  params: () => this.lookupSearch(),

  stream: ({ params }) =>
    this.api.getCustodians(params),

  defaultValue: [],
});

  // ============================================================
  // OLD GENERIC ACCOUNTS RESOURCE
  // COMMENTED ONLY
  //
  // Kini ordinary search string ang request, pero ang
  // getAccounts() nanginahanglan og AssetAccountPurpose.
  // ============================================================

  // private readonly accountsResource =
  //   rxResource({
  //     request: () =>
  //       this.lookupSearch(),
  //
  //     loader: ({
  //       request,
  //     }) =>
  //       this.api.getAccounts(
  //         request,
  //       ),
  //
  //     defaultValue:
  //       [],
  //   });

  // ============================================================
  // NEW ASSET COST ACCOUNT RESOURCE
  // ============================================================

  private readonly assetCostAccountsResource = rxResource<
  AssetAccountLookupDto[],
  AssetAccountPurpose
>({
  params: () => 'ASSET_COST',

  stream: ({ params }) =>
    this.api.getAccounts(params, '', 100),

  defaultValue: [],
});

  // ============================================================
  // NEW ACCUMULATED DEPRECIATION ACCOUNT RESOURCE
  // ============================================================

  
 readonly accumulatedDepreciationAccountsResource = rxResource<
  AssetAccountLookupDto[],
  AssetAccountPurpose
>({
  params: () => 'ACCUMULATED_DEPRECIATION',

  stream: ({ params }) =>
    this.api.getAccounts(params, '', 100),

  defaultValue: [],
});

  // ============================================================
  // NEW DEPRECIATION EXPENSE ACCOUNT RESOURCE
  // ============================================================

  
readonly depreciationExpenseAccountsResource = rxResource<
  AssetAccountLookupDto[],
  AssetAccountPurpose
>({
  params: () => 'DEPRECIATION_EXPENSE',

  stream: ({ params }) =>
    this.api.getAccounts(params, '', 100),

  defaultValue: [],
});

  // ============================================================
  // LIST COMPUTED VALUES
  // ============================================================

  readonly list = computed(() => this.listResource.value().data);

  readonly total = computed(() => this.listResource.value().total);

  readonly listLoading = computed(() => this.listResource.isLoading());

  // ============================================================
  // DOCUMENT COMPUTED VALUES
  // ============================================================

  readonly document = computed(() => this.documentResource.value());

  readonly documentLoading = computed(() => this.documentResource.isLoading());

  // ============================================================
  // PO COMPUTED VALUES
  // ============================================================

  readonly fixedAssetPos = computed(() => this.poResource.value());

  readonly fixedAssetPosLoading = computed(() => this.poResource.isLoading());

  readonly poLines = computed(() => this.poLinesResource.value());

  readonly poLinesLoading = computed(() => this.poLinesResource.isLoading());

  // ============================================================
  // LOOKUP COMPUTED VALUES
  // ============================================================

  readonly suppliers = computed(() => this.suppliersResource.value());

  readonly branches = computed(() => this.branchesResource.value());

  readonly categories = computed(() => this.categoriesResource.value());

  readonly depreciationMethods = computed(() => this.methodsResource.value());

  readonly locations = computed(() => this.locationsResource.value());

  readonly custodians = computed(() => this.custodiansResource.value());

  // ============================================================
  // OLD GENERIC ACCOUNTS COMPUTED VALUE
  // COMMENTED ONLY
  // ============================================================

  // readonly accounts =
  //   computed(() =>
  //     this.accountsResource
  //       .value(),
  //   );

  // ============================================================
  // NEW ACCOUNT COMPUTED VALUES
  // ============================================================

  readonly assetCostAccounts = computed(() =>
    this.assetCostAccountsResource
      .value()
      .filter((item: AssetAccountLookupDto) => item.isPosting),
  );

  readonly accumulatedDepreciationAccounts = computed(() =>
    this.accumulatedDepreciationAccountsResource
      .value()
      .filter((item: AssetAccountLookupDto) => item.isPosting),
  );

  readonly depreciationExpenseAccounts = computed(() =>
    this.depreciationExpenseAccountsResource
      .value()
      .filter((item: AssetAccountLookupDto) => item.isPosting),
  );

  readonly accountsLoading = computed(
    () =>
      this.assetCostAccountsResource.isLoading() ||
      this.accumulatedDepreciationAccountsResource.isLoading() ||
      this.depreciationExpenseAccountsResource.isLoading(),
  );

  // ============================================================
  // COMMAND COMPUTED VALUES
  // ============================================================

  readonly commandBusy = computed(() => this.busyState());

  readonly commandError = computed(() => this.errorState());

  // ============================================================
  // RESOURCE ERRORS
  // ============================================================

  readonly fixedAssetPoError = computed(() =>
    this.resourceError(this.poResource.error()),
  );

  readonly poLinesError = computed(() =>
    this.resourceError(this.poLinesResource.error()),
  );

  readonly documentError = computed(() =>
    this.resourceError(this.documentResource.error()),
  );

  // ============================================================
  // UPDATE LIST QUERY
  // ============================================================

  updateQuery(patch: Partial<AssetAcceptanceListQuery>): void {
    this.listQuery.update((value) => ({
      ...value,
      ...patch,
    }));
  }

  // ============================================================
  // RELOAD LIST
  // ============================================================

  reloadList(): void {
    this.listResource.reload();
  }

  // ============================================================
  // LOAD DOCUMENT
  // ============================================================

  loadDocument(documentNo: string | null): void {
    const cleaned = String(documentNo ?? '').trim() || null;

    this.documentNo.set(cleaned);
  }

  // ============================================================
  // RELOAD DOCUMENT
  // ============================================================

  reloadDocument(): void {
    if (this.documentNo()) {
      this.documentResource.reload();
    }
  }

  // ============================================================
  // PO SEARCH
  // ============================================================

  setPoSearch(search: string): void {
    this.poSearch.set(String(search ?? ''));
  }

  // ============================================================
  // SELECT PO
  // ============================================================

  selectPo(poNo: string): void {
    this.selectedPoNo.set(String(poNo ?? '').trim());
  }

  // ============================================================
  // RELOAD PO LINES
  // ============================================================

  reloadPoLines(): void {
    this.poLinesResource.reload();
  }

  // ============================================================
  // RELOAD ACCOUNT LOOKUPS
  // ============================================================

  reloadAccounts(): void {
    this.assetCostAccountsResource.reload();

    this.accumulatedDepreciationAccountsResource.reload();

    this.depreciationExpenseAccountsResource.reload();
  }

  // ============================================================
  // COMPATIBILITY RELOAD METHOD
  //
  // Gipabilin aron dili mag-error kung naa kay existing
  // component nga nagtawag og facade.reload().
  // ============================================================

  reload(): void {
    this.reloadAccounts();
  }

  // ============================================================
  // CREATE
  // ============================================================

  create(
    request: AssetAcceptanceSaveRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.run(this.api.create(request));
  }

  // ============================================================
  // UPDATE
  // ============================================================

  update(
    no: string,
    request: AssetAcceptanceSaveRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.run(this.api.update(no, request));
  }

  // ============================================================
  // DELETE
  // ============================================================

  delete(
    no: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.run(this.api.delete(no, request));
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  submit(
    no: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.run(this.api.submit(no, request));
  }

  // ============================================================
  // ACCEPT
  // ============================================================

  accept(
    no: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.run(this.api.accept(no, request));
  }

  // ============================================================
  // POST
  // ============================================================

  post(
    no: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.run(this.api.post(no, request));
  }

  // ============================================================
  // CANCEL
  // ============================================================

  cancel(
    no: string,
    request: WorkflowRequest,
  ): Observable<AssetAcceptanceCommandResponse> {
    return this.run(this.api.cancel(no, request));
  }

  // ============================================================
  // ERROR MESSAGE
  // ============================================================

  errorMessage(error: unknown): string {
    const value = error as {
      error?:
        | {
            detail?: string;
            message?: string;
            error?: string;
          }
        | string;

      message?: string;
      statusText?: string;
    };

    if (typeof value?.error === 'string') {
      return value.error;
    }

    return (
      value?.error?.message ||
      value?.error?.detail ||
      value?.error?.error ||
      value?.message ||
      value?.statusText ||
      'Unable to process asset acceptance.'
    );
  }

  // ============================================================
  // RUN COMMAND
  // ============================================================

  private run(
    source: Observable<AssetAcceptanceCommandResponse>,
  ): Observable<AssetAcceptanceCommandResponse> {
    if (this.busyState()) {
      return throwError(
        () => new Error('Another asset-acceptance command is still running.'),
      );
    }

    this.busyState.set(true);

    this.errorState.set(null);

    return source.pipe(
      tap(() => this.reloadList()),

      catchError((error: unknown) => {
        this.errorState.set(this.errorMessage(error));

        return throwError(() => error);
      }),

      finalize(() => {
        this.busyState.set(false);
      }),
    );
  }

  // ============================================================
  // RESOURCE ERROR
  // ============================================================

  private resourceError(error: unknown): string | null {
    return error ? this.errorMessage(error) : null;
  }

  // ============================================================
  // DATE ONLY
  // ============================================================

  private dateOnly(date: Date): string {
    return [
      date.getFullYear(),

      String(date.getMonth() + 1).padStart(2, '0'),

      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  // ============================================================
  // OLD DUPLICATE ACCOUNT CODE
  // COMMENTED ONLY
  //
  // This block was previously active at the bottom of the file.
  // It caused duplicate identifier errors, used this.service even
  // though the injected property is this.api, and split "as const"
  // incorrectly.
  // ============================================================

  // readonly assetCostAccountsResource =
  //   rxResource({
  //     request: () =>
  //       'ASSET_COST' as const,
  //
  //     loader: ({
  //       request,
  //     }) =>
  //       this.api.getAccounts(
  //         request,
  //         '',
  //         100,
  //       ),
  //
  //     defaultValue:
  //       [],
  //   });

  // readonly accumulatedDepreciationAccountsResource =
  //   rxResource({
  //     request: () =>
  //       'ACCUMULATED_DEPRECIATION'
  //         as const,
  //
  //     loader: ({
  //       request,
  //     }) =>
  //       this.service.getAccounts(
  //         request,
  //         '',
  //         100,
  //       ),
  //
  //     defaultValue:
  //       [],
  //   });

  // readonly depreciationExpenseAccountsResource =
  //   rxResource({
  //     request: () =>
  //       'DEPRECIATION_EXPENSE'
  //         as const,
  //
  //     loader: ({
  //       request,
  //     }) =>
  //       this.service.getAccounts(
  //         request,
  //         '',
  //         100,
  //       ),
  //
  //     defaultValue:
  //       [],
  //   });

  // readonly assetCostAccounts =
  //   computed(() =>
  //     this.assetCostAccountsResource
  //       .value()
  //       .filter(
  //         item =>
  //           item.isPosting,
  //       ),
  //   );

  // readonly accumulatedDepreciationAccounts =
  //   computed(() =>
  //     this
  //       .accumulatedDepreciationAccountsResource
  //       .value()
  //       .filter(
  //         item =>
  //           item.isPosting,
  //       ),
  //   );

  // readonly depreciationExpenseAccounts =
  //   computed(() =>
  //     this
  //       .depreciationExpenseAccountsResource
  //       .value()
  //       .filter(
  //         item =>
  //           item.isPosting,
  //       ),
  //   );

  // readonly accountsLoading =
  //   computed(() =>
  //     this.assetCostAccountsResource
  //       .isLoading() ||
  //
  //     this
  //       .accumulatedDepreciationAccountsResource
  //       .isLoading() ||
  //
  //     this
  //       .depreciationExpenseAccountsResource
  //       .isLoading(),
  //   );

  // reload(): void {
  //   this.assetCostAccountsResource
  //     .reload();
  //
  //   this
  //     .accumulatedDepreciationAccountsResource
  //     .reload();
  //
  //   this
  //     .depreciationExpenseAccountsResource
  //     .reload();
  // }
}
