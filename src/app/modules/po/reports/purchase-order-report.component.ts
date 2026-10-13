import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import {
  GridModule,
  PageChangeEvent,
} from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';

import {
  GridLayoutModule,
  SelectEvent,
  TabStripModule,
} from '@progress/kendo-angular-layout';

import { PurchaseOrderReportFacade } from './purchase-order-report.facade';
import {
  PurchaseOrderReportType,
  SupplierMode,
} from './purchase-order-report.model';

@Component({
  selector: 'app-purchase-order-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    ButtonsModule,
    DateInputsModule,
    DropDownsModule,
    GridModule,
    InputsModule,

    // KENDO LAYOUT
    GridLayoutModule,
    TabStripModule,
  ],
  templateUrl: './purchase-order-report.component.html',
  styleUrl: './purchase-order-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderReportComponent {
  readonly facade = inject(PurchaseOrderReportFacade);

  private readonly fb = inject(FormBuilder);

  readonly selectedSupplierCodes = signal<string[]>([]);
  readonly supplierSearch = signal('');
  readonly supplierMode = signal<SupplierMode>('ALL');

  readonly form = this.fb.group({
    poDateFrom: [new Date(new Date().getFullYear(), 0, 1)],
    poDateTo: [new Date()],

    deliveryDateFrom: [null as Date | null],
    deliveryDateTo: [null as Date | null],

    poStatus: ['ALL'],
    balanceStatus: ['ALL'],
    poType: ['ALL'],

    itemCode: [''],
    itemDesc: [''],
    poNo: [''],
    purchaser: [''],
    branchName: [''],
  });

  readonly types: ReadonlyArray<{
    code: PurchaseOrderReportType;
    title: string;
    detail: string;
  }> = [
      {
        code: 'PO_SUMMARY',
        title: 'PO Summary',
        detail: 'Management overview by PO',
      },
      {
        code: 'PO_TRACKING',
        title: 'PO Tracking',
        detail: 'Ordered, fulfilled and remaining lines',
      },
      {
        code: 'PO_BALANCE_SUPPLIER',
        title: 'Balances / Supplier',
        detail: 'Open commitments by supplier',
      },
      {
        code: 'PO_SUMMARY_ITEM',
        title: 'Summary / Item',
        detail: 'Purchasing history by item and U/M',
      },
      {
        code: 'PO_RR',
        title: 'PO / RR',
        detail: 'PO-to-receiving traceability',
      },
      {
        code: 'PO_BALANCE',
        title: 'PO Balances',
        detail: 'Detailed open PO lines',
      },
    ];

  readonly statuses = [
    { text: 'All Statuses', value: 'ALL' },
    { text: 'Draft', value: 'N' },
    { text: 'Posted', value: 'P' },
    { text: 'Approved', value: 'A' },
    { text: 'Cancelled', value: 'C' },
  ];

  readonly balanceStatuses = [
    'ALL',
    'OPEN',
    'UNRECEIVED',
    'PARTIAL',
    'FULLY_RECEIVED',
    'OVER_RECEIVED',
  ];

  poTypes = [
    { code: 'ALL', description: 'All PO Types' },
    { code: 'MGP', description: 'Merchandise Goods Purchase' },
    { code: 'SJP', description: 'Special Job Purchase' },
    { code: 'OFP', description: 'Office Purchase' },
    { code: 'FAP', description: 'Fixed Asset Purchase' },
    { code: 'CRP', description: 'Capital / Renovation Purchase' }
  ];

  readonly filteredSuppliers = computed(() => {
    const q = this.supplierSearch().trim().toLowerCase();

    return this.facade.suppliers().filter((supplier) => {
      if (!q) {
        return true;
      }

      return (
        supplier.suppCode.toLowerCase().includes(q) ||
        supplier.suppName.toLowerCase().includes(q)
      );
    });
  });

  readonly data = computed(() => ({
    data: this.facade.rows(),
    total: this.facade.total(),
  }));

  readonly selectedReportIndex = computed(() => {
    const reportType = this.facade.query().reportType;

    const index = this.types.findIndex(
      (type) => type.code === reportType,
    );

    return index >= 0 ? index : 0;
  });

  apply(): void {
    const raw = this.form.getRawValue();

    if (
      (raw.poDateFrom &&
        raw.poDateTo &&
        raw.poDateFrom > raw.poDateTo) ||
      (raw.deliveryDateFrom &&
        raw.deliveryDateTo &&
        raw.deliveryDateFrom > raw.deliveryDateTo)
    ) {
      this.form.setErrors({
        invalidDates: true,
      });

      return;
    }

    this.form.setErrors(null);

    const selected = this.selectedSupplierCodes();
    const supplierMode = this.supplierMode();

    this.facade.update({
      ...this.toQueryDates(raw),

      supplierMode,

      supplierCodes:
        supplierMode === 'SELECTED'
          ? selected.join('|')
          : null,

      skip: 0,
    });
  }

  refresh(): void {
    this.facade.refresh();
  }

  selectAll(): void {
    this.selectedSupplierCodes.set(
      this.filteredSuppliers().map(
        (supplier) => supplier.suppCode,
      ),
    );

    this.supplierMode.set('SELECTED');
  }

  useAllSuppliers(): void {
    this.selectedSupplierCodes.set([]);
    this.supplierMode.set('ALL');
  }

  clearAll(): void {
    this.selectedSupplierCodes.set([]);
    this.supplierMode.set('NONE');
  }

  toggleSupplier(
    code: string,
    checked: boolean,
  ): void {
    this.selectedSupplierCodes.update((values) => {
      const next = checked
        ? [...new Set([...values, code])]
        : values.filter((value) => value !== code);

      this.supplierMode.set(
        next.length ? 'SELECTED' : 'NONE',
      );

      return next;
    });
  }

  selected(code: string): boolean {
    return this.selectedSupplierCodes().includes(code);
  }

  pageChange(event: PageChangeEvent): void {
    this.facade.update({
      skip: event.skip,
      take: event.take,
    });
  }

  setType(type: PurchaseOrderReportType): void {
    this.facade.setReportType(type);
  }

  onReportTabSelect(event: SelectEvent): void {
    const selectedType = this.types[event.index];

    if (!selectedType) {
      return;
    }

    this.setType(selectedType.code);
  }

  private toQueryDates(
    raw: ReturnType<typeof this.form.getRawValue>,
  ) {
    return {
      poDateFrom: this.toApiDate(raw.poDateFrom),
      poDateTo: this.toApiDate(raw.poDateTo),

      deliveryDateFrom: this.toApiDate(
        raw.deliveryDateFrom,
      ),

      deliveryDateTo: this.toApiDate(
        raw.deliveryDateTo,
      ),

      poStatus: raw.poStatus ?? 'ALL',
      balanceStatus: raw.balanceStatus ?? 'ALL',
      poType: raw.poType ?? 'ALL',

      itemCode:
        raw.itemCode?.trim() || null,

      itemDesc:
        raw.itemDesc?.trim() || null,

      poNo:
        raw.poNo?.trim() || null,

      purchaser:
        raw.purchaser?.trim() || null,

      branchName:
        raw.branchName?.trim() || null,
    };
  }

  /**
   * Keep API format yyyy-MM-dd.
   * Visible UI format is MM-dd-yyyy.
   */
  private toApiDate(
    value: Date | null,
  ): string | null {
    if (!value) {
      return null;
    }

    const year = value.getFullYear();

    const month = String(
      value.getMonth() + 1,
    ).padStart(2, '0');

    const day = String(
      value.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}