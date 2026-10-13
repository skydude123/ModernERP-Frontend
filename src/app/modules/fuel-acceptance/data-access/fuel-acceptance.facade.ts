import {
  computed,
  inject,
  Injectable,
  signal,
} from '@angular/core';

import {
  rxResource,
} from '@angular/core/rxjs-interop';

import {
  finalize,
  Observable,
  of,
  throwError,
} from 'rxjs';

import {
  FuelAcceptanceCommandResponse,
  FuelAcceptanceDocument,
  FuelAcceptanceListItem,
  FuelAcceptanceListQuery,
  FuelAcceptanceSaveRequest,
  FuelAcceptanceWorkflowRequest,
  FuelPoLineLookup,
  FuelSupplierLookup,
  PagedResult,
} from '../models/fuel-acceptance.models';

import {
  FuelAcceptanceService,
} from './fuel-acceptance.service';


interface OpenPoLineRequest {
  supplierCode: string | null;

  excludeAcceptanceNo: string | null;

  search: string;
}


@Injectable()
export class FuelAcceptanceFacade {
  private readonly api =
    inject(
      FuelAcceptanceService,
    );


  private readonly commandBusyState =
    signal(false);


  readonly documentNo =
    signal<string | null>(
      null,
    );


  /* ============================================================
     SUPPLIER SEARCH
     ============================================================ */

  readonly supplierSearch =
    signal('');


  /* ============================================================
     OPEN PO LINE FILTERS
     ============================================================ */

  readonly selectedSupplierCode =
    signal<string | null>(
      null,
    );


  readonly excludeAcceptanceNo =
    signal<string | null>(
      null,
    );


  readonly poLineSearch =
    signal('');


  /* ============================================================
     LIST QUERY
     ============================================================ */

  readonly listQuery =
    signal<FuelAcceptanceListQuery>({
      fromDate:
        this.dateOnly(
          new Date(
            new Date().getFullYear(),
            0,
            1,
          ),
        ),

      toDate:
        this.dateOnly(
          new Date(),
        ),

      status:
        'ALL',

      branchName:
        null,

      search:
        null,

      skip:
        0,

      take:
        50,

      sortField:
        'acceptanceDate',

      sortDir:
        'desc',
    });


  /* ============================================================
     LIST RESOURCE
     ============================================================ */

  private readonly listResource =
  rxResource<
    PagedResult<FuelAcceptanceListItem>,
    FuelAcceptanceListQuery
  >({
    params: () =>
      this.listQuery(),

    stream: ({ params }) =>
      this.api.getList(params),

    defaultValue: {
      data: [],
      total: 0,
    },
  });


  /* ============================================================
     DOCUMENT RESOURCE
     ============================================================ */

  private readonly documentResource =
  rxResource<
    FuelAcceptanceDocument | null,
    string | null
  >({
    params: () =>
      this.documentNo(),

    stream: ({ params }) =>
      params
        ? this.api.getDocument(params)
        : of(null),

    defaultValue: null,
  });


  /* ============================================================
     SUPPLIER RESOURCE
     ============================================================ */

  private readonly supplierResource =
  rxResource<
    FuelSupplierLookup[],
    string
  >({
    params: () =>
      this.supplierSearch(),

    stream: ({ params }) =>
      this.api.getSuppliers(params),

    defaultValue: [],
  });


  /* ============================================================
     OPEN PO LINES RESOURCE

     Supplier drives this resource.
     ============================================================ */

  private readonly openPoLinesResource =
  rxResource<
    FuelPoLineLookup[],
    OpenPoLineRequest
  >({
    params: () => ({
      supplierCode:
        this.selectedSupplierCode(),

      excludeAcceptanceNo:
        this.excludeAcceptanceNo(),

      search:
        this.poLineSearch(),
    }),

    stream: ({ params }) => {
      const supplierCode =
        String(
          params.supplierCode ?? '',
        ).trim();

      if (!supplierCode) {
        return of<FuelPoLineLookup[]>([]);
      }

      return this.api.getOpenPoLines(
        supplierCode,
        params.excludeAcceptanceNo,
        params.search,
      );
    },

    defaultValue: [],
  });


  /* ============================================================
     BRANCH RESOURCE
     ============================================================ */

  private readonly branchResource =
  rxResource({
    stream: () =>
      this.api.getBranches(),

    defaultValue: [],
  });



  /* ============================================================
     TAX RESOURCE
     ============================================================ */

  private readonly taxResource =
  rxResource({
    stream: () =>
      this.api.getTaxSchemes(),

    defaultValue: [],
  });


  /* ============================================================
     PUBLIC STATE
     ============================================================ */

  readonly list =
    computed(
      () =>
        this.listResource
          .value()
          .data,
    );


  readonly total =
    computed(
      () =>
        this.listResource
          .value()
          .total,
    );


  readonly listLoading =
    computed(
      () =>
        this.listResource
          .isLoading(),
    );


  readonly document =
    computed(
      () =>
        this.documentResource
          .value(),
    );


  readonly documentLoading =
    computed(
      () =>
        this.documentResource
          .isLoading(),
    );


  readonly suppliers =
    computed(
      () =>
        this.supplierResource
          .value(),
    );


  readonly suppliersLoading =
    computed(
      () =>
        this.supplierResource
          .isLoading(),
    );


  /*
   * Keep the old public name so HTML modifications are smaller.
   */
  readonly purchaseOrderLines =
    computed(
      () =>
        this.openPoLinesResource
          .value(),
    );


