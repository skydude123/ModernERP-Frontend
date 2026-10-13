import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

import {
  PagedResult,
  StockCardQuery,
  StockCardRow,
  StockItem,
  StockItemListQuery,
  WarehouseLot,
  WarehouseStock,
} from '../models/stock-item-inquiry.models';
import { StockItemInquiryService } from './stock-item-inquiry.service';

interface WarehouseRequest {
  itemCode: string;
}

interface LotRequest extends WarehouseRequest {
  whseCode: string;
  openOnly: boolean;
}

interface CardRequest extends WarehouseRequest, StockCardQuery {
  whseCode: string;
}

@Injectable()
export class StockItemInquiryFacade {
  private readonly api = inject(StockItemInquiryService);

  readonly itemQuery = signal<StockItemListQuery>({ search: null, groupCode: null, skip: 0, take: 50 });
  readonly selectedItem = signal<StockItem | null>(null);
  readonly selectedWarehouse = signal<WarehouseStock | null>(null);
  readonly openOnly = signal(true);
  readonly cardQuery = signal<StockCardQuery>({
    dateFrom: this.dateOnly(new Date(new Date().getFullYear(), 0, 1)),
    dateTo: this.dateOnly(new Date()),
  });

  private readonly itemResource =
  rxResource<
    PagedResult<StockItem>,
    StockItemListQuery
  >({
    params: () =>
      this.itemQuery(),

    stream: ({ params }) =>
      this.api.items(params),

    defaultValue: {
      data: [],
      total: 0,
    },
  });

  private readonly warehouseResource =
  rxResource<
    WarehouseStock[],
    WarehouseRequest
  >({
    params: () => ({
      itemCode:
        this.selectedItem()?.itemCode ?? '',
    }),

    stream: ({ params }) =>
      params.itemCode
        ? this.api.warehouseStocks(
            params.itemCode,
          )
        : of([]),

    defaultValue: [],
  });

 private readonly lotResource =
  rxResource<
    WarehouseLot[],
    LotRequest
  >({
    params: () => ({
      itemCode:
        this.selectedItem()?.itemCode ?? '',

      whseCode:
        this.selectedWarehouse()?.whseCode ?? '',

      openOnly:
        this.openOnly(),
    }),

    stream: ({ params }) =>
      params.itemCode &&
      params.whseCode
        ? this.api.warehouseLots(
            params.itemCode,
            params.whseCode,
            params.openOnly,
          )
        : of([]),

    defaultValue: [],
  });

  private readonly cardResource =
  rxResource<
    StockCardRow[],
    CardRequest
  >({
    params: () => ({
      itemCode:
        this.selectedItem()?.itemCode ?? '',

      whseCode:
        this.selectedWarehouse()?.whseCode ?? '',

      ...this.cardQuery(),
    }),

    stream: ({ params }) =>
      params.itemCode &&
      params.whseCode
        ? this.api.stockCard(
            params.itemCode,
            params.whseCode,
            params,
          )
        : of([]),

    defaultValue: [],
  });

  
  readonly items = computed(() => this.itemResource.value().data);
  readonly itemTotal = computed(() => this.itemResource.value().total);
  readonly itemsLoading = computed(() => this.itemResource.isLoading());
  readonly itemError = computed(() => this.message(this.itemResource.error()));
  readonly warehouses = computed(() => this.warehouseResource.value());
  readonly warehousesLoading = computed(() => this.warehouseResource.isLoading());
  readonly warehouseError = computed(() => this.message(this.warehouseResource.error()));
  readonly lots = computed(() => this.lotResource.value());
  readonly lotsLoading = computed(() => this.lotResource.isLoading());
  readonly lotError = computed(() => this.message(this.lotResource.error()));
  readonly stockCard = computed(() => this.cardResource.value());
  readonly stockCardLoading = computed(() => this.cardResource.isLoading());
  readonly stockCardError = computed(() => this.message(this.cardResource.error()));

  applyItemQuery(patch: Partial<StockItemListQuery>): void {
    this.itemQuery.update((query) => ({ ...query, ...patch }));
  }

  selectItem(item: StockItem): void {
    this.selectedWarehouse.set(null);
    this.selectedItem.set(item);
  }

  selectWarehouse(warehouse: WarehouseStock): void {
    this.selectedWarehouse.set(warehouse);
  }

  refreshItems(): void { this.itemResource.reload(); }
  refreshWarehouses(): void { if (this.selectedItem()) this.warehouseResource.reload(); }
  refreshLots(): void { if (this.selectedWarehouse()) this.lotResource.reload(); }
  refreshStockCard(): void { if (this.selectedWarehouse()) this.cardResource.reload(); }

  dateOnly(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  private message(error: unknown): string | null {
    if (!error) return null;
    const value = error as { error?: { error?: string; detail?: string; message?: string }; message?: string };
    return value.error?.error ?? value.error?.detail ?? value.error?.message ?? value.message ?? 'Unable to load inquiry data.';
  }
}
