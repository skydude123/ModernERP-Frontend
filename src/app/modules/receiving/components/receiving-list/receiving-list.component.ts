import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonsModule, KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import {
  DataStateChangeEvent,
  GridDataResult,
  GridModule,
  KENDO_GRID,
} from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { LabelModule } from '@progress/kendo-angular-label';
import { ToolBarModule } from '@progress/kendo-angular-toolbar';
import { State } from '@progress/kendo-data-query';

import { ErpNotificationService } from '../../../../shared/notification-card/erp-notification.service';
import { AppToolbarComponent } from '../../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../../shared/services/app-toolbar/toolbar.service';
import { ReceivingFacade } from '../../data-access/receiving.facade';
import {
  QuickDateKey,
  ReceivingListItem,
  ReceivingStatus,
} from '../../models/receiving.models';
import {
  filterClearIcon,
  printIcon,
  searchIcon,
} from '@progress/kendo-svg-icons';
import { AuthFacadeService } from '../../../../core/services/auth-facade.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-receiving-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    KENDO_GRID,
    KENDO_BUTTONS,
    ToolBarModule,
    InputsModule,
    DropDownsModule,
    DateInputsModule,
    LabelModule,
    AppToolbarComponent,
  ],
  providers: [ReceivingFacade],
  templateUrl: './receiving-list.component.html',
  styleUrls: ['./receiving-list.component.scss'],
})
export class ReceivingListComponent implements OnDestroy {
  readonly authFacade = inject(AuthFacadeService);
  readonly facade = inject(ReceivingFacade);
  readonly toolbarService = inject(AppToolbarService);

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notify = inject(ErpNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchIcon = searchIcon;
  readonly filterClearIcon = filterClearIcon;
  readonly printIcon = printIcon;

  readonly selected = signal<ReceivingListItem | null>(null);

  readonly gridState = signal<State>({
    skip: 0,
    take: 50,
    sort: [{ field: 'rrDate', dir: 'desc' }],
  });

  readonly filterForm = this.fb.group({
    fromDate: [new Date(new Date().getFullYear(), 0, 1)],
    toDate: [new Date()],
    status: ['ALL'],
    transType: ['ALL'],
    branchname: [null as string | null],
    whseCode: [null as string | null],
    suppCode: [null as string | null],
    search: [''],
  });

  readonly gridData = computed<GridDataResult>(() => ({
    data: this.facade.receivingList(),
    total: this.facade.receivingTotal(),
  }));

  constructor() {
     this.toolbarService.setConfig({
    showNew: true,
    showRefresh: true,
    showToday: true,
    showYesterday: true,
    showThisMonth: true,
    showLastMonth: true,
    showThisYear: true,
    showLastYear: true,
  });

  /*
  |--------------------------------------------------------------------------
  | Automatic filtering
  |--------------------------------------------------------------------------
  |
  | No need to click Search.
  | Search text is debounced to avoid calling the API on every keystroke.
  |
  */

  this.filterForm.valueChanges
    .pipe(
      debounceTime(300),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe(() => {
      this.gridState.update((state) => ({
        ...state,
        skip: 0,
      }));

      this.applyFilters();
    });

  this.applyFilters();
  }

  ngOnDestroy(): void {
    this.toolbarService.reset();
  }

  newReceiving(): void {
    void this.router.navigate(['/receiving/new']);
  }

  openSelected(): void {
    const row = this.selected();

    if (!row?.rrNo) {
      return;
    }

    void this.router.navigate(['/receiving', row.rrNo]);
  }

  printSelected(): void {
    const row = this.selected();

    if (!row?.rrNo) {
      this.notify.warning(
        'Select a receiving document before printing.',
        'Print Receiving',
      );
      return;
    }

    void this.router.navigate(['/receiving/report', row.rrNo]);
  }

  refresh(): void {
    this.facade.reloadList();
  }

  applyFilters(): void {
    const raw = this.filterForm.getRawValue();
    const state = this.gridState();
    const firstSort = state.sort?.[0];

    const userId = String(this.authFacade.userId() ?? '').trim();

    if (!userId) {
      this.notify.error(
        'The logged-in user ID could not be identified.',
        'Receiving List',
      );

      return;
    }

    this.facade.updateQuery({
      fromDate: raw.fromDate ? this.toDateOnly(raw.fromDate) : null,

      toDate: raw.toDate ? this.toDateOnly(raw.toDate) : null,

      status: raw.status || 'ALL',
      transType: raw.transType || 'ALL',
      branchname: raw.branchname || null,
      whseCode: raw.whseCode || null,
      suppCode: raw.suppCode || null,
      search: raw.search?.trim() || null,

      skip: state.skip ?? 0,
      take: state.take ?? 50,

      sortField: firstSort?.field ?? 'rrDate',
      sortDir: firstSort?.dir ?? 'desc',

      userId,
    });
  }

  clearFilters(): void {
    this.filterForm.reset(
    {
      fromDate: new Date(new Date().getFullYear(), 0, 1),
      toDate: new Date(),
      status: 'ALL',
      transType: 'ALL',
      branchname: null,
      whseCode: null,
      suppCode: null,
      search: '',
    },
    {
      emitEvent: false,
    },
  );

  this.gridState.set({
    skip: 0,
    take: 50,
    sort: [{ field: 'rrDate', dir: 'desc' }],
  });

  this.applyFilters();
  }

  applyQuickDate(key: QuickDateKey): void {
    const range = this.getQuickDateRange(key);

    this.filterForm.patchValue(
      {
        fromDate: range.fromDate,
        toDate: range.toDate,
      },
      { emitEvent: false },
    );

    this.gridState.update((state) => ({
      ...state,
      skip: 0,
    }));

    this.facade.applyQuickDate(key);
  }

  dataStateChange(state: DataStateChangeEvent): void {
    this.gridState.set({
      skip: state.skip ?? 0,
      take: state.take ?? 50,
      sort: state.sort?.length
        ? state.sort
        : [{ field: 'rrDate', dir: 'desc' }],
    });

    this.applyFilters();
  }

  onSelectionChange(event: any): void {
    const selectedRows = event?.selectedRows ?? [];
    this.selected.set(
      selectedRows.length > 0
        ? (selectedRows[0]?.dataItem as ReceivingListItem)
        : null,
    );
  }

  statusClass(status: ReceivingStatus): string {
    return `status-${status}`;
  }

  private toDateOnly(value: unknown): string {
    const date = value instanceof Date ? value : new Date(String(value));
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getQuickDateRange(key: QuickDateKey): {
    fromDate: Date;
    toDate: Date;
  } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    switch (key) {
      case 'TODAY':
        return {
          fromDate: new Date(year, month, today.getDate()),
          toDate: new Date(year, month, today.getDate()),
        };
      case 'YESTERDAY': {
        const yesterday = new Date(year, month, today.getDate() - 1);
        return { fromDate: yesterday, toDate: yesterday };
      }
      case 'THIS_MONTH':
        return {
          fromDate: new Date(year, month, 1),
          toDate: new Date(year, month + 1, 0),
        };
      case 'LAST_MONTH':
        return {
          fromDate: new Date(year, month - 1, 1),
          toDate: new Date(year, month, 0),
        };
      case 'THIS_YEAR':
        return {
          fromDate: new Date(year, 0, 1),
          toDate: new Date(year, 11, 31),
        };
      case 'LAST_YEAR':
        return {
          fromDate: new Date(year - 1, 0, 1),
          toDate: new Date(year - 1, 11, 31),
        };
    }
  }
}
