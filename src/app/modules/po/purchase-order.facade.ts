import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, catchError, finalize, of, tap, throwError } from 'rxjs';

import { PurchaseOrderService } from './purchase-order.service';
import {
  BranchLookup,
  ItemLookup,
  LookupUM,
  PagedResult,
  PoTypeOption,
  QuickDateKey,
  PurchaseOrderListItem,
  PurchaseOrderListQuery,
  PurchaseOrderReverseApprovalRequest,
  PurchaseOrderSaveRequest,
  PurchaseOrderSaveResponse,
  PurchaseOrderStatusActionRequest,
  PurchaseOrderStatusActionResult,
  SoVerification,
  SupplierLookup,
  TermLookup,
  // VatTypeLookup,
  VatTypeOption
} from './purchase-order.model';
import { AuthFacadeService } from '../../core/services/auth-facade.service';




@Injectable({
  providedIn: 'root'
})
export class PurchaseOrderFacade {



  private readonly api = inject(PurchaseOrderService);
  private readonly auth = inject(AuthFacadeService);

  readonly itemSearch = signal('');
  readonly supplierSearch = signal('');
  readonly branchSearch = signal('');
  readonly termSearch = signal('');
  readonly vatSearch = signal('');
  readonly soSearch = signal('');
  readonly umSearch = signal('');

  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successMessageState = signal<string | null>(null);



  readonly lastSaved = signal<PurchaseOrderSaveResponse | null>(null);


  readonly saving = computed(() => this.savingState());
  readonly error = computed(() => this.errorState());
  readonly saveError = computed(() => this.errorState());
  readonly successMessage = computed(() => this.successMessageState());


  readonly chequeTypes = [
    { text: 'N/A', value: 'N' },
    { text: 'PDC', value: 'P' },
    { text: 'COD', value: 'O' },
    { text: 'Cash', value: 'C' }
  ];

  readonly poTypes: PoTypeOption[] = [
    { code: 'MGP', name: 'Material / Goods PO' },
    { code: 'SJP', name: 'Service / Job-Out PO' },
    { code: 'OFP', name: 'Office Supplies PO' },
    { code: 'FAP', name: 'Fixed Asset PO' },
    { code: 'CRP', name: 'Cash Request PO' },
    { code: 'ECR', name: 'Employee Cash Advance Request' },
    { code: 'OPR', name: 'Owner Personal Request' },
    { code: 'SAP', name: 'Supplier Advance / PDC PO' },
    { code: 'GAS', name: 'Gasoline PO' }
    // { code: 'LEG', name: 'Legacy PO' }
  ];


  readonly typeOfVat: VatTypeOption[] = [
    { vcode: 'N', vname: 'NON-VAT' },
    { vcode: 'V', vname: 'VATABLE' },
    { vcode: 'Z', vname: 'ZERO-RATED' },

  ];

  private readonly itemLookupResource =
  rxResource<ItemLookup[], string>({
    params: () =>
      this.itemSearch(),

    stream: ({ params }) =>
      this.api.getItemLookup(params),

    defaultValue: [],
  });

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

 private readonly termsResource =
  rxResource<TermLookup[], string>({
    params: () =>
      this.termSearch(),

    stream: ({ params }) =>
      this.api.getTerms(params),

    defaultValue: [],
  });

  private readonly umResource =
  rxResource<LookupUM[], { searchText: string }>({
    params: () => ({
      searchText: this.umSearch(),
    }),

    stream: ({ params }) =>
      this.api.getUM(
        params.searchText,
      ),

    defaultValue: [],
  });

  readonly unitMeasuresLoading = computed(() => this.umResource.isLoading());
  readonly unitMeasuresError = computed(() => this.umResource.error());



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

  readonly salesOrders = computed<SoVerification[]>(() => {
    return this.salesOrdersResource.value() ?? [];
  });

  readonly soResults = computed<SoVerification[]>(() => {
    return this.salesOrders();
  });


  readonly itemLookupData = computed<ItemLookup[]>(() => this.itemLookupResource.value());
  readonly items = computed<ItemLookup[]>(() => this.itemLookupData());
  readonly suppliers = computed<SupplierLookup[]>(() => this.suppliersResource.value());
  readonly branches = computed<BranchLookup[]>(() => this.branchesResource.value());
  readonly terms = computed<TermLookup[]>(() => this.termsResource.value());
  // Templates should use facade.unitMeasures() instead of facade.umResource.value().
  // Keeping ResourceRef private avoids calling a ResourceRef like a signal in Angular templates.
  readonly unitMeasures = computed<LookupUM[]>(() => this.umResource.value());


