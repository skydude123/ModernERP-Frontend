import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  PurchaseOrderReportQuery,
  PurchaseOrderReportType,
} from './purchase-order-report.model';
import { PurchaseOrderReportService } from './purchase-order-report.service';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderReportFacade {
  private readonly api = inject(PurchaseOrderReportService);
  readonly query = signal<PurchaseOrderReportQuery>({
    reportType: 'PO_SUMMARY',
    poDateFrom: this.dateOnly(new Date(new Date().getFullYear(), 0, 1)),
    poDateTo: this.dateOnly(new Date()),
    deliveryDateFrom: null,
    deliveryDateTo: null,
    poStatus: 'ALL',
    balanceStatus: 'ALL',
    poType: 'ALL',
    itemCode: null,
    itemDesc: null,
    poNo: null,
    purchaser: null,
    branchName: null,
    supplierMode: 'ALL',
    supplierCodes: null,
    skip: 0,
    take: 50,
  });
  private readonly reportResource = rxResource({
  params: () =>
    this.query(),

  stream: ({ params }) =>
    this.api.query(params),

  defaultValue: {
    data: [],
    total: 0,
  },
});


 private readonly supplierResource = rxResource({
  params: () => true,

  stream: () =>
    this.api.suppliers(),

  defaultValue: [],
});


  readonly rows = computed(() => this.reportResource.value().data);
  readonly total = computed(() => this.reportResource.value().total);
  readonly loading = computed(() => this.reportResource.isLoading());
  readonly error = computed(() => this.reportResource.error());
  readonly suppliers = computed(() => this.supplierResource.value());
  update(patch: Partial<PurchaseOrderReportQuery>): void {
    this.query.update((current) => ({ ...current, ...patch }));
  }
  refresh(): void {
    this.reportResource.reload();
  }
  setReportType(reportType: PurchaseOrderReportType): void {
    this.update({ reportType, skip: 0 });
  }
  private dateOnly(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
}
