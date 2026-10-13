import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import {
  DataStateChangeEvent,
  GridDataResult,
  GridModule,
  SelectionEvent,
} from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { LabelModule } from '@progress/kendo-angular-label';
import { State } from '@progress/kendo-data-query';

import { AppToolbarComponent } from '../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../shared/services/app-toolbar/toolbar.service';
import { FuelAcceptanceFacade } from '../data-access/fuel-acceptance.facade';
import {
  FuelAcceptanceListItem,
  FuelAcceptanceStatus,
} from '../models/fuel-acceptance.models';

type StatusFilter = 'ALL' | FuelAcceptanceStatus;

@Component({
  selector: 'app-fuel-acceptance-list',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    /*
    |--------------------------------------------------------------------------
    | Kendo modules
    |--------------------------------------------------------------------------
    */

    ButtonsModule,
    DateInputsModule,
    DropDownsModule,
    GridModule,
    InputsModule,

    /*
    |--------------------------------------------------------------------------
    | MODIFIED:
    | Required by:
    |   kendo-formfield
    |   kendo-label
    |   kendo-formhint
    |--------------------------------------------------------------------------
    */

    LabelModule,

    AppToolbarComponent,
  ],

  providers: [FuelAcceptanceFacade],

  templateUrl: './fuel-acceptance-list.component.html',

  styleUrl: './fuel-acceptance-list.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuelAcceptanceListComponent implements OnDestroy {
  readonly facade = inject(FuelAcceptanceFacade);

  readonly toolbar = inject(AppToolbarService);

  private readonly fb = inject(FormBuilder);

  private readonly router = inject(Router);

  readonly statusOptions: ReadonlyArray<{
    value: StatusFilter;
    text: string;
  }> = [
    {
      value: 'ALL',
      text: 'All Statuses',
    },
    {
      value: 'N',
      text: 'Draft',
    },
    {
      value: 'A',
      text: 'Posted / Ready for VP',
    },
    {
      value: 'R',
      text: 'Reversed',
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | Blank default item for branch filtering
  |--------------------------------------------------------------------------
  */

  readonly branchDefaultItem = {
    branchName: '',
  };

  readonly selected = signal<FuelAcceptanceListItem | null>(null);

  readonly state = signal<State>({
    skip: 0,
    take: 50,
    sort: [
      {
        field: 'acceptanceDate',
        dir: 'desc',
      },
    ],
  });

  readonly filters = this.fb.nonNullable.group({
    fromDate: [new Date(new Date().getFullYear(), 0, 1) as Date | null],

    toDate: [new Date() as Date | null],

    status: this.fb.nonNullable.control<StatusFilter>('ALL'),

    branchName: [''],

    search: [''],
  });

  readonly gridData = computed<GridDataResult>(() => ({
    data: this.facade.list(),

    total: this.facade.total(),
  }));

  constructor() {
    this.toolbar.setConfig({
      showNew: true,
      //showPrint: true,
      showRefresh: true,
    });

    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.toolbar.reset();
  }

  /*
  |--------------------------------------------------------------------------
  | Status
  |--------------------------------------------------------------------------
  */

  statusLabel(status: FuelAcceptanceStatus): string {
    switch (status) {
      case 'N':
        return 'DRAFT';

      case 'A':
        return 'POSTED / READY FOR VP';

      case 'R':
        return 'REVERSED';

      default:
        return status;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Toolbar actions
  |--------------------------------------------------------------------------
  */

  newDocument(): void {
    void this.router.navigate(['/fuel-acceptance/new']);
  }

  open(detail?: FuelAcceptanceListItem | null): void {
    const target = detail ?? this.selected();

    if (!target?.fuelAcceptanceNo) {
      return;
    }

    this.selected.set(target);

    void this.router.navigate(['/fuel-acceptance', target.fuelAcceptanceNo]);
  }

  refresh(): void {
    this.facade.reloadList();
  }

  print(): void {
    window.print();
  }

  /*
  |--------------------------------------------------------------------------
  | Grid events
  |--------------------------------------------------------------------------
  */

  selectionChange(event: SelectionEvent): void {
    const selectedRow = event.selectedRows?.[0];

    this.selected.set(
      (selectedRow?.dataItem as FuelAcceptanceListItem | undefined) ?? null,
    );
  }

  dataStateChange(state: DataStateChangeEvent): void {
    const sort = state.sort?.[0];

    this.state.set({
      skip: state.skip ?? 0,

      take: state.take ?? 50,

      sort: state.sort?.length
        ? state.sort
        : [
            {
              field: 'acceptanceDate',

              dir: 'desc',
            },
          ],
    });

    this.facade.updateQuery({
      skip: state.skip ?? 0,

      take: state.take ?? 50,

      sortField: sort?.field?.toString() ?? 'acceptanceDate',

      sortDir: sort?.dir ?? 'desc',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  applyFilters(): void {
    const value = this.filters.getRawValue();

    const currentState = this.state();

    const currentSort = currentState.sort?.[0];

    this.state.update((current) => ({
      ...current,
      skip: 0,
    }));

    this.selected.set(null);

    this.facade.updateQuery({
      fromDate: value.fromDate ? this.dateOnly(value.fromDate) : null,

      toDate: value.toDate ? this.dateOnly(value.toDate) : null,

      status: value.status,

      branchName: value.branchName.trim() || null,

      search: value.search.trim() || null,

      skip: 0,

      take: currentState.take ?? 50,

      sortField: currentSort?.field?.toString() ?? 'acceptanceDate',

      sortDir: currentSort?.dir ?? 'desc',
    });
  }

  clearFilters(): void {
    this.filters.reset({
      fromDate: null,
      toDate: null,
      status: 'ALL',
      branchName: '',
      search: '',
    });

    this.state.set({
      skip: 0,
      take: 50,
      sort: [
        {
          field: 'acceptanceDate',
          dir: 'desc',
        },
      ],
    });

    this.selected.set(null);

    this.applyFilters();
  }

  /*
  |--------------------------------------------------------------------------
  | Quick date ranges
  |--------------------------------------------------------------------------
  */

  today(): void {
    const date = this.startOfDay(new Date());

    this.setRange(date, date);
  }

  yesterday(): void {
    const date = this.startOfDay(new Date());

    date.setDate(date.getDate() - 1);

    this.setRange(date, date);
  }

  thisMonth(): void {
    const date = new Date();

    this.setRange(
      new Date(date.getFullYear(), date.getMonth(), 1),

      new Date(date.getFullYear(), date.getMonth() + 1, 0),
    );
  }

  lastMonth(): void {
    const date = new Date();

    this.setRange(
      new Date(date.getFullYear(), date.getMonth() - 1, 1),

      new Date(date.getFullYear(), date.getMonth(), 0),
    );
  }

  thisYear(): void {
    const year = new Date().getFullYear();

    this.setRange(
      new Date(year, 0, 1),

      new Date(year, 11, 31),
    );
  }

  lastYear(): void {
    const year = new Date().getFullYear() - 1;

    this.setRange(
      new Date(year, 0, 1),

      new Date(year, 11, 31),
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  private setRange(fromDate: Date, toDate: Date): void {
    this.filters.patchValue(
      {
        fromDate,
        toDate,
      },
      {
        emitEvent: false,
      },
    );

    this.applyFilters();
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private dateOnly(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-` + `${month}-` + `${day}`;
  }
}