  readonly listQuery = signal<PurchaseOrderListQuery>({
  fromDate: this.toDateOnly(new Date(new Date().getFullYear(), 0, 1)),
  toDate: this.toDateOnly(new Date()),
  status: 'ALL',
  branchName: null,
  search: null,

  userId: String(this.auth.userId() ?? '')
    .trim()
    .toUpperCase(),

  skip: 0,
  take: 50,
  sortField: 'poDate',
  sortDir: 'desc'
});

  readonly actionBusy = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly lastAction = signal<PurchaseOrderStatusActionResult | null>(null);

  private readonly poListResource = rxResource<
  PagedResult<PurchaseOrderListItem>,
  PurchaseOrderListQuery
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

  readonly poList = computed<PurchaseOrderListItem[]>(() => {
    const result = this.poListResource.value();
    return result.data;
  });

  readonly poTotal = computed<number>(() => {
    const result = this.poListResource.value();
    return result.total;
  });

  readonly poListLoading = computed<boolean>(() => this.poListResource.isLoading());

  clearMessages(): void {
    this.errorState.set(null);
    this.successMessageState.set(null);
  }

  updateListQuery(patch: Partial<PurchaseOrderListQuery>): void {
    this.listQuery.update(current => ({
      ...current,
      ...patch
    }));
  }

  updateQuery(patch: Partial<PurchaseOrderListQuery>): void {
    this.updateListQuery(patch);
  }  

  reloadList(): void {
    this.poListResource.reload();
  }

  reload(): void {
    this.reloadList();
  }

  applyQuickDate(key: QuickDateKey): void {
    const range = this.getQuickDateRange(key);

    // Quick date filters intentionally modify only fromDate and toDate.
    // Branch, status, and search are left unchanged to avoid hidden filtering side effects.
    this.updateListQuery({
      fromDate: range.fromDate,
      toDate: range.toDate,
      skip: 0
    });
  }

  setSupplierSearch(search: string): void {
    this.supplierSearch.set(search ?? '');
  }

  setTermSearch(search: string): void {
    this.termSearch.set(search ?? '');
  }

  setItemLookupSearch(search: string): void {
    this.itemSearch.set(search ?? '');
  }

  setUnitMeasureSearch(search: string): void {
    this.umSearch.set(search ?? '');
  }

  reloadUnitMeasures(): void {
    this.umResource.reload();
  }

  save(request: PurchaseOrderSaveRequest): Observable<PurchaseOrderSaveResponse> {
    this.savingState.set(true);
    this.errorState.set(null);
    this.successMessageState.set(null);
    this.lastSaved.set(null);

    return this.api.save(request).pipe(
      tap(result => {
        this.lastSaved.set(result);
        this.successMessageState.set(
          result.resultMessage || 'Purchase order saved successfully.'
        );
      }),
      catchError((error: unknown) => {
        this.errorState.set(this.getErrorMessage(error));
        return throwError(() => error);
      }),
      finalize(() => {
        this.savingState.set(false);
      })
    );
  }

  postPo(
    poNo: string,
    userId: string,
    remarks: string | null
  ): Observable<PurchaseOrderStatusActionResult> {
    const request: PurchaseOrderStatusActionRequest = {
      poNo,
      action: 'POST',
      userId,
      remarks
    };

    this.actionBusy.set(true);
    this.actionError.set(null);

    return this.api.postPo(poNo, request).pipe(
      tap(result => {
        this.lastAction.set(result);
        this.reloadList();
      }),
      catchError((error: unknown) => {
        this.actionError.set(this.getErrorMessage(error) || 'Failed to post PO.');
        return throwError(() => error);
      }),
      finalize(() => {
        this.actionBusy.set(false);
      })
    );
  }

  approvePo(
    poNo: string,
    userId: string,
    remarks: string | null
  ): Observable<PurchaseOrderStatusActionResult> {
    const request: PurchaseOrderStatusActionRequest = {
      poNo,
      action: 'APPROVE',
      userId,
      remarks
    };

    this.actionBusy.set(true);
    this.actionError.set(null);

    return this.api.approvePo(poNo, request).pipe(
      tap(result => {
        this.lastAction.set(result);
        this.reloadList();
      }),
      catchError((error: unknown) => {
        this.actionError.set(this.getErrorMessage(error) || 'Failed to approve PO.');
        return throwError(() => error);
      }),
      finalize(() => {
        this.actionBusy.set(false);
      })
    );
  }

