import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';

import {
  DataStateChangeEvent,
  GridDataResult,
  GridModule,
  GridSmartBoxSearchEvent,
  GridSmartBoxSearchSettings,
  KENDO_GRID,
} from '@progress/kendo-angular-grid';

import { InputsModule } from '@progress/kendo-angular-inputs';
import { LabelModule } from '@progress/kendo-angular-label';

import {
  KENDO_TOOLBAR,
  ToolBarModule,
} from '@progress/kendo-angular-toolbar';

import { State } from '@progress/kendo-data-query';

import { AuthFacadeService } from '../../../core/services/auth-facade.service';
import { AppToolbarComponent } from '../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../shared/services/app-toolbar/toolbar.service';

import { StockTransferFacade } from '../data-access/stock-transfer.facade';
import {
  StockTransferListItem,
  StockTransferStatus,
} from '../models/stock-transfer.models';

@Component({
  selector: 'app-stock-transfer-list',

  standalone: true,

  changeDetection:
    ChangeDetectionStrategy.OnPush,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    ButtonsModule,
    DateInputsModule,
    DropDownsModule,
    GridModule,
    InputsModule,
    LabelModule,
    ToolBarModule,

    KENDO_GRID,
    KENDO_TOOLBAR,

    AppToolbarComponent,
  ],

  providers: [
    StockTransferFacade,
  ],

  templateUrl:
    './stock-transfer-list.component.html',

  styleUrl:
    './stock-transfer.component.scss',
})
export class StockTransferListComponent
  implements OnDestroy
{
  readonly facade =
    inject(StockTransferFacade);

  readonly toolbar =
    inject(AppToolbarService);

  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);

  private readonly auth =
    inject(AuthFacadeService);

  /*
   * ============================================================
   * STATUS OPTIONS
   * ============================================================
   */

  readonly statuses = [
    {
      value: 'ALL',
      text: 'All',
    },

    {
      value: 'N',
      text: 'Draft',
    },

    {
      value: 'A',
      text: 'Posted',
    },
  ];

  /*
   * ============================================================
   * SELECTED ROW
   * Used for external editing concept.
   * ============================================================
   */

  readonly selected =
    signal<StockTransferListItem | null>(
      null,
    );

  /*
   * ============================================================
   * GRID STATE
   * ============================================================
   */

  readonly gridState =
    signal<State>({
      skip: 0,
      take: 50,
    });

  /*
   * ============================================================
   * GRID DATA
   * Server-paged data.
   * ============================================================
   */

  readonly gridData =
    computed<GridDataResult>(() => ({
      data:
        this.facade.rows(),

      total:
        this.facade.total(),
    }));

  /*
   * ============================================================
   * FILTER FORM
   * Existing Stock Transfer filters preserved.
   * ============================================================
   */

  readonly filterForm =
    this.fb.group({
      dateFrom: [
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        ),
      ],

      dateTo: [
        new Date(),
      ],

      status: [
        'ALL' as
          | 'ALL'
          | StockTransferStatus,
      ],

      sourceWhseCode: [
        null as string | null,
      ],

      destinationWhseCode: [
        null as string | null,
      ],

      search: [''],
    });

  /*
   * ============================================================
   * SMART BOX
   * ============================================================
   */

  readonly searchSettings:
    GridSmartBoxSearchSettings = {
    enabled: true,

    history: {
      size: 5,

      timestampFormat:
        'HH:mm:ss',
    },

    placeholder:
      'Search stock transfers...',

    delay: 300,

    fields: [
      'stNo',
      'status',
      'sourceWhseCode',
      'sourceWhseDesc',
      'destinationWhseCode',
      'destinationWhseDesc',
      'reference',
      'remarks',
      'stDate',
    ],
  };

  /*
   * ============================================================
   * CONSTRUCTOR
   * ============================================================
   */

  constructor() {
    this.toolbar.setConfig({
      showNew:
        this.auth.hasPermission(
          'INVENTORY_TRANSFER_EDIT',
        ),

      showRefresh: true,
    });

    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.toolbar.reset();
  }

  /*
   * ============================================================
   * NEW ENTRY
   * ============================================================
   */

  newEntry(): void {
    void this.router.navigate([
      '/stock-transfers',
      'new',
    ]);
  }

  /*
   * ============================================================
   * EXISTING DOCUMENT
   * ============================================================
   */

  open(stNo: string): void {
    void this.router.navigate([
      '/stock-transfers',
      stNo,
    ]);
  }

  /*
   * ============================================================
   * EXTERNAL EDITING
   *
   * Same concept as PO Listing:
   * select / click row -> navigate to Entry page.
   * ============================================================
   */

  editSelected(): void {
    const row =
      this.selected();

    if (!row?.stNo) {
      return;
    }

    void this.router.navigate([
      '/stock-transfers',
      row.stNo,
    ]);
  }

  /*
   * ============================================================
   * SELECTION
   * ============================================================
   */

  onSelectionChange(
    event: any,
  ): void {
    const selectedRows =
      event?.selectedRows ?? [];

    const selectedItem =
      selectedRows.length > 0
        ? (
            selectedRows[0]
              ?.dataItem as
              StockTransferListItem
          )
        : null;

    this.selected.set(
      selectedItem ?? null,
    );
  }

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */

  refresh(): void {
    this.selected.set(null);

    this.facade.reloadList();
  }

  /*
   * ============================================================
   * APPLY FILTERS
   *
   * Existing Stock Transfer query logic preserved.
   * ============================================================
   */

  applyFilters(): void {
    const raw =
      this.filterForm.getRawValue();

    const state =
      this.gridState();

    this.facade.updateQuery({
      dateFrom:
        raw.dateFrom
          ? this.facade.dateOnly(
              raw.dateFrom,
            )
          : null,

      dateTo:
        raw.dateTo
          ? this.facade.dateOnly(
              raw.dateTo,
            )
          : null,

      status:
        raw.status ?? 'ALL',

      sourceWhseCode:
        raw.sourceWhseCode ||
        null,

      destinationWhseCode:
        raw.destinationWhseCode ||
        null,

      search:
        raw.search?.trim() ||
        null,

      skip:
        state.skip ?? 0,

      take:
        state.take ?? 50,
    });
  }

  /*
   * ============================================================
   * CLEAR FILTER
   * ============================================================
   */

  clearFilters(): void {
    this.filterForm.reset({
      dateFrom:
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        ),

      dateTo:
        new Date(),

      status:
        'ALL',

      sourceWhseCode:
        null,

      destinationWhseCode:
        null,

      search:
        '',
    });

    this.gridState.set({
      skip: 0,
      take: 50,
    });

    this.selected.set(null);

    this.applyFilters();
  }

  /*
   * ============================================================
   * SERVER-SIDE PAGING
   * ============================================================
   */

  dataStateChange(
    event: DataStateChangeEvent,
  ): void {
    this.gridState.set({
      skip:
        event.skip ?? 0,

      take:
        event.take ?? 50,
    });

    this.selected.set(null);

    this.applyFilters();
  }

  /*
   * ============================================================
   * SMARTBOX SERVER SEARCH
   *
   * Do NOT client-filter because the Stock Transfer list
   * is server-paged.
   * ============================================================
   */

  onGridSearch(
    event:
      GridSmartBoxSearchEvent,
  ): void {
    event.preventDefault();

    const searchValue =
      event.searchValue?.trim() ??
      '';

    this.filterForm.patchValue(
      {
        search:
          searchValue,
      },
      {
        emitEvent: false,
      },
    );

    this.gridState.update(
      (state) => ({
        ...state,
        skip: 0,
      }),
    );

    this.selected.set(null);

    this.applyFilters();
  }

  /*
   * ============================================================
   * STATUS DISPLAY
   * ============================================================
   */

  statusName(
    status:
      StockTransferStatus,
  ): string {
    return status === 'U'
      ? 'Posted'
      : 'Draft';
  }
}