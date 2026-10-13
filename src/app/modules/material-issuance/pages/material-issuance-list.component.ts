import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule
} from '@angular/forms';
import { Router } from '@angular/router';

import {
  KENDO_BUTTONS
} from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import {
  DataStateChangeEvent,
  GridDataResult,
  KENDO_GRID
} from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { LabelModule } from '@progress/kendo-angular-label';
import { State } from '@progress/kendo-data-query';
import {
  filterClearIcon,
  printIcon,
  searchIcon
} from '@progress/kendo-svg-icons';

import { ErpNotificationService } from '../../../shared/notification-card/erp-notification.service';
import { AppToolbarComponent } from '../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../shared/services/app-toolbar/toolbar.service';

import { MaterialIssuanceFacade } from '../data-access/material-issuance.facade';
import {
  IssueListItem,
  IssueStatus
} from '../models/material-issuance.models';

type QuickDateKey =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'LAST_YEAR';

interface StatusOption {
  value: string;
  text: string;
}

interface SourceOption {
  value: string;
  text: string;
}

@Component({
  selector: 'app-material-issuance-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    KENDO_GRID,
    KENDO_BUTTONS,
    InputsModule,
    DropDownsModule,
    DateInputsModule,
    LabelModule,
    AppToolbarComponent
  ],
  providers: [MaterialIssuanceFacade],
  templateUrl: './material-issuance-list.component.html',

  // MODIFIED:
  // Separate list stylesheet para dili maapektuhan ang entry page.
  styleUrl: './material-issuance.component.scss'
})
export class MaterialIssuanceListComponent implements OnDestroy {
  readonly facade = inject(MaterialIssuanceFacade);
  readonly toolbar = inject(AppToolbarService);

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notify = inject(ErpNotificationService);

  readonly searchIcon = searchIcon;
  readonly filterClearIcon = filterClearIcon;
  readonly printIcon = printIcon;

  readonly selected = signal<IssueListItem | null>(null);

  readonly statuses: StatusOption[] = [
    {
      value: 'ALL',
      text: 'All'
    },
    {
      value: 'N',
      text: 'Draft'
    },
    {
      value: 'A',
      text: 'Posted'
    },
    {
      value: 'R',
      text: 'Reversed'
    }
  ];

  readonly sources: SourceOption[] = [
    {
      value: 'ALL',
      text: 'All'
    },
    {
      value: 'PRD',
      text: 'Production'
    },
    {
      value: 'JOB',
      text: 'Job Order'
    },
    {
      value: 'PRJ',
      text: 'Project / Installation'
    },
    {
      value: 'DPT',
      text: 'Department Consumption'
    },
    {
      value: 'JOT',
      text: 'Job-Out Release'
    },
    {
      value: 'DIR',
      text: 'Direct / Emergency'
    }
  ];

  readonly gridState = signal<State>({
    skip: 0,
    take: 50
  });

  readonly filterForm = this.fb.group({
    dateFrom: [
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
    ],
    dateTo: [new Date()],
    status: ['ALL'],
    sourceType: ['ALL'],
    whseCode: [null as string | null],
    search: ['']
  });

  readonly gridData = computed<GridDataResult>(() => ({
    data: this.facade.rows(),
    total: this.facade.total()
  }));

  constructor() {
    this.toolbar.setConfig({
      showNew: true,
      showRefresh: true,
      showToday: true,
      showYesterday: true,
      showThisMonth: true,
      showLastMonth: true,
      showThisYear: true,
      showLastYear: true
    });

    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.toolbar.reset();
  }

  newEntry(): void {
    void this.router.navigate([
      '/material-issuance',
      'new'
    ]);
  }

  openSelected(): void {
    const row = this.selected();

    if (!row?.issueNo) {
      return;
    }

    void this.router.navigate([
      '/material-issuance',
      row.issueNo
    ]);
  }

  open(issueNo: string): void {
    if (!issueNo) {
      return;
    }

    this.selected.set(
      this.facade
        .rows()
        .find((row) => row.issueNo === issueNo) ?? null
    );

    void this.router.navigate([
      '/material-issuance',
      issueNo
    ]);
  }

  // printSelected(): void {
  //   const row = this.selected();

  //   if (!row?.issueNo) {
  //     this.notify.warning(
  //       'Select a material issuance document before printing.',
  //       'Print Material Issuance'
  //     );

  //     return;
  //   }

  //   void this.router.navigate([
  //     '/material-issuance',
  //     'print',
  //     row.issueNo
  //   ]);
  // }