  readonly purchaseOrderLinesLoading =
    computed(
      () =>
        this.openPoLinesResource
          .isLoading(),
    );


  readonly branches =
    computed(
      () =>
        this.branchResource
          .value(),
    );


  readonly taxSchemes =
    computed(
      () =>
        this.taxResource
          .value(),
    );


  readonly commandBusy =
    computed(
      () =>
        this.commandBusyState(),
    );


  /* ============================================================
     LIST
     ============================================================ */

  updateQuery(
    patch:
      Partial<FuelAcceptanceListQuery>,
  ): void {
    this.listQuery.update(
      (
        current,
      ) => ({
        ...current,
        ...patch,
      }),
    );
  }


  /* ============================================================
     SUPPLIER SEARCH
     ============================================================ */

  searchSuppliers(
    search: string,
  ): void {
    this.supplierSearch.set(
      String(
        search ?? '',
      ).trim(),
    );
  }


  /* ============================================================
     SELECT SUPPLIER
     ============================================================ */

  selectSupplier(
    supplierCode:
      string
      | null,
  ): void {
    const cleaned =
      String(
        supplierCode ??
        '',
      ).trim();


    this.selectedSupplierCode.set(
      cleaned ||
      null,
    );


    /*
     * New supplier means clear old PO-line search.
     */
    this.poLineSearch.set(
      '',
    );
  }


  /* ============================================================
     EXCLUDE CURRENT DOCUMENT

     Important when editing Draft:
     its own existing quantity should not exclude itself.
     ============================================================ */

  setExcludeAcceptanceNo(
    fuelAcceptanceNo:
      string
      | null,
  ): void {
    const cleaned =
      String(
        fuelAcceptanceNo ??
        '',
      ).trim();


    this.excludeAcceptanceNo.set(
      cleaned ||
      null,
    );
  }


  /* ============================================================
     PO LINE SEARCH
     ============================================================ */

  searchOpenPoLines(
    search: string,
  ): void {
    this.poLineSearch.set(
      String(
        search ?? '',
      ).trim(),
    );
  }


  /* ============================================================
     DOCUMENT
     ============================================================ */

  loadDocument(
    fuelAcceptanceNo:
      string
      | null,
  ): void {
    this.documentNo.set(
      fuelAcceptanceNo,
    );


    this.setExcludeAcceptanceNo(
      fuelAcceptanceNo,
    );
  }


  reloadDocument(): void {
    if (
      this.documentNo()
    ) {
      this.documentResource
        .reload();
    }
  }


  reloadList(): void {
    this.listResource.reload();
  }


  reloadSuppliers(): void {
    this.supplierResource.reload();
  }

  reloadBranches(): void {
  this.branchResource.reload();
}


  reloadPurchaseOrderLines(): void {
    if (
      this.selectedSupplierCode()
    ) {
      this.openPoLinesResource
        .reload();
    }
  }


  /* ============================================================
     SAVE
     ============================================================ */

  save(
    request:
      FuelAcceptanceSaveRequest,
  ): Observable<
    FuelAcceptanceCommandResponse
  > {
    return this.runCommand(
      this.api.save(
        request,
      ),
    );
  }


  /* ============================================================
     POST
     ============================================================ */

  post(
    fuelAcceptanceNo: string,
    request:
      FuelAcceptanceWorkflowRequest,
  ): Observable<
    FuelAcceptanceCommandResponse
  > {
    return this.runCommand(
      this.api.post(
        fuelAcceptanceNo,
        request,
      ),
    );
  }


  /* ============================================================
     REVERSE
     ============================================================ */

  reverse(
    fuelAcceptanceNo: string,
    request:
      FuelAcceptanceWorkflowRequest,
  ): Observable<
    FuelAcceptanceCommandResponse
  > {
    return this.runCommand(
      this.api.reverse(
        fuelAcceptanceNo,
        request,
      ),
    );
  }


  /* ============================================================
     ERROR
     ============================================================ */

  errorMessage(
    error: unknown,
  ): string {
    const response =
      error as {
        error?:
          | {
              error?: string;
              message?: string;
              detail?: string;
            }
          | string;

        message?: string;
      };


    if (
      typeof response?.error ===
      'string'
    ) {
      return response.error;
    }


    return (
      response?.error?.error ||
      response?.error?.message ||
      response?.error?.detail ||
      response?.message ||
      'Unable to process Fuel Acceptance.'
    );
  }


  /* ============================================================
     COMMAND LOCK
     ============================================================ */

  private runCommand(
    source:
      Observable<
        FuelAcceptanceCommandResponse
      >,
  ): Observable<
    FuelAcceptanceCommandResponse
  > {
    if (
      this.commandBusyState()
    ) {
      return throwError(
        () =>
          new Error(
            'A Fuel Acceptance command is already running.',
          ),
      );
    }


    this.commandBusyState.set(
      true,
    );


    return source.pipe(
      finalize(
        () => {
          this.commandBusyState.set(
            false,
          );
        },
      ),
    );
  }


  /* ============================================================
     DATE
     ============================================================ */

  private dateOnly(
    date: Date,
  ): string {
    const month =
      String(
        date.getMonth() + 1,
      ).padStart(
        2,
        '0',
      );


    const day =
      String(
        date.getDate(),
      ).padStart(
        2,
        '0',
      );


    return (
      `${date.getFullYear()}-` +
      `${month}-` +
      `${day}`
    );
  }
}