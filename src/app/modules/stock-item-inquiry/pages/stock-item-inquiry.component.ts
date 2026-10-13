import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { DataStateChangeEvent, GridDataResult, GridModule } from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { LabelModule } from '@progress/kendo-angular-label';
import { SelectEvent, TabStripModule } from '@progress/kendo-angular-layout';
import { CompositeFilterDescriptor, State } from '@progress/kendo-data-query';

import { AppToolbarComponent } from '../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../shared/services/app-toolbar/toolbar.service';
import { StockItemInquiryFacade } from '../data-access/stock-item-inquiry.facade';
import { StockItem, WarehouseStock } from '../models/stock-item-inquiry.models';

@Component({
  selector: 'app-stock-item-inquiry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonsModule,
    DateInputsModule,
    GridModule,
    InputsModule,
    LabelModule,
    TabStripModule,
    //AppToolbarComponent,
  ],
  providers: [StockItemInquiryFacade],
  templateUrl: './stock-item-inquiry.component.html',
  styleUrl: './stock-item-inquiry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockItemInquiryComponent implements OnDestroy {
  readonly facade = inject(StockItemInquiryFacade);
  readonly toolbarService = inject(AppToolbarService);
  private readonly fb = inject(FormBuilder);

  readonly selectedTab = signal(0);
  readonly itemState = signal<State>({ skip: 0, take: 50 });
  readonly itemGridData = computed<GridDataResult>(() => ({
    data: this.facade.items(),
    total: this.facade.itemTotal(),
  }));

  readonly itemForm = this.fb.group({
    search: this.fb.nonNullable.control('', [Validators.maxLength(100)]),
    groupCode: this.fb.nonNullable.control('', [Validators.maxLength(10)]),
  });

  readonly cardForm = this.fb.group({
    dateFrom: this.fb.nonNullable.control(new Date(new Date().getFullYear(), 0, 1), Validators.required),
    dateTo: this.fb.nonNullable.control(new Date(), Validators.required),
  });

  constructor() {
    this.toolbarService.setConfig({ showPrint: true, showRefresh: true });
  }

  ngOnDestroy(): void {
    this.toolbarService.reset();
  }

  searchItems(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }
    this.itemState.update((state) => ({ ...state, skip: 0 }));
    const raw = this.itemForm.getRawValue();
    this.facade.applyItemQuery({
      search: raw.search.trim() || null,
      groupCode: raw.groupCode.trim() || null,
      skip: 0,
      take: this.itemState().take ?? 50,
    });
  }

  clearItemFilters(): void {
    this.itemForm.reset({ search: '', groupCode: '' });
    this.itemState.set({ skip: 0, take: 50 });
    this.facade.applyItemQuery({ search: null, groupCode: null, skip: 0, take: 50 });
  }

  // itemStateChange(event: DataStateChangeEvent): void {
  //   const state = { skip: event.skip ?? 0, take: event.take ?? 50 };
  //   this.itemState.set(state);
  //   this.facade.applyItemQuery(state);
  // }

  public filter: CompositeFilterDescriptor = {
    logic: "and",
    filters: [
      { field: "itemCode", operator: "contains", value: "" },
      { field: "itemDescription", operator: "contains", value: "" },
    ],
  };

//   public readonly itemState = signal<State>({
//   skip: 0,
//   take: 50,
//   sort: [],
//   filter: {
//     logic: 'and',
//     filters: []
//   }
// });

  itemStateChange(event: DataStateChangeEvent): void {
    const state = {
      skip: event.skip ?? 0,
      take: event.take ?? 50,
    };

    this.itemState.set(state);

    const raw = this.itemForm.getRawValue();

    this.facade.applyItemQuery({
      search: raw.search.trim() || null,
      groupCode: raw.groupCode.trim() || null,
      skip: state.skip,
      take: state.take,
    });
  }

  onItemCellClick(event: any): void {
  if (event.originalEvent?.detail === 2) {
    this.openItem(event.dataItem);
  }
}

  openItem(item: StockItem): void {
    this.facade.selectItem(item);
    this.selectedTab.set(1);
  }

  onWarehouseCellClick(event: any): void {
  if (event.originalEvent?.detail === 2) {
    this.openWarehouse(event.dataItem);
  }
}

  openWarehouse(warehouse: WarehouseStock): void {
    this.facade.selectWarehouse(warehouse);
    this.selectedTab.set(2);
  }

  setOpenOnly(value: boolean): void {
    this.facade.openOnly.set(value);
  }

  refreshStockCard(): void {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      return;
    }
    const raw = this.cardForm.getRawValue();
    if (raw.dateFrom > raw.dateTo) {
      this.cardForm.controls.dateTo.setErrors({ dateOrder: true });
      return;
    }
    this.cardForm.controls.dateTo.setErrors(null);
    this.facade.cardQuery.set({
      dateFrom: this.facade.dateOnly(raw.dateFrom),
      dateTo: this.facade.dateOnly(raw.dateTo),
    });
    this.facade.refreshStockCard();
  }

  onTabSelect(event: SelectEvent): void {
    this.selectedTab.set(event.index);
  }

  refreshActiveTab(): void {
    switch (this.selectedTab()) {
      case 1: this.facade.refreshWarehouses(); break;
      case 2: this.facade.refreshLots(); break;
      case 3: this.facade.refreshStockCard(); break;
      default: this.facade.refreshItems();
    }
  }

  print(): void {
    window.print();
  }
}