  // print(issueNo: string): void {
  //   if (!issueNo) {
  //     return;
  //   }

  //   this.selected.set(
  //     this.facade
  //       .rows()
  //       .find((row) => row.issueNo === issueNo) ?? null
  //   );

  //   void this.router.navigate([
  //     '/material-issuance',
  //     'print',
  //     issueNo
  //   ]);
  // }

  refresh(): void {
    this.selected.set(null);
    this.facade.reload();
  }

  applyFilters(): void {
    const raw = this.filterForm.getRawValue();
    const state = this.gridState();

    this.selected.set(null);

    this.facade.update({
      dateFrom: raw.dateFrom
        ? this.toDateOnly(raw.dateFrom)
        : null,

      dateTo: raw.dateTo
        ? this.toDateOnly(raw.dateTo)
        : null,

      status: raw.status || 'ALL',
      sourceType: raw.sourceType || 'ALL',
      whseCode: raw.whseCode || null,
      search: raw.search?.trim() || null,
      skip: state.skip ?? 0,
      take: state.take ?? 50
    });
  }

  clearFilters(): void {
    this.filterForm.reset({
      dateFrom: new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ),
      dateTo: new Date(),
      status: 'ALL',
      sourceType: 'ALL',
      whseCode: null,
      search: ''
    });

    this.gridState.set({
      skip: 0,
      take: 50
    });

    this.selected.set(null);
    this.applyFilters();
  }

  applyQuickDate(key: QuickDateKey): void {
    const range = this.getQuickDateRange(key);

    this.filterForm.patchValue(
      {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo
      },
      {
        emitEvent: false
      }
    );

    this.gridState.update((state) => ({
      ...state,
      skip: 0
    }));

    this.applyFilters();
  }

  dataStateChange(event: DataStateChangeEvent): void {
    this.gridState.set({
      skip: event.skip ?? 0,
      take: event.take ?? 50
    });

    this.applyFilters();
  }

  onSelectionChange(event: {
    selectedRows?: Array<{
      dataItem?: IssueListItem;
    }>;
  }): void {
    const selectedRows = event.selectedRows ?? [];

    this.selected.set(
      selectedRows.length > 0
        ? selectedRows[0]?.dataItem ?? null
        : null
    );
  }

statusClass(
  status: IssueStatus | string | null | undefined
): string {
  const value = String(status ?? '')
    .trim()
    .toUpperCase();

  switch (value) {
    // DRAFT
    case 'N':
    case 'P':
      return 'status-N';

    // POSTED
    case 'U':
    case 'A':
      return 'status-A';

    // REVERSED
    case 'C':
    case 'R':
      return 'status-R';

    default:
      return 'status-unknown';
  }
}


statusName(
  status: IssueStatus | string | null | undefined
): string {
  const value = String(status ?? '')
    .trim()
    .toUpperCase();

  switch (value) {
    // DRAFT
    case 'N':
    case 'P':
      return 'Draft';

    // POSTED
    case 'U':
    case 'A':
      return 'Posted';

    // REVERSED
    case 'C':
    case 'R':
      return 'Reversed';

    default:
      return value
        ? `Unknown (${value})`
        : 'Unknown';
  }
}

  sourceName(sourceType: string): string {
    return (
      this.sources.find(
        (source) => source.value === sourceType
      )?.text ?? sourceType
    );
  }

  private toDateOnly(value: unknown): string {
    const date =
      value instanceof Date
        ? value
        : new Date(String(value));

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');
    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getQuickDateRange(
    key: QuickDateKey
  ): {
    dateFrom: Date;
    dateTo: Date;
  } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    switch (key) {
      case 'TODAY':
        return {
          dateFrom: new Date(year, month, day),
          dateTo: new Date(year, month, day)
        };

      case 'YESTERDAY': {
        const yesterday = new Date(
          year,
          month,
          day - 1
        );

        return {
          dateFrom: yesterday,
          dateTo: yesterday
        };
      }

      case 'THIS_MONTH':
        return {
          dateFrom: new Date(year, month, 1),
          dateTo: new Date(year, month + 1, 0)
        };

      case 'LAST_MONTH':
        return {
          dateFrom: new Date(year, month - 1, 1),
          dateTo: new Date(year, month, 0)
        };

      case 'THIS_YEAR':
        return {
          dateFrom: new Date(year, 0, 1),
          dateTo: new Date(year, 11, 31)
        };

      case 'LAST_YEAR':
        return {
          dateFrom: new Date(year - 1, 0, 1),
          dateTo: new Date(year - 1, 11, 31)
        };
    }
  }
}