  reopenPo(
    poNo: string,
    userId: string,
    remarks: string | null
  ): Observable<PurchaseOrderStatusActionResult> {
    const request: PurchaseOrderStatusActionRequest = {
      poNo,
      action: 'REOPEN',
      userId,
      remarks
    };

    this.actionBusy.set(true);
    this.actionError.set(null);

    return this.api.reopenPo(poNo, request).pipe(
      tap(result => {
        this.lastAction.set(result);
        this.reloadList();
      }),
      catchError((error: unknown) => {
        this.actionError.set(this.getErrorMessage(error) || 'Failed to reopen PO.');
        return throwError(() => error);
      }),
      finalize(() => {
        this.actionBusy.set(false);
      })
    );
  }

  reverseApprovalPo(
    poNo: string,
    userId: string,
    remarks: string | null
  ): Observable<PurchaseOrderStatusActionResult> {
    const request: PurchaseOrderReverseApprovalRequest = {
      poNo,
      userId,
      remarks
    };

    this.actionBusy.set(true);
    this.actionError.set(null);

    return this.api.reverseApproval(request).pipe(
      tap(result => {
        this.lastAction.set(result);
        this.reloadList();
      }),
      catchError((error: unknown) => {
        this.actionError.set(this.getErrorMessage(error) || 'Failed to reverse PO approval.');
        return throwError(() => error);
      }),
      finalize(() => {
        this.actionBusy.set(false);
      })
    );
  }

  reversePo(
    poNo: string,
    userId: string,
    remarks: string | null
  ): Observable<PurchaseOrderStatusActionResult> {
    const request: PurchaseOrderReverseApprovalRequest = {
      poNo,
      userId,
      remarks
    };

    this.actionBusy.set(true);
    this.actionError.set(null);

    return this.api.reverseApproval(request).pipe(
      tap(result => {
        this.lastAction.set(result);
        this.reloadList();
      }),
      catchError((error: unknown) => {
        this.actionError.set(this.getErrorMessage(error) || 'Failed to reverse PO.');
        return throwError(() => error);
      }),
      finalize(() => {
        this.actionBusy.set(false);
      })
    );
  }

  private getErrorMessage(error: unknown): string {
    const err = error as {
      error?: unknown;
      message?: string;
      statusText?: string;
    };

    if (typeof err?.error === 'string') {
      return err.error;
    }

    if (err?.error && typeof err.error === 'object') {
      const errorObject = err.error as {
        message?: string;
        title?: string;
        detail?: string;
      };

      return (
        errorObject.message ||
        errorObject.detail ||
        errorObject.title ||
        'Unable to process purchase order.'
      );
    }

    return err?.message || err?.statusText || 'Unable to process purchase order.';
  }

  private toDateOnly(value: Date): string {
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
        return {
          fromDate: this.toDateOnly(today),
          toDate: this.toDateOnly(today)
        };

      case 'YESTERDAY': {
        const yesterday = new Date(year, month, today.getDate() - 1);
        return {
          fromDate: this.toDateOnly(yesterday),
          toDate: this.toDateOnly(yesterday)
        };
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

  readonly unitMeasureMap = computed(() => {
    return new Map(
      this.unitMeasures().map(row => [
        row.umCode.trim(),
        row
      ])
    );
  });
  unitMeasureExists(umCode: string | null | undefined): boolean {
    const code = String(umCode ?? '').trim();

    if (!code) {
      return false;
    }

    return this.unitMeasureMap().has(code);
  }

  getUnitMeasureDescription(umCode: string | null | undefined): string {
    const code = String(umCode ?? '').trim();

    if (!code) {
      return '';
    }

    const found = this.unitMeasureMap().get(code);

    // return found ? `${found.umCode} - ${found.umDesc}` : code;
    return found ? `${found.umDesc}` : code;
  }


  // readonly soResults = computed<SoVerification[]>(() => {
  //   return this.salesOrders();
  // });

  readonly loadingSo = computed<boolean>(() => {
    return this.salesOrdersResource.isLoading();
  });

  readonly soError = computed<string | null>(() => {
    return this.salesOrdersResource.error()
      ? 'Unable to verify SO number. Please try again.'
      : null;
  });

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

}
