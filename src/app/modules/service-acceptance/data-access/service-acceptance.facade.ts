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
} from '../models/service-acceptance.models';

import {
  ServiceAcceptanceService,
} from './service-acceptance.service';


interface OpenPoLineRequest {
  supplierCode:
    string |
    null;

  branchName:
    string |
    null;

  excludeAcceptanceNo:
    string |
    null;

  search:
    string;
}


@Injectable()
export class ServiceAcceptanceFacade {
  private readonly api =
    inject(
      ServiceAcceptanceService,
    );


  private readonly busy =
    signal(
      false,
    );


  readonly documentNo =
    signal<
      string |
      null
    >(
      null,
    );


  /* ============================================================
     SUPPLIER
     ============================================================ */

  readonly supplierSearch =
    signal(
      '',
    );


  readonly selectedSupplierCode =
    signal<
      string |
      null
    >(
      null,
    );


  /* ============================================================
     BRANCH
     ============================================================ */

  readonly selectedBranchName =
    signal<
      string |
      null
    >(
      'MANDAUE',
    );


  /* ============================================================
     OPEN PO LINE
     ============================================================ */

  readonly openPoLineSearch =
    signal(
      '',
    );


  readonly excludeAcceptanceNo =
    signal<
      string |
      null
    >(
      null,
    );


  /* ============================================================
     LIST
     ============================================================ */

