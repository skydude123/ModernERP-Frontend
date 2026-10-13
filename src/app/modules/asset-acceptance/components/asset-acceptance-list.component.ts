import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  computed,
  inject,
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
  SelectionEvent,
} from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { State } from '@progress/kendo-data-query';
import {
  filterClearIcon,
  folderOpenIcon,
  searchIcon,
} from '@progress/kendo-svg-icons';

import { ErpNotificationService } from '../../../shared/notification-card/erp-notification.service';
import { AppToolbarComponent } from '../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../shared/services/app-toolbar/toolbar.service';
import { AssetAcceptanceFacade } from '../data-access/asset-acceptance.facade';
import {
  AssetAcceptanceListItem,
  AssetAcceptanceStatus,
  BranchLookup,
  CodeNameLookup,
} from '../models/asset-acceptance.models';

@Component({
  selector: 'app-asset-acceptance-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonsModule,
    DateInputsModule,
    DropDownsModule,
    GridModule,
    InputsModule,
    AppToolbarComponent,
  ],
  providers: [AssetAcceptanceFacade],
  templateUrl:
    './asset-acceptance-list.component.html',
  styleUrl:
    './asset-acceptance-list.component.scss',
})
export class AssetAcceptanceListComponent
  implements OnDestroy
{
  readonly facade = inject(AssetAcceptanceFacade);
  readonly toolbar = inject(AppToolbarService);

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notify =
    inject(ErpNotificationService);

  readonly searchIcon = searchIcon;
  readonly clearIcon = filterClearIcon;
  readonly openIcon = folderOpenIcon;

  readonly allBranches: BranchLookup = {
    branchName: '',
  };

  readonly allCategories: CodeNameLookup = {
    code: '',
    name: 'All categories',
  };

  readonly selected =
    signal<AssetAcceptanceListItem | null>(null);

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

  readonly filters = this.fb.group({
    fromDate: [
      new Date(
        new Date().getFullYear(),
        0,
        1,
      ),
    ],
    toDate: [new Date()],
    status: ['ALL'],
    branchName: [
      null as string | null,
    ],
    assetCategoryCode: [
      null as string | null,
    ],
    search: [''],
  });

  readonly gridData =
    computed<GridDataResult>(() => ({
      data: this.facade.list(),
      total: this.facade.total(),
    }));

  constructor() {
    this.toolbar.setConfig({
      showNew: true,
      showRefresh: true,
    });

    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.toolbar.reset();
  }

  newDocument(): void {
    void this.router.navigate([
      '/acceptance/new',
    ]);
  }

   openDocument(
  row: AssetAcceptanceListItem,
): void {
  void this.router.navigate([
    '/acceptance',
    row.assetAcceptanceNo,
  ]);
}

edit(
  row: AssetAcceptanceListItem,
): void {
  void this.router.navigate([
    '/acceptance',
    row.assetAcceptanceNo,
  ]);
}

  refresh(): void {
    this.selected.set(null);
    this.facade.reloadList();
  }

  search(): void {
    this.state.update(current => ({
      ...current,
      skip: 0,
    }));

    this.selected.set(null);
    this.applyFilters();
  }

  openSelected(): void {
    const no =
      this.selected()
        ?.assetAcceptanceNo;

    if (!no) {
      this.notify.warning(
        'Select an asset acceptance first.',
        'Open Document',
      );

      return;
    }

    void this.router.navigate([
      '/acceptance',
      no,
    ]);
  }

  printSelected(): void {
    if (!this.selected()) {
      this.notify.warning(
        'Select an asset acceptance before printing.',
        'Print',
      );

      return;
    }

    window.print();
  }

  applyFilters(): void {
    const value =
      this.filters.getRawValue();

    const currentState =
      this.state();

    const sort =
      currentState.sort?.[0];

    this.facade.updateQuery({
      fromDate:
        this.dateOnly(
          value.fromDate,
        ),
      toDate:
        this.dateOnly(
          value.toDate,
        ),
      status:
        value.status || 'ALL',
      branchName:
        value.branchName?.trim() ||
        null,
      assetCategoryCode:
        value.assetCategoryCode
          ?.trim() || null,
      search:
        value.search?.trim() ||
        null,
      skip:
        currentState.skip ?? 0,
      take:
        currentState.take ?? 50,
      sortField:
        String(
          sort?.field ??
            'acceptanceDate',
        ),
      sortDir:
        sort?.dir ?? 'desc',
    });
  }

  clearFilters(): void {
    this.filters.reset({
      fromDate: new Date(
        new Date().getFullYear(),
        0,
        1,
      ),
      toDate: new Date(),
      status: 'ALL',
      branchName: null,
      assetCategoryCode: null,
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

  dataStateChange(
    event: DataStateChangeEvent,
  ): void {
    this.state.set({
      skip: event.skip ?? 0,
      take: event.take ?? 50,
      sort:
        event.sort?.length
          ? event.sort
          : [
              {
                field:
                  'acceptanceDate',
                dir: 'desc',
              },
            ],
    });

    this.selected.set(null);
    this.applyFilters();
  }

  selectionChange(
    event: SelectionEvent,
  ): void {
    const item =
      event.selectedRows?.[0]
        ?.dataItem as
        | AssetAcceptanceListItem
        | undefined;

    this.selected.set(
      item ?? null,
    );
  }

  statusClass(
    status: AssetAcceptanceStatus,
  ): string {
    return `status-${status.toLowerCase()}`;
  }

  private dateOnly(
    value: Date | null,
  ): string | null {
    if (!value) {
      return null;
    }

    return [
      value.getFullYear(),
      String(
        value.getMonth() + 1,
      ).padStart(2, '0'),
      String(
        value.getDate(),
      ).padStart(2, '0'),
    ].join('-');
  }
}