  readonly listQuery =
    signal<
      ServiceAcceptanceListQuery
    >({
      fromDate:
        this.dateOnly(
          new Date(
            new Date()
              .getFullYear(),
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


  private readonly listResource =
  rxResource<
    PagedResult<ServiceAcceptanceListItem>,
    ServiceAcceptanceListQuery
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
     DOCUMENT
     ============================================================ */

  private readonly documentResource =
  rxResource<
    ServiceAcceptanceDocument | null,
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
     SUPPLIERS
     ============================================================ */

  private readonly supplierResource =
  rxResource<
    ServiceSupplierLookup[],
    string
  >({
    params: () =>
      this.supplierSearch(),

    stream: ({ params }) =>
      this.api.getSuppliers(params),

    defaultValue: [],
  });


  /* ============================================================
     OPEN PO LINES
     ============================================================ */

  private readonly openPoLinesResource =
  rxResource<
    ServiceOpenPoLineLookup[],
    OpenPoLineRequest
  >({
    params: () => ({
      supplierCode:
        this.selectedSupplierCode(),

      branchName:
        this.selectedBranchName(),

      excludeAcceptanceNo:
        this.excludeAcceptanceNo(),

      search:
        this.openPoLineSearch(),
    }),

    stream: ({ params }) => {
      const supplierCode =
        String(
          params.supplierCode ?? '',
        ).trim();

      if (!supplierCode) {
        return of<ServiceOpenPoLineLookup[]>([]);
      }

      return this.api.getOpenPoLines(
        supplierCode,
        params.branchName,
        params.excludeAcceptanceNo,
        params.search,
      );
    },

    defaultValue: [],
  });


  /* ============================================================
     BRANCH
     ============================================================ */

  private readonly branchResource =
  rxResource<
    ServiceBranchLookup[],
    void
  >({
    stream: () =>
      this.api.getBranches(),

    defaultValue: [],
  });


  /* ============================================================
     TAX
     ============================================================ */

  private readonly taxResource =
  rxResource<
    ServiceTaxSchemeLookup[],
    void
  >({
    stream: () =>
      this.api.getTaxSchemes(),

    defaultValue: [],
  });


  /* ============================================================
     PUBLIC
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


  readonly openPoLines =
    computed(
      () =>
        this.openPoLinesResource
          .value(),
    );


  readonly openPoLinesLoading =
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


  readonly branchesLoading =
    computed(
      () =>
        this.branchResource
          .isLoading(),
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
        this.busy(),
    );


  /* ============================================================
     LIST
     ============================================================ */

  updateQuery(
    patch:
      Partial<
        ServiceAcceptanceListQuery
      >,
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


  reloadList(): void {
    this.listResource
      .reload();
  }


  /* ============================================================
     DOCUMENT
     ============================================================ */

  loadDocument(
    documentNo:
      string
      | null,
  ): void {
    this.documentNo.set(
      documentNo,
    );


    this.setExcludeAcceptanceNo(
      documentNo,
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


  /* ============================================================
     SUPPLIER
     ============================================================ */

  searchSuppliers(
    search:
      string,
  ): void {
    this.supplierSearch.set(
      String(
        search ??
        '',
      ).trim(),
    );
  }


  selectSupplier(
    supplierCode:
      string
      | null,
  ): void {
    const clean =
      String(
        supplierCode ??
        '',
      ).trim();


    this.selectedSupplierCode
      .set(
        clean ||
        null,
      );


    this.openPoLineSearch
      .set(
        '',
      );
  }


  reloadSuppliers(): void {
    this.supplierResource
      .reload();
  }


  /* ============================================================
     BRANCH
     ============================================================ */

  selectBranch(
    branchName:
      string
      | null,
  ): void {
    const clean =
      String(
        branchName ??
        '',
      ).trim();


    this.selectedBranchName
      .set(
        clean ||
        null,
      );
  }


  reloadBranches(): void {
    this.branchResource
      .reload();
  }


  /* ============================================================
     OPEN PO LINE
     ============================================================ */

  searchOpenPoLines(
    search:
      string,
  ): void {
    this.openPoLineSearch.set(
      String(
        search ??
        '',
      ).trim(),
    );
  }


  setExcludeAcceptanceNo(
    documentNo:
      string
      | null,
  ): void {
    const clean =
      String(
        documentNo ??
        '',
      ).trim();


    this.excludeAcceptanceNo
      .set(
        clean ||
        null,
      );
  }


  reloadOpenPoLines(): void {
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
      ServiceAcceptanceSaveRequest,
  ): Observable<
    ServiceAcceptanceCommandResponse
  > {
    return this.run(
      this.api.save(
        request,
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
    return this.run(
      this.api.transition(
        documentNo,
        action,
        request,
      ),
    );
  }


  /* ============================================================
     ERROR
     ============================================================ */

  errorMessage(
    error:
      unknown,
  ): string {
    const value =
      error as {
        error?:
          | {
              error?: string;
              message?: string;
              title?: string;
              errors?: Record<
                string,
                string[]
              >;
            }
          | string;

        message?: string;
      };


    if (
      typeof value?.error ===
      'string'
    ) {
      return value.error;
    }


    const validationErrors =
      value?.error

      &&

      typeof value.error !==
      'string'

        ? value.error.errors

        : undefined;


    if (
      validationErrors
    ) {
      const messages =
        Object.values(
          validationErrors,
        ).flat();


      if (
        messages.length
      ) {
        return messages.join(
          ' ',
        );
      }
    }


    if (
      value?.error

      &&

      typeof value.error !==
      'string'
    ) {
      return (
        value.error.error
        ||
        value.error.message
        ||
        value.error.title
        ||
        value.message
        ||
        'Service Acceptance operation failed.'
      );
    }


    return (
      value?.message
      ||
      'Service Acceptance operation failed.'
    );
  }


  private run(
    source:
      Observable<
        ServiceAcceptanceCommandResponse
      >,
  ): Observable<
    ServiceAcceptanceCommandResponse
  > {
    if (
      this.busy()
    ) {
      return throwError(
        () =>
          new Error(
            'Another Service Acceptance command is running.',
          ),
      );
    }


    this.busy.set(
      true,
    );


    return source.pipe(
      finalize(
        () => {
          this.busy.set(
            false,
          );

          this.reloadList();
        },
      ),
    );
  }


  private dateOnly(
    date:
      Date,
  ): string {
    return [
      date.getFullYear(),

      String(
        date.getMonth() +
        1,
      ).padStart(
        2,
        '0',
      ),

      String(
        date.getDate(),
      ).padStart(
        2,
        '0',
      ),
    ].join(
      '-',
    );
  }
}